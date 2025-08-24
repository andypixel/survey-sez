import ErrorHandler from '../utils/ErrorHandler';

/**
 * Handles all gameplay-related actions and state management
 * Manages categories, game start, and turn progression
 */
class GameplayWorkflow {
  /**
   * @param {Socket} socket - Socket.IO client instance
   * @param {Object} callbacks - State setters and getters from App.jsx
   * @param {Object} storage - localStorage utilities
   */
  constructor(socket, callbacks, storage) {
    this.socket = socket;
    this.callbacks = callbacks;
    this.storage = storage;
  }

  /**
   * Processes gameState updates from server (main state sync method)
   * Server is always source of truth - overwrites local state
   * @param {Object} state - Complete game state from server
   */
  handleGameState(state) {
    console.log('GameplayWorkflow: Processing gameState update');
    
    // Server is source of truth - always accept server state
    this.callbacks.setGameState(state);
    this.callbacks.setIsInRoom(true);
    this.callbacks.setShowUserSetup(false);
    
    const myPlayer = state.players[this.callbacks.getMyId()];
    const roomId = this.callbacks.getRoomId();
    const myUserId = this.callbacks.getMyUserId();
    
    // Sync localStorage with server state
    if (myPlayer && roomId && myUserId) {
      const serverUserData = {
        userId: myUserId,
        name: myPlayer.name,
        team: myPlayer.team,
        setupComplete: true
      };
      
      // Check for conflicts with local storage
      const localUserData = this.storage.getUserData(roomId);
      if (localUserData && 
          (localUserData.name !== myPlayer.name || localUserData.team !== myPlayer.team)) {
        console.log('Conflict detected - deferring to server:', serverUserData);
      }
      
      // Always save server state as source of truth
      this.storage.saveUserData(roomId, serverUserData);
    }
  }

  /**
   * Handles custom category creation from CategoriesDisplay form
   * Does optimistic update then syncs with server
   * @param {Event} e - Form submit event with categoryName and categoryEntries
   */
  handleAddCategory(e) {
    e.preventDefault();
    const name = e.target.categoryName.value.trim();
    const entriesText = e.target.categoryEntries?.value.trim() || '';
    
    if (name) {
      const entries = entriesText ? entriesText.split(',').map(entry => entry.trim()).filter(entry => entry) : [];
      
      this.callbacks.setCategoryError('');
      
      // Optimistic update
      const roomId = this.callbacks.getRoomId();
      const myUserId = this.callbacks.getMyUserId();
      const gameState = this.callbacks.getGameState();
      const myId = this.callbacks.getMyId();
      
      const tempCategory = {
        id: `${roomId}-${myUserId}-${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
        name: name,
        entries: entries,
        createdBy: {
          userId: myUserId,
          name: gameState.players[myId]?.name || 'Unknown'
        }
      };
      
      const userKey = `${roomId}-${myUserId}`;
      
      this.callbacks.setGameState(prevState => ({
        ...prevState,
        categories: {
          ...prevState.categories,
          userCustom: {
            ...prevState.categories.userCustom,
            [userKey]: [...(prevState.categories.userCustom[userKey] || []), tempCategory]
          }
        }
      }));
      
      this.socket.emit('addCategory', { name, entries });
      e.target.reset();
    }
  }

  handleCategoryAdded(data) {
    this.callbacks.setGameState(prevState => ({
      ...prevState,
      categories: {
        ...prevState.categories,
        userCustom: {
          ...prevState.categories.userCustom,
          [data.userKey]: [...(prevState.categories.userCustom[data.userKey] || []), data.category]
        }
      }
    }));
  }

  /**
   * Handle game start with configuration settings
   * @param {Event} e - Form submit event
   */
  handleStartGame(e) {
    console.log('handleStartGame called');
    e.preventDefault();
    const timeLimit = parseInt(e.target.timeLimit?.value) || 30;
    const rounds = parseInt(e.target.rounds?.value) || 10;
    
    console.log('Emitting startGame with:', { timeLimit, rounds });
    this.socket.emit('startGame', {
      timeLimit,
      rounds
    });
  }

  /**
   * Handle begin turn - announcer starts the turn with selected category
   */
  handleBeginTurn() {
    this.socket.emit('beginTurn');
  }

  /**
   * Handle end turn - announcer ends the active guessing phase
   */
  handleEndTurn() {
    this.socket.emit('endTurn');
  }

  /**
   * Handle continue turn - announcer advances to next turn
   */
  handleContinueTurn() {
    this.socket.emit('continueTurn');
  }

  /**
   * Handle guess submission from guessing team members
   */
  handleSubmitGuess(guess) {
    if (guess.trim()) {
      this.socket.emit('submitGuess', { guess: guess.trim() });
    }
  }
}

export default GameplayWorkflow;