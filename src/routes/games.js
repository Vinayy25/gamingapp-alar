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
 * @swagger
 * /api/games/create:
 *   post:
 *     summary: Create a new game
 *     description: Create a new Ludo game session
 *     tags: [Games]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               maxPlayers:
 *                 type: integer
 *                 minimum: 2
 *                 maximum: 4
 *                 example: 4
 *                 description: Maximum number of players (2-4)
 *               gameSettings:
 *                 type: object
 *                 properties:
 *                   gameMode:
 *                     type: string
 *                     example: "normal"
 *                   timeLimit:
 *                     type: integer
 *                     example: 30
 *                     description: Turn time limit in seconds
 *                 example: {"gameMode": "normal", "timeLimit": 30}
 *     responses:
 *       201:
 *         description: Game created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Game created successfully"
 *                 game:
 *                   $ref: '#/components/schemas/Game'
 *       400:
 *         description: Invalid request data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  "/create",
  authenticateToken,
  validateCreateGame,
  gameController.createGame
);

/**
 * @swagger
 * /api/games/join:
 *   post:
 *     summary: Join an existing game
 *     description: Join a game that is waiting for players
 *     tags: [Games]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - gameId
 *             properties:
 *               gameId:
 *                 type: integer
 *                 example: 1
 *                 description: ID of the game to join
 *     responses:
 *       200:
 *         description: Successfully joined game
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Joined game successfully"
 *                 game:
 *                   $ref: '#/components/schemas/Game'
 *       400:
 *         description: Game is full or invalid
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Game not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  "/join",
  authenticateToken,
  validateJoinGame,
  gameController.joinGame
);

/**
 * @swagger
 * /api/games/available:
 *   get:
 *     summary: Get available games
 *     description: Retrieve list of games waiting for players
 *     tags: [Games]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *         description: Number of games per page
 *     responses:
 *       200:
 *         description: List of available games
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 games:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Game'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     pages:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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
