const {
  BaseError,
  ValidationError,
  StorageError,
  SocketError,
  ERROR_CODES
} = require('../../server/utils/CustomErrors');

describe('CustomErrors', () => {
  describe('BaseError', () => {
    test('should create error with all properties', () => {
      const context = { userId: 'user123', action: 'test' };
      const error = new BaseError('Test message', 'TEST_CODE', 400, context);

      expect(error.message).toBe('Test message');
      expect(error.code).toBe('TEST_CODE');
      expect(error.statusCode).toBe(400);
      expect(error.context).toEqual(context);
      expect(error.name).toBe('BaseError');
      expect(error.timestamp).toBeDefined();
      expect(error.stack).toBeDefined();
    });

    test('should use default status code 500', () => {
      const error = new BaseError('Test message', 'TEST_CODE');

      expect(error.statusCode).toBe(500);
      expect(error.context).toEqual({});
    });

    test('should serialize to JSON correctly', () => {
      const context = { field: 'test' };
      const error = new BaseError('Test message', 'TEST_CODE', 400, context);
      const json = error.toJSON();

      expect(json).toEqual({
        name: 'BaseError',
        message: 'Test message',
        code: 'TEST_CODE',
        statusCode: 400,
        context,
        timestamp: error.timestamp
      });
    });
  });

  describe('ValidationError', () => {
    test('should create validation error with field and value', () => {
      const error = new ValidationError('Invalid name', 'playerName', 'ab', { minLength: 3 });

      expect(error.message).toBe('Invalid name');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.statusCode).toBe(400);
      expect(error.context).toEqual({
        field: 'playerName',
        value: 'ab',
        minLength: 3
      });
      expect(error.name).toBe('ValidationError');
    });

    test('should work without additional context', () => {
      const error = new ValidationError('Invalid input', 'field', 'value');

      expect(error.context).toEqual({
        field: 'field',
        value: 'value'
      });
    });
  });

  describe('StorageError', () => {
    test('should create storage error with operation', () => {
      const error = new StorageError('Write failed', 'saveRoom', { roomId: 'room123' });

      expect(error.message).toBe('Write failed');
      expect(error.code).toBe('STORAGE_ERROR');
      expect(error.statusCode).toBe(500);
      expect(error.context).toEqual({
        operation: 'saveRoom',
        roomId: 'room123'
      });
      expect(error.name).toBe('StorageError');
    });
  });

  describe('SocketError', () => {
    test('should create socket error with event and socket ID', () => {
      const error = new SocketError('Invalid data', 'joinRoom', 'socket123', { data: null });

      expect(error.message).toBe('Invalid data');
      expect(error.code).toBe('SOCKET_ERROR');
      expect(error.statusCode).toBe(400);
      expect(error.context).toEqual({
        event: 'joinRoom',
        socketId: 'socket123',
        data: null
      });
      expect(error.name).toBe('SocketError');
    });
  });



  describe('ERROR_CODES', () => {
    test('should contain all expected error codes', () => {
      expect(ERROR_CODES.INVALID_USER_NAME).toBe('INVALID_USER_NAME');
      expect(ERROR_CODES.INVALID_TEAM_NAME).toBe('INVALID_TEAM_NAME');
      expect(ERROR_CODES.INVALID_CATEGORY).toBe('INVALID_CATEGORY');
      expect(ERROR_CODES.DUPLICATE_NAME).toBe('DUPLICATE_NAME');
      expect(ERROR_CODES.GAME_NOT_STARTED).toBe('GAME_NOT_STARTED');
      expect(ERROR_CODES.INVALID_TURN_ACTION).toBe('INVALID_TURN_ACTION');
      expect(ERROR_CODES.NO_CATEGORIES_AVAILABLE).toBe('NO_CATEGORIES_AVAILABLE');
      expect(ERROR_CODES.MAX_TEAMS_REACHED).toBe('MAX_TEAMS_REACHED');
    });

    test('should have consistent naming pattern', () => {
      Object.keys(ERROR_CODES).forEach(key => {
        expect(ERROR_CODES[key]).toBe(key);
        expect(key).toMatch(/^[A-Z_]+$/);
      });
    });
  });

  describe('Error inheritance', () => {
    test('all custom errors should extend BaseError', () => {
      expect(new ValidationError('test', 'field', 'value')).toBeInstanceOf(BaseError);
      expect(new StorageError('test', 'operation')).toBeInstanceOf(BaseError);
      expect(new SocketError('test', 'event', 'socket1')).toBeInstanceOf(BaseError);
    });

    test('all custom errors should extend Error', () => {
      expect(new BaseError('test', 'code')).toBeInstanceOf(Error);
      expect(new ValidationError('test', 'field', 'value')).toBeInstanceOf(Error);
      expect(new StorageError('test', 'operation')).toBeInstanceOf(Error);
    });
  });
});