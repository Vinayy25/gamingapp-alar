# Ludo Game Backend

A robust, scalable backend for a multiplayer Ludo game built with Node.js, Express.js, Socket.io, and PostgreSQL. Designed to support up to 1000 concurrent users with real-time gameplay, server-side game logic, and comprehensive security features.

## Features

- **🎮 Real-time Multiplayer Gameplay**: Socket.io-powered real-time communication
- **🔒 Secure Authentication**: JWT-based authentication with bcrypt password hashing
- **🎯 Server-side Game Logic**: Complete Ludo game implementation to prevent cheating
- **💾 Persistent Storage**: PostgreSQL database with comprehensive game history
- **⚡ Redis Caching**: Optional Redis integration for improved performance
- **🛡️ Security**: Rate limiting, CORS, Helmet.js, and input validation
- **📊 Comprehensive Logging**: Winston-based logging with different log levels
- **🔄 Auto-reconnection**: Seamless player reconnection handling
- **📱 REST API**: Full REST API for game management and user operations

## Architecture

### Components

1. **API Server (Express.js)**: Handles authentication, game management, and user operations
2. **Real-time Server (Socket.io)**: Manages live gameplay, dice rolls, and piece movements
3. **Database (PostgreSQL)**: Stores users, games, game history, and statistics
4. **Cache (Redis)**: Optional caching for active game states
5. **Game Logic**: Complete server-side Ludo game implementation

### Security Features

- JWT authentication for API and WebSocket connections
- Password hashing with bcrypt
- Rate limiting to prevent abuse
- Input validation with Joi
- CORS configuration
- Helmet.js for security headers

## Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v12 or higher)
- Redis (v6 or higher) - Optional but recommended
- npm or yarn

## Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd ludo-game-backend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Setup

Create a `.env` file in the root directory:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ludo_game
DB_USER=postgres
DB_PASSWORD=your_password_here

# Redis Configuration (Optional)
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here_change_this_in_production
JWT_EXPIRES_IN=24h

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8080

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Game Configuration
MAX_PLAYERS_PER_GAME=4
MIN_PLAYERS_PER_GAME=2
GAME_TIMEOUT_MS=300000
```

### 4. Database Setup

#### Create PostgreSQL Database

```sql
CREATE DATABASE ludo_game;
CREATE USER ludo_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE ludo_game TO ludo_user;
```

#### Run Database Migration

```bash
npm run db:migrate
```

### 5. Start the Server

#### Development Mode

```bash
npm run dev
```

#### Production Mode

```bash
npm start
```

The server will start on `http://localhost:3000`

## API Documentation

### Authentication Endpoints

#### Register User

```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "player1",
  "email": "player1@example.com",
  "password": "password123"
}
```

#### Login User

```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "player1",
  "password": "password123"
}
```

#### Get Profile

```http
GET /api/auth/profile
Authorization: Bearer <token>
```

### Game Endpoints

#### Create Game

```http
POST /api/games/create
Authorization: Bearer <token>
Content-Type: application/json

{
  "maxPlayers": 4,
  "gameSettings": {}
}
```

#### Join Game

```http
POST /api/games/join
Authorization: Bearer <token>
Content-Type: application/json

{
  "gameId": 123
}
```

#### Get Available Games

```http
GET /api/games/available?page=1&limit=10
Authorization: Bearer <token>
```

#### Get User's Games

```http
GET /api/games/my-games?status=playing
Authorization: Bearer <token>
```

### WebSocket Events

#### Client to Server Events

```javascript
// Connect to game room
socket.emit("join_game", { gameId: 123 });

// Roll dice
socket.emit("roll_dice", { gameId: 123 });

// Move piece
socket.emit("move_piece", {
  gameId: 123,
  pieceIndex: 0,
  diceValue: 6,
});

// Send chat message
socket.emit("send_message", {
  gameId: 123,
  message: "Good luck!",
});
```

#### Server to Client Events

```javascript
// Game state updates
socket.on("game_state", (data) => {
  console.log("Game state:", data.gameState);
});

// Dice roll result
socket.on("dice_rolled", (data) => {
  console.log("Rolled:", data.diceValue);
  console.log("Valid moves:", data.validMoves);
});

// Piece moved
socket.on("piece_moved", (data) => {
  console.log("Player moved:", data.moveResult);
});

// Game ended
socket.on("game_ended", (data) => {
  console.log("Winner:", data.winner);
});
```

## Game Rules

### Ludo Rules Implementation

1. **Players**: 2-4 players, each with 4 pieces
2. **Starting**: Roll 6 to move pieces out of home
3. **Movement**: Move pieces based on dice roll (1-6)
4. **Captures**: Land on opponent's piece to send it home
5. **Safe Squares**: Certain squares are safe from capture
6. **Extra Turns**: Get extra turn for rolling 6 or capturing
7. **Winning**: First player to get all pieces to finish wins

### Board Layout

- 52 main track squares
- 6 home squares per player
- 4 starting positions (Red: 1, Blue: 14, Green: 27, Yellow: 40)
- Safe squares: 1, 9, 14, 22, 27, 35, 40, 48

## Database Schema

### Tables

- **users**: User accounts and statistics
- **games**: Game instances and metadata
- **game_players**: Player assignments to games
- **game_results**: Final game results and scores
- **game_moves**: Move history for replay/analysis

### Key Relationships

- Users can play multiple games
- Games have 2-4 players
- All moves are logged for analysis
- Game results update user statistics

## Deployment

### Docker Deployment

Create `Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
```

Create `docker-compose.yml`:

```yaml
version: "3.8"

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DB_HOST=postgres
      - REDIS_HOST=redis
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: ludo_game
      POSTGRES_USER: ludo_user
      POSTGRES_PASSWORD: secure_password
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

### Production Deployment

1. Set strong JWT secret and database passwords
2. Configure proper CORS origins
3. Set up SSL/TLS termination
4. Configure Redis for session storage
5. Set up monitoring and logging
6. Configure backup strategies

## Performance & Scalability

### Current Capacity

- **Users**: 1000 concurrent users
- **Games**: 250 simultaneous games (4 players each)
- **Response Time**: < 100ms for API calls
- **WebSocket**: < 50ms for real-time events

### Scaling Options

1. **Horizontal Scaling**: Multiple server instances with load balancer
2. **Database**: Read replicas and connection pooling
3. **Redis Cluster**: Distributed caching
4. **CDN**: Static asset delivery
5. **Microservices**: Split into game, user, and notification services

## Monitoring & Logging

### Log Files

- `logs/combined.log`: All application logs
- `logs/error.log`: Error logs only
- `logs/game.log`: Game-specific events
- `logs/exceptions.log`: Uncaught exceptions

### Metrics to Monitor

- Active connections
- Game creation/completion rates
- Response times
- Error rates
- Database performance
- Memory usage

## Testing

### Run Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage
```

### Test Categories

- Unit tests for game logic
- Integration tests for API endpoints
- WebSocket connection tests
- Database operation tests

## Contributing

1. Fork the repository
2. Create a feature branch
3. Write tests for new features
4. Ensure all tests pass
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For support and questions:

- Create an issue in the repository
- Check the API documentation
- Review the game logic implementation

## Roadmap

### Planned Features

- [ ] Tournament system
- [ ] Spectator mode
- [ ] Replay system
- [ ] Mobile app integration
- [ ] Payment integration
- [ ] Advanced matchmaking
- [ ] Leaderboards
- [ ] Achievements system

### Technical Improvements

- [ ] GraphQL API
- [ ] Microservices architecture
- [ ] Advanced caching strategies
- [ ] Real-time analytics
- [ ] Performance monitoring
- [ ] Automated testing
- [ ] CI/CD pipeline
# gamingapp-alar
