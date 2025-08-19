/**
 * Manages game room state, players, teams, and game lifecycle
 */
class GameRoom {
  /**
   * Create a new game room
   * @param {string} roomId - Unique room identifier
   * @param {Object} categoriesData - Global categories data
   */
  constructor(roomId, categoriesData) {
    this.roomId = roomId;
    this.players = {}; // socketId -> player data
    this.teams = {}; // teamName -> team data
    this.gameState = 'ONBOARDING'; // ONBOARDING, GAMEPLAY, SUMMARY
    this.gameSettings = {
      timeLimit: 30,
      turnsPerTeam: 3
    };
    this.categories = {
      universal: categoriesData.universal,
      userCustom: {} // user-specific categories
    };
    
    // Load existing user custom categories for this room
    Object.keys(categoriesData.custom).forEach(key => {
      if (key.startsWith(`${roomId}-`)) {
        this.categories.userCustom[key] = categoriesData.custom[key];
      }
    });
    
    this.currentGame = null;
  }

  /**
   * Add a player to the room and assign to team
   * @param {string} socketId - Socket connection ID
   * @param {Object} playerData - Player information (name, team)
   */
  addPlayer(socketId, playerData) {
    this.players[socketId] = {
      id: socketId,
      name: playerData.name,
      team: playerData.team
    };
    
    // Create team if it doesn't exist
    if (!this.teams[playerData.team]) {
      this.teams[playerData.team] = { name: playerData.team, players: [] };
    }
    
    // Add player to team (avoid duplicates)
    if (!this.teams[playerData.team].players.includes(socketId)) {
      this.teams[playerData.team].players.push(socketId);
    }
  }

  /**
   * Remove a player from the room and clean up empty teams
   * @param {string} socketId - Socket connection ID
   */
  removePlayer(socketId) {
    const player = this.players[socketId];
    if (player && player.team && this.teams[player.team]) {
      // Remove from team
      this.teams[player.team].players = this.teams[player.team].players.filter(id => id !== socketId);
      // Clean up empty teams
      if (this.teams[player.team].players.length === 0) {
        delete this.teams[player.team];
      }
    }
    delete this.players[socketId];
  }

  /**
   * Check if new teams can be created (max 2 teams)
   * @returns {boolean} True if team creation is allowed
   */
  canCreateTeam() {
    return Object.keys(this.teams).length < 2;
  }

  /**
   * Get list of existing team names
   * @returns {string[]} Array of team names
   */
  getTeamNames() {
    return Object.keys(this.teams);
  }

  // Game state management
  startGame() {
    if (Object.keys(this.teams).length === 2) {
      this.gameState = 'GAMEPLAY';
      this.currentGame = new GameplayManager(this);
      return true;
    }
    return false;
  }

  endGame() {
    this.gameState = 'SUMMARY';
  }

  resetGame() {
    this.gameState = 'ONBOARDING';
    this.currentGame = null;
  }

  /**
   * Add a custom category for a specific user
   * @param {Object} category - Category data
   * @param {string} userId - User who created the category
   */
  addCustomCategory(category, userId) {
    const userKey = `${this.roomId}-${userId}`;
    if (!this.categories.userCustom[userKey]) {
      this.categories.userCustom[userKey] = [];
    }
    
    this.categories.userCustom[userKey].push(category);
  }
  
  /**
   * Get categories visible to a specific user
   * @param {string} userId - User ID
   * @returns {Object} Categories object with universal and user-specific categories
   */
  getCategoriesForUser(userId) {
    const userKey = `${this.roomId}-${userId}`;
    return {
      universal: this.categories.universal,
      userCustom: this.categories.userCustom[userKey] || []
    };
  }

  getState() {
    return {
      roomId: this.roomId,
      players: this.players,
      teams: this.teams,
      gameState: this.gameState,
      gameSettings: this.gameSettings,
      categories: this.categories,
      currentGame: this.currentGame?.getState() || null
    };
  }
}

class GameplayManager {
  constructor(room) {
    this.room = room;
    this.currentTurn = 0;
    this.turnsCompleted = 0;
    this.teamOrder = Object.keys(room.teams);
    this.announcerIndex = { [this.teamOrder[0]]: 0, [this.teamOrder[1]]: 0 };
    this.currentCategory = null;
    this.responses = [];
    this.timer = null;
  }

  getCurrentGuessingTeam() {
    return this.teamOrder[this.currentTurn % 2];
  }

  getCurrentAnnouncer() {
    const team = this.getCurrentGuessingTeam();
    const teamPlayers = this.room.teams[team].players;
    return teamPlayers[this.announcerIndex[team] % teamPlayers.length];
  }

  nextTurn() {
    this.currentTurn++;
    if (this.currentTurn % 2 === 0) {
      this.turnsCompleted++;
      // Advance announcer for both teams
      this.teamOrder.forEach(team => {
        this.announcerIndex[team]++;
      });
    }
  }

  isGameComplete() {
    return this.turnsCompleted >= this.room.gameSettings.turnsPerTeam;
  }

  getState() {
    return {
      currentTurn: this.currentTurn,
      turnsCompleted: this.turnsCompleted,
      currentGuessingTeam: this.getCurrentGuessingTeam(),
      currentAnnouncer: this.getCurrentAnnouncer(),
      currentCategory: this.currentCategory,
      responses: this.responses,
      isComplete: this.isGameComplete()
    };
  }
}

module.exports = { GameRoom, GameplayManager };