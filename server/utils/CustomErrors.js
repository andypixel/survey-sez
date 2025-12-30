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

// Error codes for consistent error handling
const ERROR_CODES = {
  // Validation errors
  INVALID_USER_NAME: 'INVALID_USER_NAME',
  INVALID_TEAM_NAME: 'INVALID_TEAM_NAME',
  INVALID_CATEGORY: 'INVALID_CATEGORY',
  DUPLICATE_NAME: 'DUPLICATE_NAME',
  
  // Game errors
  GAME_NOT_STARTED: 'GAME_NOT_STARTED',
  INVALID_TURN_ACTION: 'INVALID_TURN_ACTION',
  NO_CATEGORIES_AVAILABLE: 'NO_CATEGORIES_AVAILABLE',
  
  // Room errors
  MAX_TEAMS_REACHED: 'MAX_TEAMS_REACHED'
};

module.exports = {
  BaseError,
  ValidationError,
  StorageError,
  SocketError,
  ERROR_CODES
};