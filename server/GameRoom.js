const GAME_RULES = require('./config/GameRules');
const TimeoutManager = require('./utils/TimeoutManager');

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
    this.usedCategoryIds = new Set(); // Persistent across emergency resets
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
    if (!this.teams[playerData.team].players.find(p => p.userId === userId)) {
      this.teams[playerData.team].players.push({
        userId: userId,
        name: playerData.name
      });
    } else {
      // Update name if player rejoins with different name
      const existingPlayer = this.teams[playerData.team].players.find(p => p.userId === userId);
      if (existingPlayer) {
        existingPlayer.name = playerData.name;
      }
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
    const teams = Object.values(this.teams);
    
    // Check minimum number of teams
    if (teams.length < GAME_RULES.MIN_TEAMS_TO_START) {
      return false;
    }
    
    // Check minimum players per team
    if (!teams.every(team => team.players.length >= GAME_RULES.MIN_PLAYERS_PER_TEAM)) {
      return false;
    }
    
    this.gameState = GAME_RULES.PHASES.GAMEPLAY;
    this.currentGame = new GameplayManager(this);
    // Initialize first turn
    this.currentGame.initializeFirstTurn();
    return true;
  }

  endGame() {
    // Preserve used categories from completed game
    if (this.currentGame) {
      console.log('Game ending - merging used categories from game to room');
      console.log('Game used categories:', Array.from(this.currentGame.usedCategoryIds));
      console.log('Room used categories before merge:', Array.from(this.usedCategoryIds));
      
      // Merge game's used categories back to room level
      this.currentGame.usedCategoryIds.forEach(id => {
        this.usedCategoryIds.add(id);
      });
      
      console.log('Room used categories after merge:', Array.from(this.usedCategoryIds));
      
      this.finalGameData = {
        teamScores: this.currentGame.teamScores,
        playedCategories: [] // TODO: Implement game history if needed
      };
    }
    this.gameState = GAME_RULES.PHASES.GAME_OVER;
    this.currentGame = null;
  }

  resetGame() {
    this.gameState = GAME_RULES.PHASES.ONBOARDING;
    this.currentGame = null;
    this.finalGameData = null;
    this.usedCategoryIds = new Set(); // Clear all used categories on full reset
    return true;
  }

  emergencyReset() {
    // Preserve used categories from current game
    if (this.currentGame) {
      // Sync used categories back to room level
      this.usedCategoryIds = new Set([...this.usedCategoryIds, ...this.currentGame.usedCategoryIds]);
    }
    
    // Reset game state but keep used categories
    this.gameState = GAME_RULES.PHASES.ONBOARDING;
    this.currentGame = null;
    this.finalGameData = null;
    
    return true;
  }

  /**
   * Validate a custom category for a specific user
   * @param {Object} category - Category data
   * @param {string} userId - User who created the category
   * @returns {Object} Result with success flag and validated category or error message
   */
  validateCustomCategory(category, userId) {
    // Validate category name length
    if (category.name.length < GAME_RULES.VALIDATION.MIN_CATEGORY_NAME_LENGTH || 
        category.name.length > GAME_RULES.VALIDATION.MAX_CATEGORY_NAME_LENGTH) {
      return { success: false, error: `Category name must be ${GAME_RULES.VALIDATION.MIN_CATEGORY_NAME_LENGTH}-${GAME_RULES.VALIDATION.MAX_CATEGORY_NAME_LENGTH} characters` };
    }
    
    // Check for duplicate category name across all users in room
    const categoryNameLower = category.name.toLowerCase().trim();
    const allRoomCategories = Object.values(this.categories.userCustom).flat();
    const duplicateName = allRoomCategories.some(cat => 
      cat.name.toLowerCase().trim() === categoryNameLower
    );
    
    if (duplicateName) {
      return { success: false, error: 'A category with this name already exists in the room' };
    }
    
    // Remove duplicate entries (case-insensitive, trimmed)
    const uniqueEntries = [];
    const seenEntries = new Set();
    
    category.entries.forEach(entry => {
      const normalizedEntry = entry.toLowerCase().trim();
      if (normalizedEntry && !seenEntries.has(normalizedEntry)) {
        seenEntries.add(normalizedEntry);
        uniqueEntries.push(entry.trim());
      }
    });
    
    // Check entries count limits
    if (uniqueEntries.length < GAME_RULES.VALIDATION.MIN_CATEGORY_ENTRIES) {
      return { success: false, error: `Categories must have at least ${GAME_RULES.VALIDATION.MIN_CATEGORY_ENTRIES} entry` };
    }
    
    if (uniqueEntries.length > GAME_RULES.VALIDATION.MAX_CATEGORY_ENTRIES) {
      return { success: false, error: `Categories can have a maximum of ${GAME_RULES.VALIDATION.MAX_CATEGORY_ENTRIES} entries` };
    }
    
    // Return validated category without adding to room state
    const validatedCategory = {
      ...category,
      name: category.name.trim(),
      entries: uniqueEntries
    };
    
    return { success: true, category: validatedCategory };
  }

  /**
   * Add a validated category to room state
   * @param {Object} category - Already validated category data
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
      usedCategoryIds: Array.from(this.usedCategoryIds || []),
      currentGame: this.currentGame ? this.currentGame.getState() : null,
      finalGameData: this.finalGameData
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
    console.log('GameplayManager starting with room used categories:', Array.from(room.usedCategoryIds || []));
    this.usedCategoryIds = new Set(room.usedCategoryIds || []);
    this.turnPhase = GAME_RULES.TURN_PHASES.CATEGORY_SELECTION;
    this.markedEntries = new Set();
    this.teamScores = {};
    this.isPaused = false;
    this.timeoutManager = new TimeoutManager();
    this.timerStartTime = null;
    this.timerDuration = null;
    this.pausedTimeRemaining = null;
    
    // Initialize team scores
    this.teamOrder.forEach(team => {
      this.teamScores[team] = 0;
    });
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
    if (this.selectedCategory) {
      this.currentCategory = this.selectedCategory;
      console.log('Adding category to used list:', this.selectedCategory.id);
      this.usedCategoryIds.add(this.selectedCategory.id);
      console.log('Current used categories in game:', Array.from(this.usedCategoryIds));
      this.responses = [];
      this.turnPhase = GAME_RULES.TURN_PHASES.ACTIVE_GUESSING;
      
      // Start server-side timer
      this.timerStartTime = Date.now();
      this.timerDuration = this.room.gameSettings.timeLimit * 1000; // Convert to milliseconds
      this.pausedTimeRemaining = null;
      
      return true;
    }
    return false;
  }

  endGuessing() {
    this.turnPhase = GAME_RULES.TURN_PHASES.RESULTS;
    
    // Clear timer state
    this.timerStartTime = null;
    this.timerDuration = null;
    this.pausedTimeRemaining = null;
    
    // Start timeout for results phase with offline announcer check
    this.timeoutManager.startTimeout(
      GAME_RULES.TIMEOUT_KEYS.RESULTS_PHASE,
      GAME_RULES.TIMEOUTS.RESULTS_PHASE,
      () => {
        const announcerUserId = this.getCurrentAnnouncer();
        const announcerSocketId = this.room.getSocketForUser(announcerUserId);
        return !announcerSocketId; // Returns true if announcer is offline
      }
    );
    
    return true;
  }
  
  revealResults() {
    this.turnPhase = GAME_RULES.TURN_PHASES.TURN_SUMMARY;
    this.timeoutManager.clearTimeout(GAME_RULES.TIMEOUT_KEYS.RESULTS_PHASE);
    return true;
  }
  
  pauseGame() {
    if (this.timerStartTime && !this.isPaused) {
      // Calculate remaining time when pausing
      const elapsed = Date.now() - this.timerStartTime;
      this.pausedTimeRemaining = Math.max(0, this.timerDuration - elapsed);
    }
    this.isPaused = true;
    return true;
  }
  
  resumeGame() {
    if (this.isPaused && this.pausedTimeRemaining !== null) {
      // Resume timer with remaining time
      this.timerStartTime = Date.now();
      this.timerDuration = this.pausedTimeRemaining;
      this.pausedTimeRemaining = null;
    }
    this.isPaused = false;
    return true;
  }

  skipAnnouncer() {
    // Advance to next announcer on current team without changing turn
    const currentTeam = this.getCurrentGuessingTeam();
    this.announcerIndex[currentTeam]++;
    
    // Reset turn state and select new category
    this.currentCategory = null;
    this.selectedCategory = null;
    this.responses = [];
    this.markedEntries = new Set();
    this.turnPhase = GAME_RULES.TURN_PHASES.CATEGORY_SELECTION;
    this.timeoutManager.clearTimeout(GAME_RULES.TIMEOUT_KEYS.RESULTS_PHASE);
    
    // Clear timer state
    this.timerStartTime = null;
    this.timerDuration = null;
    this.pausedTimeRemaining = null;
    
    // Select category for new announcer
    this.selectedCategory = this.selectCategoryForAnnouncer();
    return true;
  }

  canAllPlayersReveal() {
    if (this.turnPhase !== GAME_RULES.TURN_PHASES.RESULTS) return false;
    return this.timeoutManager.hasElapsed(GAME_RULES.TIMEOUT_KEYS.RESULTS_PHASE);
  }

  getTimerState() {
    if (!this.timerStartTime || this.turnPhase !== GAME_RULES.TURN_PHASES.ACTIVE_GUESSING) {
      return null;
    }

    if (this.isPaused) {
      return {
        timeRemaining: this.pausedTimeRemaining || 0,
        isPaused: true,
        totalDuration: this.room.gameSettings.timeLimit * 1000
      };
    }

    const elapsed = Date.now() - this.timerStartTime;
    const timeRemaining = Math.max(0, this.timerDuration - elapsed);
    
    return {
      timeRemaining,
      isPaused: false,
      totalDuration: this.room.gameSettings.timeLimit * 1000
    };
  }

  continueTurn() {
    console.log('continueTurn called - currentTurn:', this.currentTurn, 'turnsPerTeam:', this.room.gameSettings.turnsPerTeam);
    
    // Add current turn score to team total
    const currentTeam = this.getCurrentGuessingTeam();
    const turnScore = this.getCurrentTurnScore();
    this.teamScores[currentTeam] += turnScore;
    
    // Advance turn first
    this.nextTurn();
    
    // Check if game is complete after advancing
    const isComplete = this.isGameComplete();
    console.log('Game complete check after advance:', isComplete, 'calculation:', this.currentTurn, '>=', this.room.gameSettings.turnsPerTeam * 2);
    
    if (isComplete) {
      console.log('Ending game...');
      this.room.endGame();
      return true;
    }
    
    console.log('Game continues...');
    return true;
  }

  getCurrentTurnScore() {
    if (!this.currentCategory) return 0;
    
    let score = 0;
    this.currentCategory.entries.forEach(entry => {
      const isAutoGuessed = this.responses.some(response => 
        response.text.toLowerCase() === entry.toLowerCase()
      );
      const isManuallyMarked = this.markedEntries.has(entry);
      if (isAutoGuessed || isManuallyMarked) {
        score++;
      }
    });
    
    return score;
  }

  addGuess(guessText, playerName) {
    if (this.turnPhase === GAME_RULES.TURN_PHASES.ACTIVE_GUESSING) {
      this.responses.push({
        text: guessText,
        player: playerName,
        timestamp: Date.now()
      });
      return true;
    }
    return false;
  }

  toggleEntry(entry) {
    if (this.markedEntries.has(entry)) {
      this.markedEntries.delete(entry);
    } else {
      this.markedEntries.add(entry);
    }
    return true;
  }

  getCurrentGuessingTeam() {
    return this.teamOrder[this.currentTurn % 2];
  }

  getCurrentAnnouncer() {
    const team = this.getCurrentGuessingTeam();
    const teamPlayers = this.room.teams[team].players;
    const playerObj = teamPlayers[this.announcerIndex[team] % teamPlayers.length];
    return typeof playerObj === 'string' ? playerObj : playerObj.userId;
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
    
    // Reset for new turn
    this.currentCategory = null;
    this.selectedCategory = null;
    this.responses = [];
    this.markedEntries = new Set();
    this.turnPhase = GAME_RULES.TURN_PHASES.CATEGORY_SELECTION;
    
    // Clear timer state
    this.timerStartTime = null;
    this.timerDuration = null;
    this.pausedTimeRemaining = null;
    
    // Select category for new announcer
    this.selectedCategory = this.selectCategoryForAnnouncer();
  }

  isGameComplete() {
    // Game is complete when both teams have completed the required number of turns
    // Since currentTurn alternates between teams, we need currentTurn >= turnsPerTeam * 2
    return this.currentTurn >= this.room.gameSettings.turnsPerTeam * 2;
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
      turnPhase: this.turnPhase,
      markedEntries: Array.from(this.markedEntries),
      teamScores: this.teamScores,
      currentTurnScore: this.getCurrentTurnScore(),
      isComplete: this.isGameComplete(),
      isPaused: this.isPaused,
      canAllPlayersReveal: this.canAllPlayersReveal(),
      timerState: this.getTimerState()
    };
  }
}

module.exports = { GameRoom, GameplayManager };