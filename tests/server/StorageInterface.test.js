const StorageInterface = require('../../server/storage/StorageInterface');

describe('StorageInterface', () => {
  let storageInterface;

  beforeEach(() => {
    storageInterface = new StorageInterface();
  });

  describe('Categories Methods', () => {
    test('getCategories should throw not implemented error', async () => {
      await expect(storageInterface.getCategories()).rejects.toThrow('getCategories must be implemented');
    });

    test('saveCategories should throw not implemented error', async () => {
      const categories = { universal: [], custom: {} };
      await expect(storageInterface.saveCategories(categories)).rejects.toThrow('saveCategories must be implemented');
    });
  });

  describe('Room Methods', () => {
    test('getRoom should throw not implemented error', async () => {
      await expect(storageInterface.getRoom('room1')).rejects.toThrow('getRoom must be implemented');
    });

    test('saveRoom should throw not implemented error', async () => {
      const roomData = { players: [], teams: [] };
      await expect(storageInterface.saveRoom('room1', roomData)).rejects.toThrow('saveRoom must be implemented');
    });

    test('getAllRooms should throw not implemented error', async () => {
      await expect(storageInterface.getAllRooms()).rejects.toThrow('getAllRooms must be implemented');
    });
  });

  describe('User Methods', () => {
    test('getUser should throw not implemented error', async () => {
      await expect(storageInterface.getUser('user1')).rejects.toThrow('getUser must be implemented');
    });

    test('saveUser should throw not implemented error', async () => {
      const userData = { name: 'Test User', roomId: 'room1' };
      await expect(storageInterface.saveUser('user1', userData)).rejects.toThrow('saveUser must be implemented');
    });

    test('getAllUsers should throw not implemented error', async () => {
      await expect(storageInterface.getAllUsers()).rejects.toThrow('getAllUsers must be implemented');
    });
  });

  describe('Interface Contract', () => {
    test('should be instantiable', () => {
      expect(storageInterface).toBeInstanceOf(StorageInterface);
    });

    test('should have all required methods', () => {
      expect(typeof storageInterface.getCategories).toBe('function');
      expect(typeof storageInterface.saveCategories).toBe('function');
      expect(typeof storageInterface.getRoom).toBe('function');
      expect(typeof storageInterface.saveRoom).toBe('function');
      expect(typeof storageInterface.getAllRooms).toBe('function');
      expect(typeof storageInterface.getUser).toBe('function');
      expect(typeof storageInterface.saveUser).toBe('function');
      expect(typeof storageInterface.getAllUsers).toBe('function');
    });
  });
});