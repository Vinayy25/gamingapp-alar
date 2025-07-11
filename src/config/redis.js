const redis = require("redis");

let client = null;

const connectRedis = async () => {
  try {
    const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

    client = redis.createClient({
      url: redisUrl,
      retry_strategy: (options) => {
        if (options.error && options.error.code === "ECONNREFUSED") {
          console.log("Redis server connection refused.");
          return new Error("Redis server connection refused");
        }
        if (options.total_retry_time > 1000 * 60 * 60) {
          return new Error("Redis retry time exhausted");
        }
        if (options.attempt > 10) {
          return undefined;
        }
        return Math.min(options.attempt * 100, 3000);
      },
    });

    client.on("error", (err) => {
      console.log("Redis Client Error:", err);
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

    await client.connect();
    return client;
  } catch (error) {
    console.error("Failed to connect to Redis:", error);
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
