const express = require("express");
const router = express.Router();
const gameController = require("../controllers/gameController");
const { optionalAuth } = require("../middleware/auth");
const { validateIdParam } = require("../middleware/validation");

/**
 * @route   GET /api/users/:id
 * @desc    Get public user profile
 * @access  Public (but can be enhanced with auth)
 */
router.get(
  "/:id",
  optionalAuth,
  validateIdParam,
  gameController.getPublicProfile
);

module.exports = router;
