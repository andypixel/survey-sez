const CategoryHandler = require('../../server/handlers/CategoryHandler');
const { ValidationError, StorageError, RoomError } = require('../../server/utils/CustomErrors');

describe('CategoryHandler', () => {
  let mockSocket, mockIo, mockUserSession, mockGetOrCreateRoom, mockStorage, mockCategoriesData, mockUserSessions;
  let mockRoom, mockPlayerData;

  beforeEach(() => {
    // Mock socket
    mockSocket = {
      id: 'socket123',
      emit: jest.fn(),
      on: jest.fn()
    };

    // Mock io
    mockIo = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
      sockets: {
        adapter: {
          rooms: new Map([
            ['room1', new Set(['socket123', 'socket456'])]
          ])
        }
      }
    };

    // Mock player data
    mockPlayerData = {
      userId: 'user123',
      name: 'TestPlayer'
    };

    // Mock user session
    mockUserSession = {
      currentRoom: 'room1',
      getUserData: jest.fn().mockReturnValue(mockPlayerData)
    };

    // Mock room
    mockRoom = {
      validateCustomCategory: jest.fn(),
      addCustomCategory: jest.fn()
    };

    // Mock getOrCreateRoom
    mockGetOrCreateRoom = jest.fn().mockReturnValue(mockRoom);

    // Mock storage
    mockStorage = {
      saveCategories: jest.fn().mockResolvedValue()
    };

    // Mock categories data
    mockCategoriesData = {
      custom: {}
    };

    // Mock user sessions
    mockUserSessions = {
      socket456: {
        getUserData: jest.fn().mockReturnValue({ setupComplete: true })
      }
    };
  });

  describe('handleAddCategory', () => {
    const validCategoryData = {
      name: 'Test Category',
      entries: ['entry1', 'entry2']
    };

    test('should successfully add valid category', async () => {
      const validatedCategory = {
        id: 'room1-user123-123456789',
        name: 'Test Category',
        entries: ['entry1', 'entry2']
      };

      mockRoom.validateCustomCategory.mockReturnValue({
        success: true,
        category: validatedCategory
      });

      await CategoryHandler.handleAddCategory(
        mockSocket, mockIo, mockUserSession, mockGetOrCreateRoom,
        mockStorage, mockCategoriesData, mockUserSessions, validCategoryData
      );

      expect(mockRoom.validateCustomCategory).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test Category',
          entries: ['entry1', 'entry2']
        }),
        'user123'
      );

      expect(mockStorage.saveCategories).toHaveBeenCalledWith(mockCategoriesData);
      expect(mockRoom.addCustomCategory).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test Category',
          createdBy: { userId: 'user123', name: 'TestPlayer' }
        }),
        'user123'
      );

      expect(mockSocket.emit).toHaveBeenCalledWith('categoryAdded', expect.any(Object));
      expect(mockSocket.emit).toHaveBeenCalledWith('categorySuccess');
    });

    test('should handle validation errors', async () => {
      mockRoom.validateCustomCategory.mockReturnValue({
        success: false,
        error: 'Category name too long'
      });

      await expect(
        CategoryHandler.handleAddCategory(
          mockSocket, mockIo, mockUserSession, mockGetOrCreateRoom,
          mockStorage, mockCategoriesData, mockUserSessions, validCategoryData
        )
      ).rejects.toThrow(ValidationError);

      expect(mockStorage.saveCategories).not.toHaveBeenCalled();
      expect(mockSocket.emit).not.toHaveBeenCalled();
    });

    test('should handle storage errors', async () => {
      mockRoom.validateCustomCategory.mockReturnValue({
        success: true,
        category: { id: 'test', name: 'Test', entries: [] }
      });

      mockStorage.saveCategories.mockRejectedValue(new Error('Storage failed'));

      await expect(
        CategoryHandler.handleAddCategory(
          mockSocket, mockIo, mockUserSession, mockGetOrCreateRoom,
          mockStorage, mockCategoriesData, mockUserSessions, validCategoryData
        )
      ).rejects.toThrow(StorageError);
    });

    test('should handle missing room', async () => {
      mockUserSession.currentRoom = null;

      await expect(
        CategoryHandler.handleAddCategory(
          mockSocket, mockIo, mockUserSession, mockGetOrCreateRoom,
          mockStorage, mockCategoriesData, mockUserSessions, validCategoryData
        )
      ).rejects.toThrow(ValidationError);
    });

    test('should handle missing player data', async () => {
      mockUserSession.getUserData.mockReturnValue(null);

      await expect(
        CategoryHandler.handleAddCategory(
          mockSocket, mockIo, mockUserSession, mockGetOrCreateRoom,
          mockStorage, mockCategoriesData, mockUserSessions, validCategoryData
        )
      ).rejects.toThrow(ValidationError);
    });

    test('should handle missing category name', async () => {
      const invalidData = { entries: ['entry1'] };

      await expect(
        CategoryHandler.handleAddCategory(
          mockSocket, mockIo, mockUserSession, mockGetOrCreateRoom,
          mockStorage, mockCategoriesData, mockUserSessions, invalidData
        )
      ).rejects.toThrow(ValidationError);
    });

    test('should notify other users with completed setup', async () => {
      mockRoom.validateCustomCategory.mockReturnValue({
        success: true,
        category: { id: 'test', name: 'Test', entries: [] }
      });

      await CategoryHandler.handleAddCategory(
        mockSocket, mockIo, mockUserSession, mockGetOrCreateRoom,
        mockStorage, mockCategoriesData, mockUserSessions, validCategoryData
      );

      expect(mockIo.to).toHaveBeenCalledWith('socket456');
      expect(mockIo.emit).toHaveBeenCalledWith('categoryAdded', expect.any(Object));
    });
  });

  describe('register', () => {
    test('should register addCategory event handler', () => {
      CategoryHandler.register(
        mockSocket, mockIo, mockUserSession, mockGetOrCreateRoom,
        mockStorage, mockCategoriesData, mockUserSessions
      );

      expect(mockSocket.on).toHaveBeenCalledWith('addCategory', expect.any(Function));
    });
  });
});