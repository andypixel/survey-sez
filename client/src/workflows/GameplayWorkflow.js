class GameplayWorkflow {
  constructor(socket, callbacks, storage) {
    this.socket = socket;
    this.callbacks = callbacks;
    this.storage = storage;
  }

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
}

export default GameplayWorkflow;