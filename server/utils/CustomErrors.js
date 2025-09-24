/**
 * Custom error classes for structured error handling
 * Provides typed errors with context, status codes, and JSON serialization
 */

/**
 * Base error class with structured context and metadata
 * @extends Error
 */
class BaseError extends Error {
  /**
   * Create a structured error with context and metadata
   * @param {string} message - Error message
   * @param {string} code - Error code for programmatic handling
   * @param {number} statusCode - HTTP status code (default: 500)
   * @param {Object} context - Additional context data
   */
  constructor(message, code, statusCode = 500, context = {}) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.context = context;
    this.timestamp = new Date().toISOString();
    
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Serialize error to JSON for logging and API responses
   * @returns {Object} JSON representation of the error
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      context: this.context,
      timestamp: this.timestamp
    };
  }
}

/**
 * Validation error for invalid user input or data
 * @extends BaseError
 */
class ValidationError extends BaseError {
  /**
   * @param {string} message - Validation error message
   * @param {string} field - Field that failed validation
   * @param {*} value - Value that failed validation
   * @param {Object} context - Additional context
   */
  constructor(message, field, value, context = {}) {
    super(message, 'VALIDATION_ERROR', 400, { field, value, ...context });
  }
}

/**
 * Game logic error for invalid game state or actions
 * @extends BaseError
 */
class GameError extends BaseError {
  /**
   * @param {string} message - Game error message
   * @param {string} gameState - Current game state
   * @param {Object} context - Additional context
   */
  constructor(message, gameState, context = {}) {
    super(message, 'GAME_ERROR', 400, { gameState, ...context });
  }
}

/**
 * Room-related error for room operations
 * @extends BaseError
 */
class RoomError extends BaseError {
  /**
   * @param {string} message - Room error message
   * @param {string} roomId - Room identifier
   * @param {Object} context - Additional context
   */
  constructor(message, roomId, context = {}) {
    super(message, 'ROOM_ERROR', 400, { roomId, ...context });
  }
}

/**
 * User-related error for user operations
 * @extends BaseError
 */
class UserError extends BaseError {
  /**
   * @param {string} message - User error message
   * @param {string} userId - User identifier
   * @param {Object} context - Additional context
   */
  constructor(message, userId, context = {}) {
    super(message, 'USER_ERROR', 400, { userId, ...context });
  }
}

/**
 * Storage operation error for database/file operations
 * @extends BaseError
 */
class StorageError extends BaseError {
  /**
   * @param {string} message - Storage error message
   * @param {string} operation - Storage operation that failed
   * @param {Object} context - Additional context
   */
  constructor(message, operation, context = {}) {
    super(message, 'STORAGE_ERROR', 500, { operation, ...context });
  }
}

/**
 * Socket communication error
 * @extends BaseError
 */
class SocketError extends BaseError {
  /**
   * @param {string} message - Socket error message
   * @param {string} event - Socket event name
   * @param {string} socketId - Socket connection ID
   * @param {Object} context - Additional context
   */
  constructor(message, event, socketId, context = {}) {
    super(message, 'SOCKET_ERROR', 400, { event, socketId, ...context });
  }
}

/**
 * Configuration or setup error
 * @extends BaseError
 */
class ConfigurationError extends BaseError {
  /**
   * @param {string} message - Configuration error message
   * @param {string} config - Configuration that failed
   * @param {Object} context - Additional context
   */
  constructor(message, config, context = {}) {
    super(message, 'CONFIGURATION_ERROR', 500, { config, ...context });
  }
}

// Error codes for consistent error handling
const ERROR_CODES = {
  // Validation errors
  INVALID_ROOM_ID: 'INVALID_ROOM_ID',
  INVALID_USER_NAME: 'INVALID_USER_NAME',
  INVALID_TEAM_NAME: 'INVALID_TEAM_NAME',
  INVALID_CATEGORY: 'INVALID_CATEGORY',
  DUPLICATE_NAME: 'DUPLICATE_NAME',
  
  // Game errors
  GAME_NOT_STARTED: 'GAME_NOT_STARTED',
  GAME_ALREADY_STARTED: 'GAME_ALREADY_STARTED',
  INSUFFICIENT_PLAYERS: 'INSUFFICIENT_PLAYERS',
  INVALID_TURN_ACTION: 'INVALID_TURN_ACTION',
  NO_CATEGORIES_AVAILABLE: 'NO_CATEGORIES_AVAILABLE',
  
  // Room errors
  ROOM_NOT_FOUND: 'ROOM_NOT_FOUND',
  ROOM_FULL: 'ROOM_FULL',
  MAX_TEAMS_REACHED: 'MAX_TEAMS_REACHED',
  
  // User errors
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  USER_NOT_IN_ROOM: 'USER_NOT_IN_ROOM',
  UNAUTHORIZED_ACTION: 'UNAUTHORIZED_ACTION',
  
  // Storage errors
  STORAGE_READ_FAILED: 'STORAGE_READ_FAILED',
  STORAGE_WRITE_FAILED: 'STORAGE_WRITE_FAILED',
  DATA_CORRUPTION: 'DATA_CORRUPTION',
  
  // Socket errors
  INVALID_EVENT_DATA: 'INVALID_EVENT_DATA',
  CONNECTION_FAILED: 'CONNECTION_FAILED',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED'
};

module.exports = {
  BaseError,
  ValidationError,
  GameError,
  RoomError,
  UserError,
  StorageError,
  SocketError,
  ConfigurationError,
  ERROR_CODES
};