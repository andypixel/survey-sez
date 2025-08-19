class GameplayWorkflow {
  constructor(socket, callbacks, storage) {
    this.socket = socket;
    this.callbacks = callbacks;
    this.storage = storage;
  }

  handleGameState(state) {
    this.callbacks.setGameState(state);
    this.callbacks.setIsInRoom(true);
    this.callbacks.setShowUserSetup(false);
    
    const myPlayer = state.players[this.callbacks.getMyId()];
    const roomId = this.callbacks.getRoomId();
    const myUserId = this.callbacks.getMyUserId();
    
    if (myPlayer && roomId && myUserId) {
      this.storage.saveUserData(roomId, {
        userId: myUserId,
        name: myPlayer.name,
        team: myPlayer.team,
        setupComplete: true
      });
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
}

export default GameplayWorkflow;