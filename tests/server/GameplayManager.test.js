const { GameRoom, GameplayManager } = require('../../server/GameRoom');

describe('GameplayManager - Turn Progression', () => {
  let gameRoom;
  let gameplayManager;
  let mockCategoriesData;

  beforeEach(() => {
    mockCategoriesData = {
      universal: [
        { id: 'u1', name: 'Animals', entries: ['Dog', 'Cat', 'Bird'] },
        { id: 'u2', name: 'Colors', entries: ['Red', 'Blue', 'Green'] }
      ],
      custom: {},
      usedUniversalCategoryIds: []
    };
    
    gameRoom = new GameRoom('test-room', mockCategoriesData, global.mockStorage);
    
    // Add players to both teams (minimum 2 per team)
    gameRoom.addPlayer('socket1', { userId: 'user1', name: 'Alice', team: 'Team A' });
    gameRoom.addPlayer('socket2', { userId: 'user2', name: 'Bob', team: 'Team A' });
    gameRoom.addPlayer('socket3', { userId: 'user3', name: 'Charlie', team: 'Team B' });
    gameRoom.addPlayer('socket4', { userId: 'user4', name: 'David', team: 'Team B' });
    
    gameRoom.startGame();
    gameplayManager = gameRoom.currentGame;
  });

  describe('Initial Turn Setup', () => {
    test('should start with turn 0 and first team', () => {
      expect(gameplayManager.currentTurn).toBe(0);
      expect(gameplayManager.getCurrentGuessingTeam()).toBe('Team A');
    });

    test('should select first announcer from first team', () => {
      const announcer = gameplayManager.getCurrentAnnouncer();
      expect(announcer).toBe('user1'); // First player in Team A
    });

    test('should have selected category for announcer', () => {
      expect(gameplayManager.selectedCategory).toBeDefined();
      expect(gameplayManager.selectedCategory.name).toBeDefined();
    });
  });

  describe('Turn Alternation', () => {
    test('should alternate between teams on each turn', () => {
      expect(gameplayManager.getCurrentGuessingTeam()).toBe('Team A');
      
      gameplayManager.nextTurn();
      expect(gameplayManager.currentTurn).toBe(1);
      expect(gameplayManager.getCurrentGuessingTeam()).toBe('Team B');
      
      gameplayManager.nextTurn();
      expect(gameplayManager.currentTurn).toBe(2);
      expect(gameplayManager.getCurrentGuessingTeam()).toBe('Team A');
    });

    test('should reset turn state when advancing', () => {
      // Set some turn state
      gameplayManager.currentCategory = { id: 'test', name: 'Test' };
      gameplayManager.responses = [{ text: 'guess', player: 'Alice' }];
      gameplayManager.markedEntries.add('entry1');
      
      gameplayManager.nextTurn();
      
      expect(gameplayManager.currentCategory).toBeNull();
      expect(gameplayManager.selectedCategory).toBeDefined(); // New category selected
      expect(gameplayManager.responses).toEqual([]);
      expect(gameplayManager.markedEntries.size).toBe(0);
    });
  });

  describe('Announcer Rotation', () => {
    test('should rotate announcer within team after each round', () => {
      // Turn 0: Team A, Alice
      expect(gameplayManager.getCurrentAnnouncer()).toBe('user1');
      
      // Turn 1: Team B, Charlie  
      gameplayManager.nextTurn();
      expect(gameplayManager.getCurrentAnnouncer()).toBe('user3');
      
      // Turn 2: Team A, Bob (rotated)
      gameplayManager.nextTurn();
      expect(gameplayManager.getCurrentAnnouncer()).toBe('user2');
      
      // Turn 3: Team B, David (rotated)
      gameplayManager.nextTurn();
      expect(gameplayManager.getCurrentAnnouncer()).toBe('user4');
    });

    test('should cycle back to first player after all players have announced', () => {
      // Complete 2 full rounds (4 turns)
      gameplayManager.nextTurn(); // Turn 1
      gameplayManager.nextTurn(); // Turn 2  
      gameplayManager.nextTurn(); // Turn 3
      gameplayManager.nextTurn(); // Turn 4
      
      // Should be back to Alice for Team A
      expect(gameplayManager.getCurrentAnnouncer()).toBe('user1');
    });
  });

  describe('Game Completion', () => {
    test('should detect game completion after required turns', () => {
      // Default is 3 rounds = 6 turns total
      expect(gameplayManager.isGameComplete()).toBe(false);
      
      // Advance through turns
      for (let i = 0; i < 5; i++) {
        gameplayManager.nextTurn();
        expect(gameplayManager.isGameComplete()).toBe(false);
      }
      
      // After 6th turn (currentTurn = 6)
      gameplayManager.nextTurn();
      expect(gameplayManager.isGameComplete()).toBe(true);
    });

    test('should continue turn and end game when complete', () => {
      // Set up game near completion
      gameplayManager.currentTurn = 5; // One turn before completion
      
      const result = gameplayManager.continueTurn();
      
      expect(result).toBe(true);
      expect(gameRoom.gameState).toBe('GAME_OVER');
      expect(gameRoom.currentGame).toBeNull();
    });
  });

  describe('Skip Announcer', () => {
    test('should advance to next announcer on same team', () => {
      expect(gameplayManager.getCurrentAnnouncer()).toBe('user1');
      
      gameplayManager.skipAnnouncer();
      
      expect(gameplayManager.getCurrentAnnouncer()).toBe('user2');
      expect(gameplayManager.currentTurn).toBe(0); // Same turn
      expect(gameplayManager.getCurrentGuessingTeam()).toBe('Team A'); // Same team
    });

    test('should loop back to first player when skipping last announcer', () => {
      // Skip to last player on Team A
      gameplayManager.skipAnnouncer(); // user2
      expect(gameplayManager.getCurrentAnnouncer()).toBe('user2');
      
      // Skip again - should loop back to first player
      gameplayManager.skipAnnouncer();
      expect(gameplayManager.getCurrentAnnouncer()).toBe('user1');
      expect(gameplayManager.currentTurn).toBe(0); // Still same turn
    });

    test('should reset turn state when skipping announcer', () => {
      gameplayManager.currentCategory = { id: 'test', name: 'Test' };
      gameplayManager.responses = [{ text: 'guess', player: 'Alice' }];
      
      gameplayManager.skipAnnouncer();
      
      expect(gameplayManager.currentCategory).toBeNull();
      expect(gameplayManager.responses).toEqual([]);
      expect(gameplayManager.selectedCategory).toBeDefined(); // New category selected
    });
  });
});