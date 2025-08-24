const GAME_RULES = require('./config/GameRules');

/**
 * Manages game room state, players, teams, and game lifecycle
 * 
 * Key State Properties:
 * - gameState: 'ONBOARDING' | 'GAMEPLAY' | 'SUMMARY'
 * - players: { [socketId]: playerData } - current connections
 * - teams: { [teamName]: { name, players: [userId] } } - persistent team membership
 * - categories: { universal: [], userCustom: { "[roomId]-[userId]": [] } }
 * - currentGame: GameplayManager instance during GAMEPLAY phase
 */
class GameRoom {
  /**
   * Create a new game room
   * @param {string} roomId - Unique room identifier
   * @param {Object} categoriesData - Global categories data
   */
  constructor(roomId, categoriesData) {
    this.roomId = roomId;
    this.connectedSockets = {}; // socketId -> userId mapping
    this.players = {}; // userId -> player data (persistent)
    this.teams = {}; // teamName -> team data
    this.gameState = GAME_RULES.PHASES.ONBOARDING;
    this.gameSettings = {
      timeLimit: GAME_RULES.DEFAULT_TIME_LIMIT,
      turnsPerTeam: GAME_RULES.DEFAULT_ROUNDS
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
    const userId = playerData.userId;
    
    // Map socket to user
    this.connectedSockets[socketId] = userId;
    
    // Store player data by userId (persistent across reconnections)
    this.players[userId] = {
      userId: userId,
      name: playerData.name,
      team: playerData.team,
      lastSocketId: socketId // Track current connection
    };
    
    // Create team if it doesn't exist
    if (!this.teams[playerData.team]) {
      this.teams[playerData.team] = { name: playerData.team, players: [] };
    }
    
    // Add userId to team if not already present
    if (!this.teams[playerData.team].players.includes(userId)) {
      this.teams[playerData.team].players.push(userId);
    }
  }

  /**
   * Remove a player connection (but keep user data for reconnection)
   * @param {string} socketId - Socket connection ID
   */
  removePlayer(socketId) {
    const userId = this.connectedSockets[socketId];
    if (userId && this.players[userId]) {
      // Just remove the socket mapping, keep user data for reconnection
      delete this.connectedSockets[socketId];
      // Note: We don't remove from teams or delete player data to allow reconnection
    }
  }

  /**
   * Check if new teams can be created
   * @returns {boolean} True if team creation is allowed
   */
  canCreateTeam() {
    return Object.keys(this.teams).length < GAME_RULES.MAX_TEAMS;
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
    if (Object.keys(this.teams).length >= GAME_RULES.MIN_TEAMS_TO_START) {
      this.gameState = GAME_RULES.PHASES.GAMEPLAY;
      this.currentGame = new GameplayManager(this);
      // Initialize first turn
      this.currentGame.initializeFirstTurn();
      return true;
    }
    return false;
  }

  endGame() {
    this.gameState = GAME_RULES.PHASES.SUMMARY;
  }

  resetGame() {
    this.gameState = GAME_RULES.PHASES.ONBOARDING;
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

  /**
   * Get current socket ID for a user (for sending targeted messages)
   * @param {string} userId - User ID
   * @returns {string|null} Current socket ID or null if not connected
   */
  getSocketForUser(userId) {
    return Object.keys(this.connectedSockets).find(socketId => 
      this.connectedSockets[socketId] === userId
    ) || null;
  }

  /**
   * Get user ID for a socket
   * @param {string} socketId - Socket ID
   * @returns {string|null} User ID or null
   */
  getUserForSocket(socketId) {
    return this.connectedSockets[socketId] || null;
  }

  getState() {
    // Convert players to socket-based format for client compatibility
    const playersForClient = {};
    Object.keys(this.connectedSockets).forEach(socketId => {
      const userId = this.connectedSockets[socketId];
      const player = this.players[userId];
      if (player) {
        playersForClient[socketId] = {
          id: socketId,
          userId: userId,
          name: player.name,
          team: player.team
        };
      }
    });

    return {
      roomId: this.roomId,
      players: playersForClient,
      teams: this.teams,
      gameState: this.gameState,
      gameSettings: this.gameSettings,
      categories: this.categories,
      currentGame: this.currentGame ? this.currentGame.getState() : null
    };
  }
}

/**
 * Manages turn-based gameplay logic within a room
 * 
 * Turn Flow:
 * 1. initializeFirstTurn() - Select first announcer + category preview
 * 2. Announcer sees selectedCategory + "Begin Turn" button
 * 3. beginTurn() - Move selectedCategory to currentCategory, start timer
 * 4. Turn completion triggers nextTurn()
 * 
 * Key Properties:
 * - currentTurn: Alternates between teams (0,1,2,3...)
 * - selectedCategory: Category chosen for announcer preview
 * - currentCategory: Active category during turn
 * - usedCategoryIds: Prevents category reuse
 */
class GameplayManager {
  constructor(room) {
    this.room = room;
    this.currentTurn = 0;
    this.turnsCompleted = 0;
    this.teamOrder = Object.keys(room.teams);
    this.announcerIndex = { [this.teamOrder[0]]: 0, [this.teamOrder[1]]: 0 };
    this.currentCategory = null;
    this.selectedCategory = null;
    this.responses = [];
    this.timer = null;
    this.usedCategoryIds = new Set();
  }
  
  initializeFirstTurn() {
    // Set first team as guessing team and select their first announcer
    const firstTeam = this.getCurrentGuessingTeam();
    const firstAnnouncer = this.getCurrentAnnouncer();
    console.log(`First turn: Team ${firstTeam}, Announcer ${firstAnnouncer}`);
    
    // Select category for announcer to preview
    this.selectedCategory = this.selectCategoryForAnnouncer();
  }

  selectCategoryForAnnouncer() {
    const announcerUserId = this.getCurrentAnnouncer();
    if (!announcerUserId) return null;
    
    const userKey = `${this.room.roomId}-${announcerUserId}`;
    
    // Get announcer's unused custom categories
    const userCategories = this.room.categories.userCustom[userKey] || [];
    const unusedUserCategories = userCategories.filter(cat => !this.usedCategoryIds.has(cat.id));
    
    let selectedCategory = null;
    
    if (unusedUserCategories.length > 0) {
      // Select random unused custom category
      const randomIndex = Math.floor(Math.random() * unusedUserCategories.length);
      selectedCategory = unusedUserCategories[randomIndex];
    } else {
      // Fall back to unused universal categories
      const unusedUniversal = this.room.categories.universal.filter(cat => !this.usedCategoryIds.has(cat.id));
      if (unusedUniversal.length > 0) {
        const randomIndex = Math.floor(Math.random() * unusedUniversal.length);
        selectedCategory = unusedUniversal[randomIndex];
      }
    }
    
    return selectedCategory;
  }

  beginTurn() {
    const selectedCategory = this.selectCategoryForAnnouncer();
    if (selectedCategory) {
      this.currentCategory = selectedCategory;
      this.usedCategoryIds.add(selectedCategory.id);
      this.responses = [];
      return true;
    }
    return false;
  }

  getCurrentGuessingTeam() {
    return this.teamOrder[this.currentTurn % 2];
  }

  getCurrentAnnouncer() {
    const team = this.getCurrentGuessingTeam();
    const teamPlayers = this.room.teams[team].players;
    return teamPlayers[this.announcerIndex[team] % teamPlayers.length];
  }

  getCurrentAnnouncerSocket() {
    const announcerUserId = this.getCurrentAnnouncer();
    return this.room.getSocketForUser(announcerUserId);
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
      currentAnnouncer: this.getCurrentAnnouncerSocket(), // Return socket ID for client compatibility
      currentAnnouncerUserId: this.getCurrentAnnouncer(), // Also provide user ID
      currentCategory: this.currentCategory,
      selectedCategory: this.selectedCategory,
      responses: this.responses,
      isComplete: this.isGameComplete()
    };
  }
}

module.exports = { GameRoom, GameplayManager };