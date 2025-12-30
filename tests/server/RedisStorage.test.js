const RedisStorage = require('../../server/storage/RedisStorage');

// Mock redis module
jest.mock('redis', () => ({
  createClient: jest.fn()
}));

const redis = require('redis');

describe('RedisStorage', () => {
  let storage;
  let mockClient;

  beforeEach(() => {
    mockClient = {
      connect: jest.fn().mockResolvedValue(),
      get: jest.fn(),
      set: jest.fn().mockResolvedValue(),
      keys: jest.fn().mockResolvedValue([]),
      on: jest.fn()
    };

    redis.createClient.mockReturnValue(mockClient);
    storage = new RedisStorage();
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    test('should create Redis client with REDIS_URL from environment', () => {
      process.env.REDIS_URL = 'redis://test-redis:6379';
      
      new RedisStorage();

      expect(redis.createClient).toHaveBeenCalledWith({
        url: 'redis://test-redis:6379'
      });
    });

    test('should use default Redis URL when REDIS_URL not set', () => {
      delete process.env.REDIS_URL;
      
      new RedisStorage();

      expect(redis.createClient).toHaveBeenCalledWith({
        url: 'redis://localhost:6379'
      });
    });

    test('should set up error handler', () => {
      new RedisStorage();
      
      expect(mockClient.on).toHaveBeenCalledWith('error', expect.any(Function));
    });

    test('should initialize as not connected', () => {
      expect(storage.connected).toBe(false);
    });
  });

  describe('connect', () => {
    test('should connect when not already connected', async () => {
      await storage.connect();

      expect(mockClient.connect).toHaveBeenCalled();
      expect(storage.connected).toBe(true);
    });

    test('should not connect again when already connected', async () => {
      storage.connected = true;

      await storage.connect();

      expect(mockClient.connect).not.toHaveBeenCalled();
    });

    test('should handle connection errors', async () => {
      mockClient.connect.mockRejectedValue(new Error('Connection failed'));

      await expect(storage.connect()).rejects.toThrow('Connection failed');
    });
  });

  describe('getCategories', () => {
    test('should return parsed categories from Redis', async () => {
      const mockCategories = {
        universal: [{ id: 'u1', name: 'Test Category' }],
        custom: { 'room1-user1': [{ id: 'c1', name: 'Custom Category' }] },
        usedUniversalCategoryIds: ['u1']
      };
      mockClient.get.mockResolvedValue(JSON.stringify(mockCategories));

      const result = await storage.getCategories();

      expect(mockClient.connect).toHaveBeenCalled();
      expect(mockClient.get).toHaveBeenCalledWith('categories');
      expect(result).toEqual(mockCategories);
    });

    test('should return default structure when no data exists', async () => {
      mockClient.get.mockResolvedValue(null);

      const result = await storage.getCategories();

      expect(result).toEqual({
        universal: [],
        custom: {},
        usedUniversalCategoryIds: []
      });
    });

    test('should handle Redis errors', async () => {
      mockClient.get.mockRejectedValue(new Error('Redis error'));

      await expect(storage.getCategories()).rejects.toThrow('Redis error');
    });
  });

  describe('saveCategories', () => {
    test('should save categories to Redis', async () => {
      const categories = {
        universal: [{ id: 'u1', name: 'Test Category' }],
        custom: {}
      };

      await storage.saveCategories(categories);

      expect(mockClient.connect).toHaveBeenCalled();
      expect(mockClient.set).toHaveBeenCalledWith('categories', JSON.stringify(categories));
    });

    test('should handle save errors', async () => {
      mockClient.set.mockRejectedValue(new Error('Save failed'));

      await expect(storage.saveCategories({})).rejects.toThrow('Save failed');
    });
  });

  describe('getRoom', () => {
    test('should return parsed room data from Redis', async () => {
      const mockRoom = { id: 'room1', players: {} };
      mockClient.get.mockResolvedValue(JSON.stringify(mockRoom));

      const result = await storage.getRoom('room1');

      expect(mockClient.connect).toHaveBeenCalled();
      expect(mockClient.get).toHaveBeenCalledWith('room:room1');
      expect(result).toEqual(mockRoom);
    });

    test('should return null when room does not exist', async () => {
      mockClient.get.mockResolvedValue(null);

      const result = await storage.getRoom('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('saveRoom', () => {
    test('should save room data to Redis with correct key', async () => {
      const roomData = { id: 'room1', players: { user1: {} } };

      await storage.saveRoom('room1', roomData);

      expect(mockClient.connect).toHaveBeenCalled();
      expect(mockClient.set).toHaveBeenCalledWith('room:room1', JSON.stringify(roomData));
    });
  });

  describe('getAllRooms', () => {
    test('should return all rooms from Redis', async () => {
      const mockRooms = {
        room1: { id: 'room1', players: {} },
        room2: { id: 'room2', players: {} }
      };
      
      mockClient.keys.mockResolvedValue(['room:room1', 'room:room2']);
      mockClient.get
        .mockResolvedValueOnce(JSON.stringify(mockRooms.room1))
        .mockResolvedValueOnce(JSON.stringify(mockRooms.room2));

      const result = await storage.getAllRooms();

      expect(mockClient.connect).toHaveBeenCalled();
      expect(mockClient.keys).toHaveBeenCalledWith('room:*');
      expect(mockClient.get).toHaveBeenCalledWith('room:room1');
      expect(mockClient.get).toHaveBeenCalledWith('room:room2');
      expect(result).toEqual(mockRooms);
    });

    test('should return empty object when no rooms exist', async () => {
      mockClient.keys.mockResolvedValue([]);

      const result = await storage.getAllRooms();

      expect(result).toEqual({});
    });

    test('should handle keys with complex room IDs', async () => {
      const complexRoomId = 'room-with-dashes_and_underscores';
      mockClient.keys.mockResolvedValue([`room:${complexRoomId}`]);
      mockClient.get.mockResolvedValue(JSON.stringify({ id: complexRoomId }));

      const result = await storage.getAllRooms();

      expect(result[complexRoomId]).toEqual({ id: complexRoomId });
    });
  });

  describe('getUser', () => {
    test('should return parsed user data from Redis', async () => {
      const mockUser = { id: 'user1', name: 'Test User' };
      mockClient.get.mockResolvedValue(JSON.stringify(mockUser));

      const result = await storage.getUser('user1');

      expect(mockClient.connect).toHaveBeenCalled();
      expect(mockClient.get).toHaveBeenCalledWith('user:user1');
      expect(result).toEqual(mockUser);
    });

    test('should return null when user does not exist', async () => {
      mockClient.get.mockResolvedValue(null);

      const result = await storage.getUser('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('saveUser', () => {
    test('should save user data to Redis with correct key', async () => {
      const userData = { id: 'user1', name: 'Test User' };

      await storage.saveUser('user1', userData);

      expect(mockClient.connect).toHaveBeenCalled();
      expect(mockClient.set).toHaveBeenCalledWith('user:user1', JSON.stringify(userData));
    });
  });

  describe('error handling', () => {
    test('should handle JSON parse errors gracefully', async () => {
      mockClient.get.mockResolvedValue('invalid json');

      await expect(storage.getCategories()).rejects.toThrow();
      await expect(storage.getRoom('room1')).rejects.toThrow();
      await expect(storage.getUser('user1')).rejects.toThrow();
    });

    test('should propagate Redis connection errors', async () => {
      mockClient.connect.mockRejectedValue(new Error('Connection timeout'));

      await expect(storage.getCategories()).rejects.toThrow('Connection timeout');
      await expect(storage.saveCategories({})).rejects.toThrow('Connection timeout');
      await expect(storage.getRoom('room1')).rejects.toThrow('Connection timeout');
      await expect(storage.saveRoom('room1', {})).rejects.toThrow('Connection timeout');
      await expect(storage.getAllRooms()).rejects.toThrow('Connection timeout');
      await expect(storage.getUser('user1')).rejects.toThrow('Connection timeout');
      await expect(storage.saveUser('user1', {})).rejects.toThrow('Connection timeout');
    });

    test('should handle Redis operation errors', async () => {
      mockClient.get.mockRejectedValue(new Error('Redis operation failed'));
      mockClient.set.mockRejectedValue(new Error('Redis write failed'));
      mockClient.keys.mockRejectedValue(new Error('Redis keys failed'));

      await expect(storage.getCategories()).rejects.toThrow('Redis operation failed');
      await expect(storage.saveCategories({})).rejects.toThrow('Redis write failed');
      await expect(storage.getAllRooms()).rejects.toThrow('Redis keys failed');
    });
  });

  describe('production scenarios', () => {
    test('should handle large data sets', async () => {
      const largeCategories = {
        universal: Array.from({ length: 100 }, (_, i) => ({ id: `u${i}`, name: `Category ${i}` })),
        custom: {},
        usedUniversalCategoryIds: Array.from({ length: 50 }, (_, i) => `u${i}`)
      };

      await storage.saveCategories(largeCategories);

      expect(mockClient.set).toHaveBeenCalledWith('categories', JSON.stringify(largeCategories));
    });

    test('should handle concurrent operations', async () => {
      const promises = [
        storage.getCategories(),
        storage.getRoom('room1'),
        storage.getUser('user1')
      ];

      await Promise.all(promises);

      expect(mockClient.connect).toHaveBeenCalledTimes(3);
      expect(mockClient.get).toHaveBeenCalledTimes(3);
    });

    test('should maintain connection state across operations', async () => {
      await storage.getCategories();
      await storage.saveCategories({});
      await storage.getRoom('room1');

      expect(mockClient.connect).toHaveBeenCalledTimes(1); // Only connects once
      expect(storage.connected).toBe(true);
    });
  });
});