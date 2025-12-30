const http = require('http');
const express = require('express');
const socketIo = require('socket.io');
const Client = require('socket.io-client');
const { GameRoom } = require('../../server/GameRoom');
const UserSession = require('../../server/UserSession');
const JsonFileStorage = require('../../server/storage/JsonFileStorage');
const GameHandler = require('../../server/handlers/GameHandler');
const CategoryHandler = require('../../server/handlers/CategoryHandler');
const RoomHandler = require('../../server/handlers/RoomHandler');

describe('Basic Socket Integration Tests', () => {
  let server, io, client1, client2;
  let rooms, userSessions, categoriesData, storage;
  
  beforeAll((done) => {
    const app = express();
    server = http.createServer(app);
    io = socketIo(server);
    
    // Initialize test data
    rooms = {};
    userSessions = {};
    storage = new JsonFileStorage();
    categoriesData = {
      universal: [
        { id: 'u1', name: 'Animals', entries: ['Dog', 'Cat', 'Bird'] },
        { id: 'u2', name: 'Colors', entries: ['Red', 'Blue', 'Green'] }
      ],
      custom: {},
      usedUniversalCategoryIds: []
    };
    
    const getOrCreateRoom = (roomId) => {
      if (!rooms[roomId]) {
        rooms[roomId] = new GameRoom(roomId, categoriesData, storage);
      }
      return rooms[roomId];
    };
    
    const getOrCreateUserSession = (socketId) => {
      if (!userSessions[socketId]) {
        userSessions[socketId] = new UserSession(socketId);
      }
      return userSessions[socketId];
    };
    
    const debouncedSave = jest.fn();
    
    // Setup socket handlers
    io.on('connection', (socket) => {
      const userSession = getOrCreateUserSession(socket.id);
      
      RoomHandler.register(socket, io, userSession, getOrCreateRoom, debouncedSave, userSessions);
      GameHandler.register(socket, io, userSession, rooms, getOrCreateRoom, debouncedSave);
      CategoryHandler.register(socket, io, userSession, getOrCreateRoom, storage, categoriesData, userSessions);
    });
    
    server.listen(() => {
      const port = server.address().port;
      
      // Create client connections
      client1 = new Client(`http://localhost:${port}`);
      client2 = new Client(`http://localhost:${port}`);
      
      let connectedCount = 0;
      const onConnect = () => {
        connectedCount++;
        if (connectedCount === 2) done();
      };
      
      client1.on('connect', onConnect);
      client2.on('connect', onConnect);
    });
  });
  
  afterAll(() => {
    if (client1) client1.close();
    if (client2) client2.close();
    if (server) server.close();
  });
  
  beforeEach(() => {
    // Clear rooms and sessions between tests
    Object.keys(rooms).forEach(key => delete rooms[key]);
    Object.keys(userSessions).forEach(key => delete userSessions[key]);
  });

  describe('Socket Connection', () => {
    test('should establish socket connections', () => {
      expect(client1.connected).toBe(true);
      expect(client2.connected).toBe(true);
    });
  });

  describe('Error Handling Integration', () => {
    test('should handle invalid game start', (done) => {
      const onGameError = (error) => {
        expect(error.message).toContain('Need at least');
        done();
      };
      
      client1.on('gameError', onGameError);
      client1.emit('startGame');
    });

    test('should handle invalid category creation', (done) => {
      const roomId = 'error-room';
      
      const onCategoryError = (error) => {
        expect(error.message).toContain('User not properly set up');
        done();
      };
      
      client1.on('categoryError', onCategoryError);
      client1.emit('joinRoom', { roomId });
      
      setTimeout(() => {
        client1.emit('addCategory', {
          name: 'Invalid Category',
          entries: ['Entry1']
        });
      }, 100);
    });
  });

  describe('Room State Verification', () => {
    test('should create rooms when players join', (done) => {
      const roomId = 'state-room';
      
      client1.emit('joinRoom', { roomId });
      
      setTimeout(() => {
        // Verify room was created
        expect(rooms[roomId]).toBeDefined();
        expect(rooms[roomId].roomId).toBe(roomId);
        done();
      }, 100);
    });

    test('should track user sessions', (done) => {
      const roomId = 'session-room';
      
      client1.emit('joinRoom', { roomId });
      
      setTimeout(() => {
        // Verify user session was created
        expect(userSessions[client1.id]).toBeDefined();
        expect(userSessions[client1.id].socketId).toBe(client1.id);
        done();
      }, 100);
    });
  });

  describe('Multi-Client Basic Tests', () => {
    test('should handle multiple clients connecting', () => {
      expect(Object.keys(userSessions)).toHaveLength(2);
    });

    test('should create separate user sessions', () => {
      expect(userSessions[client1.id]).toBeDefined();
      expect(userSessions[client2.id]).toBeDefined();
      expect(userSessions[client1.id]).not.toBe(userSessions[client2.id]);
    });
  });

  describe('Socket Event Validation', () => {
    test('should validate socket events are properly registered', (done) => {
      let eventCount = 0;
      
      const checkEvents = () => {
        eventCount++;
        if (eventCount === 2) {
          done();
        }
      };
      
      // Test that error events are properly handled
      client1.on('gameError', checkEvents);
      client2.on('gameError', checkEvents);
      
      client1.emit('startGame');
      client2.emit('startGame');
    });
  });
});