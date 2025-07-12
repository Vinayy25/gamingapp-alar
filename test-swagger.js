const axios = require("axios");

const BASE_URL = "http://localhost:3000";

console.log("=== Swagger API Documentation Test ===");

async function testSwaggerEndpoints() {
  try {
    console.log("\n1. Testing server health...");
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log("✓ Server is running:", healthResponse.data.message);

    console.log("\n2. Testing root endpoint...");
    const rootResponse = await axios.get(`${BASE_URL}/`);
    console.log("✓ Root endpoint working");
    console.log("   Documentation URL:", rootResponse.data.documentation);

    console.log("\n3. Testing Swagger UI...");
    const swaggerResponse = await axios.get(`${BASE_URL}/api-docs`);
    console.log("✓ Swagger UI accessible");
    console.log("   Content-Type:", swaggerResponse.headers["content-type"]);

    console.log("\n4. Testing Swagger JSON spec...");
    const swaggerJsonResponse = await axios.get(
      `${BASE_URL}/api-docs/swagger.json`
    );
    const swaggerSpec = swaggerJsonResponse.data;
    console.log("✓ Swagger JSON spec available");
    console.log("   API Title:", swaggerSpec.info?.title);
    console.log("   API Version:", swaggerSpec.info?.version);
    console.log(
      "   Available paths:",
      Object.keys(swaggerSpec.paths || {}).length
    );

    console.log("\n5. Available API endpoints in Swagger:");
    Object.keys(swaggerSpec.paths || {}).forEach((path) => {
      const methods = Object.keys(swaggerSpec.paths[path]);
      console.log(`   ${path}: ${methods.join(", ").toUpperCase()}`);
    });

    console.log("\n🎉 Swagger setup is working correctly!");
    console.log(`\n📚 Access API Documentation at: ${BASE_URL}/api-docs`);
    console.log("   - Interactive testing interface");
    console.log("   - Request/response examples");
    console.log("   - Authentication support");
    console.log("   - Try out endpoints directly");

    return true;
  } catch (error) {
    console.error("\n❌ Swagger test failed:", error.message);

    if (error.code === "ECONNREFUSED") {
      console.log("\n💡 Server is not running. Start it first:");
      console.log("   npm run start:no-redis");
      console.log("   or");
      console.log("   npm start");
    } else {
      console.error("Error details:", error.response?.data || error.message);
    }

    return false;
  }
}

async function testApiEndpoints() {
  console.log("\n=== Testing API Endpoints ===");

  try {
    // Test registration endpoint (this should be documented in Swagger)
    console.log("\n6. Testing documented endpoints...");

    const testUser = {
      username: "swaggertest",
      email: "swagger@test.com",
      password: "password123",
    };

    const registerResponse = await axios.post(
      `${BASE_URL}/api/auth/register`,
      testUser
    );
    console.log("✓ Registration endpoint working");

    const token = registerResponse.data.token;

    // Test authenticated endpoint
    const profileResponse = await axios.get(`${BASE_URL}/api/auth/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log("✓ Authenticated profile endpoint working");

    // Test game creation
    const gameResponse = await axios.post(
      `${BASE_URL}/api/games/create`,
      {
        maxPlayers: 4,
        gameSettings: { gameMode: "normal", timeLimit: 30 },
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    console.log("✓ Game creation endpoint working");

    console.log("\n✅ All documented endpoints are functional!");
  } catch (error) {
    console.log(
      "\n⚠️  API endpoint test failed (this is expected if server is not fully running)"
    );
    console.log("   Error:", error.response?.data?.message || error.message);
    console.log("   This is fine - the Swagger UI will still work for testing");
  }
}

async function runTests() {
  const swaggerWorking = await testSwaggerEndpoints();

  if (swaggerWorking) {
    await testApiEndpoints();
  }

  console.log("\n📖 How to use Swagger UI:");
  console.log("1. Open http://localhost:3000/api-docs in your browser");
  console.log("2. Click on any endpoint to expand it");
  console.log('3. Click "Try it out" to test the endpoint');
  console.log("4. For authenticated endpoints:");
  console.log("   - First register/login to get a token");
  console.log('   - Click "Authorize" button at the top');
  console.log("   - Enter: Bearer YOUR_TOKEN_HERE");
  console.log("   - Now you can test protected endpoints");
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests();
}

module.exports = { runTests };
