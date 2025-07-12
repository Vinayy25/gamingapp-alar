// Start server without Redis
process.env.SKIP_REDIS = "true";

require("dotenv").config();

console.log("🚀 Starting Ludo Game Backend (without Redis)...");
console.log("   Environment: " + (process.env.NODE_ENV || "development"));
console.log("   Port: " + (process.env.PORT || 3000));
console.log("   Database: " + (process.env.DB_NAME || "ludo_game"));
console.log("   Redis: DISABLED");
console.log(
  "   Swagger UI: http://localhost:" + (process.env.PORT || 3000) + "/api-docs"
);

// Import and start the server
require("./src/server.js");
