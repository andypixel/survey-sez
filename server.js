/**
 * Real-time multiplayer game server using Socket.IO
 * Handles room management, user sessions, and game state persistence
 * 
 * PRODUCTION DEPLOYMENT:
 * - Hosted on Railway (railway.app) with automatic CI/CD from GitHub
 * - Uses Redis for data persistence (auto-configured via REDIS_URL)
 * - Serves built React frontend in production (NODE_ENV=production)
 * - Admin panel available at /admin for debugging and management
 * 
 * ENVIRONMENT DETECTION:
 * - Development: Uses JSON file storage, minimal categories
 * - Production: Uses Redis storage, 70 universal categories pre-loaded
 */

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const { GameRoom } = require('./server/GameRoom');
const UserSession = require('./server/UserSession');
const JsonFileStorage = require('./server/storage/JsonFileStorage');
const RedisStorage = require('./server/storage/RedisStorage');
const GameHandler = require('./server/handlers/GameHandler');
const CategoryHandler = require('./server/handlers/CategoryHandler');
const RoomHandler = require('./server/handlers/RoomHandler');
const Logger = require('./server/utils/Logger');
const GAME_RULES = require('./server/config/GameRules');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? false : "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// STORAGE LAYER: Auto-select based on environment
// Production: Redis (Railway-managed) - persistent, scalable
// Development: JSON files (git-ignored) - simple, local
const storage = process.env.NODE_ENV === 'production' 
  ? new RedisStorage() 
  : new JsonFileStorage();
const rooms = {}; // In-memory room storage
const userSessions = {}; // In-memory user session storage
let categoriesData; // Global categories cache

/**
 * Initialize application data from persistent storage
 * Restores rooms and categories from previous sessions
 * 
 * PRODUCTION: Loads 70 universal categories into Redis on first run
 * DEVELOPMENT: Uses minimal test categories from JSON files
 */
async function initializeData() {
  // Initialize production data if needed (70 universal categories)
  if (process.env.NODE_ENV === 'production') {
    const initProdData = require('./scripts/init-prod-data');
    await initProdData();
  }
  
  categoriesData = await storage.getCategories();
  
  // Restore rooms from persistent storage
  const savedRooms = await storage.getAllRooms();
  Object.keys(savedRooms).forEach(roomId => {
    const roomData = savedRooms[roomId];
    const room = new GameRoom(roomId, categoriesData, storage);
    // TODO: Use proper room restoration method instead of direct property assignment
    room.teams = roomData.teams;
    room.gameState = roomData.gameState;
    room.gameSettings = roomData.gameSettings;
    room.usedCategoryIds = new Set(roomData.usedCategoryIds || []);
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
        usedCategoryIds: Array.from(room.usedCategoryIds || []),
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
    Logger.error('DATA_SAVE_FAILED', error, { 
      roomCount: Object.keys(rooms).length,
      userCount: Object.keys(userSessions).length 
    });
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
    rooms[roomId] = new GameRoom(roomId, categoriesData, storage);
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

// API endpoint to serve game rules configuration
app.get('/api/game-rules', (req, res) => {
  res.json(GAME_RULES);
});

// Debug endpoints - available in all environments
app.get('/debug/state', (req, res) => {
  const state = {
    rooms: Object.keys(rooms).reduce((acc, roomId) => {
      const room = rooms[roomId];
      acc[roomId] = {
        roomId: room.roomId,
        gameState: room.gameState,
        gameSettings: room.gameSettings,
        teams: room.teams,
        players: room.players,
        playerCount: Object.keys(room.players).length,
        teamCount: Object.keys(room.teams).length,
        currentGame: room.currentGame ? room.currentGame.getState() : null
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

// Pretty-printed debug endpoint
app.get('/debug/pretty', (req, res) => {
  const state = {
    rooms: Object.keys(rooms).reduce((acc, roomId) => {
      const room = rooms[roomId];
      acc[roomId] = {
        roomId: room.roomId,
        gameState: room.gameState,
        gameSettings: room.gameSettings,
        teams: room.teams,
        players: room.players,
        playerCount: Object.keys(room.players).length,
        teamCount: Object.keys(room.teams).length,
        currentGame: room.currentGame ? room.currentGame.getState() : null
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
  res.setHeader('Content-Type', 'text/html');
  res.send(`<pre>${JSON.stringify(state, null, 2)}</pre>`);
});

// Redis data inspection endpoint (full data)
app.get('/debug/redis', async (req, res) => {
  try {
    if (process.env.NODE_ENV !== 'production') {
      return res.json({ error: 'Redis debug only available in production' });
    }
    
    const categories = await storage.getCategories();
    const allRooms = await storage.getAllRooms();
    
    res.setHeader('Content-Type', 'text/html');
    res.send(`
      <h2>Redis Data (Full)</h2>
      <h3>Categories</h3>
      <pre>${JSON.stringify(categories, null, 2)}</pre>
      <h3>Rooms</h3>
      <pre>${JSON.stringify(allRooms, null, 2)}</pre>
    `);
  } catch (error) {
    res.json({ error: error.message });
  }
});

// Redis data inspection endpoint (no spoilers)
app.get('/debug/redis-safe', async (req, res) => {
  try {
    if (process.env.NODE_ENV !== 'production') {
      return res.json({ error: 'Redis debug only available in production' });
    }
    
    const categories = await storage.getCategories();
    const allRooms = await storage.getAllRooms();
    
    // Remove entries from categories to avoid spoilers
    const safeCategoriesData = {
      ...categories,
      universal: categories.universal.map(cat => ({
        id: cat.id,
        name: cat.name,
        entryCount: cat.entries.length
      })),
      custom: Object.keys(categories.custom).reduce((acc, userKey) => {
        acc[userKey] = categories.custom[userKey].map(cat => ({
          id: cat.id,
          name: cat.name,
          entryCount: cat.entries.length
        }));
        return acc;
      }, {})
    };
    
    res.setHeader('Content-Type', 'text/html');
    res.send(`
      <h2>Redis Data (Safe - No Spoilers)</h2>
      <h3>Categories (entries hidden)</h3>
      <pre>${JSON.stringify(safeCategoriesData, null, 2)}</pre>
      <h3>Rooms</h3>
      <pre>${JSON.stringify(allRooms, null, 2)}</pre>
    `);
  } catch (error) {
    res.json({ error: error.message });
  }
});

// Category sync endpoint (for future use)
app.post('/admin/sync-categories', async (req, res) => {
  if (process.env.NODE_ENV !== 'production') {
    return res.json({ error: 'Sync only available in production' });
  }
  
  try {
    const initProdData = require('./scripts/init-prod-data');
    await initProdData();
    
    // Reload categories data
    categoriesData = await storage.getCategories();
    
    res.json({ 
      success: true, 
      message: 'Categories reinitialized',
      universalCount: categoriesData.universal.length,
      usedCount: categoriesData.usedUniversalCategoryIds.length,
      availableCount: categoriesData.universal.length - categoriesData.usedUniversalCategoryIds.length
    });
  } catch (error) {
    res.json({ error: error.message });
  }
});

// Simple admin panel for debugging
app.get('/admin', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(`
    <h1>Survey-Sez Admin</h1>
    <ul>
      <li><a href="/debug/state">Raw State (JSON)</a></li>
      <li><a href="/debug/pretty">Pretty State (HTML)</a></li>
      <li><a href="/debug/redis-safe">Redis Data - Safe (No Spoilers)</a></li>
      <li><a href="/debug/redis">Redis Data - Full (Spoilers!)</a></li>
    </ul>
    <h2>Actions</h2>
    <button onclick="syncCategories()">Reinitialize Categories</button>
    <h2>Playtest Info</h2>
    <ul>
      <li>Active Rooms: ${Object.keys(rooms).length}</li>
      <li>Connected Users: ${Object.keys(userSessions).length}</li>
      <li>Server Uptime: ${Math.floor(process.uptime())} seconds</li>
      <li>Logs: <a href="https://railway.app" target="_blank">Railway Dashboard</a></li>
    </ul>
    <div id="result"></div>
    <script>
      async function syncCategories() {
        const result = document.getElementById('result');
        result.innerHTML = 'Syncing...';
        try {
          const response = await fetch('/admin/sync-categories', { method: 'POST' });
          const data = await response.json();
          result.innerHTML = '<pre>' + JSON.stringify(data, null, 2) + '</pre>';
        } catch (error) {
          result.innerHTML = 'Error: ' + error.message;
        }
      }
    </script>
  `);
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
  Logger.userEvent('CONNECTED', socket.id, null, { socketId: socket.id });
  const userSession = getOrCreateUserSession(socket.id);
  
  // Register all event handlers
  RoomHandler.register(socket, io, userSession, getOrCreateRoom, debouncedSave, userSessions);
  GameHandler.register(socket, io, userSession, rooms, getOrCreateRoom, debouncedSave);
  CategoryHandler.register(socket, io, userSession, getOrCreateRoom, storage, categoriesData, userSessions);
  
  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    const roomId = userSession.currentRoom;
    Logger.userEvent('DISCONNECTED', socket.id, roomId, { socketId: socket.id });
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
  Logger.error('SERVER_INIT_FAILED', error);
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