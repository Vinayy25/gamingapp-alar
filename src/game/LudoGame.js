const config = require("../config/app");

class LudoGame {
  constructor(gameId, players = []) {
    this.gameId = gameId;
    this.players = players; // Array of player objects with {id, position, color, username}
    this.currentTurn = 0; // Index of current player
    this.gameStatus = "waiting"; // waiting, playing, finished
    this.winnerId = null;
    this.lastDiceRoll = null;
    this.moveHistory = [];

    // Initialize piece positions for all players
    this.piecePositions = {};
    this.players.forEach((player) => {
      this.piecePositions[player.id] = [0, 0, 0, 0]; // All pieces start at home (position 0)
    });

    // Ludo board configuration
    this.boardConfig = {
      totalSquares: 52, // Main track squares
      homeSquares: 6, // Safe home squares for each player
      safeSquares: [1, 9, 14, 22, 27, 35, 40, 48], // Safe squares on main track
      playerStartSquares: {
        0: 1, // Red player starts at square 1
        1: 14, // Blue player starts at square 14
        2: 27, // Green player starts at square 27
        3: 40, // Yellow player starts at square 40
      },
      playerHomeEntrySquares: {
        0: 51, // Red player enters home from square 51
        1: 12, // Blue player enters home from square 12
        2: 25, // Green player enters home from square 25
        3: 38, // Yellow player enters home from square 38
      },
    };
  }

  // Roll dice (server-side to prevent cheating)
  rollDice(playerId) {
    // Validate turn
    if (!this.isPlayerTurn(playerId)) {
      throw new Error("Not your turn");
    }

    if (this.gameStatus !== "playing") {
      throw new Error("Game is not in playing status");
    }

    // Generate random dice roll (1-6)
    const diceValue = Math.floor(Math.random() * 6) + 1;
    this.lastDiceRoll = {
      playerId,
      value: diceValue,
      timestamp: new Date(),
    };

    return diceValue;
  }

  // Get valid moves for a player after dice roll
  getValidMoves(playerId, diceValue) {
    const playerPieces = this.piecePositions[playerId];
    const validMoves = [];
    const playerPosition = this.getPlayerPosition(playerId);

    playerPieces.forEach((piecePosition, pieceIndex) => {
      const move = this.calculateMove(playerId, pieceIndex, diceValue);
      if (move.isValid) {
        validMoves.push({
          pieceIndex,
          from: piecePosition,
          to: move.newPosition,
          canCapture: move.canCapture,
          capturedPlayer: move.capturedPlayer,
          entersHome: move.entersHome,
        });
      }
    });

    return validMoves;
  }

  // Calculate move result for a piece
  calculateMove(playerId, pieceIndex, diceValue) {
    const currentPosition = this.piecePositions[playerId][pieceIndex];
    const playerPosition = this.getPlayerPosition(playerId);

    let newPosition;
    let isValid = true;
    let canCapture = false;
    let capturedPlayer = null;
    let entersHome = false;

    // Piece is at home (position 0)
    if (currentPosition === 0) {
      // Can only move out with a 6
      if (diceValue === 6) {
        newPosition = this.boardConfig.playerStartSquares[playerPosition];
      } else {
        return { isValid: false };
      }
    } else if (
      currentPosition > 0 &&
      currentPosition <= this.boardConfig.totalSquares
    ) {
      // Piece is on main track
      const potentialPosition = currentPosition + diceValue;

      // Check if piece reaches home entry square
      const homeEntrySquare =
        this.boardConfig.playerHomeEntrySquares[playerPosition];

      if (
        currentPosition <= homeEntrySquare &&
        potentialPosition > homeEntrySquare
      ) {
        // Piece enters home track
        const homePosition =
          this.boardConfig.totalSquares +
          1 +
          (potentialPosition - homeEntrySquare - 1);
        if (
          homePosition <=
          this.boardConfig.totalSquares + this.boardConfig.homeSquares
        ) {
          newPosition = homePosition;
          entersHome = true;
        } else {
          // Overshoot home
          return { isValid: false };
        }
      } else if (potentialPosition <= this.boardConfig.totalSquares) {
        // Normal move on main track
        newPosition =
          potentialPosition > this.boardConfig.totalSquares
            ? potentialPosition - this.boardConfig.totalSquares
            : potentialPosition;
      } else {
        // Overshoot
        return { isValid: false };
      }
    } else {
      // Piece is in home track
      const homeTrackPosition = currentPosition - this.boardConfig.totalSquares;
      const newHomePosition = homeTrackPosition + diceValue;

      if (newHomePosition <= this.boardConfig.homeSquares) {
        newPosition = this.boardConfig.totalSquares + newHomePosition;
      } else {
        // Overshoot home
        return { isValid: false };
      }
    }

    // Check for captures (only on main track, not in home)
    if (
      newPosition <= this.boardConfig.totalSquares &&
      !this.isSafeSquare(newPosition)
    ) {
      const occupyingPlayer = this.getPlayerAtPosition(newPosition, playerId);
      if (occupyingPlayer) {
        canCapture = true;
        capturedPlayer = occupyingPlayer;
      }
    }

    // Check if position is blocked by own piece
    if (
      this.piecePositions[playerId].some(
        (pos, idx) => pos === newPosition && idx !== pieceIndex
      )
    ) {
      return { isValid: false };
    }

    return {
      isValid,
      newPosition,
      canCapture,
      capturedPlayer,
      entersHome,
    };
  }

  // Move a piece
  movePiece(playerId, pieceIndex, diceValue) {
    // Validate turn and game status
    if (!this.isPlayerTurn(playerId)) {
      throw new Error("Not your turn");
    }

    if (this.gameStatus !== "playing") {
      throw new Error("Game is not in playing status");
    }

    // Validate dice roll
    if (
      !this.lastDiceRoll ||
      this.lastDiceRoll.playerId !== playerId ||
      this.lastDiceRoll.value !== diceValue
    ) {
      throw new Error("Invalid dice value");
    }

    // Calculate and validate move
    const move = this.calculateMove(playerId, pieceIndex, diceValue);
    if (!move.isValid) {
      throw new Error("Invalid move");
    }

    const fromPosition = this.piecePositions[playerId][pieceIndex];

    // Execute capture if applicable
    if (move.canCapture) {
      this.capturePiece(move.capturedPlayer, move.newPosition);
    }

    // Update piece position
    this.piecePositions[playerId][pieceIndex] = move.newPosition;

    // Record move in history
    const moveRecord = {
      playerId,
      pieceIndex,
      diceValue,
      from: fromPosition,
      to: move.newPosition,
      captured: move.canCapture,
      capturedPlayer: move.capturedPlayer,
      timestamp: new Date(),
    };
    this.moveHistory.push(moveRecord);

    // Check for win condition
    if (this.checkWinCondition(playerId)) {
      this.gameStatus = "finished";
      this.winnerId = playerId;
      return { ...moveRecord, gameEnded: true, winner: playerId };
    }

    // Determine next turn (extra turn for 6 or capture)
    const extraTurn = diceValue === 6 || move.canCapture;
    if (!extraTurn) {
      this.nextTurn();
    }

    return { ...moveRecord, extraTurn, gameEnded: false };
  }

  // Capture an opponent's piece
  capturePiece(targetPlayerId, position) {
    const targetPieces = this.piecePositions[targetPlayerId];

    for (let i = 0; i < targetPieces.length; i++) {
      if (targetPieces[i] === position) {
        this.piecePositions[targetPlayerId][i] = 0; // Send back to home
        break;
      }
    }
  }

  // Check if a player has won
  checkWinCondition(playerId) {
    const playerPieces = this.piecePositions[playerId];
    const homeTarget =
      this.boardConfig.totalSquares + this.boardConfig.homeSquares;

    // All pieces must be in the final home position
    return playerPieces.every((position) => position === homeTarget);
  }

  // Check if a square is safe
  isSafeSquare(position) {
    return this.boardConfig.safeSquares.includes(position);
  }

  // Get player at a specific position (excluding specified player)
  getPlayerAtPosition(position, excludePlayerId) {
    for (const player of this.players) {
      if (player.id === excludePlayerId) continue;

      const pieces = this.piecePositions[player.id];
      if (pieces.some((piecePos) => piecePos === position)) {
        return player.id;
      }
    }
    return null;
  }

  // Check if it's a specific player's turn
  isPlayerTurn(playerId) {
    if (this.players.length === 0) return false;
    return this.players[this.currentTurn].id === playerId;
  }

  // Get player's position index
  getPlayerPosition(playerId) {
    return this.players.findIndex((player) => player.id === playerId);
  }

  // Move to next turn
  nextTurn() {
    this.currentTurn = (this.currentTurn + 1) % this.players.length;
  }

  // Get current player
  getCurrentPlayer() {
    if (this.players.length === 0) return null;
    return this.players[this.currentTurn];
  }

  // Start the game
  startGame() {
    if (this.players.length < config.game.minPlayersPerGame) {
      throw new Error("Not enough players to start game");
    }

    this.gameStatus = "playing";
    this.currentTurn = 0; // Start with first player
  }

  // Add player to the game
  addPlayer(player) {
    if (this.players.length >= config.game.maxPlayersPerGame) {
      throw new Error("Game is full");
    }

    if (this.gameStatus !== "waiting") {
      throw new Error("Cannot add players to game in progress");
    }

    this.players.push(player);
    this.piecePositions[player.id] = [0, 0, 0, 0];
  }

  // Remove player from the game
  removePlayer(playerId) {
    const playerIndex = this.players.findIndex(
      (player) => player.id === playerId
    );
    if (playerIndex === -1) return false;

    this.players.splice(playerIndex, 1);
    delete this.piecePositions[playerId];

    // Adjust current turn if necessary
    if (this.currentTurn >= this.players.length) {
      this.currentTurn = 0;
    }

    return true;
  }

  // Get game state
  getGameState() {
    return {
      gameId: this.gameId,
      players: this.players,
      currentTurn: this.currentTurn,
      currentPlayer: this.getCurrentPlayer(),
      gameStatus: this.gameStatus,
      winnerId: this.winnerId,
      piecePositions: this.piecePositions,
      lastDiceRoll: this.lastDiceRoll,
      moveHistory: this.moveHistory.slice(-10), // Last 10 moves
      boardConfig: this.boardConfig,
    };
  }

  // Get public game state (for other players)
  getPublicGameState(requestingPlayerId) {
    const state = this.getGameState();

    // Hide dice roll if it's not the requesting player's turn
    if (
      state.lastDiceRoll &&
      state.lastDiceRoll.playerId !== requestingPlayerId
    ) {
      state.lastDiceRoll = null;
    }

    return state;
  }

  // Get player statistics
  getPlayerStats(playerId) {
    const playerPieces = this.piecePositions[playerId];
    const homeTarget =
      this.boardConfig.totalSquares + this.boardConfig.homeSquares;

    const piecesHome = playerPieces.filter((pos) => pos === homeTarget).length;
    const piecesInPlay = playerPieces.filter(
      (pos) => pos > 0 && pos < homeTarget
    ).length;
    const piecesAtStart = playerPieces.filter((pos) => pos === 0).length;

    return {
      piecesHome,
      piecesInPlay,
      piecesAtStart,
      totalMoves: this.moveHistory.filter((move) => move.playerId === playerId)
        .length,
    };
  }

  // Reset the game
  reset() {
    this.currentTurn = 0;
    this.gameStatus = "waiting";
    this.winnerId = null;
    this.lastDiceRoll = null;
    this.moveHistory = [];

    // Reset all piece positions
    this.players.forEach((player) => {
      this.piecePositions[player.id] = [0, 0, 0, 0];
    });
  }

  // Validate game state
  validateGameState() {
    // Check player count
    if (
      this.players.length < config.game.minPlayersPerGame ||
      this.players.length > config.game.maxPlayersPerGame
    ) {
      return false;
    }

    // Check piece positions
    for (const playerId in this.piecePositions) {
      const pieces = this.piecePositions[playerId];
      if (pieces.length !== 4) return false;

      for (const position of pieces) {
        if (
          position < 0 ||
          position >
            this.boardConfig.totalSquares + this.boardConfig.homeSquares
        ) {
          return false;
        }
      }
    }

    return true;
  }
}

module.exports = LudoGame;
