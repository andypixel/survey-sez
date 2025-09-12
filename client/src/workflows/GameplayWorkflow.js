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
    
    // Save user's name to localStorage for convenience in future sessions
    if (myPlayer && myPlayer.name) {
      this.storage.saveUserName(myPlayer.name);
    }
  }

  /**
   * Handles custom category creation from CategoriesDisplay form
   * Sends to server and waits for response
   * @param {Event} e - Form submit event with categoryName and categoryEntries
   */
  handleAddCategory(e) {
    e.preventDefault();
    const name = e.target.categoryName.value.trim();
    const entriesText = e.target.categoryEntries?.value.trim() || '';
    
    if (name) {
      const entries = entriesText ? entriesText.split('\n').map(entry => entry.trim()).filter(entry => entry) : [];
      
      this.callbacks.setCategoryError('');
      
      // Send to server without optimistic update
      this.socket.emit('addCategory', { name, entries });
      
      // Store form reference for reset on success
      this.lastCategoryForm = e.target;
      console.log('Stored form reference for reset:', !!this.lastCategoryForm);
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

  handleCategorySuccess() {
    console.log('handleCategorySuccess called, lastCategoryForm:', !!this.lastCategoryForm);
    if (this.lastCategoryForm) {
      console.log('Resetting form');
      this.lastCategoryForm.reset();
      this.lastCategoryForm = null;
    } else {
      console.log('No form to reset - form reference was lost');
    }
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
  
  handleEndGuessing() {
    this.socket.emit('endGuessing');
  }
  
  handleRevealResults() {
    this.socket.emit('revealResults');
  }
  
  handlePauseGame() {
    this.socket.emit('pauseGame');
  }
  
  handleResumeGame() {
    this.socket.emit('resumeGame');
  }
  
  handleRestartGame() {
    this.socket.emit('restartGame');
  }

  handleSkipAnnouncer() {
    this.socket.emit('skipAnnouncer');
  }

  /**
   * Skip current universal category (announcer only, max 2 per turn)
   */
  handleSkipCategory() {
    this.socket.emit('skipCategory');
  }

  handleEmergencyReset() {
    this.socket.emit('emergencyReset');
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
  handleEndGuessing() {
    this.socket.emit('endGuessing');
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

  /**
   * Handle entry toggle from announcer
   */
  handleToggleEntry(entry) {
    this.socket.emit('toggleEntry', { entry });
  }
}

export default GameplayWorkflow;