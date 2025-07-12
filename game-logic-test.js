const io = require("socket.io-client");
const axios = require("axios");

class GameLogicTester {
  constructor() {
    this.SERVER_URL = "http://localhost:3000";
    this.clients = [];
    this.tokens = [];
    this.gameId = null;
    this.testResults = [];
    this.playerIds = [];
  }

  // Helper method to log test results
  logTest(testName, success, details = "") {
    const result = success ? "✅" : "❌";
    const message = `${result} ${testName}${details ? " - " + details : ""}`;
    console.log(message);
    this.testResults.push({ testName, success, details });
  }

  // Register and authenticate users
  async setupUsers() {
    console.log("\n=== Setting Up Users ===");

    const users = [
      { username: "gamer1", email: "gamer1@test.com", password: "Test123!" },
      { username: "gamer2", email: "gamer2@test.com", password: "Test123!" },
    ];

    for (const user of users) {
      try {
        // Try to register
        let response;
        try {
          response = await axios.post(
            `${this.SERVER_URL}/api/auth/register`,
            user
          );
          this.logTest(`Register ${user.username}`, true);
        } catch (error) {
          // User exists, try login
          response = await axios.post(`${this.SERVER_URL}/api/auth/login`, {
            username: user.username,
            password: user.password,
          });
          this.logTest(`Login ${user.username}`, true);
        }

        this.tokens.push(response.data.data.token);
        this.playerIds.push(response.data.data.user.id);
      } catch (error) {
        this.logTest(`Setup ${user.username}`, false, error.message);
      }
    }
  }

  // Create a game for testing
  async createGame() {
    console.log("\n=== Creating Game ===");

    try {
      const response = await axios.post(
        `${this.SERVER_URL}/api/games/create`,
        {
          maxPlayers: 2,
          isPrivate: false,
        },
        {
          headers: { Authorization: `Bearer ${this.tokens[0]}` },
        }
      );

      this.gameId = response.data.data.gameId;
      this.logTest("Create Game", true, `Game ID: ${this.gameId}`);
    } catch (error) {
      this.logTest("Create Game", false, error.message);
      throw error;
    }
  }

  // Join game via API
  async joinGame() {
    console.log("\n=== Joining Game ===");

    try {
      // Player 2 joins the game
      const response = await axios.post(
        `${this.SERVER_URL}/api/games/${this.gameId}/join`,
        {},
        {
          headers: { Authorization: `Bearer ${this.tokens[1]}` },
        }
      );

      this.logTest("Join Game", true, `Player 2 joined game ${this.gameId}`);
    } catch (error) {
      this.logTest("Join Game", false, error.message);
    }
  }

  // Connect WebSocket clients
  async connectWebSockets() {
    console.log("\n=== Connecting WebSockets ===");

    for (let i = 0; i < this.tokens.length; i++) {
      try {
        const socket = io(this.SERVER_URL, {
          auth: {
            token: this.tokens[i],
          },
          transports: ["websocket"],
        });

        // Set up event listeners
        this.setupGameEventListeners(socket, `Player${i + 1}`);

        this.clients.push({
          socket,
          name: `Player${i + 1}`,
          playerId: this.playerIds[i],
        });

        // Wait for connection
        await new Promise((resolve, reject) => {
          socket.on("connect", () => {
            this.logTest(`Connect ${this.clients[i].name}`, true);
            resolve();
          });

          socket.on("connect_error", (error) => {
            this.logTest(
              `Connect ${this.clients[i].name}`,
              false,
              error.message
            );
            reject(error);
          });

          setTimeout(() => reject(new Error("Connection timeout")), 5000);
        });
      } catch (error) {
        this.logTest(`Connect Player${i + 1}`, false, error.message);
      }
    }
  }

  // Set up game-specific event listeners
  setupGameEventListeners(socket, playerName) {
    // Connection events
    socket.on("connect", () => {
      console.log(`🔌 ${playerName} connected to WebSocket`);
    });

    socket.on("disconnect", () => {
      console.log(`🔌 ${playerName} disconnected`);
    });

    // Game room events
    socket.on("game_joined", (data) => {
      console.log(
        `🎮 ${playerName} joined game room, status: ${data.gameState?.gameStatus}`
      );
    });

    socket.on("game_started", (data) => {
      console.log(
        `🎮 Game started! Current turn: ${data.gameState?.currentTurn}`
      );
      console.log(
        `🎮 Current player: ${data.gameState?.currentPlayer?.username}`
      );
    });

    // Dice events
    socket.on("dice_rolled", (data) => {
      console.log(`🎲 ${playerName} rolled: ${data.diceValue}`);
      console.log(`🎲 Valid moves: ${data.validMoves?.length || 0}`);
      if (data.validMoves) {
        console.log(`🎲 Moves: ${JSON.stringify(data.validMoves)}`);
      }
    });

    socket.on("player_rolled_dice", (data) => {
      console.log(`🎲 ${data.username} rolled: ${data.diceValue}`);
    });

    // Movement events
    socket.on("piece_moved", (data) => {
      console.log(`🔄 ${data.username} moved piece:`);
      console.log(
        `   From: ${data.moveResult?.from} → To: ${data.moveResult?.to}`
      );
      console.log(`   Captured: ${data.moveResult?.captured || false}`);
      console.log(`   Extra turn: ${data.moveResult?.extraTurn || false}`);
    });

    // Game end events
    socket.on("game_ended", (data) => {
      console.log(
        `🏆 Game ended! Winner: ${data.winner?.username || data.winner}`
      );
    });

    // Error events
    socket.on("error", (data) => {
      console.log(`❌ ${playerName} error: ${data.message}`);
    });

    // Chat events
    socket.on("message_received", (data) => {
      console.log(`💬 ${data.username}: ${data.message}`);
    });
  }

  // Test joining game rooms
  async testJoinGameRooms() {
    console.log("\n=== Testing Join Game Rooms ===");

    for (let i = 0; i < this.clients.length; i++) {
      try {
        const client = this.clients[i];

        // Join game room
        client.socket.emit("join_game", { gameId: this.gameId });

        // Wait for confirmation
        await new Promise((resolve) => {
          client.socket.once("game_joined", (data) => {
            this.logTest(
              `${client.name} Join Game Room`,
              true,
              `Status: ${data.gameState?.gameStatus}`
            );
            resolve();
          });

          client.socket.once("error", (error) => {
            this.logTest(`${client.name} Join Game Room`, false, error.message);
            resolve();
          });

          setTimeout(() => {
            this.logTest(`${client.name} Join Game Room`, false, "Timeout");
            resolve();
          }, 3000);
        });

        // Delay between joins
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        this.logTest(
          `${this.clients[i].name} Join Game Room`,
          false,
          error.message
        );
      }
    }
  }

  // Test starting game
  async testStartGame() {
    console.log("\n=== Testing Start Game ===");

    if (this.clients.length > 0) {
      try {
        const client = this.clients[0];

        // Start game
        client.socket.emit("start_game", { gameId: this.gameId });

        // Wait for game start
        await new Promise((resolve) => {
          client.socket.once("game_started", (data) => {
            this.logTest(
              "Start Game",
              true,
              `Current player: ${data.gameState?.currentPlayer?.username}`
            );
            resolve();
          });

          client.socket.once("error", (error) => {
            this.logTest("Start Game", false, error.message);
            resolve();
          });

          setTimeout(() => {
            this.logTest("Start Game", false, "Timeout");
            resolve();
          }, 3000);
        });
      } catch (error) {
        this.logTest("Start Game", false, error.message);
      }
    }
  }

  // Test dice rolling
  async testDiceRoll() {
    console.log("\n=== Testing Dice Roll ===");

    if (this.clients.length > 0) {
      try {
        const client = this.clients[0];

        // Roll dice
        client.socket.emit("roll_dice", { gameId: this.gameId });

        // Wait for dice result
        await new Promise((resolve) => {
          client.socket.once("dice_rolled", (data) => {
            this.logTest(
              "Dice Roll",
              true,
              `Rolled: ${data.diceValue}, Valid moves: ${
                data.validMoves?.length || 0
              }`
            );
            resolve();
          });

          client.socket.once("error", (error) => {
            this.logTest("Dice Roll", false, error.message);
            resolve();
          });

          setTimeout(() => {
            this.logTest("Dice Roll", false, "Timeout");
            resolve();
          }, 3000);
        });
      } catch (error) {
        this.logTest("Dice Roll", false, error.message);
      }
    }
  }

  // Test piece movement
  async testPieceMovement() {
    console.log("\n=== Testing Piece Movement ===");

    if (this.clients.length > 0) {
      try {
        const client = this.clients[0];

        // Try to move a piece (assuming we have a 6 from previous roll)
        client.socket.emit("move_piece", {
          gameId: this.gameId,
          pieceIndex: 0,
          diceValue: 6,
        });

        // Wait for move result
        await new Promise((resolve) => {
          client.socket.once("piece_moved", (data) => {
            this.logTest(
              "Piece Movement",
              true,
              `From: ${data.moveResult?.from} → To: ${data.moveResult?.to}`
            );
            resolve();
          });

          client.socket.once("error", (error) => {
            this.logTest("Piece Movement", false, error.message);
            resolve();
          });

          setTimeout(() => {
            this.logTest("Piece Movement", false, "Timeout");
            resolve();
          }, 3000);
        });
      } catch (error) {
        this.logTest("Piece Movement", false, error.message);
      }
    }
  }

  // Test chat functionality
  async testChat() {
    console.log("\n=== Testing Chat ===");

    if (this.clients.length >= 2) {
      try {
        const client1 = this.clients[0];
        const client2 = this.clients[1];

        // Set up message listener
        let messageReceived = false;
        client2.socket.once("message_received", (data) => {
          messageReceived = true;
          this.logTest(
            "Chat Message",
            true,
            `From: ${data.username}, Message: ${data.message}`
          );
        });

        // Send message
        client1.socket.emit("send_message", {
          gameId: this.gameId,
          message: "Good luck! 🎮",
        });

        // Wait for message
        await new Promise((resolve) => setTimeout(resolve, 2000));

        if (!messageReceived) {
          this.logTest("Chat Message", false, "Message not received");
        }
      } catch (error) {
        this.logTest("Chat Test", false, error.message);
      }
    }
  }

  // Test game state request
  async testGameStateRequest() {
    console.log("\n=== Testing Game State Request ===");

    if (this.clients.length > 0) {
      try {
        const client = this.clients[0];

        // Request game state
        client.socket.emit("get_game_state", { gameId: this.gameId });

        // Wait for game state
        await new Promise((resolve) => {
          client.socket.once("game_state", (data) => {
            const players = data.gameState?.players?.length || 0;
            const status = data.gameState?.gameStatus || "unknown";
            this.logTest(
              "Game State Request",
              true,
              `Players: ${players}, Status: ${status}`
            );
            resolve();
          });

          client.socket.once("error", (error) => {
            this.logTest("Game State Request", false, error.message);
            resolve();
          });

          setTimeout(() => {
            this.logTest("Game State Request", false, "Timeout");
            resolve();
          }, 3000);
        });
      } catch (error) {
        this.logTest("Game State Request", false, error.message);
      }
    }
  }

  // Clean up connections
  async cleanup() {
    console.log("\n=== Cleaning Up ===");

    for (const client of this.clients) {
      try {
        client.socket.disconnect();
        this.logTest(`Disconnect ${client.name}`, true);
      } catch (error) {
        this.logTest(`Disconnect ${client.name}`, false, error.message);
      }
    }
  }

  // Print test summary
  printSummary() {
    console.log("\n=== Test Summary ===");

    const passed = this.testResults.filter((r) => r.success).length;
    const failed = this.testResults.filter((r) => r.success === false).length;
    const total = this.testResults.length;

    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📊 Total: ${total}`);
    console.log(`📈 Success Rate: ${((passed / total) * 100).toFixed(1)}%`);

    if (failed > 0) {
      console.log("\n❌ Failed Tests:");
      this.testResults
        .filter((r) => r.success === false)
        .forEach((r) => console.log(`   - ${r.testName}: ${r.details}`));
    }
  }

  // Run all tests
  async runAllTests() {
    console.log("🎮 Starting Game Logic WebSocket Tests...");

    try {
      await this.setupUsers();
      await this.createGame();
      await this.joinGame();
      await this.connectWebSockets();
      await this.testJoinGameRooms();
      await this.testStartGame();
      await this.testDiceRoll();
      await this.testPieceMovement();
      await this.testChat();
      await this.testGameStateRequest();
    } catch (error) {
      console.error("❌ Test suite failed:", error);
    } finally {
      await this.cleanup();
      this.printSummary();
    }
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  const tester = new GameLogicTester();
  tester.runAllTests().catch(console.error);
}

module.exports = GameLogicTester;
