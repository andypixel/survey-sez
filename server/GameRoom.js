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
   * @param {Object} playerData - Player information (name, team, userId)
   */
  addPlayer(socketId, playerData) {
    const userId = playerData.userId || socketId;
    
    this.players[socketId] = {
      id: socketId,
      userId: userId,
      name: playerData.name,
      team: playerData.team
    };
    
    // Create team if it doesn't exist
    if (!this.teams[playerData.team]) {
      this.teams[playerData.team] = { name: playerData.team, players: [] };
    }
    
    // Clean team array and use only userId for membership
    this.teams[playerData.team].players = this.teams[playerData.team].players.filter(id => 
      id.startsWith('user_') // Keep only user IDs, remove socket IDs
    );
    
    // Add userId if not already present
    if (!this.teams[playerData.team].players.includes(userId)) {
      this.teams[playerData.team].players.push(userId);
    }
  }

  /**
   * Remove a player from the room and clean up empty teams
   * @param {string} socketId - Socket connection ID
   */
  removePlayer(socketId) {
    const player = this.players[socketId];
    if (player && player.team && this.teams[player.team]) {
      // Remove from team using userId to handle reconnections properly
      const userId = player.userId || socketId;
      this.teams[player.team].players = this.teams[player.team].players.filter(id => id !== userId);
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
      // Initialize first turn
      this.currentGame.initializeFirstTurn();
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
  
  initializeFirstTurn() {
    // Set first team as guessing team and select their first announcer
    const firstTeam = this.getCurrentGuessingTeam();
    const firstAnnouncer = this.getCurrentAnnouncer();
    console.log(`First turn: Team ${firstTeam}, Announcer ${firstAnnouncer}`);
  }

  getCurrentGuessingTeam() {
    return this.teamOrder[this.currentTurn % 2];
  }

  getCurrentAnnouncer() {
    const team = this.getCurrentGuessingTeam();
    const teamPlayers = this.room.teams[team].players;
    const announcerUserId = teamPlayers[this.announcerIndex[team] % teamPlayers.length];
    
    // Find the current socket ID for this user
    const playerEntry = Object.entries(this.room.players).find(([socketId, player]) => 
      player.userId === announcerUserId
    );
    
    return playerEntry ? playerEntry[0] : null;
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