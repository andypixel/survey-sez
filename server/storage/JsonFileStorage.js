const fs = require('fs').promises;
const path = require('path');

/**
 * JSON file-based storage implementation
 * Stores data in local JSON files for development/prototyping
 * TODO: Replace with database storage for production
 */
class JsonFileStorage {
  /**
   * Initialize JSON file storage with file paths
   */
  constructor() {
    this.dataDir = path.join(__dirname, '..', '..', 'data');
    this.categoriesFile = path.join(this.dataDir, 'categories.json');
    this.roomsFile = path.join(this.dataDir, 'rooms.json');
    this.usersFile = path.join(this.dataDir, 'users.json');
  }

  async getCategories() {
    try {
      const data = await fs.readFile(this.categoriesFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return { universal: [], custom: {} };
    }
  }

  async saveCategories(categories) {
    await fs.writeFile(this.categoriesFile, JSON.stringify(categories, null, 2));
  }

  async getRoom(roomId) {
    const rooms = await this.getAllRooms();
    return rooms[roomId] || null;
  }

  async saveRoom(roomId, roomData) {
    // TODO: Optimize - this loads/saves entire file for single room update
    const rooms = await this.getAllRooms();
    rooms[roomId] = roomData;
    await fs.writeFile(this.roomsFile, JSON.stringify(rooms, null, 2));
  }

  async getAllRooms() {
    try {
      const data = await fs.readFile(this.roomsFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return {};
    }
  }

  async getUser(userId) {
    const users = await this.getAllUsers();
    return users[userId] || null;
  }

  async saveUser(userId, userData) {
    // TODO: Optimize - this loads/saves entire file for single user update
    const users = await this.getAllUsers();
    users[userId] = userData;
    await fs.writeFile(this.usersFile, JSON.stringify(users, null, 2));
  }

  async getAllUsers() {
    try {
      const data = await fs.readFile(this.usersFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return {};
    }
  }
}

module.exports = JsonFileStorage;