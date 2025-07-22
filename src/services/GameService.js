const LudoGame = require("../game/LudoGame");
const Game = require("../models/Game");
const User = require("../models/User");
const {
  setGameState,
  getGameState,
  deleteGameState,
} = require("../config/redis");
const logger = require("../utils/logger");
const config = require("../config/app");

class GameService {
  constructor() {
    this.activeGames = new Map(); // In-memory storage for active game instances
    this.playerGameMap = new Map(); // Map players to their current games
  }

  // Create a new game instance
  async createGameInstance(gameId) {
    try {
      // Get game data from database
      const gameData = await Game.findById(gameId);
      if (!gameData) {
        throw new Error(`Game ${gameId} not found`);
      }

      // Get players
      const players = await gameData.getPlayers();

      // Create game instance
      const gameInstance = new LudoGame(gameId, players);

      // Store in memory
      this.activeGames.set(gameId, gameInstance);

      // Map players to game
      players.forEach((player) => {
        this.playerGameMap.set(player.user_id, gameId);
      });

      // Cache game state in Redis
      await this.cacheGameState(gameId, gameInstance.getGameState());

      logger.gameEvent("Game instance created", {
        gameId,
        playersCount: players.length,
      });

      return gameInstance;
    } catch (error) {
      logger.error("Failed to create game instance:", error);
      throw error;
    }
  }

  // Get game instance (from memory or create new)
  async getGameInstance(gameId) {
    try {
      // Check if game is already in memory
      if (this.activeGames.has(gameId)) {
        return this.activeGames.get(gameId);
      }

      // Try to restore from Redis cache (only if Redis is enabled)
      if (process.env.SKIP_REDIS !== "true") {
        try {
          const cachedState = await getGameState(gameId);
          if (cachedState) {
            const gameInstance = this.restoreGameFromState(cachedState);
            this.activeGames.set(gameId, gameInstance);
            logger.debug(`Game ${gameId} restored from Redis cache`);
            return gameInstance;
          }
        } catch (redisError) {
          logger.warn(
            `Failed to restore from Redis, creating new instance: ${redisError.message}`
          );
        }
      }

      // Create new instance from database
      return await this.createGameInstance(gameId);
    } catch (error) {
      logger.error(`Failed to get game instance ${gameId}:`, error);
      throw error;
    }
  }

  // Add player to game
  async addPlayerToGame(gameId, player) {
    try {
      const gameInstance = await this.getGameInstance(gameId);
      gameInstance.addPlayer(player);

      // Update player mapping
      this.playerGameMap.set(player.id, gameId);

      // Cache updated state
      await this.cacheGameState(gameId, gameInstance.getGameState());

      logger.gameEvent("Player added to game", {
        gameId,
        playerId: player.id,
        playerName: player.username,
      });

      return gameInstance;
    } catch (error) {
      logger.error(`Failed to add player to game ${gameId}:`, error);
      throw error;
    }
  }

  // Remove player from game
  async removePlayerFromGame(gameId, playerId) {
    try {
      const gameInstance = await this.getGameInstance(gameId);
      const removed = gameInstance.removePlayer(playerId);

      if (removed) {
        // Update player mapping
        this.playerGameMap.delete(playerId);

        // If no players left, clean up game
        if (gameInstance.players.length === 0) {
          await this.cleanupGame(gameId);
        } else {
          // Cache updated state
          await this.cacheGameState(gameId, gameInstance.getGameState());
        }

        logger.gameEvent("Player removed from game", {
          gameId,
          playerId,
        });
      }

      return gameInstance;
    } catch (error) {
      logger.error(`Failed to remove player from game ${gameId}:`, error);
      throw error;
    }
  }

  // Start a game
  async startGame(gameId) {
    try {
      const gameInstance = await this.getGameInstance(gameId);
      gameInstance.startGame();

      // Update database
      const game = await Game.findById(gameId);
      await game.startGame();

      // Cache updated state
      await this.cacheGameState(gameId, gameInstance.getGameState());

      logger.gameEvent("Game started", {
        gameId,
        playersCount: gameInstance.players.length,
      });

      return gameInstance;
    } catch (error) {
      logger.error(`Failed to start game ${gameId}:`, error);
      throw error;
    }
  }

  // Handle dice roll
  async rollDice(gameId, playerId) {
    try {
      const gameInstance = await this.getGameInstance(gameId);
      const diceValue = gameInstance.rollDice(playerId);

      // Cache updated state
      await this.cacheGameState(gameId, gameInstance.getGameState());

      logger.gameEvent("Dice rolled", {
        gameId,
        playerId,
        diceValue,
      });

      return {
        diceValue,
        gameState: gameInstance.getPublicGameState(playerId),
        validMoves: gameInstance.getValidMoves(playerId, diceValue),
      };
    } catch (error) {
      logger.error(`Failed to roll dice in game ${gameId}:`, error);
      throw error;
    }
  }

  // Handle piece move
  async movePiece(gameId, playerId, pieceIndex, diceValue) {
    try {
      const gameInstance = await this.getGameInstance(gameId);
      const moveResult = gameInstance.movePiece(
        playerId,
        pieceIndex,
        diceValue
      );

      // Save move to database
      await this.saveMove(gameId, playerId, moveResult);

      // Check if game ended
      if (moveResult.gameEnded) {
        await this.endGame(gameId, moveResult.winner);
      }

      // Cache updated state
      await this.cacheGameState(gameId, gameInstance.getGameState());

      logger.gameEvent("Piece moved", {
        gameId,
        playerId,
        pieceIndex,
        from: moveResult.from,
        to: moveResult.to,
        captured: moveResult.captured,
        gameEnded: moveResult.gameEnded,
      });

      return {
        moveResult,
        gameState: gameInstance.getGameState(),
      };
    } catch (error) {
      logger.error(`Failed to move piece in game ${gameId}:`, error);
      throw error;
    }
  }

  // Get player's current game
  getPlayerGame(playerId) {
    return this.playerGameMap.get(playerId);
  }

  // Get game state for a player
  async getGameStateForPlayer(gameId, playerId) {
    try {
      const gameInstance = await this.getGameInstance(gameId);
      return gameInstance.getPublicGameState(playerId);
    } catch (error) {
      logger.error(`Failed to get game state for player ${playerId}:`, error);
      throw error;
    }
  }

  // Handle player disconnection
  async handlePlayerDisconnection(playerId) {
    try {
      const gameId = this.getPlayerGame(playerId);
      if (!gameId) return;

      const gameInstance = await this.getGameInstance(gameId);

      // Update database
      const game = await Game.findById(gameId);
      await game.updatePlayerConnection(playerId, false);

      logger.gameEvent("Player disconnected", {
        gameId,
        playerId,
      });

      // Check if all players are disconnected
      const players = await game.getPlayers();
      const connectedPlayers = players.filter((p) => p.is_connected);

      if (
        connectedPlayers.length === 0 &&
        gameInstance.gameStatus === "playing"
      ) {
        // Pause the game or set timeout
        setTimeout(async () => {
          const updatedPlayers = await game.getPlayers();
          const stillConnected = updatedPlayers.filter((p) => p.is_connected);

          if (stillConnected.length === 0) {
            await this.cleanupGame(gameId);
          }
        }, config.game.reconnectTimeoutMs);
      }
    } catch (error) {
      logger.error(`Failed to handle player disconnection ${playerId}:`, error);
    }
  }

  // Handle player reconnection
  async handlePlayerReconnection(playerId) {
    try {
      const gameId = this.getPlayerGame(playerId);
      if (!gameId) return null;

      // Update database
      const game = await Game.findById(gameId);
      await game.updatePlayerConnection(playerId, true);

      logger.gameEvent("Player reconnected", {
        gameId,
        playerId,
      });

      // Return current game state
      return await this.getGameStateForPlayer(gameId, playerId);
    } catch (error) {
      logger.error(`Failed to handle player reconnection ${playerId}:`, error);
      throw error;
    }
  }

  // End a game
  async endGame(gameId, winnerId) {
    try {
      const gameInstance = await this.getGameInstance(gameId);

      // Update database
      const game = await Game.findById(gameId);
      await game.setWinner(winnerId);

      // Record results for all players
      for (const player of gameInstance.players) {
        const stats = gameInstance.getPlayerStats(player.id);
        const result = player.id === winnerId ? "win" : "loss";

        await game.recordPlayerResult(
          player.id,
          result,
          stats.piecesHome * 10, // Score calculation
          stats.piecesHome
        );

        // Update user statistics
        const user = await User.findById(player.id);
        await user.updateGameStats(player.id === winnerId);
      }

      logger.gameEvent("Game ended", {
        gameId,
        winnerId,
        duration: game.getDuration(),
      });

      // Clean up after a delay
      setTimeout(() => {
        this.cleanupGame(gameId);
      }, 30000); // 30 seconds delay
    } catch (error) {
      logger.error(`Failed to end game ${gameId}:`, error);
      throw error;
    }
  }

  // Save move to database
  async saveMove(gameId, playerId, moveResult) {
    try {
      const db = require("../config/database");

      const query = `
        INSERT INTO game_moves (
          game_id, player_id, move_number, dice_roll, piece_moved,
          from_position, to_position, captured_piece, captured_player_id, extra_turn
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `;

      await db.query(query, [
        gameId,
        playerId,
        moveResult.moveNumber || 0,
        moveResult.diceValue,
        moveResult.pieceIndex,
        moveResult.from,
        moveResult.to,
        moveResult.captured || false,
        moveResult.capturedPlayer || null,
        moveResult.extraTurn || false,
      ]);
    } catch (error) {
      logger.error("Failed to save move to database:", error);
      // Don't throw - game can continue without move history
    }
  }

  // Cache game state in Redis (optional)
  async cacheGameState(gameId, gameState) {
    // Skip caching if Redis is disabled
    if (process.env.SKIP_REDIS === "true") {
      return;
    }

    try {
      const result = await setGameState(gameId, gameState, 3600); // 1 hour TTL
      if (result) {
        logger.debug(`Game state cached for ${gameId}`);
      }
    } catch (error) {
      logger.warn(`Failed to cache game state for ${gameId}:`, error.message);
      // Continue without caching - this is not critical
    }
  }

  // Restore game from cached state
  restoreGameFromState(cachedState) {
    const gameInstance = new LudoGame(cachedState.gameId, cachedState.players);

    // Restore state
    gameInstance.currentTurn = cachedState.currentTurn;
    gameInstance.gameStatus = cachedState.gameStatus;
    gameInstance.winnerId = cachedState.winnerId;
    gameInstance.piecePositions = cachedState.piecePositions;
    gameInstance.lastDiceRoll = cachedState.lastDiceRoll;
    gameInstance.moveHistory = cachedState.moveHistory;

    return gameInstance;
  }

  // Clean up game instance
  async cleanupGame(gameId) {
    try {
      // Remove from memory
      this.activeGames.delete(gameId);

      // Remove player mappings
      for (const [playerId, gameIdMapped] of this.playerGameMap.entries()) {
        if (gameIdMapped === gameId) {
          this.playerGameMap.delete(playerId);
        }
      }

      // Remove from Redis cache (only if Redis is enabled)
      if (process.env.SKIP_REDIS !== "true") {
        try {
          const result = await deleteGameState(gameId);
          if (result) {
            logger.debug(`Game ${gameId} removed from Redis cache`);
          }
        } catch (redisError) {
          logger.warn(
            `Failed to remove game ${gameId} from Redis: ${redisError.message}`
          );
        }
      }

      logger.gameEvent("Game cleaned up", { gameId });
    } catch (error) {
      logger.error(`Failed to cleanup game ${gameId}:`, error);
    }
  }

  // Get active games count
  getActiveGamesCount() {
    return this.activeGames.size;
  }

  // Get connected players count
  getConnectedPlayersCount() {
    return this.playerGameMap.size;
  }

  // Cleanup inactive games (periodic maintenance)
  async cleanupInactiveGames() {
    try {
      const inactiveThreshold = Date.now() - 30 * 60 * 1000; // 30 minutes

      for (const [gameId, gameInstance] of this.activeGames.entries()) {
        if (
          gameInstance.gameStatus === "finished" ||
          (gameInstance.lastActivity &&
            gameInstance.lastActivity < inactiveThreshold)
        ) {
          await this.cleanupGame(gameId);
        }
      }
    } catch (error) {
      logger.error("Failed to cleanup inactive games:", error);
    }
  }
}

module.exports = GameService;
