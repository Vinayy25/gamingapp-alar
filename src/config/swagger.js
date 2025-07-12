const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Ludo Game Backend API",
      version: "1.0.0",
      description:
        "Complete API documentation for the multiplayer Ludo game backend with authentication, game management, and real-time features.",
      contact: {
        name: "Ludo Game Team",
        email: "support@ludogame.com",
      },
      license: {
        name: "MIT",
        url: "https://opensource.org/licenses/MIT",
      },
    },
    servers: [
      {
        url: "http://localhost:3000",
        description: "Development server",
      },
      {
        url: "https://api.ludogame.com",
        description: "Production server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Enter JWT token obtained from login",
        },
      },
      schemas: {
        User: {
          type: "object",
          required: ["username", "email", "password"],
          properties: {
            id: {
              type: "integer",
              description: "User ID",
            },
            username: {
              type: "string",
              description: "Unique username",
              minLength: 3,
              maxLength: 50,
            },
            email: {
              type: "string",
              format: "email",
              description: "User email address",
            },
            password: {
              type: "string",
              description: "User password",
              minLength: 6,
            },
            created_at: {
              type: "string",
              format: "date-time",
              description: "Account creation timestamp",
            },
            is_active: {
              type: "boolean",
              description: "Account status",
            },
            total_games_played: {
              type: "integer",
              description: "Total number of games played",
            },
            total_games_won: {
              type: "integer",
              description: "Total number of games won",
            },
          },
        },
        Game: {
          type: "object",
          properties: {
            id: {
              type: "integer",
              description: "Game ID",
            },
            status: {
              type: "string",
              enum: ["waiting", "playing", "finished", "cancelled"],
              description: "Current game status",
            },
            max_players: {
              type: "integer",
              minimum: 2,
              maximum: 4,
              description: "Maximum number of players",
            },
            current_players: {
              type: "integer",
              description: "Current number of players",
            },
            created_at: {
              type: "string",
              format: "date-time",
              description: "Game creation timestamp",
            },
            game_settings: {
              type: "object",
              description: "Game configuration settings",
            },
          },
        },
        AuthResponse: {
          type: "object",
          properties: {
            success: {
              type: "boolean",
            },
            message: {
              type: "string",
            },
            token: {
              type: "string",
              description: "JWT authentication token",
            },
            user: {
              $ref: "#/components/schemas/User",
            },
          },
        },
        Error: {
          type: "object",
          properties: {
            success: {
              type: "boolean",
              example: false,
            },
            message: {
              type: "string",
              description: "Error message",
            },
            errors: {
              type: "array",
              items: {
                type: "string",
              },
              description: "Detailed error messages",
            },
            timestamp: {
              type: "string",
              format: "date-time",
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: [
    "./src/routes/*.js", // Path to the API route files
    "./src/controllers/*.js", // Include controllers for additional documentation
  ],
};

const specs = swaggerJsdoc(options);

module.exports = {
  specs,
  swaggerUi,
  swaggerServe: swaggerUi.serve,
  swaggerSetup: swaggerUi.setup(specs, {
    explorer: true,
    customCss: ".swagger-ui .topbar { display: none }",
    customSiteTitle: "Ludo Game API Documentation",
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      showExtensions: true,
      showCommonExtensions: true,
    },
  }),
};
