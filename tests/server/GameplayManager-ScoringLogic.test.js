const { GameRoom, GameplayManager } = require('../../server/GameRoom');

describe('GameplayManager - Scoring Logic', () => {
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
    
    // Add players
    gameRoom.addPlayer('socket1', { userId: 'user1', name: 'Alice', team: 'Team A' });
    gameRoom.addPlayer('socket2', { userId: 'user2', name: 'Bob', team: 'Team A' });
    gameRoom.addPlayer('socket3', { userId: 'user3', name: 'Charlie', team: 'Team B' });
    gameRoom.addPlayer('socket4', { userId: 'user4', name: 'David', team: 'Team B' });
    
    gameRoom.startGame();
    gameplayManager = gameRoom.currentGame;
    
    // Set up a category for testing
    gameplayManager.currentCategory = {
      id: 'test1',
      name: 'Test Category',
      entries: ['Apple', 'Banana', 'Cherry', 'Date']
    };
  });

  describe('Team Score Initialization', () => {
    test('should initialize team scores to zero', () => {
      expect(gameplayManager.teamScores['Team A']).toBe(0);
      expect(gameplayManager.teamScores['Team B']).toBe(0);
    });
  });

  describe('Guess Tracking', () => {
    test('should add guesses during active guessing phase', () => {
      gameplayManager.turnPhase = 'ACTIVE_GUESSING';
      
      const result = gameplayManager.addGuess('apple', 'Alice');
      
      expect(result).toBe(true);
      expect(gameplayManager.responses).toHaveLength(1);
      expect(gameplayManager.responses[0]).toEqual({
        text: 'apple',
        player: 'Alice',
        timestamp: expect.any(Number)
      });
    });

    test('should not add guesses outside active guessing phase', () => {
      gameplayManager.turnPhase = 'RESULTS';
      
      const result = gameplayManager.addGuess('apple', 'Alice');
      
      expect(result).toBe(false);
      expect(gameplayManager.responses).toHaveLength(0);
    });
  });

  describe('Entry Marking', () => {
    test('should toggle entry marking', () => {
      expect(gameplayManager.markedEntries.has('Apple')).toBe(false);
      
      gameplayManager.toggleEntry('Apple');
      expect(gameplayManager.markedEntries.has('Apple')).toBe(true);
      
      gameplayManager.toggleEntry('Apple');
      expect(gameplayManager.markedEntries.has('Apple')).toBe(false);
    });
  });

  describe('Turn Score Calculation', () => {
    beforeEach(() => {
      // Add some guesses
      gameplayManager.responses = [
        { text: 'apple', player: 'Alice' },
        { text: 'BANANA', player: 'Bob' },
        { text: 'grape', player: 'Charlie' }, // Not in category
        { text: 'cherry', player: 'David' }
      ];
    });

    test('should count auto-matched guesses (case insensitive)', () => {
      const score = gameplayManager.getCurrentTurnScore();
      
      // Should match: apple->Apple, BANANA->Banana, cherry->Cherry
      expect(score).toBe(3);
    });

    test('should count manually marked entries', () => {
      gameplayManager.markedEntries.add('Date'); // Manually mark Date
      
      const score = gameplayManager.getCurrentTurnScore();
      
      // 3 auto-matched + 1 manually marked = 4
      expect(score).toBe(4);
    });

    test('should not double-count auto-matched and manually marked entries', () => {
      gameplayManager.markedEntries.add('Apple'); // Manually mark already auto-matched entry
      
      const score = gameplayManager.getCurrentTurnScore();
      
      // Should still be 3 (Apple counted once, not twice)
      expect(score).toBe(3);
    });

    test('should handle empty category', () => {
      gameplayManager.currentCategory = { entries: [] };
      
      const score = gameplayManager.getCurrentTurnScore();
      
      expect(score).toBe(0);
    });
  });

  describe('Team Score Accumulation', () => {
    test('should add turn score to team total when continuing turn', () => {
      // Set up scoring scenario
      gameplayManager.responses = [
        { text: 'apple', player: 'Alice' },
        { text: 'banana', player: 'Bob' }
      ];
      gameplayManager.markedEntries.add('Cherry');
      
      // Team A should get 3 points (2 auto + 1 manual)
      expect(gameplayManager.teamScores['Team A']).toBe(0);
      
      gameplayManager.continueTurn();
      
      expect(gameplayManager.teamScores['Team A']).toBe(3);
    });

    test('should accumulate scores across multiple turns', () => {
      // First turn: Team A scores 2
      gameplayManager.responses = [{ text: 'apple' }, { text: 'banana' }];
      gameplayManager.continueTurn();
      
      expect(gameplayManager.teamScores['Team A']).toBe(2);
      expect(gameplayManager.teamScores['Team B']).toBe(0);
      
      // Second turn: Team B scores 1
      gameplayManager.currentCategory = { entries: ['Dog', 'Cat'] };
      gameplayManager.responses = [{ text: 'dog' }];
      gameplayManager.continueTurn();
      
      expect(gameplayManager.teamScores['Team A']).toBe(2);
      expect(gameplayManager.teamScores['Team B']).toBe(1);
    });
  });

  describe('Score State in Game State', () => {
    test('should include current turn score in game state', () => {
      gameplayManager.responses = [{ text: 'apple' }];
      gameplayManager.markedEntries.add('Banana');
      
      const state = gameplayManager.getState();
      
      expect(state.currentTurnScore).toBe(2);
      expect(state.teamScores).toEqual({
        'Team A': 0,
        'Team B': 0
      });
    });

    test('should include marked entries in game state', () => {
      gameplayManager.markedEntries.add('Apple');
      gameplayManager.markedEntries.add('Cherry');
      
      const state = gameplayManager.getState();
      
      expect(state.markedEntries).toEqual(['Apple', 'Cherry']);
    });
  });

  describe('Score Reset on Turn Advance', () => {
    test('should reset turn-specific scoring state on next turn', () => {
      // Set up turn state
      gameplayManager.responses = [{ text: 'apple' }];
      gameplayManager.markedEntries.add('Banana');
      
      gameplayManager.nextTurn();
      
      expect(gameplayManager.responses).toEqual([]);
      expect(gameplayManager.markedEntries.size).toBe(0);
      expect(gameplayManager.getCurrentTurnScore()).toBe(0);
    });

    test('should preserve team scores on turn advance', () => {
      gameplayManager.teamScores['Team A'] = 5;
      gameplayManager.teamScores['Team B'] = 3;
      
      gameplayManager.nextTurn();
      
      expect(gameplayManager.teamScores['Team A']).toBe(5);
      expect(gameplayManager.teamScores['Team B']).toBe(3);
    });
  });
});