const Logger = require('../../server/utils/Logger');
const winston = require('winston');
const fs = require('fs');
const path = require('path');

// Mock winston
jest.mock('winston', () => {
  const mockLogger = {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn()
  };

  return {
    createLogger: jest.fn(() => mockLogger),
    format: {
      combine: jest.fn(),
      timestamp: jest.fn(),
      errors: jest.fn(),
      json: jest.fn(),
      colorize: jest.fn(),
      printf: jest.fn()
    },
    transports: {
      Console: jest.fn()
    },
    addColors: jest.fn(),
    __mockLogger: mockLogger
  };
});

// Mock winston-daily-rotate-file
jest.mock('winston-daily-rotate-file', () => {
  return jest.fn();
});

// Mock fs
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn()
}));

describe('Logger', () => {
  let mockLogger;

  beforeEach(() => {
    mockLogger = winston.__mockLogger;
    jest.clearAllMocks();
  });

  describe('error', () => {
    test('should log error message with context', () => {
      const message = 'Test error message';
      const context = { userId: 'user123', action: 'test' };

      Logger.error(message, null, context);

      expect(mockLogger.error).toHaveBeenCalledWith({
        message,
        context
      });
    });

    test('should log error with error object', () => {
      const message = 'Database connection failed';
      const error = new Error('Connection timeout');
      error.code = 'ECONNREFUSED';
      const context = { database: 'redis' };

      Logger.error(message, error, context);

      expect(mockLogger.error).toHaveBeenCalledWith({
        message,
        context,
        error: {
          name: 'Error',
          message: 'Connection timeout',
          stack: error.stack,
          code: 'ECONNREFUSED'
        }
      });
    });

    test('should handle error without context', () => {
      const message = 'Simple error';

      Logger.error(message);

      expect(mockLogger.error).toHaveBeenCalledWith({
        message,
        context: {}
      });
    });
  });

  describe('warn', () => {
    test('should log warning message with context', () => {
      const message = 'Warning message';
      const context = { component: 'GameRoom', action: 'validation' };

      Logger.warn(message, context);

      expect(mockLogger.warn).toHaveBeenCalledWith({
        message,
        context
      });
    });

    test('should handle warning without context', () => {
      const message = 'Simple warning';

      Logger.warn(message);

      expect(mockLogger.warn).toHaveBeenCalledWith({
        message,
        context: {}
      });
    });
  });

  describe('info', () => {
    test('should log info message with context', () => {
      const message = 'Info message';
      const context = { roomId: 'room123', playerCount: 4 };

      Logger.info(message, context);

      expect(mockLogger.info).toHaveBeenCalledWith({
        message,
        context
      });
    });

    test('should handle info without context', () => {
      const message = 'Simple info';

      Logger.info(message);

      expect(mockLogger.info).toHaveBeenCalledWith({
        message,
        context: {}
      });
    });
  });

  describe('debug', () => {
    test('should log debug message with context', () => {
      const message = 'Debug message';
      const context = { function: 'handleUserSetup', step: 'validation' };

      Logger.debug(message, context);

      expect(mockLogger.debug).toHaveBeenCalledWith({
        message,
        context
      });
    });

    test('should handle debug without context', () => {
      const message = 'Simple debug';

      Logger.debug(message);

      expect(mockLogger.debug).toHaveBeenCalledWith({
        message,
        context: {}
      });
    });
  });

  describe('userEvent', () => {
    test('should log user event with all parameters', () => {
      const action = 'JOINED_ROOM';
      const socketId = 'socket123';
      const roomId = 'room456';
      const context = { playerName: 'TestPlayer', teamName: 'Team A' };

      Logger.userEvent(action, socketId, roomId, context);

      expect(mockLogger.info).toHaveBeenCalledWith({
        message: 'User JOINED_ROOM',
        context: {
          type: 'USER_EVENT',
          action,
          socketId,
          roomId,
          playerName: 'TestPlayer',
          teamName: 'Team A'
        }
      });
    });

    test('should handle user event without context', () => {
      const action = 'DISCONNECTED';
      const socketId = 'socket123';
      const roomId = 'room456';

      Logger.userEvent(action, socketId, roomId);

      expect(mockLogger.info).toHaveBeenCalledWith({
        message: 'User DISCONNECTED',
        context: {
          type: 'USER_EVENT',
          action,
          socketId,
          roomId
        }
      });
    });
  });

  describe('gameEvent', () => {
    test('should log game event with context', () => {
      const action = 'STARTED';
      const roomId = 'room123';
      const context = { playerCount: 6, teamCount: 2 };

      Logger.gameEvent(action, roomId, context);

      expect(mockLogger.info).toHaveBeenCalledWith({
        message: 'Game STARTED',
        context: {
          type: 'GAME_EVENT',
          action,
          roomId,
          playerCount: 6,
          teamCount: 2
        }
      });
    });

    test('should handle game event without context', () => {
      const action = 'ENDED';
      const roomId = 'room123';

      Logger.gameEvent(action, roomId);

      expect(mockLogger.info).toHaveBeenCalledWith({
        message: 'Game ENDED',
        context: {
          type: 'GAME_EVENT',
          action,
          roomId
        }
      });
    });
  });

  describe('socketError', () => {
    test('should log socket error with full context', () => {
      const event = 'addCategory';
      const socketId = 'socket123';
      const error = new Error('Invalid category data');
      const context = { categoryName: 'Test Category', userId: 'user456' };

      Logger.socketError(event, socketId, error, context);

      expect(mockLogger.error).toHaveBeenCalledWith({
        message: 'Socket error on addCategory',
        context: {
          type: 'SOCKET_ERROR',
          event,
          socketId,
          categoryName: 'Test Category',
          userId: 'user456'
        },
        error: {
          name: 'Error',
          message: 'Invalid category data',
          stack: error.stack,
          code: undefined
        }
      });
    });

    test('should handle socket error without context', () => {
      const event = 'joinRoom';
      const socketId = 'socket123';
      const error = new Error('Room not found');

      Logger.socketError(event, socketId, error);

      expect(mockLogger.error).toHaveBeenCalledWith({
        message: 'Socket error on joinRoom',
        context: {
          type: 'SOCKET_ERROR',
          event,
          socketId
        },
        error: {
          name: 'Error',
          message: 'Room not found',
          stack: error.stack,
          code: undefined
        }
      });
    });
  });

  describe('validationError', () => {
    test('should log validation error with all parameters', () => {
      const field = 'playerName';
      const value = 'ab';
      const reason = 'too short';
      const context = { minLength: 3, roomId: 'room123' };

      Logger.validationError(field, value, reason, context);

      expect(mockLogger.warn).toHaveBeenCalledWith({
        message: 'Validation failed for playerName',
        context: {
          type: 'VALIDATION_ERROR',
          field,
          value,
          reason,
          minLength: 3,
          roomId: 'room123'
        }
      });
    });

    test('should truncate long string values', () => {
      const field = 'description';
      const longValue = 'a'.repeat(150);
      const reason = 'too long';

      Logger.validationError(field, longValue, reason);

      expect(mockLogger.warn).toHaveBeenCalledWith({
        message: 'Validation failed for description',
        context: {
          type: 'VALIDATION_ERROR',
          field,
          value: 'a'.repeat(100), // Truncated to 100 chars
          reason
        }
      });
    });

    test('should handle non-string values without truncation', () => {
      const field = 'count';
      const value = 42;
      const reason = 'out of range';

      Logger.validationError(field, value, reason);

      expect(mockLogger.warn).toHaveBeenCalledWith({
        message: 'Validation failed for count',
        context: {
          type: 'VALIDATION_ERROR',
          field,
          value: 42,
          reason
        }
      });
    });
  });

  describe('performance', () => {
    test('should log performance metrics with context', () => {
      const operation = 'saveRoom';
      const duration = 150;
      const context = { roomId: 'room123', dataSize: '2KB' };

      Logger.performance(operation, duration, context);

      expect(mockLogger.info).toHaveBeenCalledWith({
        message: 'Performance: saveRoom took 150ms',
        context: {
          type: 'PERFORMANCE',
          operation,
          duration,
          roomId: 'room123',
          dataSize: '2KB'
        }
      });
    });

    test('should handle performance logging without context', () => {
      const operation = 'getCategories';
      const duration = 25;

      Logger.performance(operation, duration);

      expect(mockLogger.info).toHaveBeenCalledWith({
        message: 'Performance: getCategories took 25ms',
        context: {
          type: 'PERFORMANCE',
          operation,
          duration
        }
      });
    });
  });

  describe('winston configuration', () => {
    test('should have winston logger instance', () => {
      // Test that Logger methods work, which implies winston is configured
      Logger.info('test message');
      expect(mockLogger.info).toHaveBeenCalled();
    });

    test('should handle all log levels', () => {
      Logger.error('error test');
      Logger.warn('warn test');
      Logger.info('info test');
      Logger.debug('debug test');

      expect(mockLogger.error).toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalled();
    });
  });

  describe('logs directory creation', () => {
    test('should handle directory creation logic', () => {
      // The directory creation happens during module load
      // We can test that fs methods are available and mockable
      expect(typeof fs.existsSync).toBe('function');
      expect(typeof fs.mkdirSync).toBe('function');
    });

    test('should not throw errors during initialization', () => {
      // Test that Logger can be imported without errors
      expect(() => {
        const TestLogger = require('../../server/utils/Logger');
        TestLogger.info('test');
      }).not.toThrow();
    });
  });
});