const { GameRoom } = require('../../server/GameRoom');

describe('GameRoom', () => {
  let gameRoom;
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
  });

  describe('Player Management', () => {
    test('should add player to room and create team', () => {
      const playerData = {
        userId: 'user1',
        name: 'Alice',
        team: 'Team A'
      };

      gameRoom.addPlayer('socket1', playerData);

      expect(gameRoom.players['user1']).toEqual({
        userId: 'user1',
        name: 'Alice',
        team: 'Team A',
        lastSocketId: 'socket1',
        isReady: false
      });

      expect(gameRoom.teams['Team A']).toEqual({
        name: 'Team A',
        players: [{ userId: 'user1', name: 'Alice' }]
      });

      expect(gameRoom.connectedSockets['socket1']).toBe('user1');
    });

    test('should handle player reconnection', () => {
      // Initial connection
      gameRoom.addPlayer('socket1', { userId: 'user1', name: 'Alice', team: 'Team A' });
      
      // Disconnect
      gameRoom.removePlayer('socket1');
      expect(gameRoom.connectedSockets['socket1']).toBeUndefined();
      
      // Reconnect with new socket
      gameRoom.addPlayer('socket2', { userId: 'user1', name: 'Alice', team: 'Team A' });
      
      expect(gameRoom.connectedSockets['socket2']).toBe('user1');
      expect(gameRoom.players['user1'].lastSocketId).toBe('socket2');
      // Team data should persist
      expect(gameRoom.teams['Team A'].players).toHaveLength(1);
    });
  });

  describe('Team Management', () => {
    test('should allow team creation when under limit', () => {
      expect(gameRoom.canCreateTeam()).toBe(true);
      
      gameRoom.addPlayer('socket1', { userId: 'user1', name: 'Alice', team: 'Team A' });
      expect(gameRoom.canCreateTeam()).toBe(true);
      
      gameRoom.addPlayer('socket2', { userId: 'user2', name: 'Bob', team: 'Team B' });
      expect(gameRoom.canCreateTeam()).toBe(false); // Max 2 teams
    });

    test('should return existing team names', () => {
      gameRoom.addPlayer('socket1', { userId: 'user1', name: 'Alice', team: 'Team A' });
      gameRoom.addPlayer('socket2', { userId: 'user2', name: 'Bob', team: 'Team B' });
      
      expect(gameRoom.getTeamNames()).toEqual(['Team A', 'Team B']);
    });
  });

  describe('Game State Transitions', () => {
    beforeEach(() => {
      // Add minimum players to start game
      gameRoom.addPlayer('socket1', { userId: 'user1', name: 'Alice', team: 'Team A' });
      gameRoom.addPlayer('socket2', { userId: 'user2', name: 'Bob', team: 'Team A' });
      gameRoom.addPlayer('socket3', { userId: 'user3', name: 'Charlie', team: 'Team B' });
      gameRoom.addPlayer('socket4', { userId: 'user4', name: 'David', team: 'Team B' });
    });

    test('should start game when minimum requirements met', () => {
      expect(gameRoom.gameState).toBe('ONBOARDING');
      
      const result = gameRoom.startGame();
      
      expect(result).toBe(true);
      expect(gameRoom.gameState).toBe('GAMEPLAY');
      expect(gameRoom.currentGame).toBeDefined();
    });

    test('should not start game without minimum teams', () => {
      const singleTeamRoom = new GameRoom('test-room-2', mockCategoriesData, global.mockStorage);
      singleTeamRoom.addPlayer('socket1', { userId: 'user1', name: 'Alice', team: 'Team A' });
      singleTeamRoom.addPlayer('socket2', { userId: 'user2', name: 'Bob', team: 'Team A' });
      
      const result = singleTeamRoom.startGame();
      
      expect(result).toBe(false);
      expect(singleTeamRoom.gameState).toBe('ONBOARDING');
    });

    test('should not start game without minimum players per team', () => {
      const insufficientRoom = new GameRoom('test-room-3', mockCategoriesData, global.mockStorage);
      insufficientRoom.addPlayer('socket1', { userId: 'user1', name: 'Alice', team: 'Team A' });
      insufficientRoom.addPlayer('socket2', { userId: 'user2', name: 'Bob', team: 'Team B' });
      
      const result = insufficientRoom.startGame();
      
      expect(result).toBe(false);
      expect(insufficientRoom.gameState).toBe('ONBOARDING');
    });

    test('should end game and preserve used categories', () => {
      gameRoom.startGame();
      
      // Simulate some used categories
      gameRoom.currentGame.usedCategoryIds.add('u1');
      
      gameRoom.endGame();
      
      expect(gameRoom.gameState).toBe('GAME_OVER');
      expect(gameRoom.currentGame).toBeNull();
      expect(gameRoom.usedCategoryIds.has('u1')).toBe(true);
    });

    test('should reset game and clear used categories', () => {
      gameRoom.startGame();
      gameRoom.usedCategoryIds.add('u1');
      
      const result = gameRoom.resetGame();
      
      expect(result).toBe(true);
      expect(gameRoom.gameState).toBe('ONBOARDING');
      expect(gameRoom.usedCategoryIds.size).toBe(0);
    });
  });

  describe('Category Validation', () => {
    test('should validate category name length', () => {
      const longCategory = { name: 'A'.repeat(51), entries: ['Entry1', 'Entry2'] }; // Too long
      const result = gameRoom.validateCustomCategory(longCategory, 'user1');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Category name must be');
    });

    test('should prevent duplicate category names', () => {
      const category1 = { id: 'c1', name: 'Test Category', entries: ['Entry1', 'Entry2'] };
      const category2 = { id: 'c2', name: 'test category', entries: ['Entry3', 'Entry4'] }; // Case insensitive
      
      gameRoom.addCustomCategory(category1, 'user1');
      
      const result = gameRoom.validateCustomCategory(category2, 'user2');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('already exists');
    });

    test('should remove duplicate entries', () => {
      const category = {
        name: 'Test Category',
        entries: ['Entry1', 'entry1', 'Entry2', 'Entry2', '  Entry3  ']
      };
      
      const result = gameRoom.validateCustomCategory(category, 'user1');
      
      expect(result.success).toBe(true);
      expect(result.category.entries).toEqual(['Entry1', 'Entry2', 'Entry3']);
    });

    test('should enforce minimum entries requirement', () => {
      const category = { name: 'Test Category', entries: [] };
      const result = gameRoom.validateCustomCategory(category, 'user1');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('at least');
    });
  });

  describe('State Management', () => {
    test('should return correct state format', () => {
      gameRoom.addPlayer('socket1', { userId: 'user1', name: 'Alice', team: 'Team A' });
      
      const state = gameRoom.getState();
      
      expect(state).toHaveProperty('roomId', 'test-room');
      expect(state).toHaveProperty('players');
      expect(state).toHaveProperty('teams');
      expect(state).toHaveProperty('gameState', 'ONBOARDING');
      expect(state).toHaveProperty('categories');
      expect(state.players['socket1']).toEqual({
        id: 'socket1',
        userId: 'user1',
        name: 'Alice',
        team: 'Team A',
        isReady: false
      });
    });
  });
});