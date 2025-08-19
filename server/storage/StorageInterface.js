/**
 * Abstract storage interface for data persistence
 * Defines contract for any storage backend (JSON files, database, etc.)
 */
class StorageInterface {
  /**
   * Get all categories data
   * @returns {Promise<Object>} Categories object with universal and custom categories
   */
  async getCategories() {
    throw new Error('getCategories must be implemented');
  }

  /**
   * Save categories data
   * @param {Object} categories - Categories data to save
   * @returns {Promise<void>}
   */
  async saveCategories(categories) {
    throw new Error('saveCategories must be implemented');
  }

  /**
   * Get room data by ID
   * @param {string} roomId - Room identifier
   * @returns {Promise<Object|null>} Room data or null if not found
   */
  async getRoom(roomId) {
    throw new Error('getRoom must be implemented');
  }

  /**
   * Save room data
   * @param {string} roomId - Room identifier
   * @param {Object} roomData - Room data to save
   * @returns {Promise<void>}
   */
  async saveRoom(roomId, roomData) {
    throw new Error('saveRoom must be implemented');
  }

  /**
   * Get all rooms data
   * @returns {Promise<Object>} Object mapping room IDs to room data
   */
  async getAllRooms() {
    throw new Error('getAllRooms must be implemented');
  }

  /**
   * Get user data by ID
   * @param {string} userId - User identifier
   * @returns {Promise<Object|null>} User data or null if not found
   */
  async getUser(userId) {
    throw new Error('getUser must be implemented');
  }

  /**
   * Save user data
   * @param {string} userId - User identifier
   * @param {Object} userData - User data to save
   * @returns {Promise<void>}
   */
  async saveUser(userId, userData) {
    throw new Error('saveUser must be implemented');
  }

  /**
   * Get all users data
   * @returns {Promise<Object>} Object mapping user IDs to user data
   */
  async getAllUsers() {
    throw new Error('getAllUsers must be implemented');
  }
}

module.exports = StorageInterface;