# WebSocket Testing Guide

This guide explains how to test the real-time multiplayer functionality of the Ludo game backend using WebSockets.

## Prerequisites

Before testing WebSocket functionality, ensure:

1. **Server is running**: The backend server must be running on port 3000
2. **Database is connected**: PostgreSQL database is accessible
3. **Environment configured**: `.env` file is properly set up
4. **Dependencies installed**: All npm packages are installed

## Quick Test Commands

```bash
# First, create your .env file
cp env-template.txt .env

# Start the server (in one terminal)
npm run start:no-redis

# Test WebSocket functionality (in another terminal)
npm run test:websocket

# Test game logic via WebSocket (advanced)
npm run test:gamelogic

# Run all tests
npm run test:all
```

## WebSocket Events Reference

### Client to Server Events

| Event            | Description            | Payload                                                     |
| ---------------- | ---------------------- | ----------------------------------------------------------- |
| `join_game`      | Join a game room       | `{ gameId: number }`                                        |
| `leave_game`     | Leave a game room      | `{ gameId: number }`                                        |
| `start_game`     | Start a game           | `{ gameId: number }`                                        |
| `roll_dice`      | Roll dice              | `{ gameId: number }`                                        |
| `move_piece`     | Move a piece           | `{ gameId: number, pieceIndex: number, diceValue: number }` |
| `get_game_state` | Get current game state | `{ gameId: number }`                                        |
| `send_message`   | Send chat message      | `{ gameId: number, message: string }`                       |
| `player_ready`   | Set ready status       | `{ gameId: number, ready: boolean }`                        |
| `ping`           | Heartbeat              | `{}`                                                        |

### Server to Client Events

| Event                 | Description           | Payload                                                                         |
| --------------------- | --------------------- | ------------------------------------------------------------------------------- |
| `game_joined`         | Joined game room      | `{ gameState: object }`                                                         |
| `game_left`           | Left game room        | `{ gameId: number }`                                                            |
| `game_started`        | Game started          | `{ gameState: object }`                                                         |
| `game_state`          | Current game state    | `{ gameState: object }`                                                         |
| `dice_rolled`         | Dice roll result      | `{ diceValue: number, validMoves: array }`                                      |
| `piece_moved`         | Piece moved           | `{ playerId: number, username: string, moveResult: object, gameState: object }` |
| `game_ended`          | Game finished         | `{ winner: object, gameState: object }`                                         |
| `message_received`    | Chat message          | `{ playerId: number, username: string, message: string, timestamp: string }`    |
| `player_joined`       | Player joined         | `{ playerId: number, username: string }`                                        |
| `player_left`         | Player left           | `{ playerId: number, username: string }`                                        |
| `player_disconnected` | Player disconnected   | `{ playerId: number, username: string }`                                        |
| `player_reconnected`  | Player reconnected    | `{ playerId: number, username: string }`                                        |
| `player_rolled_dice`  | Another player rolled | `{ playerId: number, username: string, diceValue: number }`                     |
| `player_ready_status` | Player ready status   | `{ playerId: number, username: string, ready: boolean }`                        |
| `error`               | Error occurred        | `{ message: string }`                                                           |
| `pong`                | Heartbeat response    | `{ timestamp: number }`                                                         |

## Test Scripts Explained

### 1. Basic WebSocket Test (`websocket-test.js`)

Tests core WebSocket functionality:

```bash
npm run test:websocket
```

**What it tests:**

- User registration/login
- Game creation
- WebSocket connection establishment
- Joining game rooms
- Chat functionality
- Player ready status
- Heartbeat/ping-pong
- Game state requests
- Leaving games

**Expected Output:**

```
=== Registering Test Users ===
✅ Register player1
✅ Register player2
✅ Register player3
✅ Register player4

=== Creating Test Game ===
✅ Create Game - Game ID: 123

=== Connecting WebSocket Clients ===
✅ Connect Player1
✅ Connect Player2
🔌 Player1 connected
🔌 Player2 connected

=== Testing Join Game ===
✅ Player1 Join Game - Game ID: 123
✅ Player2 Join Game - Game ID: 123

=== Testing Chat ===
✅ Chat Message Received - From: player1, Message: Hello from WebSocket test!

=== Test Summary ===
✅ Passed: 15
❌ Failed: 0
📊 Total: 15
📈 Success Rate: 100.0%
```

### 2. Game Logic Test (`game-logic-test.js`)

Tests actual gameplay mechanics:

```bash
npm run test:gamelogic
```

**What it tests:**

- User authentication
- Game creation and joining
- WebSocket game room management
- Starting games
- Dice rolling
- Piece movement
- Chat during gameplay
- Game state synchronization

**Expected Output:**

```
🎮 Starting Game Logic WebSocket Tests...

=== Setting Up Users ===
✅ Register gamer1
✅ Register gamer2

=== Creating Game ===
✅ Create Game - Game ID: 456

=== Joining Game ===
✅ Join Game - Player 2 joined game 456

=== Connecting WebSockets ===
✅ Connect Player1
✅ Connect Player2
🔌 Player1 connected to WebSocket
🔌 Player2 connected to WebSocket

=== Testing Join Game Rooms ===
✅ Player1 Join Game Room - Status: waiting
✅ Player2 Join Game Room - Status: waiting

=== Testing Start Game ===
✅ Start Game - Current player: gamer1
🎮 Game started! Current turn: 0
🎮 Current player: gamer1

=== Testing Dice Roll ===
✅ Dice Roll - Rolled: 6, Valid moves: 4
🎲 Player1 rolled: 6
🎲 Valid moves: 4

=== Testing Piece Movement ===
✅ Piece Movement - From: 0 → To: 1
🔄 gamer1 moved piece:
   From: 0 → To: 1
   Captured: false
   Extra turn: true

=== Testing Chat ===
✅ Chat Message - From: gamer1, Message: Good luck! 🎮
💬 gamer1: Good luck! 🎮

=== Test Summary ===
✅ Passed: 12
❌ Failed: 0
📊 Total: 12
📈 Success Rate: 100.0%
```

## Manual WebSocket Testing

### Using Browser Console

1. **Start the server:**

   ```bash
   npm run start:no-redis
   ```

2. **Open browser console** and connect to WebSocket:

   ```javascript
   // Connect to WebSocket
   const socket = io("http://localhost:3000", {
     auth: {
       token: "your_jwt_token_here",
     },
   });

   // Listen for events
   socket.on("connect", () => console.log("Connected!"));
   socket.on("dice_rolled", (data) => console.log("Dice:", data));
   socket.on("piece_moved", (data) => console.log("Move:", data));

   // Send events
   socket.emit("join_game", { gameId: 123 });
   socket.emit("roll_dice", { gameId: 123 });
   ```

### Using Postman or Socket.io Client

1. **Install Socket.io client** (if not already installed):

   ```bash
   npm install socket.io-client
   ```

2. **Create test script:**

   ```javascript
   const io = require("socket.io-client");

   const socket = io("http://localhost:3000", {
     auth: { token: "your_jwt_token" },
   });

   socket.on("connect", () => {
     console.log("Connected to WebSocket");
     socket.emit("join_game", { gameId: 123 });
   });

   socket.on("game_joined", (data) => {
     console.log("Joined game:", data);
   });
   ```

## Common Issues and Troubleshooting

### 1. Connection Refused

```
❌ Connect Player1 - Connection refused
```

**Solution:** Make sure the server is running on port 3000:

```bash
npm run start:no-redis
```

### 2. Authentication Failed

```
❌ Connect Player1 - Authentication failed
```

**Solution:** Check that JWT tokens are valid and users are registered:

```bash
# Check if users exist in database
npm run test:api
```

### 3. Game Not Found

```
❌ Player1 Join Game - Game not found
```

**Solution:** Ensure the game exists and is accessible:

```bash
# Check game creation
curl -X POST http://localhost:3000/api/games/create \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"maxPlayers": 4}'
```

### 4. WebSocket Timeout

```
❌ Dice Roll - Timeout
```

**Solution:** Check server logs for errors:

```bash
tail -f logs/app.log
```

### 5. Database Connection Issues

```
❌ Create Game - Database connection failed
```

**Solution:** Verify PostgreSQL is running and credentials are correct:

```bash
# Check database connection
psql -h localhost -U ludo_user -d ludo_game
```

## Performance Testing

### Load Testing with Multiple Clients

```javascript
// load-test.js
const io = require("socket.io-client");

const clients = [];
const numClients = 10;

for (let i = 0; i < numClients; i++) {
  const socket = io("http://localhost:3000");
  clients.push(socket);

  socket.on("connect", () => {
    console.log(`Client ${i} connected`);
    socket.emit("join_game", { gameId: 123 });
  });
}

// Simulate dice rolls
setInterval(() => {
  const randomClient = clients[Math.floor(Math.random() * clients.length)];
  randomClient.emit("roll_dice", { gameId: 123 });
}, 1000);
```

### Latency Testing

```javascript
// Test ping-pong latency
socket.on("pong", (data) => {
  const latency = Date.now() - data.timestamp;
  console.log(`Latency: ${latency}ms`);
});

setInterval(() => {
  socket.emit("ping");
}, 5000);
```

## Integration with Unity

### Unity WebSocket Client Example

```csharp
using System;
using UnityEngine;
using SocketIOClient;

public class LudoGameClient : MonoBehaviour
{
    private SocketIOUnity socket;

    void Start()
    {
        var uri = new Uri("http://localhost:3000");
        socket = new SocketIOUnity(uri, new SocketIOOptions
        {
            Auth = new { token = "your_jwt_token" }
        });

        socket.OnConnected += OnConnected;
        socket.On("dice_rolled", OnDiceRolled);
        socket.On("piece_moved", OnPieceMoved);
        socket.On("game_ended", OnGameEnded);

        socket.Connect();
    }

    private void OnConnected(object sender, EventArgs e)
    {
        Debug.Log("Connected to Ludo Game Server");
        socket.Emit("join_game", new { gameId = 123 });
    }

    private void OnDiceRolled(SocketIOResponse response)
    {
        var data = response.GetValue<DiceRollData>();
        Debug.Log($"Dice rolled: {data.diceValue}");
    }

    public void RollDice()
    {
        socket.Emit("roll_dice", new { gameId = 123 });
    }

    public void MovePiece(int pieceIndex, int diceValue)
    {
        socket.Emit("move_piece", new {
            gameId = 123,
            pieceIndex = pieceIndex,
            diceValue = diceValue
        });
    }
}
```

## Best Practices

1. **Always authenticate** WebSocket connections with JWT tokens
2. **Handle disconnections** gracefully with reconnection logic
3. **Validate game actions** server-side to prevent cheating
4. **Use rooms** for game isolation and efficient broadcasting
5. **Implement heartbeat** to detect and handle connection issues
6. **Rate limit** WebSocket events to prevent spam
7. **Log all game events** for debugging and audit trails

## Monitoring and Debugging

### Server Logs

```bash
# Monitor real-time logs
tail -f logs/app.log

# Filter WebSocket events
grep "Socket" logs/app.log

# Monitor errors
grep "ERROR" logs/app.log
```

### WebSocket Debug Events

```javascript
socket.on("connect", () => console.log("Connected"));
socket.on("disconnect", () => console.log("Disconnected"));
socket.on("error", (error) => console.log("Error:", error));
socket.on("connect_error", (error) => console.log("Connection Error:", error));
```

This comprehensive testing approach ensures your WebSocket functionality works correctly for multiplayer Ludo gameplay!
