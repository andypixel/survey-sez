/**
 * Temporary error testing endpoints - REMOVE IN PRODUCTION
 */
const Logger = require('./utils/Logger');
const ErrorHandler = require('./utils/ErrorHandler');
const { ValidationError, GameError, RoomError, StorageError, SocketError } = require('./utils/CustomErrors');

function addTestErrorEndpoints(app) {
  // Test all custom error types
  app.get('/test/errors/validation', (req, res) => {
    throw new ValidationError('Test validation error', 'testField', 'testValue', { test: true });
  });

  app.get('/test/errors/game', (req, res) => {
    throw new GameError('Test game error', 'ONBOARDING', { test: true });
  });

  app.get('/test/errors/room', (req, res) => {
    throw new RoomError('Test room error', 'test-room', { test: true });
  });

  app.get('/test/errors/storage', (req, res) => {
    throw new StorageError('Test storage error', 'testOperation', { test: true });
  });

  app.get('/test/errors/generic', (req, res) => {
    throw new Error('Test generic error');
  });

  // Test logging methods
  app.get('/test/logging/all-levels', (req, res) => {
    Logger.error('Test error log', new Error('Test error'), { test: true });
    Logger.warn('Test warning log', { test: true });
    Logger.info('Test info log', { test: true });
    Logger.debug('Test debug log', { test: true });
    res.json({ message: 'All log levels tested' });
  });

  app.get('/test/logging/specialized', (req, res) => {
    Logger.userEvent('TEST_ACTION', 'test-socket', 'test-room', { test: true });
    Logger.gameEvent('TEST_GAME_ACTION', 'test-room', { test: true });
    Logger.validationError('testField', 'testValue', 'test reason', { test: true });
    Logger.performance('testOperation', 150, { test: true });
    res.json({ message: 'Specialized logging tested' });
  });

  // Test async error handling
  app.get('/test/async/success', async (req, res) => {
    const result = await ErrorHandler.withPerformanceLogging('testAsyncSuccess', async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
      return { success: true };
    })();
    res.json(result);
  });

  app.get('/test/async/failure', async (req, res, next) => {
    try {
      await ErrorHandler.withPerformanceLogging('testAsyncFailure', async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        throw new Error('Async operation failed');
      })();
    } catch (error) {
      // Pass to Express error middleware
      next(error);
    }
  });

  // Test unhandled rejection
  app.get('/test/unhandled-rejection', (req, res) => {
    Promise.reject(new Error('Test unhandled rejection'));
    res.json({ message: 'Unhandled rejection triggered' });
  });

  // Test uncaught exception (dangerous - will crash server)
  app.get('/test/uncaught-exception', (req, res) => {
    res.json({ message: 'Uncaught exception will trigger in 1 second' });
    setTimeout(() => {
      throw new Error('Test uncaught exception');
    }, 1000);
  });
}

function addTestSocketEvents(io) {
  io.on('connection', (socket) => {
    // Test socket error handling
    socket.on('testSocketError', (data) => {
      try {
        throw new SocketError('Test socket error', 'testSocketError', socket.id, { data });
      } catch (error) {
        ErrorHandler.handleSocketError(socket, 'testSocketError', error, { data });
      }
    });

    socket.on('testValidationError', (data) => {
      try {
        throw new ValidationError('Test socket validation error', 'socketField', data, { socketId: socket.id });
      } catch (error) {
        ErrorHandler.handleSocketError(socket, 'testValidationError', error, { data });
      }
    });

    socket.on('testAsyncSocketError', async (data) => {
      try {
        await new Promise(resolve => setTimeout(resolve, 100));
        throw new Error('Test async socket error');
      } catch (error) {
        ErrorHandler.handleSocketError(socket, 'testAsyncSocketError', error, { data });
      }
    });
  });
}

module.exports = { addTestErrorEndpoints, addTestSocketEvents };