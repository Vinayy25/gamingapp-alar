require("dotenv").config();

console.log("=== Comprehensive Server Test ===");

async function runTests() {
  try {
    // Step 1: Test basic Node.js modules
    console.log("\n1. Testing basic Node.js modules...");
    const express = require("express");
    const http = require("http");
    const socketIo = require("socket.io");
    const cors = require("cors");
    console.log("✓ Basic Node.js modules imported successfully");

    // Step 2: Test configuration
    console.log("\n2. Testing configuration...");
    const config = require("./src/config/app");
    console.log("✓ App config imported successfully");
    console.log("   Server port:", config.server.port);
    console.log("   Environment:", config.server.environment);

    // Step 3: Test logger
    console.log("\n3. Testing logger...");
    const logger = require("./src/utils/logger");
    logger.info("Test log message");
    console.log("✓ Logger working successfully");

    // Step 4: Test database configuration
    console.log("\n4. Testing database config...");
    const db = require("./src/config/database");
    console.log("✓ Database config imported successfully");

    // Step 5: Test models
    console.log("\n5. Testing models...");
    const User = require("./src/models/User");
    const Game = require("./src/models/Game");
    console.log("✓ Models imported successfully");

    // Step 6: Test controllers
    console.log("\n6. Testing controllers...");
    const authController = require("./src/controllers/authController");
    const gameController = require("./src/controllers/gameController");
    console.log("✓ Controllers imported successfully");

    // Step 7: Test middleware
    console.log("\n7. Testing middleware...");
    const { authenticateToken } = require("./src/middleware/auth");
    const { validateRegister } = require("./src/middleware/validation");
    console.log("✓ Middleware imported successfully");

    // Step 8: Test routes
    console.log("\n8. Testing routes...");
    const authRoutes = require("./src/routes/auth");
    const gameRoutes = require("./src/routes/games");
    const userRoutes = require("./src/routes/users");
    console.log("✓ Routes imported successfully");

    // Step 9: Test services
    console.log("\n9. Testing services...");
    const GameService = require("./src/services/GameService");
    const SocketService = require("./src/services/SocketService");
    console.log("✓ Services imported successfully");

    // Step 10: Test game logic
    console.log("\n10. Testing game logic...");
    const LudoGame = require("./src/game/LudoGame");
    console.log("✓ Game logic imported successfully");

    // Step 11: Create and start server
    console.log("\n11. Creating server...");
    const app = express();
    const server = http.createServer(app);

    // Basic middleware
    app.use(cors());
    app.use(express.json());

    // Simple error handler
    app.use((err, req, res, next) => {
      console.error("Error:", err.message);
      res.status(500).json({ success: false, message: err.message });
    });

    // Health check
    app.get("/health", (req, res) => {
      res.json({ success: true, message: "Server is running" });
    });

    // API routes
    app.use("/api/auth", authRoutes);
    app.use("/api/games", gameRoutes);
    app.use("/api/users", userRoutes);

    console.log("✓ Server configured successfully");

    // Step 12: Start server
    const PORT = config.server.port;
    server.listen(PORT, () => {
      console.log(`\n🚀 Server started successfully on port ${PORT}`);
      console.log(`   Health check: http://localhost:${PORT}/health`);
      console.log(`   API endpoints:`);
      console.log(`   - POST /api/auth/register`);
      console.log(`   - POST /api/auth/login`);
      console.log(`   - GET /api/games/available`);
      console.log(`   - POST /api/games/create`);
      console.log("\n✅ All tests passed! Server is running.");
    });
  } catch (error) {
    console.error("\n❌ Test failed:", error.message);
    console.error("Stack:", error.stack);
    process.exit(1);
  }
}

runTests();
