require("dotenv").config();

const config = {
  // Server Configuration
  server: {
    port: parseInt(process.env.PORT) || 3000,
    environment: process.env.NODE_ENV || "development",
    host: process.env.HOST || "localhost",
  },

  // Database Configuration
  database: {
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT) || 5432,
    name: process.env.DB_NAME || "ludo_game",
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "your_password_here",
  },

  // Redis Configuration
  redis: {
    url: process.env.REDIS_URL || "redis://localhost:6379",
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT) || 6379,
  },

  // JWT Configuration
  jwt: {
    secret:
      process.env.JWT_SECRET ||
      "your_super_secret_jwt_key_here_change_this_in_production",
    expiresIn: process.env.JWT_EXPIRES_IN || "24h",
  },

  // CORS Configuration
  cors: {
    origins: process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(",")
      : ["http://localhost:3000", "http://localhost:8080"],
  },

  // Rate Limiting Configuration
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  },

  // Game Configuration
  game: {
    maxPlayersPerGame: parseInt(process.env.MAX_PLAYERS_PER_GAME) || 4,
    minPlayersPerGame: parseInt(process.env.MIN_PLAYERS_PER_GAME) || 2,
    gameTimeoutMs: parseInt(process.env.GAME_TIMEOUT_MS) || 5 * 60 * 1000, // 5 minutes
    turnTimeoutMs: parseInt(process.env.TURN_TIMEOUT_MS) || 30 * 1000, // 30 seconds
    reconnectTimeoutMs: parseInt(process.env.RECONNECT_TIMEOUT_MS) || 60 * 1000, // 1 minute
  },

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || "info",
    file: process.env.LOG_FILE || "logs/app.log",
  },
};

// Validate required environment variables in production
if (config.server.environment === "production") {
  const requiredVars = ["JWT_SECRET", "DB_PASSWORD"];

  const missingVars = requiredVars.filter((varName) => !process.env[varName]);

  if (missingVars.length > 0) {
    console.error("Missing required environment variables:", missingVars);
    process.exit(1);
  }
}

module.exports = config;
