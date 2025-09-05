const GAME_RULES = require('../config/GameRules');

/**
 * Handles category-related socket events
 */
class CategoryHandler {
  /**
   * Register all category event handlers for a socket
   */
  static register(socket, io, userSession, getOrCreateRoom, storage, categoriesData, userSessions) {
    socket.on('addCategory', async (data) => {
      await this.handleAddCategory(socket, io, userSession, getOrCreateRoom, storage, categoriesData, userSessions, data);
    });
  }

  /**
   * Handle adding custom category
   */
  static async handleAddCategory(socket, io, userSession, getOrCreateRoom, storage, categoriesData, userSessions, data) {
    const roomId = userSession.currentRoom;
    const playerData = userSession.getUserData(roomId);
    
    if (roomId && playerData && data.name) {
      const room = getOrCreateRoom(roomId);
      
      const categoryId = data.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const fullId = `${roomId}-${playerData.team}-${categoryId}`;
      
      const newCategory = {
        id: fullId,
        name: data.name,
        entries: data.entries || []
      };
      
      // Validate category first
      const validationResult = room.validateCustomCategory(newCategory, playerData.userId);
      
      if (!validationResult.success) {
        socket.emit('categoryError', { message: validationResult.error });
        return;
      }
      
      // Create category with creator info
      const categoryWithCreator = {
        ...validationResult.category,
        createdBy: {
          userId: playerData.userId,
          name: playerData.name
        }
      };
      
      // Save to persistent storage (user-scoped)
      const storageKey = `${roomId}-${playerData.userId}`;
      if (!categoriesData.custom[storageKey]) {
        categoriesData.custom[storageKey] = [];
      }
      
      categoriesData.custom[storageKey].push(categoryWithCreator);
      try {
        await storage.saveCategories(categoriesData);
      } catch (error) {
        const errorMsg = 'Failed to save category';
        console.error('[CategoryHandler] Save category failed:', error);
        socket.emit('categoryError', { message: errorMsg });
        return;
      }
      
      // Update room state immediately to sync with persistent storage
      const userKey = `${roomId}-${playerData.userId}`;
      if (!room.categories.userCustom[userKey]) {
        room.categories.userCustom[userKey] = [];
      }
      room.categories.userCustom[userKey].push(categoryWithCreator);
      
      // Also update global categoriesData to keep everything in sync
      if (!categoriesData.custom[storageKey]) {
        categoriesData.custom[storageKey] = [];
      }
      
      // Send success confirmation to sender
      socket.emit('categoryAdded', {
        userKey: `${roomId}-${playerData.userId}`,
        category: categoryWithCreator
      });
      
      // Tell sender to reset form
      console.log('Sending categorySuccess to socket:', socket.id);
      socket.emit('categorySuccess');
      
      // Send targeted category update to other users who have completed setup
      const socketsInRoom = io.sockets.adapter.rooms.get(roomId);
      if (socketsInRoom) {
        socketsInRoom.forEach(socketId => {
          if (socketId !== socket.id) {
            const otherUserSession = userSessions[socketId];
            if (otherUserSession && otherUserSession.getUserData(roomId)?.setupComplete) {
              io.to(socketId).emit('categoryAdded', {
                userKey: `${roomId}-${playerData.userId}`,
                category: categoryWithCreator
              });
            }
          }
        });
      }
    } else {
      const error = 'Category must have a name';
      console.error('[CategoryHandler] Add category failed:', error);
      socket.emit('categoryError', { message: error });
    }
  }
}

module.exports = CategoryHandler;