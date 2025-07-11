const Game = require("../models/Game");
const User = require("../models/User");

// Create a new game
const createGame = async (req, res) => {
  try {
    const { maxPlayers = 4, gameSettings = {} } = req.body;
    const userId = req.userId;

    // Create new game
    const game = await Game.create({ maxPlayers, gameSettings });

    // Add creator as first player
    await game.addPlayer(userId);

    // Get game with player information
    const gameWithPlayers = await Game.findById(game.id);
    const players = await gameWithPlayers.getPlayers();

    res.status(201).json({
      success: true,
      message: "Game created successfully",
      data: {
        game: {
          ...gameWithPlayers.toJSON(),
          players,
        },
      },
    });
  } catch (error) {
    console.error("Create game error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create game",
    });
  }
};

// Join an existing game
const joinGame = async (req, res) => {
  try {
    const { gameId } = req.body;
    const userId = req.userId;

    // Find the game
    const game = await Game.findById(gameId);
    if (!game) {
      return res.status(404).json({
        success: false,
        message: "Game not found",
      });
    }

    // Check game status
    if (game.status !== "waiting") {
      return res.status(400).json({
        success: false,
        message: "Cannot join game that is not waiting for players",
      });
    }

    // Check if game is full
    if (game.isFull()) {
      return res.status(400).json({
        success: false,
        message: "Game is full",
      });
    }

    // Check if user is already in the game
    const existingPlayer = await game.getPlayer(userId);
    if (existingPlayer) {
      return res.status(400).json({
        success: false,
        message: "You are already in this game",
      });
    }

    // Add player to game
    await game.addPlayer(userId);

    // Get updated game with players
    const updatedGame = await Game.findById(gameId);
    const players = await updatedGame.getPlayers();

    res.json({
      success: true,
      message: "Joined game successfully",
      data: {
        game: {
          ...updatedGame.toJSON(),
          players,
        },
      },
    });
  } catch (error) {
    console.error("Join game error:", error);

    if (
      error.message === "Game is full" ||
      error.message === "Player already in game"
    ) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to join game",
    });
  }
};

// Leave a game
const leaveGame = async (req, res) => {
  try {
    const { id: gameId } = req.params;
    const userId = req.userId;

    // Find the game
    const game = await Game.findById(gameId);
    if (!game) {
      return res.status(404).json({
        success: false,
        message: "Game not found",
      });
    }

    // Check if user is in the game
    const player = await game.getPlayer(userId);
    if (!player) {
      return res.status(400).json({
        success: false,
        message: "You are not in this game",
      });
    }

    // Can only leave if game is waiting or if disconnected during play
    if (game.status === "playing") {
      // Mark as disconnected instead of removing
      await game.updatePlayerConnection(userId, false);

      res.json({
        success: true,
        message: "Marked as disconnected from game",
      });
    } else {
      // Remove player from waiting game
      await game.removePlayer(userId);

      res.json({
        success: true,
        message: "Left game successfully",
      });
    }
  } catch (error) {
    console.error("Leave game error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to leave game",
    });
  }
};

// Get list of available games
const getAvailableGames = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const games = await Game.getAvailableGames(limit, offset);

    res.json({
      success: true,
      data: {
        games,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: games.length,
        },
      },
    });
  } catch (error) {
    console.error("Get available games error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get available games",
    });
  }
};

// Get user's games
const getUserGames = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const userId = req.userId;
    const offset = (page - 1) * limit;

    const games = await Game.getGamesByUserId(userId, status, limit, offset);

    res.json({
      success: true,
      data: {
        games: games.map((game) => game.toJSON()),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: games.length,
        },
      },
    });
  } catch (error) {
    console.error("Get user games error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get user games",
    });
  }
};

// Get specific game details
const getGame = async (req, res) => {
  try {
    const { id: gameId } = req.params;
    const userId = req.userId;

    // Find the game
    const game = await Game.findById(gameId);
    if (!game) {
      return res.status(404).json({
        success: false,
        message: "Game not found",
      });
    }

    // Check if user is in the game
    const player = await game.getPlayer(userId);
    if (!player) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to view this game",
      });
    }

    // Get game with players
    const players = await game.getPlayers();

    res.json({
      success: true,
      data: {
        game: {
          ...game.toJSON(),
          players,
          currentPlayer: player,
        },
      },
    });
  } catch (error) {
    console.error("Get game error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get game details",
    });
  }
};

// Start a game (if user is in the game and enough players)
const startGame = async (req, res) => {
  try {
    const { id: gameId } = req.params;
    const userId = req.userId;

    // Find the game
    const game = await Game.findById(gameId);
    if (!game) {
      return res.status(404).json({
        success: false,
        message: "Game not found",
      });
    }

    // Check if user is in the game
    const player = await game.getPlayer(userId);
    if (!player) {
      return res.status(403).json({
        success: false,
        message: "You are not in this game",
      });
    }

    // Check if game can be started
    if (!game.canStart()) {
      return res.status(400).json({
        success: false,
        message: "Game cannot be started (not enough players or wrong status)",
      });
    }

    // Start the game
    await game.startGame();

    // Get updated game
    const updatedGame = await Game.findById(gameId);
    const players = await updatedGame.getPlayers();

    res.json({
      success: true,
      message: "Game started successfully",
      data: {
        game: {
          ...updatedGame.toJSON(),
          players,
        },
      },
    });
  } catch (error) {
    console.error("Start game error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to start game",
    });
  }
};

// Get public user profile for game context
const getPublicProfile = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      data: {
        user: user.toPublicJSON(),
      },
    });
  } catch (error) {
    console.error("Get public profile error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get user profile",
    });
  }
};

// Get game statistics
const getGameStats = async (req, res) => {
  try {
    // Get overall game statistics
    const stats = {
      totalGames: 0,
      activeGames: 0,
      waitingGames: 0,
      finishedGames: 0,
    };

    // You could implement more detailed statistics here
    // For now, return basic structure

    res.json({
      success: true,
      data: {
        stats,
      },
    });
  } catch (error) {
    console.error("Get game stats error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get game statistics",
    });
  }
};

module.exports = {
  createGame,
  joinGame,
  leaveGame,
  getAvailableGames,
  getUserGames,
  getGame,
  startGame,
  getPublicProfile,
  getGameStats,
};
