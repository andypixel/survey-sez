/**
 * Handles room and user setup related socket events
 */
class RoomHandler {
  /**
   * Register all room event handlers for a socket
   */
  static register(socket, io, userSession, getOrCreateRoom, debouncedSave, userSessions) {
    socket.on('joinRoom', (roomId) => {
      this.handleJoinRoom(socket, userSession, getOrCreateRoom, roomId);
    });

    socket.on('userSetup', (data) => {
      this.handleUserSetup(socket, io, userSession, getOrCreateRoom, debouncedSave, userSessions, data);
    });
  }

  /**
   * Handle room join requests
   */
  static handleJoinRoom(socket, userSession, getOrCreateRoom, roomId) {
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
  }

  /**
   * Handle user setup completion (name + team selection)
   */
  static handleUserSetup(socket, io, userSession, getOrCreateRoom, debouncedSave, userSessions, data) {
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
        const error = 'Invalid team selection';
        console.error('[RoomHandler] User setup failed:', error);
        socket.emit('setupError', { message: error });
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
  }
}

module.exports = RoomHandler;