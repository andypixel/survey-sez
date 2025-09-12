const redis = require('redis');

class RedisStorage {
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

  async getCategories() {
    await this.connect();
    const data = await this.client.get('categories');
    return data ? JSON.parse(data) : { universal: [], custom: {}, usedUniversalCategoryIds: [] };
  }

  async saveCategories(categories) {
    await this.connect();
    await this.client.set('categories', JSON.stringify(categories));
  }

  async getRoom(roomId) {
    await this.connect();
    const data = await this.client.get(`room:${roomId}`);
    return data ? JSON.parse(data) : null;
  }

  async saveRoom(roomId, roomData) {
    await this.connect();
    await this.client.set(`room:${roomId}`, JSON.stringify(roomData));
  }

  async getAllRooms() {
    await this.connect();
    const keys = await this.client.keys('room:*');
    const rooms = {};
    for (const key of keys) {
      const roomId = key.replace('room:', '');
      const data = await this.client.get(key);
      rooms[roomId] = JSON.parse(data);
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
}

module.exports = RedisStorage;