const User = require("../models/User");
const { generateToken } = require("../middleware/auth");
const bcrypt = require("bcryptjs");

// Register a new user
const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findByUsername(username);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Username already exists",
      });
    }

    const existingEmail = await User.findByEmail(email);
    if (existingEmail) {
      return res.status(409).json({
        success: false,
        message: "Email already registered",
      });
    }

    // Create new user
    const user = await User.create({ username, email, password });

    // Generate JWT token
    const token = generateToken(user.id);

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: {
        user: user.toJSON(),
        token,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);

    // Handle database constraint errors
    if (error.code === "23505") {
      // PostgreSQL unique constraint violation
      if (error.constraint?.includes("username")) {
        return res.status(409).json({
          success: false,
          message: "Username already exists",
        });
      }
      if (error.constraint?.includes("email")) {
        return res.status(409).json({
          success: false,
          message: "Email already registered",
        });
      }
    }

    res.status(500).json({
      success: false,
      message: "Registration failed",
    });
  }
};

// Login user
const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Authenticate user
    const user = await User.authenticate(username, password);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid username or password",
      });
    }

    // Generate JWT token
    const token = generateToken(user.id);

    res.json({
      success: true,
      message: "Login successful",
      data: {
        user: user.toJSON(),
        token,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Login failed",
    });
  }
};

// Get current user profile
const getProfile = async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        user: req.user.toJSON(),
      },
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get profile",
    });
  }
};

// Update user profile
const updateProfile = async (req, res) => {
  try {
    const { username, email } = req.body;
    const userId = req.userId;

    // Check if username is taken by another user
    if (username && username !== req.user.username) {
      const existingUser = await User.findByUsername(username);
      if (existingUser && existingUser.id !== userId) {
        return res.status(409).json({
          success: false,
          message: "Username already exists",
        });
      }
    }

    // Check if email is taken by another user
    if (email && email !== req.user.email) {
      const existingEmail = await User.findByEmail(email);
      if (existingEmail && existingEmail.id !== userId) {
        return res.status(409).json({
          success: false,
          message: "Email already registered",
        });
      }
    }

    // Update user
    const updatedUser = await req.user.update({
      username: username || req.user.username,
      email: email || req.user.email,
    });

    res.json({
      success: true,
      message: "Profile updated successfully",
      data: {
        user: updatedUser.toJSON(),
      },
    });
  } catch (error) {
    console.error("Update profile error:", error);

    // Handle database constraint errors
    if (error.code === "23505") {
      if (error.constraint?.includes("username")) {
        return res.status(409).json({
          success: false,
          message: "Username already exists",
        });
      }
      if (error.constraint?.includes("email")) {
        return res.status(409).json({
          success: false,
          message: "Email already registered",
        });
      }
    }

    res.status(500).json({
      success: false,
      message: "Failed to update profile",
    });
  }
};

// Change password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Verify current password
    const isValidPassword = await bcrypt.compare(
      currentPassword,
      req.user.password_hash
    );
    if (!isValidPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    // Check if new password is different
    if (currentPassword === newPassword) {
      return res.status(400).json({
        success: false,
        message: "New password must be different from current password",
      });
    }

    // Update password
    await req.user.updatePassword(newPassword);

    res.json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to change password",
    });
  }
};

// Get user game history
const getGameHistory = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const gameHistory = await req.user.getGameHistory(limit, offset);

    res.json({
      success: true,
      data: {
        games: gameHistory,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: gameHistory.length,
        },
      },
    });
  } catch (error) {
    console.error("Get game history error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get game history",
    });
  }
};

// Get user statistics
const getStats = async (req, res) => {
  try {
    const user = req.user;

    const stats = {
      totalGamesPlayed: user.total_games_played,
      totalGamesWon: user.total_games_won,
      winRate: user.getWinRate(),
      joinDate: user.created_at,
      lastLogin: user.last_login,
    };

    res.json({
      success: true,
      data: {
        stats,
      },
    });
  } catch (error) {
    console.error("Get stats error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get statistics",
    });
  }
};

// Get public user profile (for other users to see)
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

// Deactivate user account
const deactivateAccount = async (req, res) => {
  try {
    await req.user.deactivate();

    res.json({
      success: true,
      message: "Account deactivated successfully",
    });
  } catch (error) {
    console.error("Deactivate account error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to deactivate account",
    });
  }
};

// Refresh token (optional endpoint for token renewal)
const refreshToken = async (req, res) => {
  try {
    // Generate new token for authenticated user
    const token = generateToken(req.userId);

    res.json({
      success: true,
      message: "Token refreshed successfully",
      data: {
        token,
      },
    });
  } catch (error) {
    console.error("Refresh token error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to refresh token",
    });
  }
};

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  getGameHistory,
  getStats,
  getPublicProfile,
  deactivateAccount,
  refreshToken,
};
