require("dotenv").config();

const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

// Import configuration
const config = require("./config/app");
const { connectRedis } = require("./config/redis");
const { swaggerServe, swaggerSetup } = require("./config/swagger");

// Import routes
const authRoutes = require("./routes/auth");
const gameRoutes = require("./routes/games");
const userRoutes = require("./routes/users");

// Import services
const GameService = require("./services/GameService");
const SocketService = require("./services/SocketService");

// Import utilities
const logger = require("./utils/logger");
// const { errorHandler } = require("./middleware/errorHandler"); // Temporarily disabled

// Simple inline error handler
const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Something went wrong";

  logger.error("Error:", {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
  });

  res.status(statusCode).json({
    success: false,
    message: message,
    timestamp: new Date().toISOString(),
  });
};

// Create Express app
const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
const io = socketIo(server, {
  cors: {
    origin: config.cors.origins,
    methods: ["GET", "POST"],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  })
);

// CORS middleware
app.use(
  cors({
    origin: config.cors.origins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: {
    success: false,
    message: "Too many requests from this IP, please try again later",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api", limiter);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    logger.info(
      `${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`,
      {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration,
        userAgent: req.get("User-Agent"),
        ip: req.ip,
      }
    );
  });

  next();
});

// Health check endpoint
app.get("/health", (req, res) => {
  const redisStatus =
    process.env.SKIP_REDIS === "true"
      ? "disabled"
      : "enabled (may not be connected)";

  res.json({
    success: true,
    status: "healthy",
    message: "Server is running",
    timestamp: new Date().toISOString(),
    environment: config.server.environment,
    version: process.env.npm_package_version || "1.0.0",
    redis: redisStatus,
    database: "connected", // PostgreSQL is required for server to start
    services: {
      api: "operational",
      websocket: "operational",
      gameLogic: "operational",
    },
  });
});

// Swagger API Documentation
app.use("/api-docs", swaggerServe, swaggerSetup);

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/games", gameRoutes);
app.use("/api/users", userRoutes);

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Ludo Game Backend API",
    version: "1.0.0",
    documentation: "/api-docs",
    health: "/health",
    endpoints: {
      auth: "/api/auth",
      games: "/api/games",
      users: "/api/users",
    },
  });
});

// 404 handler for API routes
app.use("/api/*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "API endpoint not found",
  });
});

// Global error handler
app.use(errorHandler);

// Initialize services
const gameService = new GameService();
const socketService = new SocketService(io, gameService);

// Initialize Socket.IO
socketService.initialize();

// Graceful shutdown handler
const gracefulShutdown = async (signal) => {
  logger.info(`Received ${signal}, starting graceful shutdown...`);

  try {
    // Stop accepting new connections
    server.close(() => {
      logger.info("HTTP server closed");
    });

    // Close Socket.IO connections
    io.close(() => {
      logger.info("Socket.IO server closed");
    });

    // Close database connections (if needed)
    // await db.close();

    // Close Redis connection
    const { disconnectRedis } = require("./config/redis");
    await disconnectRedis();

    logger.info("Graceful shutdown completed");
    process.exit(0);
  } catch (error) {
    logger.error("Error during graceful shutdown:", error);
    process.exit(1);
  }
};

// Handle shutdown signals
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception:", error);
  gracefulShutdown("uncaughtException");
});

// Handle unhandled rejections
process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at:", promise, "reason:", reason);
  gracefulShutdown("unhandledRejection");
});

// Start server
const startServer = async () => {
  try {
    // Initialize Redis connection (optional) - don't let it block startup
    setTimeout(async () => {
      try {
        const redisClient = await connectRedis();
        if (redisClient) {
          logger.info("Redis connected successfully");
        } else {
          logger.info("Running without Redis cache");
        }
      } catch (error) {
        logger.warn(
          "Redis connection failed, continuing without cache:",
          error.message
        );
      }
    }, 1000); // Connect to Redis after server starts

    // Start HTTP server
    const port = config.server.port;
    server.listen(port, () => {
      logger.info(
        `Server started on port ${port} in ${config.server.environment} mode`
      );
      logger.info(`Health check available at: http://localhost:${port}/health`);
      logger.info(`API documentation: http://localhost:${port}/api-docs`);
      logger.info(`Swagger UI: http://localhost:${port}/api-docs`);
    });
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
};

// Start the server
if (require.main === module) {
  startServer();
}

module.exports = { app, server, io };
