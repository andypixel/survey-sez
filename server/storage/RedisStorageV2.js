const redis = require('redis');

/**
 * Enhanced Redis storage using hashes for better debugging
 * Optional upgrade - keeps JSON strings for now but adds structure
 */
class RedisStorageV2 {
  constructor() {
    this.client = redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });
    this.client.on('error', (err) => console.error('Redis error:', err));
    this.connected = false;
  }

  async connect() {
    if (!this.connected) {
      await this.client.connect();
      this.connected = true;
    }
  }

  // Keep existing JSON methods for compatibility
  async getCategories() {
    await this.connect();
    const data = await this.client.get('categories');
    return data ? JSON.parse(data) : { universal: [], custom: {}, usedUniversalCategoryIds: [] };
  }

  async saveCategories(categories) {
    await this.connect();
    // Store as JSON string (current method)
    await this.client.set('categories', JSON.stringify(categories));
    
    // ALSO store structured data for easier debugging
    await this.client.hSet('categories:meta', {
      universalCount: categories.universal.length,
      customCount: Object.keys(categories.custom).length,
      usedCount: categories.usedUniversalCategoryIds.length,
      lastUpdated: new Date().toISOString()
    });
  }

  async getRoom(roomId) {
    await this.connect();
    const data = await this.client.get(`room:${roomId}`);
    return data ? JSON.parse(data) : null;
  }

  async saveRoom(roomId, roomData) {
    await this.connect();
    // Store as JSON string (current method)
    await this.client.set(`room:${roomId}`, JSON.stringify(roomData));
    
    // ALSO store metadata for easier debugging
    await this.client.hSet(`room:${roomId}:meta`, {
      gameState: roomData.gameState,
      teamCount: Object.keys(roomData.teams || {}).length,
      lastActivity: roomData.lastActivity || Date.now(),
      lastUpdated: new Date().toISOString()
    });
  }

  async getAllRooms() {
    await this.connect();
    const keys = await this.client.keys('room:*');
    const rooms = {};
    for (const key of keys) {
      if (!key.includes(':meta')) { // Skip metadata keys
        const roomId = key.replace('room:', '');
        const data = await this.client.get(key);
        rooms[roomId] = JSON.parse(data);
      }
    }
    return rooms;
  }

  async getUser(userId) {
    await this.connect();
    const data = await this.client.get(`user:${userId}`);
    return data ? JSON.parse(data) : null;
  }

  async saveUser(userId, userData) {
    await this.connect();
    await this.client.set(`user:${userId}`, JSON.stringify(userData));
  }

  // Debug helper methods
  async getDebugInfo() {
    await this.connect();
    const info = {
      totalKeys: await this.client.dbSize(),
      categories: await this.client.hGetAll('categories:meta'),
      rooms: {}
    };
    
    const roomMetaKeys = await this.client.keys('room:*:meta');
    for (const key of roomMetaKeys) {
      const roomId = key.replace('room:', '').replace(':meta', '');
      info.rooms[roomId] = await this.client.hGetAll(key);
    }
    
    return info;
  }
}

module.exports = RedisStorageV2;