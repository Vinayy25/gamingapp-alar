const db = require("../config/database");
const config = require("../config/app");

class Game {
  constructor(data) {
    this.id = data.id;
    this.status = data.status;
    this.created_at = data.created_at;
    this.started_at = data.started_at;
    this.finished_at = data.finished_at;
    this.winner_id = data.winner_id;
    this.max_players = data.max_players;
    this.current_players = data.current_players;
    this.current_turn = data.current_turn;
    this.game_settings = data.game_settings || {};
    this.total_turns = data.total_turns;
  }

  // Create a new game
  static async create({ maxPlayers = 4, gameSettings = {} }) {
    try {
      const query = `
        INSERT INTO games (max_players, game_settings)
        VALUES ($1, $2)
        RETURNING *
      `;

      const result = await db.query(query, [
        maxPlayers,
        JSON.stringify(gameSettings),
      ]);
      return new Game(result.rows[0]);
    } catch (error) {
      throw error;
    }
  }

  // Find game by ID
  static async findById(id) {
    try {
      const query = `
        SELECT * FROM games WHERE id = $1
      `;

      const result = await db.query(query, [id]);
      return result.rows.length > 0 ? new Game(result.rows[0]) : null;
    } catch (error) {
      throw error;
    }
  }

  // Get available games (waiting for players)
  static async getAvailableGames(limit = 10, offset = 0) {
    try {
      const query = `
        SELECT g.*, 
               COUNT(gp.user_id) as current_players,
               ARRAY_AGG(
                 CASE WHEN gp.user_id IS NOT NULL 
                 THEN json_build_object('username', u.username, 'color', gp.color, 'position', gp.position)
                 ELSE NULL END
               ) FILTER (WHERE gp.user_id IS NOT NULL) as players
        FROM games g
        LEFT JOIN game_players gp ON g.id = gp.game_id
        LEFT JOIN users u ON gp.user_id = u.id
        WHERE g.status = 'waiting'
        GROUP BY g.id
        HAVING COUNT(gp.user_id) < g.max_players
        ORDER BY g.created_at DESC
        LIMIT $1 OFFSET $2
      `;

      const result = await db.query(query, [limit, offset]);
      return result.rows.map((row) => ({
        ...new Game(row),
        players: row.players || [],
      }));
    } catch (error) {
      throw error;
    }
  }

  // Get games by user ID
  static async getGamesByUserId(userId, status = null, limit = 10, offset = 0) {
    try {
      let query = `
        SELECT g.*, gp.position, gp.color, gp.is_connected
        FROM games g
        JOIN game_players gp ON g.id = gp.game_id
        WHERE gp.user_id = $1
      `;

      const params = [userId];

      if (status) {
        query += " AND g.status = $2";
        params.push(status);
      }

      query +=
        " ORDER BY g.created_at DESC LIMIT $" +
        (params.length + 1) +
        " OFFSET $" +
        (params.length + 2);
      params.push(limit, offset);

      const result = await db.query(query, params);
      return result.rows.map((row) => new Game(row));
    } catch (error) {
      throw error;
    }
  }

  // Add player to game
  async addPlayer(userId) {
    try {
      // Check if game is full
      if (this.current_players >= this.max_players) {
        throw new Error("Game is full");
      }

      // Check if player is already in the game
      const existingPlayer = await this.getPlayer(userId);
      if (existingPlayer) {
        throw new Error("Player already in game");
      }

      // Get available position and color
      const availableSlot = await this.getAvailableSlot();
      if (!availableSlot) {
        throw new Error("No available slots");
      }

      const query = `
        INSERT INTO game_players (game_id, user_id, position, color)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `;

      const result = await db.query(query, [
        this.id,
        userId,
        availableSlot.position,
        availableSlot.color,
      ]);

      // Update game's current player count
      await this.updatePlayerCount();

      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Remove player from game
  async removePlayer(userId) {
    try {
      const query = `
        DELETE FROM game_players 
        WHERE game_id = $1 AND user_id = $2
        RETURNING *
      `;

      const result = await db.query(query, [this.id, userId]);

      if (result.rows.length > 0) {
        await this.updatePlayerCount();

        // If no players left, cancel the game
        if (this.current_players === 0 && this.status === "waiting") {
          await this.updateStatus("cancelled");
        }
      }

      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Get player in game
  async getPlayer(userId) {
    try {
      const query = `
        SELECT gp.*, u.username 
        FROM game_players gp
        JOIN users u ON gp.user_id = u.id
        WHERE gp.game_id = $1 AND gp.user_id = $2
      `;

      const result = await db.query(query, [this.id, userId]);
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      throw error;
    }
  }

  // Get all players in game
  async getPlayers() {
    try {
      const query = `
        SELECT gp.*, u.username 
        FROM game_players gp
        JOIN users u ON gp.user_id = u.id
        WHERE gp.game_id = $1
        ORDER BY gp.position
      `;

      const result = await db.query(query, [this.id]);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Get available slot (position and color)
  async getAvailableSlot() {
    try {
      const usedSlots = await db.query(
        "SELECT position, color FROM game_players WHERE game_id = $1",
        [this.id]
      );

      const usedPositions = usedSlots.rows.map((row) => row.position);
      const usedColors = usedSlots.rows.map((row) => row.color);

      const colors = ["red", "blue", "green", "yellow"];

      for (let position = 0; position < this.max_players; position++) {
        if (!usedPositions.includes(position)) {
          const color = colors[position];
          if (!usedColors.includes(color)) {
            return { position, color };
          }
        }
      }

      return null;
    } catch (error) {
      throw error;
    }
  }

  // Update player count
  async updatePlayerCount() {
    try {
      const countQuery = `
        SELECT COUNT(*) as count FROM game_players WHERE game_id = $1
      `;

      const countResult = await db.query(countQuery, [this.id]);
      const playerCount = parseInt(countResult.rows[0].count);

      const updateQuery = `
        UPDATE games 
        SET current_players = $1 
        WHERE id = $2
      `;

      await db.query(updateQuery, [playerCount, this.id]);
      this.current_players = playerCount;

      // Auto-start game if enough players
      if (
        playerCount >= config.game.minPlayersPerGame &&
        this.status === "waiting"
      ) {
        await this.startGame();
      }
    } catch (error) {
      throw error;
    }
  }

  // Start the game
  async startGame() {
    try {
      const query = `
        UPDATE games 
        SET status = 'playing', started_at = CURRENT_TIMESTAMP, current_turn = 0
        WHERE id = $1 AND status = 'waiting'
        RETURNING *
      `;

      const result = await db.query(query, [this.id]);
      if (result.rows.length > 0) {
        Object.assign(this, result.rows[0]);
      }
    } catch (error) {
      throw error;
    }
  }

  // Update game status
  async updateStatus(status) {
    try {
      let query = `UPDATE games SET status = $1`;
      const params = [status, this.id];

      if (status === "finished") {
        query += ", finished_at = CURRENT_TIMESTAMP";
      }

      query += " WHERE id = $2 RETURNING *";

      const result = await db.query(query, params);
      if (result.rows.length > 0) {
        Object.assign(this, result.rows[0]);
      }
    } catch (error) {
      throw error;
    }
  }

  // Set game winner
  async setWinner(winnerId) {
    try {
      const query = `
        UPDATE games 
        SET winner_id = $1, status = 'finished', finished_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
      `;

      const result = await db.query(query, [winnerId, this.id]);
      if (result.rows.length > 0) {
        Object.assign(this, result.rows[0]);
      }
    } catch (error) {
      throw error;
    }
  }

  // Update player connection status
  async updatePlayerConnection(userId, isConnected) {
    try {
      const query = `
        UPDATE game_players 
        SET is_connected = $1, last_action_at = CURRENT_TIMESTAMP
        WHERE game_id = $2 AND user_id = $3
      `;

      await db.query(query, [isConnected, this.id, userId]);
    } catch (error) {
      throw error;
    }
  }

  // Update current turn
  async updateTurn(turn) {
    try {
      const query = `
        UPDATE games 
        SET current_turn = $1, total_turns = total_turns + 1
        WHERE id = $2
      `;

      await db.query(query, [turn, this.id]);
      this.current_turn = turn;
      this.total_turns = (this.total_turns || 0) + 1;
    } catch (error) {
      throw error;
    }
  }

  // Record game result for a player
  async recordPlayerResult(playerId, result, score = 0, piecesHome = 0) {
    try {
      const query = `
        INSERT INTO game_results (game_id, player_id, final_position, result, score, pieces_home)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (game_id, player_id) 
        DO UPDATE SET result = $4, score = $5, pieces_home = $6
        RETURNING *
      `;

      // Calculate final position based on pieces home
      const finalPosition = this.current_players - piecesHome;

      const resultData = await db.query(query, [
        this.id,
        playerId,
        finalPosition,
        result,
        score,
        piecesHome,
      ]);

      return resultData.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Check if game can be started
  canStart() {
    return (
      this.status === "waiting" &&
      this.current_players >= config.game.minPlayersPerGame &&
      this.current_players <= this.max_players
    );
  }

  // Check if game is full
  isFull() {
    return this.current_players >= this.max_players;
  }

  // Get game duration
  getDuration() {
    if (!this.started_at) return null;

    const endTime = this.finished_at || new Date();
    return endTime.getTime() - new Date(this.started_at).getTime();
  }

  // Convert to JSON for API responses
  toJSON() {
    return {
      id: this.id,
      status: this.status,
      created_at: this.created_at,
      started_at: this.started_at,
      finished_at: this.finished_at,
      winner_id: this.winner_id,
      max_players: this.max_players,
      current_players: this.current_players,
      current_turn: this.current_turn,
      game_settings: this.game_settings,
      total_turns: this.total_turns,
      duration: this.getDuration(),
    };
  }
}

module.exports = Game;
