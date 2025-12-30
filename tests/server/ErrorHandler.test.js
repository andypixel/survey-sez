const ErrorHandler = require('../../server/utils/ErrorHandler');
const Logger = require('../../server/utils/Logger');
const { BaseError, ValidationError, ERROR_CODES } = require('../../server/utils/CustomErrors');

// Mock Logger
jest.mock('../../server/utils/Logger', () => ({
  socketError: jest.fn(),
  error: jest.fn(),
  validationError: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  performance: jest.fn()
}));

// Mock process.exit to prevent test termination
const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});

describe('ErrorHandler', () => {
  let mockSocket;

  beforeEach(() => {
    mockSocket = {
      id: 'socket123',
      emit: jest.fn()
    };
    jest.clearAllMocks();
  });

  describe('handleSocketError', () => {
    test('should handle BaseError with proper logging and client response', () => {
      const error = new ValidationError('Invalid name', 'playerName', 'ab');
      
      ErrorHandler.handleSocketError(mockSocket, 'userSetup', error, { roomId: 'room1' });

      expect(Logger.socketError).toHaveBeenCalledWith(
        'userSetup',
        'socket123',
        error,
        { roomId: 'room1', field: 'playerName', value: 'ab' }
      );
      expect(mockSocket.emit).toHaveBeenCalledWith('setupError', {
        message: 'Invalid name',
        code: 'VALIDATION_ERROR',
        event: 'userSetup',
        timestamp: error.timestamp
      });
    });

    test('should handle generic Error with fallback response', () => {
      const error = new Error('Database connection failed');
      
      ErrorHandler.handleSocketError(mockSocket, 'addCategory', error);

      expect(Logger.socketError).toHaveBeenCalledWith('addCategory', 'socket123', error, {});
      expect(mockSocket.emit).toHaveBeenCalledWith('categoryError', {
        message: 'An unexpected error occurred',
        code: 'INTERNAL_ERROR',
        event: 'addCategory',
        timestamp: expect.any(String)
      });
    });

    test('should handle invalid socket gracefully', () => {
      const error = new Error('Test error');
      
      ErrorHandler.handleSocketError(null, 'test', error);

      expect(Logger.warn).toHaveBeenCalledWith('Cannot emit error - invalid socket', { socketId: undefined });
      expect(Logger.socketError).toHaveBeenCalled();
    });

    test('should handle socket without emit method', () => {
      const invalidSocket = { id: 'socket123' };
      const error = new Error('Test error');
      
      ErrorHandler.handleSocketError(invalidSocket, 'test', error);

      expect(Logger.warn).toHaveBeenCalledWith('Cannot emit error - invalid socket', { socketId: 'socket123' });
    });
  });

  describe('wrapSocketHandler', () => {
    test('should execute handler successfully', async () => {
      const handler = jest.fn().mockResolvedValue('success');
      const wrappedHandler = ErrorHandler.wrapSocketHandler(handler, 'testEvent');

      await wrappedHandler(mockSocket, { data: 'test' });

      expect(handler).toHaveBeenCalledWith(mockSocket, { data: 'test' });
    });

    test('should catch and handle errors from handler', async () => {
      const error = new ValidationError('Invalid data', 'field', 'value');
      const handler = jest.fn().mockRejectedValue(error);
      const wrappedHandler = ErrorHandler.wrapSocketHandler(handler, 'testEvent');

      await wrappedHandler(mockSocket, { data: 'test' });

      expect(handler).toHaveBeenCalledWith(mockSocket, { data: 'test' });
      expect(Logger.socketError).toHaveBeenCalledWith('testEvent', 'socket123', error, expect.any(Object));
      expect(mockSocket.emit).toHaveBeenCalled();
    });
  });

  describe('handleStorageError', () => {
    test('should log storage error and re-throw', () => {
      const error = new Error('Database write failed');
      const context = { roomId: 'room1', operation: 'save' };

      expect(() => {
        ErrorHandler.handleStorageError('saveRoom', error, context);
      }).toThrow('Database write failed');

      expect(Logger.error).toHaveBeenCalledWith(
        'Storage operation failed: saveRoom',
        error,
        {
          type: 'STORAGE_ERROR',
          operation: 'saveRoom',
          roomId: 'room1',
          operation: 'save'
        }
      );
    });
  });

  describe('handleValidationError', () => {
    test('should log validation error and throw ValidationError', () => {
      const context = { minLength: 3 };

      expect(() => {
        ErrorHandler.handleValidationError('playerName', 'ab', 'too short', context);
      }).toThrow('Validation failed for playerName: too short');

      expect(Logger.validationError).toHaveBeenCalledWith('playerName', 'ab', 'too short', context);
    });

    test('should create ValidationError with correct properties', () => {
      try {
        ErrorHandler.handleValidationError('teamName', '', 'required');
      } catch (error) {
        expect(error.message).toBe('Validation failed for teamName: required');
        expect(error.context.field).toBe('teamName');
        expect(error.context.value).toBe('');
      }
    });
  });

  describe('formatErrorForClient', () => {
    test('should format BaseError for client', () => {
      const error = new ValidationError('Invalid input', 'field', 'value');
      
      const formatted = ErrorHandler.formatErrorForClient(error, 'testEvent');

      expect(formatted).toEqual({
        message: 'Invalid input',
        code: 'VALIDATION_ERROR',
        event: 'testEvent',
        timestamp: error.timestamp
      });
    });

    test('should format generic Error for client', () => {
      const error = new Error('Internal error');
      
      const formatted = ErrorHandler.formatErrorForClient(error, 'testEvent');

      expect(formatted).toEqual({
        message: 'An unexpected error occurred',
        code: 'INTERNAL_ERROR',
        event: 'testEvent',
        timestamp: expect.any(String)
      });
    });

    test('should use default event name', () => {
      const error = new Error('Test error');
      
      const formatted = ErrorHandler.formatErrorForClient(error);

      expect(formatted.event).toBe('unknown');
    });
  });

  describe('getErrorEventType', () => {
    test('should map socket events to error event types', () => {
      expect(ErrorHandler.getErrorEventType('addCategory')).toBe('categoryError');
      expect(ErrorHandler.getErrorEventType('userSetup')).toBe('setupError');
      expect(ErrorHandler.getErrorEventType('joinRoom')).toBe('setupError');
      expect(ErrorHandler.getErrorEventType('startGame')).toBe('gameError');
      expect(ErrorHandler.getErrorEventType('beginTurn')).toBe('gameError');
      expect(ErrorHandler.getErrorEventType('endGuessing')).toBe('gameError');
      expect(ErrorHandler.getErrorEventType('continueTurn')).toBe('gameError');
    });

    test('should fallback to error code mapping', () => {
      const categoryError = new BaseError('Test', ERROR_CODES.INVALID_CATEGORY);
      const setupError = new BaseError('Test', ERROR_CODES.INVALID_USER_NAME);
      const gameError = new BaseError('Test', ERROR_CODES.GAME_NOT_STARTED);

      expect(ErrorHandler.getErrorEventType('unknown', categoryError)).toBe('categoryError');
      expect(ErrorHandler.getErrorEventType('unknown', setupError)).toBe('setupError');
      expect(ErrorHandler.getErrorEventType('unknown', gameError)).toBe('gameError');
    });

    test('should use generic error for unknown cases', () => {
      const genericError = new Error('Unknown error');
      const unknownBaseError = new BaseError('Test', 'UNKNOWN_CODE');

      expect(ErrorHandler.getErrorEventType('unknown', genericError)).toBe('error');
      expect(ErrorHandler.getErrorEventType('unknown', unknownBaseError)).toBe('error');
    });
  });

  describe('expressErrorHandler', () => {
    let mockReq, mockRes, mockNext;

    beforeEach(() => {
      mockReq = {
        method: 'POST',
        url: '/api/test',
        ip: '127.0.0.1'
      };
      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      mockNext = jest.fn();
    });

    test('should handle BaseError with proper status and response', () => {
      const error = new ValidationError('Invalid data', 'field', 'value');
      
      ErrorHandler.expressErrorHandler(error, mockReq, mockRes, mockNext);

      expect(Logger.error).toHaveBeenCalledWith('Express error', error, {
        type: 'HTTP_ERROR',
        method: 'POST',
        url: '/api/test',
        ip: '127.0.0.1'
      });
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(error.toJSON());
    });

    test('should handle generic Error with 500 status', () => {
      const error = new Error('Internal error');
      
      ErrorHandler.expressErrorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Internal server error',
        code: 'INTERNAL_ERROR',
        timestamp: expect.any(String)
      });
    });
  });

  describe('setupGlobalErrorHandlers', () => {
    let originalProcessOn;
    let processListeners;

    beforeEach(() => {
      originalProcessOn = process.on;
      processListeners = {};
      process.on = jest.fn((event, handler) => {
        processListeners[event] = handler;
      });
    });

    afterEach(() => {
      process.on = originalProcessOn;
    });

    test('should set up uncaught exception handler', () => {
      ErrorHandler.setupGlobalErrorHandlers();

      expect(process.on).toHaveBeenCalledWith('uncaughtException', expect.any(Function));
      expect(processListeners.uncaughtException).toBeDefined();
    });

    test('should set up unhandled rejection handler', () => {
      ErrorHandler.setupGlobalErrorHandlers();

      expect(process.on).toHaveBeenCalledWith('unhandledRejection', expect.any(Function));
      expect(processListeners.unhandledRejection).toBeDefined();
    });

    test('should log uncaught exceptions', () => {
      ErrorHandler.setupGlobalErrorHandlers();
      const error = new Error('Uncaught error');

      processListeners.uncaughtException(error);

      expect(Logger.error).toHaveBeenCalledWith('Uncaught Exception', error, {
        type: 'UNCAUGHT_EXCEPTION'
      });
      expect(mockExit).not.toHaveBeenCalled(); // setTimeout prevents immediate exit
    });

    test('should log unhandled rejections', () => {
      ErrorHandler.setupGlobalErrorHandlers();
      const reason = new Error('Unhandled rejection');
      const mockPromise = { toString: () => 'Promise{<rejected>}' };

      processListeners.unhandledRejection(reason, mockPromise);

      expect(Logger.error).toHaveBeenCalledWith('Unhandled Rejection', reason, {
        type: 'UNHANDLED_REJECTION',
        promise: 'Promise{<rejected>}'
      });
    });
  });

  describe('withPerformanceLogging', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('should log performance for successful operations', async () => {
      const mockFn = jest.fn().mockResolvedValue('result');
      const wrappedFn = ErrorHandler.withPerformanceLogging('testOperation', mockFn);

      const promise = wrappedFn('arg1', 'arg2');
      jest.advanceTimersByTime(100);
      const result = await promise;

      expect(result).toBe('result');
      expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2');
      expect(Logger.performance).toHaveBeenCalledWith('testOperation', 100);
    });

    test('should log performance for failed operations', async () => {
      const error = new Error('Operation failed');
      const mockFn = jest.fn().mockRejectedValue(error);
      const wrappedFn = ErrorHandler.withPerformanceLogging('testOperation', mockFn);

      const promise = wrappedFn('arg1');
      jest.advanceTimersByTime(50);

      await expect(promise).rejects.toThrow('Operation failed');
      expect(Logger.performance).toHaveBeenCalledWith('testOperation (failed)', 50);
    });
  });
});