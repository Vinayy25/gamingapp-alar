const express = require("express");
const router = express.Router();
const gameController = require("../controllers/gameController");
const { authenticateToken } = require("../middleware/auth");
const {
  validateCreateGame,
  validateJoinGame,
  validateGameList,
  validateIdParam,
} = require("../middleware/validation");

/**
 * @route   POST /api/games/create
 * @desc    Create a new game
 * @access  Private
 */
router.post(
  "/create",
  authenticateToken,
  validateCreateGame,
  gameController.createGame
);

/**
 * @route   POST /api/games/join
 * @desc    Join an existing game
 * @access  Private
 */
router.post(
  "/join",
  authenticateToken,
  validateJoinGame,
  gameController.joinGame
);

/**
 * @route   GET /api/games/available
 * @desc    Get list of available games (waiting for players)
 * @access  Private
 */
router.get(
  "/available",
  authenticateToken,
  validateGameList,
  gameController.getAvailableGames
);

/**
 * @route   GET /api/games/my-games
 * @desc    Get current user's games
 * @access  Private
 */
router.get(
  "/my-games",
  authenticateToken,
  validateGameList,
  gameController.getUserGames
);

/**
 * @route   GET /api/games/stats
 * @desc    Get overall game statistics
 * @access  Private
 */
router.get("/stats", authenticateToken, gameController.getGameStats);

/**
 * @route   GET /api/games/:id
 * @desc    Get specific game details
 * @access  Private
 */
router.get("/:id", authenticateToken, validateIdParam, gameController.getGame);

/**
 * @route   POST /api/games/:id/start
 * @desc    Start a game
 * @access  Private
 */
router.post(
  "/:id/start",
  authenticateToken,
  validateIdParam,
  gameController.startGame
);

/**
 * @route   DELETE /api/games/:id/leave
 * @desc    Leave a game
 * @access  Private
 */
router.delete(
  "/:id/leave",
  authenticateToken,
  validateIdParam,
  gameController.leaveGame
);

module.exports = router;
