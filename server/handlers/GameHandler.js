/**
 * Handles all game-related socket events
 */
class GameHandler {
  /**
   * Register all game event handlers for a socket
   * @param {Socket} socket - Socket.IO socket instance
   * @param {SocketIO} io - Socket.IO server instance
   * @param {UserSession} userSession - User session for this socket
   * @param {Object} rooms - Rooms storage object
   * @param {Function} getOrCreateRoom - Room factory function
   * @param {Function} debouncedSave - Save function
   */
  static register(socket, io, userSession, rooms, getOrCreateRoom, debouncedSave) {
    socket.on('startGame', (data) => {
      this.handleStartGame(socket, io, userSession, getOrCreateRoom, debouncedSave, data);
    });

    socket.on('beginTurn', () => {
      this.handleBeginTurn(socket, io, userSession, getOrCreateRoom, debouncedSave);
    });
  }

  /**
   * Handle game start request
   */
  static handleStartGame(socket, io, userSession, getOrCreateRoom, debouncedSave, data) {
    console.log('Server received startGame event:', data);
    const roomId = userSession.currentRoom;
    console.log('Current room:', roomId);
    
    if (roomId) {
      const room = getOrCreateRoom(roomId);
      console.log('Room teams:', Object.keys(room.teams));
      
      // Validate that we have exactly 2 teams to start
      if (Object.keys(room.teams).length !== 2) {
        const error = 'Need exactly 2 teams to start the game';
        console.error('[GameHandler] Start game failed:', error);
        socket.emit('gameError', { message: error });
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
        const error = 'Failed to start game';
        console.error('[GameHandler] Start game failed:', error);
        socket.emit('gameError', { message: error });
      }
    } else {
      const error = 'No current room found';
      console.error('[GameHandler] Start game failed:', error);
      socket.emit('gameError', { message: error });
    }
  }

  /**
   * Handle begin turn request
   */
  static handleBeginTurn(socket, io, userSession, getOrCreateRoom, debouncedSave) {
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
  }
}

module.exports = GameHandler;