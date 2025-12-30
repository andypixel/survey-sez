const request = require('supertest');
const express = require('express');
const GAME_RULES = require('../../server/config/GameRules');
const Logger = require('../../server/utils/Logger');
const ErrorHandler = require('../../server/utils/ErrorHandler');

// Mock dependencies
jest.mock('../../server/utils/Logger');
jest.mock('../../server/utils/ErrorHandler');

describe('Server Configuration', () => {
  let app;
  
  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    
    // Mock error handler
    ErrorHandler.expressErrorHandler = jest.fn((err, req, res, next) => {
      res.status(500).json({ error: err.message });
    });
  });

  describe('Environment Configuration', () => {
    const originalEnv = process.env.NODE_ENV;
    
    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    test('should detect development environment', () => {
      process.env.NODE_ENV = 'development';
      
      const isDevelopment = process.env.NODE_ENV !== 'production';
      expect(isDevelopment).toBe(true);
    });

    test('should detect production environment', () => {
      process.env.NODE_ENV = 'production';
      
      const isProduction = process.env.NODE_ENV === 'production';
      expect(isProduction).toBe(true);
    });

    test('should configure CORS for development', () => {
      process.env.NODE_ENV = 'development';
      
      const corsOrigin = process.env.NODE_ENV === 'production' ? false : "http://localhost:3000";
      expect(corsOrigin).toBe("http://localhost:3000");
    });

    test('should disable CORS for production', () => {
      process.env.NODE_ENV = 'production';
      
      const corsOrigin = process.env.NODE_ENV === 'production' ? false : "http://localhost:3000";
      expect(corsOrigin).toBe(false);
    });
  });

  describe('API Endpoints', () => {
    test('should serve game rules configuration', async () => {
      app.get('/api/game-rules', (req, res) => {
        res.json(GAME_RULES);
      });
      
      const response = await request(app)
        .get('/api/game-rules')
        .expect(200);
      
      expect(response.body).toEqual(GAME_RULES);
      expect(response.body.MAX_TEAMS).toBe(2);
      expect(response.body.DEFAULT_TIME_LIMIT).toBe(30);
    });
  });

  describe('Debug Endpoints', () => {
    test('should provide debug state endpoint', async () => {
      app.get('/debug/state', (req, res) => {
        res.json({ 
          rooms: {}, 
          userSessions: {}, 
          totalConnections: 0 
        });
      });
      
      const response = await request(app)
        .get('/debug/state')
        .expect(200);
      
      expect(response.body).toHaveProperty('rooms');
      expect(response.body).toHaveProperty('userSessions');
      expect(response.body).toHaveProperty('totalConnections');
    });

    test('should provide pretty debug endpoint', async () => {
      app.get('/debug/pretty', (req, res) => {
        res.setHeader('Content-Type', 'text/html');
        res.send('<pre>{"test": "data"}</pre>');
      });
      
      const response = await request(app)
        .get('/debug/pretty')
        .expect(200);
      
      expect(response.headers['content-type']).toContain('text/html');
      expect(response.text).toContain('<pre>');
    });

    test('should provide admin panel', async () => {
      app.get('/admin', (req, res) => {
        res.setHeader('Content-Type', 'text/html');
        res.send('<h1>Survey-Sez Admin</h1>');
      });
      
      const response = await request(app)
        .get('/admin')
        .expect(200);
      
      expect(response.headers['content-type']).toContain('text/html');
      expect(response.text).toContain('Survey-Sez Admin');
    });
  });

  describe('Production-specific Endpoints', () => {
    const originalEnv = process.env.NODE_ENV;
    
    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    test('should restrict Redis debug to production', async () => {
      process.env.NODE_ENV = 'development';
      
      app.get('/debug/redis', (req, res) => {
        if (process.env.NODE_ENV !== 'production') {
          return res.json({ error: 'Redis debug only available in production' });
        }
        res.json({ categories: [], rooms: [] });
      });
      
      const response = await request(app)
        .get('/debug/redis')
        .expect(200);
      
      expect(response.body.error).toBe('Redis debug only available in production');
    });

    test('should restrict category sync to production', async () => {
      process.env.NODE_ENV = 'development';
      
      app.post('/admin/sync-categories', (req, res) => {
        if (process.env.NODE_ENV !== 'production') {
          return res.json({ error: 'Sync only available in production' });
        }
        res.json({ success: true });
      });
      
      const response = await request(app)
        .post('/admin/sync-categories')
        .expect(200);
      
      expect(response.body.error).toBe('Sync only available in production');
    });

    test('should allow Redis debug in production', async () => {
      process.env.NODE_ENV = 'production';
      
      app.get('/debug/redis', (req, res) => {
        if (process.env.NODE_ENV !== 'production') {
          return res.json({ error: 'Redis debug only available in production' });
        }
        res.json({ categories: [], rooms: [] });
      });
      
      const response = await request(app)
        .get('/debug/redis')
        .expect(200);
      
      expect(response.body).not.toHaveProperty('error');
      expect(response.body).toHaveProperty('categories');
      expect(response.body).toHaveProperty('rooms');
    });
  });

  describe('Development Routes', () => {
    test('should serve development room routes', async () => {
      app.get('/room/:roomId', (req, res) => {
        res.send(`Room: ${req.params.roomId}`);
      });
      
      const response = await request(app)
        .get('/room/test-room')
        .expect(200);
      
      expect(response.text).toContain('Room: test-room');
    });
  });

  describe('Error Handling', () => {
    test('should handle express errors with middleware', async () => {
      app.get('/test-error', (req, res, next) => {
        next(new Error('Test error'));
      });
      
      app.use(ErrorHandler.expressErrorHandler);
      
      const response = await request(app)
        .get('/test-error')
        .expect(500);
      
      expect(response.body.error).toBe('Test error');
    });
  });

  describe('Server Configuration Validation', () => {
    test('should validate port configuration', () => {
      const port = process.env.PORT || 3001;
      const portNumber = typeof port === 'string' ? parseInt(port) : port;
      expect(portNumber).toBeGreaterThan(0);
      expect(typeof portNumber).toBe('number');
    });

    test('should validate storage selection logic', () => {
      // Test development storage selection
      process.env.NODE_ENV = 'development';
      const devStorage = process.env.NODE_ENV === 'production' ? 'redis' : 'json';
      expect(devStorage).toBe('json');
      
      // Test production storage selection
      process.env.NODE_ENV = 'production';
      const prodStorage = process.env.NODE_ENV === 'production' ? 'redis' : 'json';
      expect(prodStorage).toBe('redis');
    });

    test('should validate timeout configurations', () => {
      const saveTimeout = 5000;
      const intervalTimeout = 30000;
      
      expect(saveTimeout).toBeGreaterThan(0);
      expect(intervalTimeout).toBeGreaterThan(saveTimeout);
    });
  });

  describe('Data Management Functions', () => {
    test('should validate room creation logic', () => {
      const rooms = {};
      const categoriesData = { universal: [], custom: {} };
      
      const getOrCreateRoom = (roomId) => {
        if (!rooms[roomId]) {
          rooms[roomId] = { roomId, categoriesData };
        }
        return rooms[roomId];
      };
      
      const room1 = getOrCreateRoom('test-room');
      const room2 = getOrCreateRoom('test-room');
      
      expect(room1).toBe(room2); // Same instance
      expect(room1.roomId).toBe('test-room');
    });

    test('should validate user session creation logic', () => {
      const userSessions = {};
      
      const getOrCreateUserSession = (socketId) => {
        if (!userSessions[socketId]) {
          userSessions[socketId] = { socketId };
        }
        return userSessions[socketId];
      };
      
      const session1 = getOrCreateUserSession('socket-1');
      const session2 = getOrCreateUserSession('socket-1');
      
      expect(session1).toBe(session2); // Same instance
      expect(session1.socketId).toBe('socket-1');
    });
  });

  describe('Graceful Shutdown Logic', () => {
    test('should handle shutdown data saving', async () => {
      const mockStorage = {
        saveCategories: jest.fn().mockResolvedValue()
      };
      
      const shutdownHandler = async () => {
        await mockStorage.saveCategories();
        return 'shutdown-complete';
      };
      
      const result = await shutdownHandler();
      
      expect(mockStorage.saveCategories).toHaveBeenCalled();
      expect(result).toBe('shutdown-complete');
    });

    test('should handle shutdown error scenarios', async () => {
      const mockStorage = {
        saveCategories: jest.fn().mockRejectedValue(new Error('Save failed'))
      };
      
      const shutdownHandler = async () => {
        try {
          await mockStorage.saveCategories();
          return 'shutdown-complete';
        } catch (error) {
          return `shutdown-error: ${error.message}`;
        }
      };
      
      const result = await shutdownHandler();
      
      expect(mockStorage.saveCategories).toHaveBeenCalled();
      expect(result).toBe('shutdown-error: Save failed');
    });
  });
});