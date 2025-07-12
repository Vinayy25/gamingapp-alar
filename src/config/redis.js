const redis = require("redis");

let client = null;

const connectRedis = async () => {
  // Skip Redis connection if explicitly disabled
  if (process.env.SKIP_REDIS === "true") {
    console.log("Redis connection skipped (SKIP_REDIS=true)");
    return null;
  }

  try {
    const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

    client = redis.createClient({
      url: redisUrl,
      socket: {
        connectTimeout: 5000, // 5 second timeout
        lazyConnect: true,
      },
    });

    // Set up error handling before connecting
    client.on("error", (err) => {
      console.log(
        "Redis Client Error (continuing without Redis):",
        err.message
      );
      // Don't crash the server, just continue without Redis
    });

    client.on("connect", () => {
      console.log("Connected to Redis server");
    });

    client.on("ready", () => {
      console.log("Redis client ready");
    });

    client.on("end", () => {
      console.log("Redis connection ended");
    });

    // Try to connect with timeout
    await Promise.race([
      client.connect(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Redis connection timeout")), 5000)
      ),
    ]);

    return client;
  } catch (error) {
    console.log(
      "Redis connection failed, continuing without cache:",
      error.message
    );
    client = null;
    return null;
  }
};

const getClient = () => client;

const disconnectRedis = async () => {
  if (client) {
    await client.quit();
    client = null;
  }
};

// Game state cache methods
const setGameState = async (gameId, gameState, ttl = 3600) => {
  if (!client) return false;
  try {
    await client.setEx(`game:${gameId}`, ttl, JSON.stringify(gameState));
    return true;
  } catch (error) {
    console.error("Error setting game state in Redis:", error);
    return false;
  }
};

const getGameState = async (gameId) => {
  if (!client) return null;
  try {
    const state = await client.get(`game:${gameId}`);
    return state ? JSON.parse(state) : null;
  } catch (error) {
    console.error("Error getting game state from Redis:", error);
    return null;
  }
};

const deleteGameState = async (gameId) => {
  if (!client) return false;
  try {
    await client.del(`game:${gameId}`);
    return true;
  } catch (error) {
    console.error("Error deleting game state from Redis:", error);
    return false;
  }
};

module.exports = {
  connectRedis,
  getClient,
  disconnectRedis,
  setGameState,
  getGameState,
  deleteGameState,
};
