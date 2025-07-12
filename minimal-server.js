require("dotenv").config();

console.log("Starting minimal server...");

try {
  // Test basic imports first
  console.log("1. Testing express...");
  const express = require("express");

  console.log("2. Testing cors...");
  const cors = require("cors");

  console.log("3. Testing config...");
  const config = require("./src/config/app");
  console.log("   Config loaded, port:", config.server.port);

  console.log("4. Testing database config...");
  const db = require("./src/config/database");
  console.log("   Database config loaded");

  console.log("5. Testing logger...");
  const logger = require("./src/utils/logger");
  logger.info("Logger test message");
  console.log("   Logger working");

  console.log("6. Creating express app...");
  const app = express();

  // Basic middleware
  app.use(cors());
  app.use(express.json());

  // Simple routes
  app.get("/", (req, res) => {
    res.json({ success: true, message: "Minimal server running" });
  });

  app.get("/health", (req, res) => {
    res.json({
      success: true,
      message: "Health check OK",
      timestamp: new Date().toISOString(),
    });
  });

  // Error handler
  app.use((err, req, res, next) => {
    console.error("Error:", err.message);
    res.status(500).json({ success: false, message: err.message });
  });

  console.log("7. Starting server...");
  const PORT = config.server.port || 3000;

  app.listen(PORT, () => {
    console.log(`✅ Minimal server running on port ${PORT}`);
    console.log(`   Test: http://localhost:${PORT}/health`);
  });
} catch (error) {
  console.error("❌ Minimal server failed:", error.message);
  console.error("Stack:", error.stack);
  process.exit(1);
}
