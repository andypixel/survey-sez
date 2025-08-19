const StorageInterface = require('./StorageInterface');

class DatabaseStorage extends StorageInterface {
  constructor(dbConnection) {
    super();
    this.db = dbConnection;
  }

  async getCategories() {
    const universal = await this.db.query('SELECT * FROM universal_categories');
    const custom = await this.db.query('SELECT * FROM custom_categories');
    return { universal, custom };
  }

  async saveCategories(categories) {
    // Implementation would handle database transactions
    await this.db.transaction(async (trx) => {
      await trx('custom_categories').insert(categories.custom);
    });
  }

  async getRoom(roomId) {
    return await this.db.query('SELECT * FROM rooms WHERE id = ?', [roomId]);
  }

  async saveRoom(roomId, roomData) {
    await this.db.query(
      'INSERT INTO rooms (id, data, updated_at) VALUES (?, ?, NOW()) ON DUPLICATE KEY UPDATE data = ?, updated_at = NOW()',
      [roomId, JSON.stringify(roomData), JSON.stringify(roomData)]
    );
  }

  async getAllRooms() {
    const rows = await this.db.query('SELECT * FROM rooms');
    return rows.reduce((acc, row) => {
      acc[row.id] = JSON.parse(row.data);
      return acc;
    }, {});
  }

  async getUser(userId) {
    return await this.db.query('SELECT * FROM users WHERE id = ?', [userId]);
  }

  async saveUser(userId, userData) {
    await this.db.query(
      'INSERT INTO users (id, data, updated_at) VALUES (?, ?, NOW()) ON DUPLICATE KEY UPDATE data = ?, updated_at = NOW()',
      [userId, JSON.stringify(userData), JSON.stringify(userData)]
    );
  }

  async getAllUsers() {
    const rows = await this.db.query('SELECT * FROM users');
    return rows.reduce((acc, row) => {
      acc[row.id] = JSON.parse(row.data);
      return acc;
    }, {});
  }
}

module.exports = DatabaseStorage;