const JsonFileStorage = require('../../server/storage/JsonFileStorage');
const fs = require('fs').promises;

// Mock fs module
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn()
  }
}));

describe('JsonFileStorage', () => {
  let storage;

  beforeEach(() => {
    storage = new JsonFileStorage();
    jest.clearAllMocks();
    // Reset all mocks to resolved state
    fs.readFile.mockResolvedValue('{}');
    fs.writeFile.mockResolvedValue();
  });

  describe('constructor', () => {
    test('should initialize with correct file paths', () => {
      expect(storage.dataDir).toContain('data');
      expect(storage.categoriesFile).toContain('categories.json');
      expect(storage.roomsFile).toContain('rooms.json');
      expect(storage.usersFile).toContain('users.json');
    });
  });

  describe('getCategories', () => {
    test('should return parsed categories from file', async () => {
      const mockCategories = {
        universal: [{ id: 'u1', name: 'Test Category' }],
        custom: { 'room1-user1': [{ id: 'c1', name: 'Custom Category' }] }
      };
      fs.readFile.mockResolvedValue(JSON.stringify(mockCategories));

      const result = await storage.getCategories();

      expect(fs.readFile).toHaveBeenCalledWith(storage.categoriesFile, 'utf8');
      expect(result).toEqual(mockCategories);
    });

    test('should return default structure when file does not exist', async () => {
      fs.readFile.mockRejectedValue(new Error('ENOENT: no such file'));

      const result = await storage.getCategories();

      expect(result).toEqual({ universal: [], custom: {} });
    });

    test('should return default structure when file is corrupted', async () => {
      fs.readFile.mockResolvedValue('invalid json');

      const result = await storage.getCategories();

      expect(result).toEqual({ universal: [], custom: {} });
    });
  });

  describe('saveCategories', () => {
    test('should write categories to file with formatting', async () => {
      const categories = {
        universal: [{ id: 'u1', name: 'Test Category' }],
        custom: {}
      };

      await storage.saveCategories(categories);

      expect(fs.writeFile).toHaveBeenCalledWith(
        storage.categoriesFile,
        JSON.stringify(categories, null, 2)
      );
    });

    test('should handle write errors', async () => {
      fs.writeFile.mockRejectedValue(new Error('Permission denied'));

      await expect(storage.saveCategories({})).rejects.toThrow('Permission denied');
    });
  });

  describe('getRoom', () => {
    test('should return specific room data', async () => {
      const mockRooms = {
        room1: { id: 'room1', players: {} },
        room2: { id: 'room2', players: {} }
      };
      fs.readFile.mockResolvedValue(JSON.stringify(mockRooms));

      const result = await storage.getRoom('room1');

      expect(result).toEqual({ id: 'room1', players: {} });
    });

    test('should return null for non-existent room', async () => {
      fs.readFile.mockResolvedValue(JSON.stringify({}));

      const result = await storage.getRoom('nonexistent');

      expect(result).toBeNull();
    });

    test('should return null when rooms file does not exist', async () => {
      fs.readFile.mockRejectedValue(new Error('ENOENT'));

      const result = await storage.getRoom('room1');

      expect(result).toBeNull();
    });
  });

  describe('saveRoom', () => {
    test('should save room data to existing rooms file', async () => {
      const existingRooms = { room1: { id: 'room1', players: {} } };
      const newRoomData = { id: 'room2', players: { user1: {} } };
      
      fs.readFile.mockResolvedValue(JSON.stringify(existingRooms));

      await storage.saveRoom('room2', newRoomData);

      const expectedRooms = {
        room1: { id: 'room1', players: {} },
        room2: { id: 'room2', players: { user1: {} } }
      };

      expect(fs.writeFile).toHaveBeenCalledWith(
        storage.roomsFile,
        JSON.stringify(expectedRooms, null, 2)
      );
    });

    test('should create new rooms file if it does not exist', async () => {
      fs.readFile.mockRejectedValue(new Error('ENOENT'));
      const roomData = { id: 'room1', players: {} };

      await storage.saveRoom('room1', roomData);

      expect(fs.writeFile).toHaveBeenCalledWith(
        storage.roomsFile,
        JSON.stringify({ room1: roomData }, null, 2)
      );
    });

    test('should update existing room data', async () => {
      const existingRooms = { room1: { id: 'room1', players: {} } };
      const updatedRoomData = { id: 'room1', players: { user1: {} } };
      
      fs.readFile.mockResolvedValue(JSON.stringify(existingRooms));

      await storage.saveRoom('room1', updatedRoomData);

      expect(fs.writeFile).toHaveBeenCalledWith(
        storage.roomsFile,
        JSON.stringify({ room1: updatedRoomData }, null, 2)
      );
    });
  });

  describe('getAllRooms', () => {
    test('should return all rooms from file', async () => {
      const mockRooms = {
        room1: { id: 'room1', players: {} },
        room2: { id: 'room2', players: {} }
      };
      fs.readFile.mockResolvedValue(JSON.stringify(mockRooms));

      const result = await storage.getAllRooms();

      expect(result).toEqual(mockRooms);
    });

    test('should return empty object when file does not exist', async () => {
      fs.readFile.mockRejectedValue(new Error('ENOENT'));

      const result = await storage.getAllRooms();

      expect(result).toEqual({});
    });
  });

  describe('getUser', () => {
    test('should return specific user data', async () => {
      const mockUsers = {
        user1: { id: 'user1', name: 'Test User' },
        user2: { id: 'user2', name: 'Another User' }
      };
      fs.readFile.mockResolvedValue(JSON.stringify(mockUsers));

      const result = await storage.getUser('user1');

      expect(result).toEqual({ id: 'user1', name: 'Test User' });
    });

    test('should return null for non-existent user', async () => {
      fs.readFile.mockResolvedValue(JSON.stringify({}));

      const result = await storage.getUser('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('saveUser', () => {
    test('should save user data to existing users file', async () => {
      const existingUsers = { user1: { id: 'user1', name: 'Test User' } };
      const newUserData = { id: 'user2', name: 'New User' };
      
      fs.readFile.mockResolvedValue(JSON.stringify(existingUsers));

      await storage.saveUser('user2', newUserData);

      const expectedUsers = {
        user1: { id: 'user1', name: 'Test User' },
        user2: { id: 'user2', name: 'New User' }
      };

      expect(fs.writeFile).toHaveBeenCalledWith(
        storage.usersFile,
        JSON.stringify(expectedUsers, null, 2)
      );
    });

    test('should update existing user data', async () => {
      const existingUsers = { user1: { id: 'user1', name: 'Old Name' } };
      const updatedUserData = { id: 'user1', name: 'New Name' };
      
      fs.readFile.mockResolvedValue(JSON.stringify(existingUsers));

      await storage.saveUser('user1', updatedUserData);

      expect(fs.writeFile).toHaveBeenCalledWith(
        storage.usersFile,
        JSON.stringify({ user1: updatedUserData }, null, 2)
      );
    });
  });

  describe('getAllUsers', () => {
    test('should return all users from file', async () => {
      const mockUsers = {
        user1: { id: 'user1', name: 'Test User' },
        user2: { id: 'user2', name: 'Another User' }
      };
      fs.readFile.mockResolvedValue(JSON.stringify(mockUsers));

      const result = await storage.getAllUsers();

      expect(result).toEqual(mockUsers);
    });

    test('should return empty object when file does not exist', async () => {
      fs.readFile.mockRejectedValue(new Error('ENOENT'));

      const result = await storage.getAllUsers();

      expect(result).toEqual({});
    });
  });

  describe('error handling', () => {
    test('should handle JSON parse errors gracefully', async () => {
      fs.readFile.mockResolvedValue('invalid json content');

      const categories = await storage.getCategories();
      const rooms = await storage.getAllRooms();
      const users = await storage.getAllUsers();

      expect(categories).toEqual({ universal: [], custom: {} });
      expect(rooms).toEqual({});
      expect(users).toEqual({});
    });

    test('should propagate write errors', async () => {
      fs.writeFile.mockRejectedValue(new Error('Disk full'));

      await expect(storage.saveCategories({})).rejects.toThrow('Disk full');
      await expect(storage.saveRoom('room1', {})).rejects.toThrow('Disk full');
      await expect(storage.saveUser('user1', {})).rejects.toThrow('Disk full');
    });
  });
});