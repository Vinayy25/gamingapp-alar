const io = require('socket.io-client');
const axios = require('axios');

class WebSocketTester {
  constructor() {
    this.SERVER_URL = 'http://localhost:3000';
    this.clients = [];
    this.tokens = [];
    this.gameId = null;
    this.testResults = [];
  }

  // Helper method to log test results
  logTest(testName, success, details = '') {
    const result = success ? '✅' : '❌';
    const message = `${result} ${testName}${details ? ' - ' + details : ''}`;
    console.log(message);
    this.testResults.push({ testName, success, details });
  }

  // Register test users
  async registerTestUsers() {
    console.log('\n=== Registering Test Users ===');
    
    const users = [
      { username: 'player1', email: 'player1@test.com', password: 'Test123!' },
      { username: 'player2', email: 'player2@test.com', password: 'Test123!' },
      { username: 'player3', email: 'player3@test.com', password: 'Test123!' },
      { username: 'player4', email: 'player4@test.com', password: 'Test123!' }
    ];

    for (let i = 0; i < users.length; i++) {
      try {
        const response = await axios.post(`${this.SERVER_URL}/api/auth/register`, users[i]);
        this.tokens.push(response.data.data.token);
        this.logTest(`Register ${users[i].username}`, true);
      } catch (error) {
        // User might already exist, try login
        try {
          const loginResponse = await axios.post(`${this.SERVER_URL}/api/auth/login`, {
            username: users[i].username,
            password: users[i].password
          });
          this.tokens.push(loginResponse.data.data.token);
          this.logTest(`Login ${users[i].username}`, true);
        } catch (loginError) {
          this.logTest(`Register/Login ${users[i].username}`, false, loginError.message);
        }
      }
    }
  }

  // Create a test game
  async createTestGame() {
    console.log('\n=== Creating Test Game ===');
    
    try {
      const response = await axios.post(`${this.SERVER_URL}/api/games/create`, {
        maxPlayers: 4,
        isPrivate: false
      }, {
        headers: { Authorization: `Bearer ${this.tokens[0]}` }
      });
      
      this.gameId = response.data.data.gameId;
      this.logTest('Create Game', true, `Game ID: ${this.gameId}`);
    } catch (error) {
      this.logTest('Create Game', false, error.message);
      throw error;
    }
  }

  // Connect WebSocket clients
  async connectClients() {
    console.log('\n=== Connecting WebSocket Clients ===');
    
    const playerNames = ['Player1', 'Player2', 'Player3', 'Player4'];
    
    for (let i = 0; i < Math.min(4, this.tokens.length); i++) {
      try {
        const socket = io(this.SERVER_URL, {
          auth: {
            token: this.tokens[i]
          },
          transports: ['websocket']
        });

        // Set up event listeners
        this.setupEventListeners(socket, playerNames[i]);
        
        // Store client
        this.clients.push({
          socket,
          name: playerNames[i],
          playerId: i + 1
        });

        // Wait for connection
        await new Promise((resolve, reject) => {
          socket.on('connect', () => {
            this.logTest(`Connect ${playerNames[i]}`, true);
            resolve();
          });
          
          socket.on('connect_error', (error) => {
            this.logTest(`Connect ${playerNames[i]}`, false, error.message);
            reject(error);
          });
          
          setTimeout(() => reject(new Error('Connection timeout')), 5000);
        });

      } catch (error) {
        this.logTest(`Connect ${playerNames[i]}`, false, error.message);
      }
    }
  }

  // Set up event listeners for a socket
  setupEventListeners(socket, playerName) {
    // Connection events
    socket.on('connect', () => {
      console.log(`🔌 ${playerName} connected`);
    });

    socket.on('disconnect', () => {
      console.log(`🔌 ${playerName} disconnected`);
    });

    // Game events
    socket.on('game_joined', (data) => {
      console.log(`🎮 ${playerName} joined game:`, data.gameState?.gameId);
    });

    socket.on('game_left', (data) => {
      console.log(`🎮 ${playerName} left game:`, data.gameId);
    });

    socket.on('game_started', (data) => {
      console.log(`🎮 Game started! Current player: ${data.gameState?.currentPlayer?.username}`);
    });

    socket.on('game_state', (data) => {
      console.log(`📊 ${playerName} received game state`);
    });

    // Dice and movement events
    socket.on('dice_rolled', (data) => {
      console.log(`🎲 ${playerName} rolled: ${data.diceValue}, Valid moves: ${data.validMoves?.length || 0}`);
    });

    socket.on('player_rolled_dice', (data) => {
      console.log(`🎲 ${data.username} rolled: ${data.diceValue}`);
    });

    socket.on('piece_moved', (data) => {
      console.log(`🔄 ${data.username} moved piece from ${data.moveResult?.from} to ${data.moveResult?.to}`);
    });

    socket.on('game_ended', (data) => {
      console.log(`🏆 Game ended! Winner: ${data.winner?.username || data.winner}`);
    });

    // Player events
    socket.on('player_joined', (data) => {
      console.log(`👥 ${data.username} joined the game`);
    });

    socket.on('player_left', (data) => {
      console.log(`👥 ${data.username} left the game`);
    });

    socket.on('player_disconnected', (data) => {
      console.log(`👥 ${data.username} disconnected`);
    });

    socket.on('player_reconnected', (data) => {
      console.log(`👥 ${data.username} reconnected`);
    });

    socket.on('player_ready_status', (data) => {
      console.log(`👥 ${data.username} ready status: ${data.ready}`);
    });

    // Chat events
    socket.on('message_received', (data) => {
      console.log(`💬 ${data.username}: ${data.message}`);
    });

    // Error events
    socket.on('error', (data) => {
      console.log(`❌ ${playerName} error:`, data.message);
    });

    // Heartbeat
    socket.on('pong', (data) => {
      console.log(`💗 ${playerName} heartbeat: ${data.timestamp}`);
    });
  }

  // Test joining game rooms
  async testJoinGame() {
    console.log('\n=== Testing Join Game ===');
    
    for (let i = 0; i < Math.min(2, this.clients.length); i++) {
      try {
        const client = this.clients[i];
        
        // Join game
        client.socket.emit('join_game', { gameId: this.gameId });
        
        // Wait for response
        await new Promise((resolve) => {
          client.socket.once('game_joined', (data) => {
            this.logTest(`${client.name} Join Game`, true, `Game ID: ${data.gameState?.gameId}`);
            resolve();
          });
          
          client.socket.once('error', (error) => {
            this.logTest(`${client.name} Join Game`, false, error.message);
            resolve();
          });
          
          setTimeout(() => {
            this.logTest(`${client.name} Join Game`, false, 'Timeout');
            resolve();
          }, 3000);
        });
        
        // Add delay between joins
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        this.logTest(`${this.clients[i].name} Join Game`, false, error.message);
      }
    }
  }

  // Test chat functionality
  async testChat() {
    console.log('\n=== Testing Chat ===');
    
    if (this.clients.length >= 2) {
      try {
        const client1 = this.clients[0];
        const client2 = this.clients[1];
        
        // Set up message listener
        let messageReceived = false;
        client2.socket.once('message_received', (data) => {
          messageReceived = true;
          this.logTest('Chat Message Received', true, `From: ${data.username}, Message: ${data.message}`);
        });
        
        // Send message
        client1.socket.emit('send_message', {
          gameId: this.gameId,
          message: 'Hello from WebSocket test!'
        });
        
        // Wait for message
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        if (!messageReceived) {
          this.logTest('Chat Message Received', false, 'No message received');
        }
        
      } catch (error) {
        this.logTest('Chat Test', false, error.message);
      }
    }
  }

  // Test player ready status
  async testPlayerReady() {
    console.log('\n=== Testing Player Ready ===');
    
    for (let i = 0; i < Math.min(2, this.clients.length); i++) {
      try {
        const client = this.clients[i];
        
        // Set up ready status listener
        let readyReceived = false;
        if (i === 0 && this.clients.length > 1) {
          this.clients[1].socket.once('player_ready_status', (data) => {
            readyReceived = true;
            this.logTest('Player Ready Status Received', true, `${data.username} is ready: ${data.ready}`);
          });
        }
        
        // Send ready status
        client.socket.emit('player_ready', {
          gameId: this.gameId,
          ready: true
        });
        
        this.logTest(`${client.name} Set Ready`, true);
        
        // Wait for broadcast
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        this.logTest(`${this.clients[i].name} Set Ready`, false, error.message);
      }
    }
  }

  // Test heartbeat
  async testHeartbeat() {
    console.log('\n=== Testing Heartbeat ===');
    
    if (this.clients.length > 0) {
      try {
        const client = this.clients[0];
        
        // Send ping
        client.socket.emit('ping');
        
        // Wait for pong
        await new Promise((resolve) => {
          client.socket.once('pong', (data) => {
            this.logTest('Heartbeat', true, `Latency: ${Date.now() - data.timestamp}ms`);
            resolve();
          });
          
          setTimeout(() => {
            this.logTest('Heartbeat', false, 'No pong received');
            resolve();
          }, 2000);
        });
        
      } catch (error) {
        this.logTest('Heartbeat', false, error.message);
      }
    }
  }

  // Test game state request
  async testGameState() {
    console.log('\n=== Testing Game State ===');
    
    if (this.clients.length > 0) {
      try {
        const client = this.clients[0];
        
        // Request game state
        client.socket.emit('get_game_state', { gameId: this.gameId });
        
        // Wait for response
        await new Promise((resolve) => {
          client.socket.once('game_state', (data) => {
            this.logTest('Get Game State', true, `Players: ${data.gameState?.players?.length || 0}`);
            resolve();
          });
          
          client.socket.once('error', (error) => {
            this.logTest('Get Game State', false, error.message);
            resolve();
          });
          
          setTimeout(() => {
            this.logTest('Get Game State', false, 'Timeout');
            resolve();
          }, 3000);
        });
        
      } catch (error) {
        this.logTest('Get Game State', false, error.message);
      }
    }
  }

  // Test leaving game
  async testLeaveGame() {
    console.log('\n=== Testing Leave Game ===');
    
    if (this.clients.length > 0) {
      try {
        const client = this.clients[0];
        
        // Leave game
        client.socket.emit('leave_game', { gameId: this.gameId });
        
        // Wait for response
        await new Promise((resolve) => {
          client.socket.once('game_left', (data) => {
            this.logTest(`${client.name} Leave Game`, true, `Game ID: ${data.gameId}`);
            resolve();
          });
          
          client.socket.once('error', (error) => {
            this.logTest(`${client.name} Leave Game`, false, error.message);
            resolve();
          });
          
          setTimeout(() => {
            this.logTest(`${client.name} Leave Game`, false, 'Timeout');
            resolve();
          }, 3000);
        });
        
      } catch (error) {
        this.logTest(`${this.clients[0].name} Leave Game`, false, error.message);
      }
    }
  }

  // Clean up connections
  async cleanup() {
    console.log('\n=== Cleaning Up ===');
    
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
    console.log('\n=== Test Summary ===');
    
    const passed = this.testResults.filter(r => r.success).length;
    const failed = this.testResults.filter(r => r.success === false).length;
    const total = this.testResults.length;
    
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📊 Total: ${total}`);
    console.log(`📈 Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
    
    if (failed > 0) {
      console.log('\nFailed Tests:');
      this.testResults
        .filter(r => r.success === false)
        .forEach(r => console.log(`  - ${r.testName}: ${r.details}`));
    }
  }

  // Run all tests
  async runAllTests() {
    console.log('🚀 Starting WebSocket Tests...');
    
    try {
      await this.registerTestUsers();
      await this.createTestGame();
      await this.connectClients();
      await this.testJoinGame();
      await this.testChat();
      await this.testPlayerReady();
      await this.testHeartbeat();
      await this.testGameState();
      await this.testLeaveGame();
      
    } catch (error) {
      console.error('Test suite failed:', error);
    } finally {
      await this.cleanup();
      this.printSummary();
    }
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  const tester = new WebSocketTester();
  tester.runAllTests().catch(console.error);
}

module.exports = WebSocketTester; 