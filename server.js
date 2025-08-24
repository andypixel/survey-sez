/**
 * Real-time multiplayer game server using Socket.IO
 * Handles room management, user sessions, and game state persistence
 */

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const { GameRoom } = require('./server/GameRoom');
const UserSession = require('./server/UserSession');
const JsonFileStorage = require('./server/storage/JsonFileStorage');
const GameHandler = require('./server/handlers/GameHandler');
const CategoryHandler = require('./server/handlers/CategoryHandler');
const RoomHandler = require('./server/handlers/RoomHandler');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? false : "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// TODO: Replace in-memory storage with Redis for production scalability
const storage = new JsonFileStorage();
const rooms = {}; // In-memory room storage
const userSessions = {}; // In-memory user session storage
let categoriesData; // Global categories cache

/**
 * Initialize application data from persistent storage
 * Restores rooms and categories from previous sessions
 */
async function initializeData() {
  categoriesData = await storage.getCategories();
  
  // Restore rooms from persistent storage
  const savedRooms = await storage.getAllRooms();
  Object.keys(savedRooms).forEach(roomId => {
    const roomData = savedRooms[roomId];
    const room = new GameRoom(roomId, categoriesData);
    // TODO: Use proper room restoration method instead of direct property assignment
    room.teams = roomData.teams;
    room.gameState = roomData.gameState;
    room.gameSettings = roomData.gameSettings;
    rooms[roomId] = room;
  });
}

// Debounced save to prevent concurrent writes
let saveTimeout = null;
function debouncedSave() {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(async () => {
    await saveAllData();
    saveTimeout = null;
  }, 5000); // Save 5 seconds after last change
}

// TODO: Replace interval-based saving with event-driven persistence for better performance
setInterval(async () => {
  await saveAllData();
}, 30000);

/**
 * Save all application data to persistent storage
 * Saves both room state and user sessions
 */
async function saveAllData() {
  try {
    // Save rooms
    const roomPromises = Object.keys(rooms).map(roomId => {
      const room = rooms[roomId];
      return storage.saveRoom(roomId, {
        roomId: room.roomId,
        teams: room.teams,
        gameState: room.gameState,
        gameSettings: room.gameSettings,
        lastActivity: Date.now()
      });
    });
    
    // Save users
    const userPromises = Object.keys(userSessions).map(socketId => {
      const session = userSessions[socketId];
      return storage.saveUser(session.userId, {
        userId: session.userId,
        userData: session.userData,
        lastActivity: Date.now()
      });
    });
    
    await Promise.all([...roomPromises, ...userPromises]);
  } catch (error) {
    console.error('Error saving data:', error);
  }
}

/**
 * Get existing room or create new one
 * @param {string} roomId - Unique room identifier
 * @returns {GameRoom} Room instance
 */
function getOrCreateRoom(roomId) {
  if (!rooms[roomId]) {
    rooms[roomId] = new GameRoom(roomId, categoriesData);
  }
  return rooms[roomId];
}

/**
 * Get existing user session or create new one
 * @param {string} socketId - Socket.IO connection ID
 * @returns {UserSession} User session instance
 */
function getOrCreateUserSession(socketId) {
  if (!userSessions[socketId]) {
    userSessions[socketId] = new UserSession(socketId);
  }
  return userSessions[socketId];
}

// Debug endpoint - available in all environments
app.get('/debug/state', (req, res) => {
  const state = {
    rooms: Object.keys(rooms).reduce((acc, roomId) => {
      const room = rooms[roomId];
      acc[roomId] = {
        roomId: room.roomId,
        gameState: room.gameState,
        teams: room.teams,
        players: room.players,
        playerCount: Object.keys(room.players).length,
        teamCount: Object.keys(room.teams).length
      };
      return acc;
    }, {}),
    userSessions: Object.keys(userSessions).reduce((acc, socketId) => {
      const session = userSessions[socketId];
      acc[socketId] = {
        userId: session.userId,
        currentRoom: session.currentRoom,
        userData: session.userData
      };
      return acc;
    }, {}),
    totalConnections: Object.keys(userSessions).length
  };
  res.json(state);
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'client/build')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
  });
} else {
  // In development, handle room routes
  app.get('/room/:roomId', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html>
        <head><title>Room ${req.params.roomId}</title></head>
        <body>
          <p>Room: ${req.params.roomId}</p>
          <p>Please use the React dev server at <a href="http://localhost:3000/room/${req.params.roomId}">http://localhost:3000/room/${req.params.roomId}</a></p>
        </body>
      </html>
    `);
  });
}

/**
 * Handle new Socket.IO connections
 * Sets up event listeners for room management and game actions
 */
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  const userSession = getOrCreateUserSession(socket.id);
  
  // Register all event handlers
  RoomHandler.register(socket, io, userSession, getOrCreateRoom, debouncedSave, userSessions);
  GameHandler.register(socket, io, userSession, rooms, getOrCreateRoom, debouncedSave);
  CategoryHandler.register(socket, io, userSession, getOrCreateRoom, debouncedSave, storage, categoriesData, userSessions);
  
  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    const roomId = userSession.currentRoom;
    if (roomId) {
      const room = getOrCreateRoom(roomId);
      room.removePlayer(socket.id);
      
      // Only send gameState to users who have completed setup
      const socketsInRoom = io.sockets.adapter.rooms.get(roomId);
      if (socketsInRoom) {
        socketsInRoom.forEach(socketId => {
          const otherUserSession = userSessions[socketId];
          if (otherUserSession && otherUserSession.getUserData(roomId) && otherUserSession.getUserData(roomId).setupComplete) {
            io.to(socketId).emit('gameState', room.getState());
          }
        });
      }
    }
    delete userSessions[socket.id];
  });
});

const PORT = process.env.PORT || 3001;

// Initialize data then start server
initializeData().then(() => {
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}).catch(error => {
  console.error('Failed to initialize data:', error);
  process.exit(1);
});

// Save data on server shutdown
process.on('SIGINT', async () => {
  console.log('Saving data before shutdown...');
  await saveAllData();
  await storage.saveCategories(categoriesData);
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Saving data before shutdown...');
  await saveAllData();
  await storage.saveCategories(categoriesData);
  process.exit(0);
});