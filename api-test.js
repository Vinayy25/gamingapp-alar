const axios = require("axios");

const BASE_URL = "http://localhost:3000";

// Test data
const testUser1 = {
  username: "testuser1",
  email: "test1@example.com",
  password: "password123",
};

const testUser2 = {
  username: "testuser2",
  email: "test2@example.com",
  password: "password123",
};

let user1Token = "";
let user2Token = "";
let gameId = "";

console.log("=== API Test Suite ===");

async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function testHealthCheck() {
  console.log("\n1. Testing Health Check...");
  try {
    const response = await axios.get(`${BASE_URL}/health`);
    console.log("✓ Health check passed:", response.data.message);
    return true;
  } catch (error) {
    console.error("❌ Health check failed:", error.message);
    return false;
  }
}

async function testUserRegistration() {
  console.log("\n2. Testing User Registration...");
  try {
    // Register first user
    const response1 = await axios.post(
      `${BASE_URL}/api/auth/register`,
      testUser1
    );
    console.log("✓ User 1 registered successfully:", response1.data.message);

    // Register second user
    const response2 = await axios.post(
      `${BASE_URL}/api/auth/register`,
      testUser2
    );
    console.log("✓ User 2 registered successfully:", response2.data.message);

    return true;
  } catch (error) {
    console.error(
      "❌ User registration failed:",
      error.response?.data?.message || error.message
    );
    return false;
  }
}

async function testUserLogin() {
  console.log("\n3. Testing User Login...");
  try {
    // Login first user
    const response1 = await axios.post(`${BASE_URL}/api/auth/login`, {
      username: testUser1.username,
      password: testUser1.password,
    });
    user1Token = response1.data.token;
    console.log("✓ User 1 logged in successfully");

    // Login second user
    const response2 = await axios.post(`${BASE_URL}/api/auth/login`, {
      username: testUser2.username,
      password: testUser2.password,
    });
    user2Token = response2.data.token;
    console.log("✓ User 2 logged in successfully");

    return true;
  } catch (error) {
    console.error(
      "❌ User login failed:",
      error.response?.data?.message || error.message
    );
    return false;
  }
}

async function testUserProfile() {
  console.log("\n4. Testing User Profile...");
  try {
    const response = await axios.get(`${BASE_URL}/api/auth/profile`, {
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    console.log(
      "✓ Profile retrieved successfully:",
      response.data.user.username
    );
    return true;
  } catch (error) {
    console.error(
      "❌ Profile retrieval failed:",
      error.response?.data?.message || error.message
    );
    return false;
  }
}

async function testGameCreation() {
  console.log("\n5. Testing Game Creation...");
  try {
    const response = await axios.post(
      `${BASE_URL}/api/games/create`,
      {
        maxPlayers: 4,
        gameSettings: {
          gameMode: "normal",
          timeLimit: 30,
        },
      },
      {
        headers: { Authorization: `Bearer ${user1Token}` },
      }
    );
    gameId = response.data.game.id;
    console.log("✓ Game created successfully, ID:", gameId);
    return true;
  } catch (error) {
    console.error(
      "❌ Game creation failed:",
      error.response?.data?.message || error.message
    );
    return false;
  }
}

async function testGameJoin() {
  console.log("\n6. Testing Game Join...");
  try {
    const response = await axios.post(
      `${BASE_URL}/api/games/join`,
      {
        gameId: gameId,
      },
      {
        headers: { Authorization: `Bearer ${user2Token}` },
      }
    );
    console.log("✓ User 2 joined game successfully");
    return true;
  } catch (error) {
    console.error(
      "❌ Game join failed:",
      error.response?.data?.message || error.message
    );
    return false;
  }
}

async function testAvailableGames() {
  console.log("\n7. Testing Available Games...");
  try {
    const response = await axios.get(`${BASE_URL}/api/games/available`, {
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    console.log(
      "✓ Available games retrieved:",
      response.data.games.length,
      "games"
    );
    return true;
  } catch (error) {
    console.error(
      "❌ Available games retrieval failed:",
      error.response?.data?.message || error.message
    );
    return false;
  }
}

async function testUserGames() {
  console.log("\n8. Testing User Games...");
  try {
    const response = await axios.get(`${BASE_URL}/api/games/my-games`, {
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    console.log("✓ User games retrieved:", response.data.games.length, "games");
    return true;
  } catch (error) {
    console.error(
      "❌ User games retrieval failed:",
      error.response?.data?.message || error.message
    );
    return false;
  }
}

async function testGameDetails() {
  console.log("\n9. Testing Game Details...");
  try {
    const response = await axios.get(`${BASE_URL}/api/games/${gameId}`, {
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    console.log("✓ Game details retrieved:", response.data.game.status);
    return true;
  } catch (error) {
    console.error(
      "❌ Game details retrieval failed:",
      error.response?.data?.message || error.message
    );
    return false;
  }
}

async function testGameStart() {
  console.log("\n10. Testing Game Start...");
  try {
    const response = await axios.post(
      `${BASE_URL}/api/games/${gameId}/start`,
      {},
      {
        headers: { Authorization: `Bearer ${user1Token}` },
      }
    );
    console.log("✓ Game started successfully");
    return true;
  } catch (error) {
    console.error(
      "❌ Game start failed:",
      error.response?.data?.message || error.message
    );
    return false;
  }
}

async function testGameStats() {
  console.log("\n11. Testing Game Stats...");
  try {
    const response = await axios.get(`${BASE_URL}/api/games/stats`, {
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    console.log("✓ Game stats retrieved");
    return true;
  } catch (error) {
    console.error(
      "❌ Game stats retrieval failed:",
      error.response?.data?.message || error.message
    );
    return false;
  }
}

async function testUserStats() {
  console.log("\n12. Testing User Stats...");
  try {
    const response = await axios.get(`${BASE_URL}/api/auth/stats`, {
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    console.log("✓ User stats retrieved");
    return true;
  } catch (error) {
    console.error(
      "❌ User stats retrieval failed:",
      error.response?.data?.message || error.message
    );
    return false;
  }
}

async function runAllTests() {
  console.log("Starting comprehensive API tests...");
  console.log("Server should be running on", BASE_URL);

  await delay(2000); // Wait for server to be ready

  const tests = [
    testHealthCheck,
    testUserRegistration,
    testUserLogin,
    testUserProfile,
    testGameCreation,
    testGameJoin,
    testAvailableGames,
    testUserGames,
    testGameDetails,
    testGameStart,
    testGameStats,
    testUserStats,
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      const result = await test();
      if (result) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      console.error("❌ Test execution error:", error.message);
      failed++;
    }

    await delay(500); // Brief pause between tests
  }

  console.log(`\n=== Test Results ===`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Total: ${passed + failed}`);

  if (failed === 0) {
    console.log("\n🎉 All tests passed! Backend is working correctly.");
  } else {
    console.log("\n⚠️  Some tests failed. Check the errors above.");
  }

  process.exit(failed === 0 ? 0 : 1);
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests();
}

module.exports = { runAllTests };
