require("dotenv").config();
const db = require("../config/database");

const createTables = async () => {
  try {
    console.log("Starting database migration...");

    // Create Users table
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT true,
        last_login TIMESTAMP,
        total_games_played INTEGER DEFAULT 0,
        total_games_won INTEGER DEFAULT 0
      );
    `);
    console.log("✓ Users table created");

    // Create Games table
    await db.query(`
      CREATE TABLE IF NOT EXISTS games (
        id SERIAL PRIMARY KEY,
        status VARCHAR(20) NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'playing', 'finished', 'cancelled')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        started_at TIMESTAMP,
        finished_at TIMESTAMP,
        winner_id INTEGER REFERENCES users(id),
        max_players INTEGER DEFAULT 4 CHECK (max_players BETWEEN 2 AND 4),
        current_players INTEGER DEFAULT 0,
        current_turn INTEGER DEFAULT 0,
        game_settings JSONB DEFAULT '{}',
        total_turns INTEGER DEFAULT 0
      );
    `);
    console.log("✓ Games table created");

    // Create Game_Players table
    await db.query(`
      CREATE TABLE IF NOT EXISTS game_players (
        id SERIAL PRIMARY KEY,
        game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id),
        position INTEGER NOT NULL CHECK (position BETWEEN 0 AND 3),
        color VARCHAR(10) NOT NULL CHECK (color IN ('red', 'blue', 'green', 'yellow')),
        piece_positions JSONB NOT NULL DEFAULT '[0, 0, 0, 0]',
        is_connected BOOLEAN DEFAULT true,
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_action_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(game_id, user_id),
        UNIQUE(game_id, position),
        UNIQUE(game_id, color)
      );
    `);
    console.log("✓ Game_Players table created");

    // Create Game_Results table
    await db.query(`
      CREATE TABLE IF NOT EXISTS game_results (
        id SERIAL PRIMARY KEY,
        game_id INTEGER NOT NULL REFERENCES games(id),
        player_id INTEGER NOT NULL REFERENCES users(id),
        final_position INTEGER NOT NULL,
        result VARCHAR(10) NOT NULL CHECK (result IN ('win', 'loss')),
        score INTEGER DEFAULT 0,
        pieces_home INTEGER DEFAULT 0,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✓ Game_Results table created");

    // Create Game_Moves table for move history
    await db.query(`
      CREATE TABLE IF NOT EXISTS game_moves (
        id SERIAL PRIMARY KEY,
        game_id INTEGER NOT NULL REFERENCES games(id),
        player_id INTEGER NOT NULL REFERENCES users(id),
        move_number INTEGER NOT NULL,
        dice_roll INTEGER NOT NULL CHECK (dice_roll BETWEEN 1 AND 6),
        piece_moved INTEGER CHECK (piece_moved BETWEEN 0 AND 3),
        from_position INTEGER,
        to_position INTEGER,
        captured_piece BOOLEAN DEFAULT false,
        captured_player_id INTEGER REFERENCES users(id),
        extra_turn BOOLEAN DEFAULT false,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✓ Game_Moves table created");

    // Create indexes for better performance
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);
      CREATE INDEX IF NOT EXISTS idx_games_created_at ON games(created_at);
      CREATE INDEX IF NOT EXISTS idx_game_players_game_id ON game_players(game_id);
      CREATE INDEX IF NOT EXISTS idx_game_players_user_id ON game_players(user_id);
      CREATE INDEX IF NOT EXISTS idx_game_results_game_id ON game_results(game_id);
      CREATE INDEX IF NOT EXISTS idx_game_results_player_id ON game_results(player_id);
      CREATE INDEX IF NOT EXISTS idx_game_moves_game_id ON game_moves(game_id);
    `);
    console.log("✓ Database indexes created");

    // Create trigger to update updated_at timestamp
    await db.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ language 'plpgsql';

      DROP TRIGGER IF EXISTS update_users_updated_at ON users;
      CREATE TRIGGER update_users_updated_at
          BEFORE UPDATE ON users
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();
    `);
    console.log("✓ Database triggers created");

    console.log("✅ Database migration completed successfully!");
  } catch (error) {
    console.error("❌ Database migration failed:", error);
    throw error;
  }
};

const dropTables = async () => {
  try {
    console.log("Dropping all tables...");

    await db.query("DROP TABLE IF EXISTS game_moves CASCADE;");
    await db.query("DROP TABLE IF EXISTS game_results CASCADE;");
    await db.query("DROP TABLE IF EXISTS game_players CASCADE;");
    await db.query("DROP TABLE IF EXISTS games CASCADE;");
    await db.query("DROP TABLE IF EXISTS users CASCADE;");
    await db.query(
      "DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;"
    );

    console.log("✅ All tables dropped successfully!");
  } catch (error) {
    console.error("❌ Failed to drop tables:", error);
    throw error;
  }
};

// Command line interface
const command = process.argv[2];

const main = async () => {
  try {
    if (command === "drop") {
      await dropTables();
    } else if (command === "reset") {
      await dropTables();
      await createTables();
    } else {
      await createTables();
    }
  } catch (error) {
    console.error("Migration error:", error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
};

if (require.main === module) {
  main();
}

module.exports = { createTables, dropTables };
