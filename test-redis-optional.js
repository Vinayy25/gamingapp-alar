require("dotenv").config();
const axios = require("axios");

class RedisOptionalTester {
  constructor() {
    this.SERVER_URL = "http://localhost:3000";
    this.testResults = [];
  }

  // Helper method to log test results
  logTest(testName, success, details = "") {
    const result = success ? "✅" : "❌";
    const message = `${result} ${testName}${details ? " - " + details : ""}`;
    console.log(message);
    this.testResults.push({ testName, success, details });
  }

  // Test server health
  async testServerHealth() {
    console.log("\n=== Testing Server Health ===");

    try {
      const response = await axios.get(`${this.SERVER_URL}/health`);
      const status = response.data.status;
      const redisStatus = response.data.redis || "not reported";

      this.logTest(
        "Server Health Check",
        status === "healthy",
        `Status: ${status}, Redis: ${redisStatus}`
      );

      return response.data;
    } catch (error) {
      this.logTest("Server Health Check", false, error.message);
      throw error;
    }
  }

  // Test user registration (database functionality)
  async testUserRegistration() {
    console.log("\n=== Testing User Registration (Database) ===");

    const testUser = {
      username: "redistest_" + Date.now(),
      email: `redistest_${Date.now()}@test.com`,
      password: "Test123!",
    };

    try {
      const response = await axios.post(
        `${this.SERVER_URL}/api/auth/register`,
        testUser
      );
      const success = response.data.success && response.data.data.token;

      this.logTest(
        "User Registration",
        success,
        success ? `User: ${testUser.username}` : "Registration failed"
      );

      return success ? response.data.data.token : null;
    } catch (error) {
      this.logTest(
        "User Registration",
        false,
        error.response?.data?.message || error.message
      );
      return null;
    }
  }

  // Test game creation (database + optional Redis)
  async testGameCreation(token) {
    console.log("\n=== Testing Game Creation (Database + Optional Redis) ===");

    if (!token) {
      this.logTest("Game Creation", false, "No token available");
      return null;
    }

    try {
      const response = await axios.post(
        `${this.SERVER_URL}/api/games/create`,
        {
          maxPlayers: 2,
          isPrivate: false,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const success = response.data.success && response.data.data.gameId;
      const gameId = response.data.data.gameId;

      this.logTest(
        "Game Creation",
        success,
        success ? `Game ID: ${gameId}` : "Creation failed"
      );

      return gameId;
    } catch (error) {
      this.logTest(
        "Game Creation",
        false,
        error.response?.data?.message || error.message
      );
      return null;
    }
  }

  // Test game retrieval (database functionality)
  async testGameRetrieval(token, gameId) {
    console.log("\n=== Testing Game Retrieval ===");

    if (!token || !gameId) {
      this.logTest("Game Retrieval", false, "Missing token or gameId");
      return;
    }

    try {
      const response = await axios.get(
        `${this.SERVER_URL}/api/games/${gameId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const success = response.data.success && response.data.data.game;
      const gameStatus = response.data.data.game?.status || "unknown";

      this.logTest(
        "Game Retrieval",
        success,
        success ? `Status: ${gameStatus}` : "Retrieval failed"
      );
    } catch (error) {
      this.logTest(
        "Game Retrieval",
        false,
        error.response?.data?.message || error.message
      );
    }
  }

  // Test Redis impact on performance
  async testRedisImpact() {
    console.log("\n=== Testing Redis Impact ===");

    const redisEnabled = process.env.SKIP_REDIS !== "true";

    this.logTest(
      "Redis Configuration",
      true,
      redisEnabled ? "Redis ENABLED" : "Redis DISABLED (SKIP_REDIS=true)"
    );

    // Test multiple requests to see if there are any Redis-related delays or errors
    const startTime = Date.now();
    const promises = [];

    for (let i = 0; i < 5; i++) {
      promises.push(axios.get(`${this.SERVER_URL}/health`));
    }

    try {
      await Promise.all(promises);
      const duration = Date.now() - startTime;

      this.logTest(
        "Multiple Requests Performance",
        true,
        `5 requests completed in ${duration}ms`
      );
    } catch (error) {
      this.logTest("Multiple Requests Performance", false, error.message);
    }
  }

  // Print test summary
  printSummary() {
    console.log("\n=== Redis Optional Test Summary ===");

    const passed = this.testResults.filter((r) => r.success).length;
    const failed = this.testResults.filter((r) => r.success === false).length;
    const total = this.testResults.length;

    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📊 Total: ${total}`);
    console.log(`📈 Success Rate: ${((passed / total) * 100).toFixed(1)}%`);

    const redisStatus =
      process.env.SKIP_REDIS === "true" ? "DISABLED" : "ENABLED";
    console.log(`🔧 Redis Status: ${redisStatus}`);

    if (failed > 0) {
      console.log("\n❌ Failed Tests:");
      this.testResults
        .filter((r) => r.success === false)
        .forEach((r) => console.log(`   - ${r.testName}: ${r.details}`));
    } else {
      console.log(
        "\n🎉 All tests passed! The system works correctly with current Redis configuration."
      );
    }
  }

  // Run all tests
  async runAllTests() {
    console.log("🔧 Testing Redis Optional Functionality...");
    console.log(
      `📋 Environment: SKIP_REDIS=${process.env.SKIP_REDIS || "undefined"}`
    );

    try {
      // Basic functionality tests
      const healthData = await this.testServerHealth();
      const token = await this.testUserRegistration();
      const gameId = await this.testGameCreation(token);
      await this.testGameRetrieval(token, gameId);
      await this.testRedisImpact();
    } catch (error) {
      console.error("❌ Test suite failed:", error.message);
    } finally {
      this.printSummary();
    }
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  const tester = new RedisOptionalTester();
  tester.runAllTests().catch(console.error);
}

module.exports = RedisOptionalTester;
