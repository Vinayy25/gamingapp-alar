const winston = require("winston");
const path = require("path");
const config = require("../config/app");

// Create logs directory if it doesn't exist
const fs = require("fs");
const logDir = "logs";
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: "YYYY-MM-DD HH:mm:ss",
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    return `${timestamp} [${level.toUpperCase()}]: ${message} ${
      Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ""
    }`;
  })
);

// Create logger instance
const logger = winston.createLogger({
  level: config.logging.level,
  format: logFormat,
  defaultMeta: {
    service: "ludo-game-backend",
    environment: config.server.environment,
  },
  transports: [
    // Error logs
    new winston.transports.File({
      filename: path.join(logDir, "error.log"),
      level: "error",
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
    }),

    // Combined logs
    new winston.transports.File({
      filename: path.join(logDir, "combined.log"),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
    }),

    // Game-specific logs
    new winston.transports.File({
      filename: path.join(logDir, "game.log"),
      level: "info",
      maxsize: 5242880, // 5MB
      maxFiles: 3,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
    }),
  ],

  // Handle uncaught exceptions and rejections
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logDir, "exceptions.log"),
    }),
  ],

  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logDir, "rejections.log"),
    }),
  ],
});

// Add console transport for development
if (config.server.environment !== "production") {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          return `${timestamp} [${level}]: ${message} ${
            Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ""
          }`;
        })
      ),
    })
  );
}

// Add custom logging methods for game events
logger.gameEvent = (event, data) => {
  logger.info(`Game Event: ${event}`, {
    event,
    ...data,
    category: "game",
  });
};

logger.userAction = (action, userId, data = {}) => {
  logger.info(`User Action: ${action}`, {
    action,
    userId,
    ...data,
    category: "user",
  });
};

logger.socketEvent = (event, socketId, data = {}) => {
  logger.info(`Socket Event: ${event}`, {
    event,
    socketId,
    ...data,
    category: "socket",
  });
};

logger.dbQuery = (query, duration, result = {}) => {
  logger.debug(`Database Query`, {
    query: query.substring(0, 100) + (query.length > 100 ? "..." : ""),
    duration,
    rowCount: result.rowCount || 0,
    category: "database",
  });
};

logger.apiRequest = (method, path, statusCode, duration, userId = null) => {
  logger.info(`API Request`, {
    method,
    path,
    statusCode,
    duration,
    userId,
    category: "api",
  });
};

// Security-related logging
logger.security = (event, details) => {
  logger.warn(`Security Event: ${event}`, {
    event,
    ...details,
    category: "security",
  });
};

module.exports = logger;
