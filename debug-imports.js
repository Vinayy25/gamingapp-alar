console.log("=== Server Import Debug ===");

// Test each import individually
const testImports = [
  // Step 1: Environment
  () => {
    console.log("\n1. Loading environment variables...");
    require("dotenv").config();
    console.log("✓ Environment loaded");
    console.log("   DB_HOST:", process.env.DB_HOST);
    console.log("   DB_NAME:", process.env.DB_NAME);
    console.log("   PORT:", process.env.PORT);
  },

  // Step 2: Basic Node modules
  () => {
    console.log("\n2. Testing basic Node.js modules...");
    require("express");
    console.log("✓ express");
    require("http");
    console.log("✓ http");
    require("cors");
    console.log("✓ cors");
    require("helmet");
    console.log("✓ helmet");
  },

  // Step 3: Socket.io
  () => {
    console.log("\n3. Testing Socket.io...");
    require("socket.io");
    console.log("✓ socket.io");
  },

  // Step 4: Database libraries
  () => {
    console.log("\n4. Testing database modules...");
    require("pg");
    console.log("✓ pg (PostgreSQL)");
    require("redis");
    console.log("✓ redis");
  },

  // Step 5: Auth modules
  () => {
    console.log("\n5. Testing auth modules...");
    require("jsonwebtoken");
    console.log("✓ jsonwebtoken");
    require("bcryptjs");
    console.log("✓ bcryptjs");
  },

  // Step 6: Utility modules
  () => {
    console.log("\n6. Testing utility modules...");
    require("joi");
    console.log("✓ joi");
    require("winston");
    console.log("✓ winston");
    require("express-rate-limit");
    console.log("✓ express-rate-limit");
  },

  // Step 7: App configuration
  () => {
    console.log("\n7. Testing app configuration...");
    const config = require("./src/config/app");
    console.log("✓ app config loaded");
    console.log("   Server port:", config.server.port);
    console.log("   Environment:", config.server.environment);
  },

  // Step 8: Database configuration
  () => {
    console.log("\n8. Testing database configuration...");
    const db = require("./src/config/database");
    console.log("✓ database config loaded");
  },

  // Step 9: Redis configuration
  () => {
    console.log("\n9. Testing redis configuration...");
    const redis = require("./src/config/redis");
    console.log("✓ redis config loaded");
  },

  // Step 10: Logger
  () => {
    console.log("\n10. Testing logger...");
    const logger = require("./src/utils/logger");
    logger.info("Test log message");
    console.log("✓ logger working");
  },

  // Step 11: Models
  () => {
    console.log("\n11. Testing models...");
    const User = require("./src/models/User");
    console.log("✓ User model");
    const Game = require("./src/models/Game");
    console.log("✓ Game model");
  },

  // Step 12: Middleware
  () => {
    console.log("\n12. Testing middleware...");
    const auth = require("./src/middleware/auth");
    console.log("✓ auth middleware");
    const validation = require("./src/middleware/validation");
    console.log("✓ validation middleware");
  },

  // Step 13: Controllers
  () => {
    console.log("\n13. Testing controllers...");
    const authController = require("./src/controllers/authController");
    console.log("✓ auth controller");
    const gameController = require("./src/controllers/gameController");
    console.log("✓ game controller");
  },

  // Step 14: Routes
  () => {
    console.log("\n14. Testing routes...");
    const authRoutes = require("./src/routes/auth");
    console.log("✓ auth routes");
    const gameRoutes = require("./src/routes/games");
    console.log("✓ game routes");
    const userRoutes = require("./src/routes/users");
    console.log("✓ user routes");
  },

  // Step 15: Services
  () => {
    console.log("\n15. Testing services...");
    const GameService = require("./src/services/GameService");
    console.log("✓ GameService");
    const SocketService = require("./src/services/SocketService");
    console.log("✓ SocketService");
  },

  // Step 16: Game logic
  () => {
    console.log("\n16. Testing game logic...");
    const LudoGame = require("./src/game/LudoGame");
    console.log("✓ LudoGame");
  },
];

async function runDiagnostics() {
  console.log("Starting comprehensive import diagnostics...");
  
  for (let i = 0; i < testImports.length; i++) {
    try {
      testImports[i]();
    } catch (error) {
      console.error(`\n❌ FAILED at step ${i + 1}:`);
      console.error("Error:", error.message);
      console.error("Stack:", error.stack);
      console.log("\n🔍 This is where the server is failing to start!");
      process.exit(1);
    }
  }
  
  console.log("\n🎉 All imports successful!");
  console.log("The server should start without import errors.");
  console.log("If it's still failing, the issue might be in the server logic or database connection.");
}

runDiagnostics(); 