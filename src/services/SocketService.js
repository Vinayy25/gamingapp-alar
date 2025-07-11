const { authenticateSocket } = require("../middleware/auth");
const logger = require("../utils/logger");
const config = require("../config/app");

class SocketService {
  constructor(io, gameService) {
    this.io = io;
    this.gameService = gameService;
    this.connectedUsers = new Map(); // Map socket.id to user data
    this.userSockets = new Map(); // Map userId to socket.id
  }

  // Initialize Socket.IO with authentication and event handlers
  initialize() {
    // Authentication middleware
    this.io.use(authenticateSocket);

    // Connection handler
    this.io.on("connection", (socket) => {
      this.handleConnection(socket);
    });

    logger.info("Socket.IO service initialized");
  }

  // Handle new socket connection
  async handleConnection(socket) {
    try {
      const user = socket.user;
      const userId = user.id;

      // Store user connection
      this.connectedUsers.set(socket.id, {
        userId,
        username: user.username,
        connectedAt: new Date(),
      });
      this.userSockets.set(userId, socket.id);

      logger.socketEvent("User connected", socket.id, {
        userId,
        username: user.username,
      });

      // Handle reconnection to existing game
      const gameState = await this.gameService.handlePlayerReconnection(userId);
      if (gameState) {
        const gameId = gameState.gameId;
        socket.join(`game_${gameId}`);
        socket.emit("game_reconnected", { gameState });

        // Notify other players in the game
        socket.to(`game_${gameId}`).emit("player_reconnected", {
          playerId: userId,
          username: user.username,
        });
      }

      // Set up event handlers
      this.setupEventHandlers(socket);

      // Handle disconnection
      socket.on("disconnect", () => {
        this.handleDisconnection(socket);
      });
    } catch (error) {
      logger.error("Socket connection error:", error);
      socket.emit("connection_error", {
        message: "Failed to establish connection",
      });
      socket.disconnect();
    }
  }

  // Set up all socket event handlers
  setupEventHandlers(socket) {
    const userId = this.connectedUsers.get(socket.id)?.userId;

    // Game room events
    socket.on("join_game", (data) => this.handleJoinGame(socket, data));
    socket.on("leave_game", (data) => this.handleLeaveGame(socket, data));
    socket.on("start_game", (data) => this.handleStartGame(socket, data));

    // Gameplay events
    socket.on("roll_dice", (data) => this.handleRollDice(socket, data));
    socket.on("move_piece", (data) => this.handleMovePiece(socket, data));
    socket.on("get_game_state", (data) =>
      this.handleGetGameState(socket, data)
    );

    // Chat and communication events
    socket.on("send_message", (data) => this.handleSendMessage(socket, data));
    socket.on("player_ready", (data) => this.handlePlayerReady(socket, data));

    // Heartbeat for connection monitoring
    socket.on("ping", () => {
      socket.emit("pong", { timestamp: Date.now() });
    });

    logger.socketEvent("Event handlers set up", socket.id, { userId });
  }

  // Handle joining a game room
  async handleJoinGame(socket, data) {
    try {
      const { gameId } = data;
      const userId = this.connectedUsers.get(socket.id)?.userId;

      if (!userId || !gameId) {
        socket.emit("error", { message: "Invalid join game request" });
        return;
      }

      // Join the game room
      socket.join(`game_${gameId}`);

      // Get game state
      const gameState = await this.gameService.getGameStateForPlayer(
        gameId,
        userId
      );

      // Send game state to the player
      socket.emit("game_joined", { gameState });

      // Notify other players
      socket.to(`game_${gameId}`).emit("player_joined", {
        playerId: userId,
        username: this.connectedUsers.get(socket.id)?.username,
      });

      logger.socketEvent("Player joined game room", socket.id, {
        userId,
        gameId,
      });
    } catch (error) {
      logger.error("Join game error:", error);
      socket.emit("error", { message: "Failed to join game" });
    }
  }

  // Handle leaving a game room
  async handleLeaveGame(socket, data) {
    try {
      const { gameId } = data;
      const userId = this.connectedUsers.get(socket.id)?.userId;

      if (!userId || !gameId) {
        socket.emit("error", { message: "Invalid leave game request" });
        return;
      }

      // Leave the game room
      socket.leave(`game_${gameId}`);

      // Notify other players
      socket.to(`game_${gameId}`).emit("player_left", {
        playerId: userId,
        username: this.connectedUsers.get(socket.id)?.username,
      });

      socket.emit("game_left", { gameId });

      logger.socketEvent("Player left game room", socket.id, {
        userId,
        gameId,
      });
    } catch (error) {
      logger.error("Leave game error:", error);
      socket.emit("error", { message: "Failed to leave game" });
    }
  }

  // Handle starting a game
  async handleStartGame(socket, data) {
    try {
      const { gameId } = data;
      const userId = this.connectedUsers.get(socket.id)?.userId;

      if (!userId || !gameId) {
        socket.emit("error", { message: "Invalid start game request" });
        return;
      }

      // Start the game
      const gameInstance = await this.gameService.startGame(gameId);

      // Broadcast game started to all players in the room
      this.io.to(`game_${gameId}`).emit("game_started", {
        gameState: gameInstance.getGameState(),
      });

      logger.socketEvent("Game started", socket.id, {
        userId,
        gameId,
      });
    } catch (error) {
      logger.error("Start game error:", error);
      socket.emit("error", {
        message: error.message || "Failed to start game",
      });
    }
  }

  // Handle dice roll
  async handleRollDice(socket, data) {
    try {
      const { gameId } = data;
      const userId = this.connectedUsers.get(socket.id)?.userId;

      if (!userId || !gameId) {
        socket.emit("error", { message: "Invalid roll dice request" });
        return;
      }

      // Roll dice
      const result = await this.gameService.rollDice(gameId, userId);

      // Send result to the player
      socket.emit("dice_rolled", {
        diceValue: result.diceValue,
        validMoves: result.validMoves,
      });

      // Broadcast dice roll to other players
      socket.to(`game_${gameId}`).emit("player_rolled_dice", {
        playerId: userId,
        diceValue: result.diceValue,
        username: this.connectedUsers.get(socket.id)?.username,
      });

      logger.socketEvent("Dice rolled", socket.id, {
        userId,
        gameId,
        diceValue: result.diceValue,
      });
    } catch (error) {
      logger.error("Roll dice error:", error);
      socket.emit("error", { message: error.message || "Failed to roll dice" });
    }
  }

  // Handle piece movement
  async handleMovePiece(socket, data) {
    try {
      const { gameId, pieceIndex, diceValue } = data;
      const userId = this.connectedUsers.get(socket.id)?.userId;

      if (!userId || !gameId || pieceIndex === undefined || !diceValue) {
        socket.emit("error", { message: "Invalid move piece request" });
        return;
      }

      // Move piece
      const result = await this.gameService.movePiece(
        gameId,
        userId,
        pieceIndex,
        diceValue
      );

      // Broadcast move to all players in the game
      this.io.to(`game_${gameId}`).emit("piece_moved", {
        playerId: userId,
        username: this.connectedUsers.get(socket.id)?.username,
        moveResult: result.moveResult,
        gameState: result.gameState,
      });

      // Check if game ended
      if (result.moveResult.gameEnded) {
        this.io.to(`game_${gameId}`).emit("game_ended", {
          winner: result.moveResult.winner,
          gameState: result.gameState,
        });
      }

      logger.socketEvent("Piece moved", socket.id, {
        userId,
        gameId,
        pieceIndex,
        from: result.moveResult.from,
        to: result.moveResult.to,
      });
    } catch (error) {
      logger.error("Move piece error:", error);
      socket.emit("error", {
        message: error.message || "Failed to move piece",
      });
    }
  }

  // Handle getting game state
  async handleGetGameState(socket, data) {
    try {
      const { gameId } = data;
      const userId = this.connectedUsers.get(socket.id)?.userId;

      if (!userId || !gameId) {
        socket.emit("error", { message: "Invalid get game state request" });
        return;
      }

      // Get game state
      const gameState = await this.gameService.getGameStateForPlayer(
        gameId,
        userId
      );

      socket.emit("game_state", { gameState });

      logger.socketEvent("Game state requested", socket.id, {
        userId,
        gameId,
      });
    } catch (error) {
      logger.error("Get game state error:", error);
      socket.emit("error", { message: "Failed to get game state" });
    }
  }

  // Handle chat messages
  async handleSendMessage(socket, data) {
    try {
      const { gameId, message } = data;
      const userId = this.connectedUsers.get(socket.id)?.userId;
      const username = this.connectedUsers.get(socket.id)?.username;

      if (!userId || !gameId || !message) {
        socket.emit("error", { message: "Invalid message request" });
        return;
      }

      // Validate message length
      if (message.length > 500) {
        socket.emit("error", { message: "Message too long" });
        return;
      }

      // Broadcast message to all players in the game
      this.io.to(`game_${gameId}`).emit("message_received", {
        playerId: userId,
        username,
        message: message.trim(),
        timestamp: new Date().toISOString(),
      });

      logger.socketEvent("Message sent", socket.id, {
        userId,
        gameId,
        messageLength: message.length,
      });
    } catch (error) {
      logger.error("Send message error:", error);
      socket.emit("error", { message: "Failed to send message" });
    }
  }

  // Handle player ready status
  async handlePlayerReady(socket, data) {
    try {
      const { gameId, ready } = data;
      const userId = this.connectedUsers.get(socket.id)?.userId;
      const username = this.connectedUsers.get(socket.id)?.username;

      if (!userId || !gameId || ready === undefined) {
        socket.emit("error", { message: "Invalid ready request" });
        return;
      }

      // Broadcast ready status to other players
      socket.to(`game_${gameId}`).emit("player_ready_status", {
        playerId: userId,
        username,
        ready: !!ready,
      });

      logger.socketEvent("Player ready status", socket.id, {
        userId,
        gameId,
        ready,
      });
    } catch (error) {
      logger.error("Player ready error:", error);
      socket.emit("error", { message: "Failed to update ready status" });
    }
  }

  // Handle socket disconnection
  async handleDisconnection(socket) {
    try {
      const userData = this.connectedUsers.get(socket.id);
      if (!userData) return;

      const { userId, username } = userData;

      // Handle game disconnection
      await this.gameService.handlePlayerDisconnection(userId);

      // Notify players in all rooms this user was in
      const rooms = Array.from(socket.rooms);
      rooms.forEach((room) => {
        if (room.startsWith("game_")) {
          socket.to(room).emit("player_disconnected", {
            playerId: userId,
            username,
          });
        }
      });

      // Clean up user data
      this.connectedUsers.delete(socket.id);
      this.userSockets.delete(userId);

      logger.socketEvent("User disconnected", socket.id, {
        userId,
        username,
      });
    } catch (error) {
      logger.error("Socket disconnection error:", error);
    }
  }

  // Get connected users count
  getConnectedUsersCount() {
    return this.connectedUsers.size;
  }

  // Get user by socket ID
  getUser(socketId) {
    return this.connectedUsers.get(socketId);
  }

  // Send notification to specific user
  sendToUser(userId, event, data) {
    const socketId = this.userSockets.get(userId);
    if (socketId) {
      this.io.to(socketId).emit(event, data);
      return true;
    }
    return false;
  }

  // Broadcast to all users in a game
  broadcastToGame(gameId, event, data) {
    this.io.to(`game_${gameId}`).emit(event, data);
  }

  // Send notification to all connected users
  broadcastToAll(event, data) {
    this.io.emit(event, data);
  }

  // Get game room information
  getGameRoomInfo(gameId) {
    const room = this.io.sockets.adapter.rooms.get(`game_${gameId}`);
    if (!room) return null;

    const players = Array.from(room)
      .map((socketId) => {
        return this.connectedUsers.get(socketId);
      })
      .filter(Boolean);

    return {
      gameId,
      connectedPlayers: players.length,
      players,
    };
  }
}

module.exports = SocketService;
