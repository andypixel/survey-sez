/**
 * Manages user session data across rooms and connections
 */
class UserSession {
  /**
   * Create a new user session
   * @param {string} socketId - Socket connection ID
   */
  constructor(socketId) {
    this.socketId = socketId;
    this.userId = this.generateUserId();
    this.currentRoom = null;
    this.userData = {}; // per-room user data
  }
  
  /**
   * Generate a unique user ID
   * @returns {string} Random user ID
   * @private
   */
  generateUserId() {
    // TODO: Use more robust ID generation (UUID) for production
    return 'user_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Join a room
   * @param {string} roomId - Room to join
   */
  joinRoom(roomId) {
    this.currentRoom = roomId;
  }

  /**
   * Leave current room
   */
  leaveRoom() {
    this.currentRoom = null;
  }

  /**
   * Set user data for a specific room
   * @param {string} roomId - Room ID
   * @param {Object} data - User data to merge
   */
  setUserData(roomId, data) {
    this.userData[roomId] = { ...this.userData[roomId], ...data };
  }

  /**
   * Get user data for a specific room
   * @param {string} roomId - Room ID
   * @returns {Object|null} User data or null if not found
   */
  getUserData(roomId) {
    return this.userData[roomId] || null;
  }

  // Team operations
  switchTeam(newTeam) {
    if (this.currentRoom && this.userData[this.currentRoom]) {
      this.userData[this.currentRoom].team = newTeam;
    }
  }

  changeName(newName) {
    if (this.currentRoom && this.userData[this.currentRoom]) {
      this.userData[this.currentRoom].name = newName;
    }
  }

  // Persistence helpers
  getStorageKey(roomId) {
    return `gameUser_${roomId}`;
  }

  // For client-side localStorage integration
  getClientStorageData(roomId) {
    const userData = this.getUserData(roomId);
    return userData ? {
      name: userData.name,
      team: userData.team
    } : null;
  }
}

module.exports = UserSession;