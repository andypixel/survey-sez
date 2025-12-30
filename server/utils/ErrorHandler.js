const Logger = require('./Logger');
const { BaseError, ValidationError, ERROR_CODES } = require('./CustomErrors');

/**
 * Centralized error handling utilities for socket events, HTTP requests, and async operations
 * Provides structured error logging, client error responses, and global error handling setup
 */
class ErrorHandler {
  /**
   * Handle socket event errors with proper logging and user feedback
   * @param {Object} socket - Socket.IO socket instance
   * @param {string} event - Socket event name that caused the error
   * @param {Error} error - Error object to handle
   * @param {Object} context - Additional context for logging
   */
  static handleSocketError(socket, event, error, context = {}) {
    const socketId = socket?.id || 'unknown';
    
    if (error instanceof BaseError) {
      Logger.socketError(event, socketId, error, { ...context, ...error.context });
    } else {
      Logger.socketError(event, socketId, error, context);
    }

    const errorResponse = this.formatErrorForClient(error, event);
    const errorEvent = this.getErrorEventType(event, error);
    
    if (socket && socket.emit) {
      Logger.debug(`Emitting ${errorEvent} to client`, { 
        socketId: socket.id, 
        errorEvent,
        errorResponse,
        errorType: error.constructor.name 
      });
      socket.emit(errorEvent, errorResponse);
    } else {
      Logger.warn('Cannot emit error - invalid socket', { socketId: socket?.id });
    }
  }

  /**
   * Handle async socket event wrapper with error catching
   */
  static wrapSocketHandler(handler, eventName) {
    return async (...args) => {
      try {
        await handler(...args);
      } catch (error) {
        const socket = args[0];
        this.handleSocketError(socket, eventName || 'unknown', error);
      }
    };
  }

  /**
   * Handle storage operation errors with logging and re-throwing
   * @param {string} operation - Storage operation that failed
   * @param {Error} error - Error from storage operation
   * @param {Object} context - Additional context for logging
   * @throws {Error} Re-throws the original error after logging
   */
  static handleStorageError(operation, error, context = {}) {
    Logger.error(`Storage operation failed: ${operation}`, error, {
      type: 'STORAGE_ERROR',
      operation,
      ...context
    });
    
    // Could implement retry logic here
    throw error;
  }

  /**
   * Handle validation errors with detailed context and throw ValidationError
   * @param {string} field - Field that failed validation
   * @param {*} value - Value that failed validation
   * @param {string} reason - Reason for validation failure
   * @param {Object} context - Additional context data
   * @throws {ValidationError} Structured validation error
   */
  static handleValidationError(field, value, reason, context = {}) {
    Logger.validationError(field, value, reason, context);
    
    const error = new ValidationError(
      `Validation failed for ${field}: ${reason}`,
      field,
      value,
      context
    );
    
    throw error;
  }

  /**
   * Format error for client consumption, removing sensitive server details
   * @param {Error} error - Error object to format
   * @param {string} event - Event name that caused the error
   * @returns {Object} Client-safe error object
   */
  static formatErrorForClient(error, event = 'unknown') {
    if (error instanceof BaseError) {
      return {
        message: error.message,
        code: error.code,
        event,
        timestamp: error.timestamp
      };
    }

    // For unknown errors, provide generic message
    return {
      message: 'An unexpected error occurred',
      code: 'INTERNAL_ERROR',
      event,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Determine appropriate error event type based on context
   */
  static getErrorEventType(event, error) {
    // Map based on socket event context (most reliable)
    switch (event) {
      case 'addCategory':
        return 'categoryError';
      case 'userSetup':
      case 'joinRoom':
        return 'setupError';
      case 'startGame':
      case 'beginTurn':
      case 'endGuessing':
      case 'continueTurn':
        return 'gameError';
      default:
        // Fallback to error code mapping
        if (error instanceof BaseError) {
          switch (error.code) {
            case ERROR_CODES.INVALID_CATEGORY:
            case ERROR_CODES.DUPLICATE_NAME:
              return 'categoryError';
            case ERROR_CODES.INVALID_USER_NAME:
            case ERROR_CODES.INVALID_TEAM_NAME:
            case ERROR_CODES.MAX_TEAMS_REACHED:
              return 'setupError';
            case ERROR_CODES.GAME_NOT_STARTED:
            case ERROR_CODES.INVALID_TURN_ACTION:
            case ERROR_CODES.NO_CATEGORIES_AVAILABLE:
              return 'gameError';
            default:
              return 'error';
          }
        }
        return 'error';
    }
  }

  /**
   * Express error middleware for HTTP endpoints
   */
  static expressErrorHandler(err, req, res, next) {
    Logger.error('Express error', err, {
      type: 'HTTP_ERROR',
      method: req.method,
      url: req.url,
      ip: req.ip
    });

    if (err instanceof BaseError) {
      return res.status(err.statusCode).json(err.toJSON());
    }

    res.status(500).json({
      message: 'Internal server error',
      code: 'INTERNAL_ERROR',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Process uncaught exceptions and unhandled rejections
   */
  static setupGlobalErrorHandlers() {
    process.on('uncaughtException', (error) => {
      Logger.error('Uncaught Exception', error, { type: 'UNCAUGHT_EXCEPTION' });
      
      // Graceful shutdown
      setTimeout(() => {
        process.exit(1);
      }, 1000);
    });

    process.on('unhandledRejection', (reason, promise) => {
      Logger.error('Unhandled Rejection', reason, { 
        type: 'UNHANDLED_REJECTION',
        promise: promise.toString()
      });
    });
  }

  /**
   * Performance monitoring wrapper
   */
  static withPerformanceLogging(operation, fn) {
    return async (...args) => {
      const start = Date.now();
      try {
        const result = await fn(...args);
        const duration = Date.now() - start;
        Logger.performance(operation, duration);
        return result;
      } catch (error) {
        const duration = Date.now() - start;
        Logger.performance(`${operation} (failed)`, duration);
        throw error;
      }
    };
  }
}

module.exports = ErrorHandler;