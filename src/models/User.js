const db = require("../config/database");
const bcrypt = require("bcryptjs");

class User {
  constructor(data) {
    this.id = data.id;
    this.username = data.username;
    this.email = data.email;
    this.password_hash = data.password_hash;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
    this.is_active = data.is_active;
    this.last_login = data.last_login;
    this.total_games_played = data.total_games_played || 0;
    this.total_games_won = data.total_games_won || 0;
  }

  // Create a new user
  static async create({ username, email, password }) {
    try {
      // Hash password
      const saltRounds = 10;
      const password_hash = await bcrypt.hash(password, saltRounds);

      const query = `
        INSERT INTO users (username, email, password_hash)
        VALUES ($1, $2, $3)
        RETURNING id, username, email, created_at, is_active, total_games_played, total_games_won
      `;

      const result = await db.query(query, [username, email, password_hash]);
      return new User(result.rows[0]);
    } catch (error) {
      throw error;
    }
  }

  // Find user by ID
  static async findById(id) {
    try {
      const query = `
        SELECT id, username, email, created_at, updated_at, is_active, 
               last_login, total_games_played, total_games_won
        FROM users 
        WHERE id = $1 AND is_active = true
      `;

      const result = await db.query(query, [id]);
      return result.rows.length > 0 ? new User(result.rows[0]) : null;
    } catch (error) {
      throw error;
    }
  }

  // Find user by username
  static async findByUsername(username) {
    try {
      const query = `
        SELECT * FROM users 
        WHERE username = $1 AND is_active = true
      `;

      const result = await db.query(query, [username]);
      return result.rows.length > 0 ? new User(result.rows[0]) : null;
    } catch (error) {
      throw error;
    }
  }

  // Find user by email
  static async findByEmail(email) {
    try {
      const query = `
        SELECT * FROM users 
        WHERE email = $1 AND is_active = true
      `;

      const result = await db.query(query, [email]);
      return result.rows.length > 0 ? new User(result.rows[0]) : null;
    } catch (error) {
      throw error;
    }
  }

  // Authenticate user
  static async authenticate(username, password) {
    try {
      const user = await User.findByUsername(username);
      if (!user) {
        return null;
      }

      const isValidPassword = await bcrypt.compare(
        password,
        user.password_hash
      );
      if (!isValidPassword) {
        return null;
      }

      // Update last login
      await user.updateLastLogin();
      return user;
    } catch (error) {
      throw error;
    }
  }

  // Update last login timestamp
  async updateLastLogin() {
    try {
      const query = `
        UPDATE users 
        SET last_login = CURRENT_TIMESTAMP 
        WHERE id = $1
      `;

      await db.query(query, [this.id]);
      this.last_login = new Date();
    } catch (error) {
      throw error;
    }
  }

  // Update user profile
  async update({ username, email }) {
    try {
      const query = `
        UPDATE users 
        SET username = $1, email = $2, updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
        RETURNING username, email, updated_at
      `;

      const result = await db.query(query, [username, email, this.id]);
      if (result.rows.length > 0) {
        this.username = result.rows[0].username;
        this.email = result.rows[0].email;
        this.updated_at = result.rows[0].updated_at;
      }
      return this;
    } catch (error) {
      throw error;
    }
  }

  // Update password
  async updatePassword(newPassword) {
    try {
      const saltRounds = 10;
      const password_hash = await bcrypt.hash(newPassword, saltRounds);

      const query = `
        UPDATE users 
        SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `;

      await db.query(query, [password_hash, this.id]);
      this.password_hash = password_hash;
    } catch (error) {
      throw error;
    }
  }

  // Update game statistics
  async updateGameStats(won = false) {
    try {
      const query = `
        UPDATE users 
        SET total_games_played = total_games_played + 1,
            total_games_won = total_games_won + $1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING total_games_played, total_games_won
      `;

      const result = await db.query(query, [won ? 1 : 0, this.id]);
      if (result.rows.length > 0) {
        this.total_games_played = result.rows[0].total_games_played;
        this.total_games_won = result.rows[0].total_games_won;
      }
    } catch (error) {
      throw error;
    }
  }

  // Get user's game history
  async getGameHistory(limit = 10, offset = 0) {
    try {
      const query = `
        SELECT g.id, g.status, g.created_at, g.finished_at, g.winner_id,
               gp.position, gp.color, gr.result, gr.score, gr.pieces_home
        FROM games g
        JOIN game_players gp ON g.id = gp.game_id
        LEFT JOIN game_results gr ON g.id = gr.game_id AND gp.user_id = gr.player_id
        WHERE gp.user_id = $1
        ORDER BY g.created_at DESC
        LIMIT $2 OFFSET $3
      `;

      const result = await db.query(query, [this.id, limit, offset]);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Deactivate user account
  async deactivate() {
    try {
      const query = `
        UPDATE users 
        SET is_active = false, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `;

      await db.query(query, [this.id]);
      this.is_active = false;
    } catch (error) {
      throw error;
    }
  }

  // Get user's win rate
  getWinRate() {
    if (this.total_games_played === 0) return 0;
    return (this.total_games_won / this.total_games_played) * 100;
  }

  // Get public user data (without sensitive information)
  toPublicJSON() {
    return {
      id: this.id,
      username: this.username,
      created_at: this.created_at,
      total_games_played: this.total_games_played,
      total_games_won: this.total_games_won,
      win_rate: this.getWinRate(),
    };
  }

  // Get full user data (for authenticated user)
  toJSON() {
    return {
      id: this.id,
      username: this.username,
      email: this.email,
      created_at: this.created_at,
      updated_at: this.updated_at,
      last_login: this.last_login,
      total_games_played: this.total_games_played,
      total_games_won: this.total_games_won,
      win_rate: this.getWinRate(),
    };
  }
}

module.exports = User;
