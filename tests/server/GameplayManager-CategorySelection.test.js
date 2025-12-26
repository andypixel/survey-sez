const { GameRoom, GameplayManager } = require('../../server/GameRoom');

describe('GameplayManager - Category Selection', () => {
  let gameRoom;
  let gameplayManager;
  let mockCategoriesData;

  beforeEach(() => {
    mockCategoriesData = {
      universal: [
        { id: 'u1', name: 'Animals', entries: ['Dog', 'Cat', 'Bird'] },
        { id: 'u2', name: 'Colors', entries: ['Red', 'Blue', 'Green'] },
        { id: 'u3', name: 'Foods', entries: ['Pizza', 'Burger', 'Salad'] }
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
  });

  describe('Initial Category Selection', () => {
    test('should select category for first announcer on initialization', () => {
      expect(gameplayManager.selectedCategory).toBeDefined();
      expect(gameplayManager.selectedCategory.name).toBeDefined();
      expect(gameplayManager.selectedCategory.entries).toBeDefined();
    });

    test('should prefer user custom categories over universal', () => {
      // Add custom category for user1
      const customCategory = { id: 'c1', name: 'Custom Category', entries: ['A', 'B', 'C'] };
      gameRoom.addCustomCategory(customCategory, 'user1');
      
      // Create new game to test selection
      gameRoom.resetGame();
      gameRoom.startGame();
      const newGameplayManager = gameRoom.currentGame;
      
      expect(newGameplayManager.selectedCategory.name).toBe('Custom Category');
    });

    test('should fall back to universal categories when no custom categories', () => {
      // No custom categories added, should select universal
      const universalNames = mockCategoriesData.universal.map(cat => cat.name);
      expect(universalNames).toContain(gameplayManager.selectedCategory.name);
    });
  });

  describe('Category Usage Tracking', () => {
    test('should mark category as used when turn begins', () => {
      const selectedId = gameplayManager.selectedCategory.id;
      expect(gameplayManager.usedCategoryIds.has(selectedId)).toBe(false);
      
      gameplayManager.beginTurn();
      
      expect(gameplayManager.usedCategoryIds.has(selectedId)).toBe(true);
    });

    test('should not select already used categories', () => {
      // Mark all but one category as used
      gameplayManager.usedCategoryIds.add('u1');
      gameplayManager.usedCategoryIds.add('u2');
      // u3 should be the only available category
      
      const newCategory = gameplayManager.selectCategoryForAnnouncer();
      
      expect(newCategory.id).toBe('u3');
      expect(gameplayManager.usedCategoryIds.has(newCategory.id)).toBe(false);
    });

    test('should track global usage for universal categories', () => {
      const universalCategory = mockCategoriesData.universal[0];
      gameplayManager.selectedCategory = universalCategory;
      
      gameplayManager.beginTurn();
      
      expect(gameRoom.globalUsedUniversalIds.has(universalCategory.id)).toBe(true);
    });
  });

  describe('Category Skip Functionality', () => {
    test('should allow skipping universal categories', () => {
      // Ensure we have a universal category selected
      const universalCategory = mockCategoriesData.universal[0];
      gameplayManager.selectedCategory = universalCategory;
      
      const originalId = gameplayManager.selectedCategory.id;
      const result = gameplayManager.skipCategory();
      
      expect(result).toBe(true);
      expect(gameplayManager.selectedCategory.id).not.toBe(originalId);
      expect(gameplayManager.skipsUsed).toBe(1);
    });

    test('should not allow skipping custom categories', () => {
      // Add custom category and select it
      const customCategory = { id: 'c1', name: 'Custom Category', entries: ['A', 'B', 'C'] };
      gameplayManager.selectedCategory = customCategory;
      
      const result = gameplayManager.skipCategory();
      
      expect(result).toBe(false);
      expect(gameplayManager.skipsUsed).toBe(0);
    });

    test('should limit skips to maximum of 2 per turn', () => {
      const universalCategory = mockCategoriesData.universal[0];
      gameplayManager.selectedCategory = universalCategory;
      
      // First skip
      expect(gameplayManager.skipCategory()).toBe(true);
      expect(gameplayManager.skipsUsed).toBe(1);
      
      // Second skip
      expect(gameplayManager.skipCategory()).toBe(true);
      expect(gameplayManager.skipsUsed).toBe(2);
      
      // Third skip should fail
      expect(gameplayManager.skipCategory()).toBe(false);
      expect(gameplayManager.skipsUsed).toBe(2);
    });

    test('should reset skip count on new turn', () => {
      gameplayManager.skipsUsed = 2;
      
      gameplayManager.nextTurn();
      
      expect(gameplayManager.skipsUsed).toBe(0);
    });
  });

  describe('Category Selection Edge Cases', () => {
    test('should handle case when all categories are used', () => {
      // Mark all categories as used
      mockCategoriesData.universal.forEach(cat => {
        gameplayManager.usedCategoryIds.add(cat.id);
        gameRoom.globalUsedUniversalIds.add(cat.id);
      });
      
      const category = gameplayManager.selectCategoryForAnnouncer();
      
      expect(category).toBeNull();
    });

    test('should select from different user\'s categories when announcer changes teams', () => {
      // Add custom categories for different users
      gameRoom.addCustomCategory({ id: 'c1', name: 'User1 Category', entries: ['A'] }, 'user1');
      gameRoom.addCustomCategory({ id: 'c2', name: 'User3 Category', entries: ['B'] }, 'user3');
      
      // Reset and start new game
      gameRoom.resetGame();
      gameRoom.startGame();
      const newManager = gameRoom.currentGame;
      
      // First turn: Team A (user1) - should get user1's category
      expect(newManager.selectedCategory.name).toBe('User1 Category');
      
      // Next turn: Team B (user3) - should get user3's category
      newManager.nextTurn();
      expect(newManager.selectedCategory.name).toBe('User3 Category');
    });
  });
});