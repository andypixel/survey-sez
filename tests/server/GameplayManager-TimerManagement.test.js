const { GameRoom, GameplayManager } = require('../../server/GameRoom');

describe('GameplayManager - Timer Management', () => {
  let gameRoom;
  let gameplayManager;
  let mockCategoriesData;

  beforeEach(() => {
    mockCategoriesData = {
      universal: [
        { id: 'u1', name: 'Animals', entries: ['Dog', 'Cat', 'Bird'] }
      ],
      custom: {},
      usedUniversalCategoryIds: []
    };
    
    gameRoom = new GameRoom('test-room', mockCategoriesData, global.mockStorage);
    gameRoom.gameSettings.timeLimit = 30; // 30 seconds for testing
    
    // Add players
    gameRoom.addPlayer('socket1', { userId: 'user1', name: 'Alice', team: 'Team A' });
    gameRoom.addPlayer('socket2', { userId: 'user2', name: 'Bob', team: 'Team A' });
    gameRoom.addPlayer('socket3', { userId: 'user3', name: 'Charlie', team: 'Team B' });
    gameRoom.addPlayer('socket4', { userId: 'user4', name: 'David', team: 'Team B' });
    
    gameRoom.startGame();
    gameplayManager = gameRoom.currentGame;
  });

  describe('Timer Initialization', () => {
    test('should not have timer state before turn begins', () => {
      const timerState = gameplayManager.getTimerState();
      expect(timerState).toBeNull();
    });

    test('should initialize timer when turn begins', () => {
      gameplayManager.beginTurn();
      
      const timerState = gameplayManager.getTimerState();
      expect(timerState).toBeDefined();
      expect(timerState.totalDuration).toBe(30000); // 30 seconds in ms
      expect(timerState.isPaused).toBe(false);
      expect(timerState.timeRemaining).toBeLessThanOrEqual(30000);
    });
  });

  describe('Timer State During Active Guessing', () => {
    beforeEach(() => {
      gameplayManager.beginTurn();
    });

    test('should return timer state during active guessing phase', () => {
      const timerState = gameplayManager.getTimerState();
      
      expect(timerState).toBeDefined();
      expect(timerState.totalDuration).toBe(30000);
      expect(timerState.isPaused).toBe(false);
      expect(typeof timerState.timeRemaining).toBe('number');
    });

    test('should return null timer state outside active guessing phase', () => {
      gameplayManager.turnPhase = 'RESULTS';
      
      const timerState = gameplayManager.getTimerState();
      expect(timerState).toBeNull();
    });
  });

  describe('Pause and Resume Functionality', () => {
    beforeEach(() => {
      gameplayManager.beginTurn();
    });

    test('should pause timer and preserve remaining time', () => {
      // Let some time pass (simulate)
      const originalStartTime = gameplayManager.timerStartTime;
      gameplayManager.timerStartTime = Date.now() - 5000; // 5 seconds ago
      
      const result = gameplayManager.pauseGame();
      
      expect(result).toBe(true);
      expect(gameplayManager.isPaused).toBe(true);
      expect(gameplayManager.pausedTimeRemaining).toBeLessThanOrEqual(25000); // ~25 seconds left
      expect(gameplayManager.pausedTimeRemaining).toBeGreaterThan(24000);
    });

    test('should resume timer with remaining time', () => {
      // Pause first
      gameplayManager.timerStartTime = Date.now() - 10000; // 10 seconds ago
      gameplayManager.pauseGame();
      
      const pausedTime = gameplayManager.pausedTimeRemaining;
      
      const result = gameplayManager.resumeGame();
      
      expect(result).toBe(true);
      expect(gameplayManager.isPaused).toBe(false);
      expect(gameplayManager.timerDuration).toBe(pausedTime);
      expect(gameplayManager.pausedTimeRemaining).toBeNull();
    });

    test('should return paused timer state when paused', () => {
      gameplayManager.timerStartTime = Date.now() - 8000; // 8 seconds ago
      gameplayManager.pauseGame();
      
      const timerState = gameplayManager.getTimerState();
      
      expect(timerState.isPaused).toBe(true);
      expect(timerState.timeRemaining).toBeLessThanOrEqual(22000); // ~22 seconds left
      expect(timerState.totalDuration).toBe(30000);
    });
  });

  describe('Timer Reset on Phase Changes', () => {
    test('should clear timer state when ending guessing', () => {
      gameplayManager.beginTurn();
      expect(gameplayManager.timerStartTime).toBeDefined();
      
      gameplayManager.endGuessing();
      
      expect(gameplayManager.timerStartTime).toBeNull();
      expect(gameplayManager.timerDuration).toBeNull();
      expect(gameplayManager.pausedTimeRemaining).toBeNull();
    });

    test('should clear timer state on next turn', () => {
      gameplayManager.beginTurn();
      gameplayManager.pauseGame();
      
      gameplayManager.nextTurn();
      
      expect(gameplayManager.timerStartTime).toBeNull();
      expect(gameplayManager.timerDuration).toBeNull();
      expect(gameplayManager.pausedTimeRemaining).toBeNull();
      // Note: isPaused is not reset by nextTurn() - this is current behavior
    });
  });

  describe('Timer Edge Cases', () => {
    test('should handle pause when no timer is active', () => {
      // No timer started
      const result = gameplayManager.pauseGame();
      
      expect(result).toBe(true);
      expect(gameplayManager.isPaused).toBe(true);
    });

    test('should handle resume when not paused', () => {
      gameplayManager.beginTurn();
      
      const result = gameplayManager.resumeGame();
      
      expect(result).toBe(true);
      expect(gameplayManager.isPaused).toBe(false);
    });

    test('should handle time remaining calculation at zero', () => {
      gameplayManager.beginTurn();
      // Simulate timer expired
      gameplayManager.timerStartTime = Date.now() - 35000; // 35 seconds ago (past limit)
      
      const timerState = gameplayManager.getTimerState();
      
      expect(timerState.timeRemaining).toBe(0);
    });

    test('should preserve pause state in game state', () => {
      gameplayManager.beginTurn();
      gameplayManager.pauseGame();
      
      const gameState = gameplayManager.getState();
      
      expect(gameState.isPaused).toBe(true);
      expect(gameState.timerState.isPaused).toBe(true);
    });
  });

  describe('Timer Integration with Game Settings', () => {
    test('should use custom time limit from game settings', () => {
      gameRoom.gameSettings.timeLimit = 60; // 60 seconds
      
      gameplayManager.beginTurn();
      const timerState = gameplayManager.getTimerState();
      
      expect(timerState.totalDuration).toBe(60000); // 60 seconds in ms
    });

    test('should handle different time limits across games', () => {
      // First game with 30 seconds
      gameplayManager.beginTurn();
      let timerState = gameplayManager.getTimerState();
      expect(timerState.totalDuration).toBe(30000);
      
      gameplayManager.endGuessing();
      
      // Change settings and start new turn
      gameRoom.gameSettings.timeLimit = 45;
      gameplayManager.beginTurn();
      timerState = gameplayManager.getTimerState();
      expect(timerState.totalDuration).toBe(45000);
    });
  });
});