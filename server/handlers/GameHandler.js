const GAME_RULES = require('../config/GameRules');

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

    socket.on('endGuessing', () => {
      this.handleEndGuessing(socket, io, userSession, getOrCreateRoom, debouncedSave);
    });

    socket.on('revealResults', () => {
      this.handleRevealResults(socket, io, userSession, getOrCreateRoom, debouncedSave);
    });

    socket.on('continueTurn', () => {
      this.handleContinueTurn(socket, io, userSession, getOrCreateRoom, debouncedSave);
    });

    socket.on('submitGuess', (data) => {
      this.handleSubmitGuess(socket, io, userSession, getOrCreateRoom, debouncedSave, data);
    });

    socket.on('toggleEntry', (data) => {
      this.handleToggleEntry(socket, io, userSession, getOrCreateRoom, debouncedSave, data);
    });

    socket.on('pauseGame', () => {
      this.handlePauseGame(socket, io, userSession, getOrCreateRoom, debouncedSave);
    });

    socket.on('resumeGame', () => {
      this.handleResumeGame(socket, io, userSession, getOrCreateRoom, debouncedSave);
    });

    socket.on('restartGame', () => {
      this.handleRestartGame(socket, io, userSession, getOrCreateRoom, debouncedSave);
    });

    socket.on('skipAnnouncer', () => {
      this.handleSkipAnnouncer(socket, io, userSession, getOrCreateRoom, debouncedSave);
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
      
      // Validate that we have enough teams to start
      if (Object.keys(room.teams).length < GAME_RULES.MIN_TEAMS_TO_START) {
        const error = `Need at least ${GAME_RULES.MIN_TEAMS_TO_START} teams to start the game`;
        console.error('[GameHandler] Start game failed:', error);
        socket.emit('gameError', { message: error });
        return;
      }
      
      // Update game settings
      room.gameSettings.timeLimit = data.timeLimit || GAME_RULES.DEFAULT_TIME_LIMIT;
      room.gameSettings.turnsPerTeam = data.rounds || GAME_RULES.DEFAULT_ROUNDS;
      
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
      if (room.gameState === GAME_RULES.PHASES.GAMEPLAY && room.currentGame) {
        const announcerSocketId = room.currentGame.getCurrentAnnouncerSocket();
        if (announcerSocketId === socket.id) {
          if (room.currentGame.beginTurn()) {
            io.to(roomId).emit('gameState', room.getState());
            debouncedSave();
          }
        }
      }
    }
  }

  /**
   * Handle end guessing request
   */
  static handleEndGuessing(socket, io, userSession, getOrCreateRoom, debouncedSave) {
    const roomId = userSession.currentRoom;
    if (roomId) {
      const room = getOrCreateRoom(roomId);
      if (room.gameState === GAME_RULES.PHASES.GAMEPLAY && room.currentGame) {
        const announcerSocketId = room.currentGame.getCurrentAnnouncerSocket();
        if (announcerSocketId === socket.id) {
          console.log('EndGuessing called, current phase:', room.currentGame.turnPhase);
          if (room.currentGame.endGuessing()) {
            console.log('EndGuessing successful, new phase:', room.currentGame.turnPhase);
            io.to(roomId).emit('gameState', room.getState());
            debouncedSave();
          }
        }
      }
    }
  }

  /**
   * Handle reveal results request (RESULTS -> TURN_SUMMARY)
   */
  static handleRevealResults(socket, io, userSession, getOrCreateRoom, debouncedSave) {
    const roomId = userSession.currentRoom;
    if (roomId) {
      const room = getOrCreateRoom(roomId);
      if (room.gameState === GAME_RULES.PHASES.GAMEPLAY && room.currentGame) {
        const announcerSocketId = room.currentGame.getCurrentAnnouncerSocket();
        if (announcerSocketId === socket.id) {
          console.log('RevealResults called, current phase:', room.currentGame.turnPhase);
          if (room.currentGame.revealResults()) {
            console.log('RevealResults successful, new phase:', room.currentGame.turnPhase);
            io.to(roomId).emit('gameState', room.getState());
            debouncedSave();
          }
        }
      }
    }
  }

  /**
   * Handle continue turn request (advance to next turn)
   */
  static handleContinueTurn(socket, io, userSession, getOrCreateRoom, debouncedSave) {
    console.log('handleContinueTurn called by socket:', socket.id);
    const roomId = userSession.currentRoom;
    if (roomId) {
      const room = getOrCreateRoom(roomId);
      console.log('Room found:', roomId, 'gameState:', room.gameState, 'hasCurrentGame:', !!room.currentGame);
      if (room.gameState === GAME_RULES.PHASES.GAMEPLAY && room.currentGame) {
        const announcerSocketId = room.currentGame.getCurrentAnnouncerSocket();
        console.log('Announcer check - expected:', announcerSocketId, 'actual:', socket.id, 'match:', announcerSocketId === socket.id);
        if (announcerSocketId === socket.id) {
          console.log('Calling continueTurn...');
          if (room.currentGame.continueTurn()) {
            console.log('continueTurn successful, emitting gameState');
            io.to(roomId).emit('gameState', room.getState());
            debouncedSave();
          }
        }
      }
    }
  }

  /**
   * Handle guess submission from guessing team members
   */
  static handleSubmitGuess(socket, io, userSession, getOrCreateRoom, debouncedSave, data) {
    const roomId = userSession.currentRoom;
    if (roomId && data.guess) {
      const room = getOrCreateRoom(roomId);
      if (room.gameState === GAME_RULES.PHASES.GAMEPLAY && room.currentGame) {
        const userId = room.getUserForSocket(socket.id);
        const player = room.players[userId];
        
        // Validate player is on guessing team and not the announcer
        if (player && 
            player.team === room.currentGame.getCurrentGuessingTeam() && 
            socket.id !== room.currentGame.getCurrentAnnouncerSocket() &&
            room.currentGame.turnPhase === GAME_RULES.TURN_PHASES.ACTIVE_GUESSING) {
          
          if (room.currentGame.addGuess(data.guess, player.name)) {
            io.to(roomId).emit('gameState', room.getState());
            debouncedSave();
          }
        }
      }
    }
  }

  /**
   * Handle entry toggle from announcer
   */
  static handleToggleEntry(socket, io, userSession, getOrCreateRoom, debouncedSave, data) {
    const roomId = userSession.currentRoom;
    if (roomId && data.entry) {
      const room = getOrCreateRoom(roomId);
      if (room.gameState === GAME_RULES.PHASES.GAMEPLAY && room.currentGame) {
        const announcerSocketId = room.currentGame.getCurrentAnnouncerSocket();
        if (announcerSocketId === socket.id) {
          if (room.currentGame.toggleEntry(data.entry)) {
            io.to(roomId).emit('gameState', room.getState());
            debouncedSave();
          }
        }
      }
    }
  }

  /**
   * Handle pause game request
   */
  static handlePauseGame(socket, io, userSession, getOrCreateRoom, debouncedSave) {
    const roomId = userSession.currentRoom;
    if (roomId) {
      const room = getOrCreateRoom(roomId);
      if (room.gameState === GAME_RULES.PHASES.GAMEPLAY && room.currentGame) {
        if (room.currentGame.pauseGame()) {
          io.to(roomId).emit('gameState', room.getState());
          debouncedSave();
        }
      }
    }
  }

  /**
   * Handle resume game request
   */
  static handleResumeGame(socket, io, userSession, getOrCreateRoom, debouncedSave) {
    const roomId = userSession.currentRoom;
    if (roomId) {
      const room = getOrCreateRoom(roomId);
      if (room.gameState === GAME_RULES.PHASES.GAMEPLAY && room.currentGame) {
        if (room.currentGame.resumeGame()) {
          io.to(roomId).emit('gameState', room.getState());
          debouncedSave();
        }
      }
    }
  }

  /**
   * Handle restart game request
   */
  static handleRestartGame(socket, io, userSession, getOrCreateRoom, debouncedSave) {
    console.log('handleRestartGame called by socket:', socket.id);
    const roomId = userSession.currentRoom;
    console.log('Room ID:', roomId);
    if (roomId) {
      const room = getOrCreateRoom(roomId);
      console.log('Room found, current gameState:', room.gameState);
      if (room.resetGame()) {
        console.log('Game reset successful, emitting gameState');
        io.to(roomId).emit('gameState', room.getState());
        debouncedSave();
      } else {
        console.log('Game reset failed');
      }
    } else {
      console.log('No room ID found');
    }
  }

  /**
   * Handle skip announcer request
   */
  static handleSkipAnnouncer(socket, io, userSession, getOrCreateRoom, debouncedSave) {
    const roomId = userSession.currentRoom;
    if (roomId) {
      const room = getOrCreateRoom(roomId);
      if (room.gameState === GAME_RULES.PHASES.GAMEPLAY && room.currentGame) {
        if (room.currentGame.skipAnnouncer()) {
          io.to(roomId).emit('gameState', room.getState());
          debouncedSave();
        }
      }
    }
  }
}

module.exports = GameHandler;