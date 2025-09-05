/**
 * Handles user setup workflow including name entry and team selection
 */
class UserSetupWorkflow {
  /**
   * Initialize user setup workflow
   * @param {Object} socket - Socket.IO client instance
   * @param {Object} callbacks - App state update callbacks
   * @param {Object} storage - Storage utilities for localStorage
   */
  constructor(socket, callbacks, storage) {
    this.socket = socket;
    this.callbacks = callbacks;
    this.storage = storage;
  }

  /**
   * Handle user setup form submission
   * @param {Event} e - Form submit event
   */
  handleUserSetup(e) {
    e.preventDefault();
    const playerName = e.target.playerName.value.trim();
    const teamChoice = e.target.teamChoice.value;
    const newTeamName = e.target.newTeamName?.value.trim();
    
    if (!playerName) return;
    
    // Save name for convenience in future sessions
    this.storage.saveUserName(playerName);
    
    // Save room data for auto-rejoin (server will validate)
    this.storage.saveUserData(this.callbacks.getRoomId(), {
      userId: this.callbacks.getMyUserId(),
      name: playerName,
      team: teamChoice === 'new' ? newTeamName : teamChoice,
      setupComplete: true
    });
    
    const setupData = { 
      playerName,
      userId: this.callbacks.getMyUserId()
    };
    
    // Determine team assignment
    if (teamChoice === 'new' && newTeamName) {
      setupData.newTeamName = newTeamName;
    } else if (teamChoice !== 'new') {
      setupData.existingTeam = teamChoice;
    } else {
      return; // Invalid team selection
    }
    
    this.callbacks.setSetupError('');
    this.socket.emit('userSetup', setupData);
  }

  handleRoomSetup(data) {
    const existingUserData = this.storage.getUserData(data.roomId);
    
    if (existingUserData && existingUserData.team && existingUserData.name && existingUserData.setupComplete) {
      // Auto-rejoin with stored data (server validates and is source of truth)
      this.socket.emit('userSetup', {
        playerName: existingUserData.name,
        existingTeam: existingUserData.team,
        userId: this.callbacks.getMyUserId()
      });
    } else {
      this.callbacks.setRoomSetupData(data);
      this.callbacks.setShowUserSetup(true);
    }
  }

  handleRoomSetupUpdate(data) {
    // Update existing room setup data with new team information
    this.callbacks.setRoomSetupData(data);
  }
}

export default UserSetupWorkflow;