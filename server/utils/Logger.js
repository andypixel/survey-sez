const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
const fs = require('fs');

const logsDir = path.join(process.cwd(), 'logs');
try {
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
    console.log('Created logs directory:', logsDir);
  }
} catch (error) {
  console.error('Failed to create logs directory:', error);
}

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  debug: 'blue'
};

winston.addColors(colors);

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let log = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`;
    }
    return log;
  })
);

const transports = [
  new winston.transports.Console({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: process.env.NODE_ENV === 'production' ? logFormat : consoleFormat
  })
];

// File transports for production
if (process.env.NODE_ENV === 'production') {
  console.log('Setting up file logging for production mode');
  
  const errorTransport = new DailyRotateFile({
    filename: path.join(logsDir, 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    level: 'error',
    format: logFormat,
    maxSize: '20m',
    maxFiles: '14d'
  });
  transports.push(errorTransport);

  const combinedTransport = new DailyRotateFile({
    filename: path.join(logsDir, 'combined-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    format: logFormat,
    maxSize: '20m',
    maxFiles: '7d'
  });
  transports.push(combinedTransport);
  
  console.log('File transports added:', transports.length, 'total transports');
}

const logger = winston.createLogger({
  levels,
  transports,
  exitOnError: false
});

/**
 * Enhanced logging system with structured output and context
 * Provides different log levels and specialized logging methods
 */
class Logger {
  /**
   * Log error with optional error object and context
   * @param {string} message - Error message
   * @param {Error|null} error - Error object with stack trace
   * @param {Object} context - Additional context data
   */
  static error(message, error = null, context = {}) {
    const logData = {
      message,
      context,
      ...(error && {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
          code: error.code
        }
      })
    };
    logger.error(logData);
  }

  /**
   * Log warning message with context
   * @param {string} message - Warning message
   * @param {Object} context - Additional context data
   */
  static warn(message, context = {}) {
    logger.warn({ message, context });
  }

  /**
   * Log info message with context
   * @param {string} message - Info message
   * @param {Object} context - Additional context data
   */
  static info(message, context = {}) {
    logger.info({ message, context });
  }

  /**
   * Log debug message with context
   * @param {string} message - Debug message
   * @param {Object} context - Additional context data
   */
  static debug(message, context = {}) {
    logger.debug({ message, context });
  }

  /**
   * Log user-related events (connect, disconnect, join, etc.)
   * @param {string} action - User action performed
   * @param {string} socketId - Socket connection ID
   * @param {string} roomId - Room identifier
   * @param {Object} context - Additional context data
   */
  static userEvent(action, socketId, roomId, context = {}) {
    this.info(`User ${action}`, {
      type: 'USER_EVENT',
      action,
      socketId,
      roomId,
      ...context
    });
  }

  /**
   * Log game-related events (start, end, turn changes, etc.)
   * @param {string} action - Game action performed
   * @param {string} roomId - Room identifier
   * @param {Object} context - Additional context data
   */
  static gameEvent(action, roomId, context = {}) {
    this.info(`Game ${action}`, {
      type: 'GAME_EVENT',
      action,
      roomId,
      ...context
    });
  }

  /**
   * Log socket-related errors with event context
   * @param {string} event - Socket event name
   * @param {string} socketId - Socket connection ID
   * @param {Error} error - Error object
   * @param {Object} context - Additional context data
   */
  static socketError(event, socketId, error, context = {}) {
    this.error(`Socket error on ${event}`, error, {
      type: 'SOCKET_ERROR',
      event,
      socketId,
      ...context
    });
  }

  /**
   * Log validation errors with field details
   * @param {string} field - Field that failed validation
   * @param {*} value - Value that failed (truncated if string)
   * @param {string} reason - Reason for validation failure
   * @param {Object} context - Additional context data
   */
  static validationError(field, value, reason, context = {}) {
    this.warn(`Validation failed for ${field}`, {
      type: 'VALIDATION_ERROR',
      field,
      value: typeof value === 'string' ? value.substring(0, 100) : value,
      reason,
      ...context
    });
  }

  /**
   * Log performance metrics for operations
   * @param {string} operation - Operation name
   * @param {number} duration - Duration in milliseconds
   * @param {Object} context - Additional context data
   */
  static performance(operation, duration, context = {}) {
    this.info(`Performance: ${operation} took ${duration}ms`, {
      type: 'PERFORMANCE',
      operation,
      duration,
      ...context
    });
  }
}

module.exports = Logger;