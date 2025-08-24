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
  
  /**
   * Handle room join requests
   * Creates room if it doesn't exist and sends setup information
   */
  socket.on('joinRoom', (roomId) => {
    console.log(`Player ${socket.id} requesting to join room: ${roomId}`);
    
    userSession.joinRoom(roomId);
    socket.join(roomId);
    
    const room = getOrCreateRoom(roomId);
    
    // Send room setup info to client
    socket.emit('roomSetup', {
      roomId,
      existingTeams: room.getTeamNames(),
      canCreateTeam: room.canCreateTeam()
    });
  });
  
  /**
   * Handle user setup completion (name + team selection)
   * Adds player to room and broadcasts updates to other users
   */
  socket.on('userSetup', (data) => {
    const roomId = userSession.currentRoom;
    if (roomId && data.playerName) {
      const room = getOrCreateRoom(roomId);
      
      let teamId;
      
      // Determine team assignment
      if (data.newTeamName && room.canCreateTeam()) {
        teamId = data.newTeamName;
      } else if (data.existingTeam) {
        teamId = data.existingTeam;
      } else {
        socket.emit('setupError', { message: 'Invalid team selection' });
        return;
      }
      
      const userId = data.userId || userSession.userId;
      
      // Check if this is a rejoin to prevent duplicate broadcasts
      const existingUserData = userSession.getUserData(roomId);
      const isRejoin = existingUserData && existingUserData.name === data.playerName && existingUserData.team === teamId;
      
      // Add player to room and save user data
      room.addPlayer(socket.id, { name: data.playerName, team: teamId, userId: userId });
      userSession.setUserData(roomId, { 
        userId: userId,
        name: data.playerName, 
        team: teamId,
        setupComplete: true
      });
      
      console.log(`Player ${data.playerName} ${isRejoin ? 'rejoined' : 'joined'} team ${teamId} in room ${roomId}`);
      
      // Send current game state to new player
      socket.emit('gameState', room.getState());
      
      // Trigger debounced save after state change
      debouncedSave();
      
      // Broadcast updates to other users (avoid cascading refreshes on rejoins)
      if (!isRejoin) {
        // TODO: Optimize room iteration - this doesn't scale well with large rooms
        const socketsInRoom = io.sockets.adapter.rooms.get(roomId);
        if (socketsInRoom) {
          socketsInRoom.forEach(socketId => {
            if (socketId !== socket.id) {
              const otherUserSession = userSessions[socketId];
              const otherUserData = otherUserSession?.getUserData(roomId);
              
              if (otherUserData?.setupComplete) {
                // Send gameState to users who completed setup
                io.to(socketId).emit('gameState', room.getState());
              } else if (otherUserData && !otherUserData.setupComplete) {
                // Send room setup update to users still in setup
                io.to(socketId).emit('roomSetup', {
                  roomId,
                  existingTeams: room.getTeamNames(),
                  canCreateTeam: room.canCreateTeam()
                });
              }
            }
          });
        }
      }
    }
  });
  
  /**
   * Handle game start request
   * Validates teams and starts gameplay phase
   */
  socket.on('startGame', (data) => {
    console.log('Server received startGame event:', data);
    const roomId = userSession.currentRoom;
    console.log('Current room:', roomId);
    
    if (roomId) {
      const room = getOrCreateRoom(roomId);
      console.log('Room teams:', Object.keys(room.teams));
      
      // Validate that we have exactly 2 teams to start
      if (Object.keys(room.teams).length !== 2) {
        console.log('Not enough teams to start game');
        socket.emit('gameError', { message: 'Need exactly 2 teams to start the game' });
        return;
      }
      
      // Update game settings
      room.gameSettings.timeLimit = data.timeLimit || 30;
      room.gameSettings.turnsPerTeam = data.rounds || 10;
      
      // Start the game
      console.log('Attempting to start game...');
      if (room.startGame()) {
        // Broadcast game state to all players in room
        io.to(roomId).emit('gameState', room.getState());
        debouncedSave();
        console.log(`Game started in room ${roomId}`);
      } else {
        console.log('Failed to start game');
        socket.emit('gameError', { message: 'Failed to start game' });
      }
    } else {
      console.log('No current room for user');
    }
  });
  
  // Handle begin turn
  socket.on('beginTurn', () => {
    const roomId = userSession.currentRoom;
    if (roomId) {
      const room = getOrCreateRoom(roomId);
      if (room.gameState === 'GAMEPLAY' && room.currentGame) {
        const announcerSocketId = room.currentGame.getCurrentAnnouncer();
        if (announcerSocketId === socket.id) {
          if (room.currentGame.beginTurn()) {
            io.to(roomId).emit('gameState', room.getState());
            debouncedSave();
          }
        }
      }
    }
  });
  
  // Handle adding custom category
  socket.on('addCategory', async (data) => {
    const roomId = userSession.currentRoom;
    const playerData = userSession.getUserData(roomId);
    
    if (roomId && playerData && data.name) {
      const categoryId = data.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const fullId = `${roomId}-${playerData.team}-${categoryId}`;
      
      const room = getOrCreateRoom(roomId);
      
      // Check for duplicate IDs in universal categories
      const universalExists = room.categories.universal.some(cat => cat.id === categoryId);
      
      // Check for duplicate IDs in user's custom categories
      const userKey = `${roomId}-${playerData.userId}`;
      const userCustom = room.categories.userCustom[userKey] || [];
      const customExists = userCustom.some(cat => cat.id === fullId);
      
      if (universalExists || customExists) {
        socket.emit('categoryError', { message: 'A category with this name already exists' });
        return;
      }
      
      const newCategory = {
        id: fullId,
        name: data.name,
        entries: data.entries || []
      };
      
      // Save to persistent storage (user-scoped)
      const storageKey = `${roomId}-${playerData.userId}`;
      if (!categoriesData.custom[storageKey]) {
        categoriesData.custom[storageKey] = [];
      }
      
      const categoryWithCreator = {
        ...newCategory,
        createdBy: {
          userId: playerData.userId,
          name: playerData.name
        }
      };
      
      categoriesData.custom[storageKey].push(categoryWithCreator);
      try {
        await storage.saveCategories(categoriesData);
      } catch (error) {
        console.error('Error saving categories:', error);
        socket.emit('categoryError', { message: 'Failed to save category' });
        return;
      }
      
      // Update room state with the category that includes creator info
      room.addCustomCategory(categoryWithCreator, playerData.userId);
      
      // Send targeted category update to users who have completed setup
      const socketsInRoom = io.sockets.adapter.rooms.get(roomId);
      if (socketsInRoom) {
        socketsInRoom.forEach(socketId => {
          if (socketId !== socket.id) {
            const otherUserSession = userSessions[socketId];
            if (otherUserSession && otherUserSession.getUserData(roomId)?.setupComplete) {
              io.to(socketId).emit('categoryAdded', {
                userKey: `${roomId}-${playerData.userId}`,
                category: categoryWithCreator
              });
            }
          }
        });
      }
      
      // Note: No gameState broadcast needed - sender has optimistic update, others get categoryAdded
    } else {
      socket.emit('categoryError', { message: 'Category must have a name' });
    }
  });
  
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
          if (otherUserSession && otherUserSession.getUserData(roomId)?.setupComplete) {
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