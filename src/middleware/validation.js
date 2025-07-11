const Joi = require("joi");

// Validation middleware factory
const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, {
      abortEarly: false,
      allowUnknown: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join("."),
        message: detail.message,
        value: detail.context?.value,
      }));

      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors,
      });
    }

    next();
  };
};

// User registration validation schema
const registerSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).required().messages({
    "string.alphanum": "Username must contain only alphanumeric characters",
    "string.min": "Username must be at least 3 characters long",
    "string.max": "Username cannot exceed 30 characters",
    "any.required": "Username is required",
  }),

  email: Joi.string().email().required().messages({
    "string.email": "Please provide a valid email address",
    "any.required": "Email is required",
  }),

  password: Joi.string().min(6).max(100).required().messages({
    "string.min": "Password must be at least 6 characters long",
    "string.max": "Password cannot exceed 100 characters",
    "any.required": "Password is required",
  }),
});

// User login validation schema
const loginSchema = Joi.object({
  username: Joi.string().required().messages({
    "any.required": "Username is required",
  }),

  password: Joi.string().required().messages({
    "any.required": "Password is required",
  }),
});

// User profile update validation schema
const updateProfileSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).optional().messages({
    "string.alphanum": "Username must contain only alphanumeric characters",
    "string.min": "Username must be at least 3 characters long",
    "string.max": "Username cannot exceed 30 characters",
  }),

  email: Joi.string().email().optional().messages({
    "string.email": "Please provide a valid email address",
  }),
});

// Password change validation schema
const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required().messages({
    "any.required": "Current password is required",
  }),

  newPassword: Joi.string().min(6).max(100).required().messages({
    "string.min": "New password must be at least 6 characters long",
    "string.max": "New password cannot exceed 100 characters",
    "any.required": "New password is required",
  }),
});

// Game creation validation schema
const createGameSchema = Joi.object({
  maxPlayers: Joi.number().integer().min(2).max(4).optional().messages({
    "number.base": "Max players must be a number",
    "number.integer": "Max players must be an integer",
    "number.min": "Max players must be at least 2",
    "number.max": "Max players cannot exceed 4",
  }),

  gameSettings: Joi.object().optional().default({}),
});

// Game join validation schema
const joinGameSchema = Joi.object({
  gameId: Joi.number().integer().positive().required().messages({
    "number.base": "Game ID must be a number",
    "number.integer": "Game ID must be an integer",
    "number.positive": "Game ID must be positive",
    "any.required": "Game ID is required",
  }),
});

// Move piece validation schema
const movePieceSchema = Joi.object({
  pieceIndex: Joi.number().integer().min(0).max(3).required().messages({
    "number.base": "Piece index must be a number",
    "number.integer": "Piece index must be an integer",
    "number.min": "Piece index must be at least 0",
    "number.max": "Piece index cannot exceed 3",
    "any.required": "Piece index is required",
  }),

  diceValue: Joi.number().integer().min(1).max(6).required().messages({
    "number.base": "Dice value must be a number",
    "number.integer": "Dice value must be an integer",
    "number.min": "Dice value must be at least 1",
    "number.max": "Dice value cannot exceed 6",
    "any.required": "Dice value is required",
  }),
});

// Query parameters validation schema
const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).optional().default(1),

  limit: Joi.number().integer().min(1).max(100).optional().default(10),
});

// Game list query validation
const gameListSchema = Joi.object({
  status: Joi.string()
    .valid("waiting", "playing", "finished", "cancelled")
    .optional(),

  ...paginationSchema.describe().keys,
});

// Validate query parameters
const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      allowUnknown: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join("."),
        message: detail.message,
        value: detail.context?.value,
      }));

      return res.status(400).json({
        success: false,
        message: "Query validation error",
        errors,
      });
    }

    // Replace query with validated values
    req.query = value;
    next();
  };
};

// Validate URL parameters
const validateParams = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.params, {
      abortEarly: false,
      allowUnknown: false,
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join("."),
        message: detail.message,
        value: detail.context?.value,
      }));

      return res.status(400).json({
        success: false,
        message: "Parameter validation error",
        errors,
      });
    }

    next();
  };
};

// ID parameter validation schema
const idParamSchema = Joi.object({
  id: Joi.number().integer().positive().required().messages({
    "number.base": "ID must be a number",
    "number.integer": "ID must be an integer",
    "number.positive": "ID must be positive",
    "any.required": "ID is required",
  }),
});

module.exports = {
  validate,
  validateQuery,
  validateParams,

  // Schemas
  registerSchema,
  loginSchema,
  updateProfileSchema,
  changePasswordSchema,
  createGameSchema,
  joinGameSchema,
  movePieceSchema,
  paginationSchema,
  gameListSchema,
  idParamSchema,

  // Validation middlewares
  validateRegister: validate(registerSchema),
  validateLogin: validate(loginSchema),
  validateUpdateProfile: validate(updateProfileSchema),
  validateChangePassword: validate(changePasswordSchema),
  validateCreateGame: validate(createGameSchema),
  validateJoinGame: validate(joinGameSchema),
  validateMovePiece: validate(movePieceSchema),
  validateGameList: validateQuery(gameListSchema),
  validateIdParam: validateParams(idParamSchema),
};
