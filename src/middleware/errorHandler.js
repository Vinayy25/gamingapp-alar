const logger = require("../utils/logger");
const config = require("../config/app");

// Custom error class
class AppError extends Error {
  constructor(message, statusCode, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.name = this.constructor.name;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Handle different types of database errors
const handleDatabaseError = (error) => {
  let message = "Database error occurred";
  let statusCode = 500;

  // PostgreSQL specific errors
  if (error.code) {
    switch (error.code) {
      case "23505": // Unique constraint violation
        message = "A record with this information already exists";
        statusCode = 409;
        break;
      case "23503": // Foreign key violation
        message = "Referenced record does not exist";
        statusCode = 400;
        break;
      case "23502": // Not null violation
        message = "Required field is missing";
        statusCode = 400;
        break;
      case "23514": // Check constraint violation
        message = "Invalid data provided";
        statusCode = 400;
        break;
      case "42P01": // Undefined table
        message = "Database structure error";
        statusCode = 500;
        break;
      case "42703": // Undefined column
        message = "Database structure error";
        statusCode = 500;
        break;
      case "28P01": // Authentication failed
        message = "Database authentication failed";
        statusCode = 500;
        break;
      case "53300": // Too many connections
        message = "Service temporarily unavailable";
        statusCode = 503;
        break;
      default:
        message = "Database operation failed";
        statusCode = 500;
    }
  }

  return new AppError(message, statusCode);
};

// Handle JWT errors
const handleJWTError = (error) => {
  let message = "Authentication error";
  let statusCode = 401;

  if (error.name === "TokenExpiredError") {
    message = "Your session has expired. Please log in again";
  } else if (error.name === "JsonWebTokenError") {
    message = "Invalid authentication token";
  } else if (error.name === "NotBeforeError") {
    message = "Token not active yet";
  }

  return new AppError(message, statusCode);
};

// Handle validation errors
const handleValidationError = (error) => {
  const errors = Object.values(error.errors || {}).map((err) => err.message);
  const message = `Invalid input data: ${errors.join(". ")}`;
  return new AppError(message, 400);
};

// Handle cast errors (invalid IDs, etc.)
const handleCastError = (error) => {
  const message = `Invalid ${error.path}: ${error.value}`;
  return new AppError(message, 400);
};

// Send error response in development
const sendErrorDev = (err, req, res) => {
  // Log the error
  logger.error("Error in development mode:", {
    error: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
  });

  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message,
    error: err,
    stack: err.stack,
    timestamp: new Date().toISOString(),
  });
};

// Send error response in production
const sendErrorProd = (err, req, res) => {
  // Log operational errors only
  if (err.isOperational) {
    logger.warn("Operational error:", {
      message: err.message,
      statusCode: err.statusCode,
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
    });

    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      timestamp: new Date().toISOString(),
    });
  } else {
    // Log programming or unknown errors
    logger.error("Programming error:", {
      error: err.message,
      stack: err.stack,
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
    });

    // Send generic message to client
    res.status(500).json({
      success: false,
      message: "Something went wrong on our end",
      timestamp: new Date().toISOString(),
    });
  }
};

// Main error handling middleware
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  error.statusCode = err.statusCode || 500;

  // Handle different types of errors
  if (err.code && err.code.startsWith("23")) {
    error = handleDatabaseError(err);
  } else if (
    err.name === "TokenExpiredError" ||
    err.name === "JsonWebTokenError" ||
    err.name === "NotBeforeError"
  ) {
    error = handleJWTError(err);
  } else if (err.name === "ValidationError") {
    error = handleValidationError(err);
  } else if (err.name === "CastError") {
    error = handleCastError(err);
  } else if (err.type === "entity.parse.failed") {
    error = new AppError("Invalid JSON payload", 400);
  } else if (err.type === "entity.too.large") {
    error = new AppError("Request payload too large", 413);
  }

  // Send appropriate response based on environment
  if (config.server.environment === "development") {
    sendErrorDev(error, req, res);
  } else {
    sendErrorProd(error, req, res);
  }
};

// Async error wrapper
const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

// 404 handler
const notFound = (req, res, next) => {
  const err = new AppError(`Route ${req.originalUrl} not found`, 404);
  next(err);
};

module.exports = {
  AppError,
  errorHandler,
  catchAsync,
  notFound,
};
