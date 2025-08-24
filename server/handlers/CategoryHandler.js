/**
 * Handles category-related socket events
 */
class CategoryHandler {
  /**
   * Register all category event handlers for a socket
   */
  static register(socket, io, userSession, getOrCreateRoom, debouncedSave, storage, categoriesData, userSessions) {
    socket.on('addCategory', async (data) => {
      await this.handleAddCategory(socket, io, userSession, getOrCreateRoom, debouncedSave, storage, categoriesData, userSessions, data);
    });
  }

  /**
   * Handle adding custom category
   */
  static async handleAddCategory(socket, io, userSession, getOrCreateRoom, debouncedSave, storage, categoriesData, userSessions, data) {
    const roomId = userSession.currentRoom;
    const playerData = userSession.getUserData(roomId);
    
    if (roomId && playerData && data.name) {
      const categoryId = data.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const fullId = `${roomId}-${playerData.team}-${categoryId}`;
      
      const room = getOrCreateRoom(roomId);
      
      // Check for duplicate IDs in universal categories
      const universalExists = room.categories.universal.some(cat => cat.id === categoryId);
      
      // Check for duplicate IDs in user's custom categories
      const userKey = `${roomId}-${playerData.userId}`;
      const userCustom = room.categories.userCustom[userKey] || [];
      const customExists = userCustom.some(cat => cat.id === fullId);
      
      if (universalExists || customExists) {
        socket.emit('categoryError', { message: 'A category with this name already exists' });
        return;
      }
      
      const newCategory = {
        id: fullId,
        name: data.name,
        entries: data.entries || []
      };
      
      // Save to persistent storage (user-scoped)
      const storageKey = `${roomId}-${playerData.userId}`;
      if (!categoriesData.custom[storageKey]) {
        categoriesData.custom[storageKey] = [];
      }
      
      const categoryWithCreator = {
        ...newCategory,
        createdBy: {
          userId: playerData.userId,
          name: playerData.name
        }
      };
      
      categoriesData.custom[storageKey].push(categoryWithCreator);
      try {
        await storage.saveCategories(categoriesData);
      } catch (error) {
        console.error('Error saving categories:', error);
        socket.emit('categoryError', { message: 'Failed to save category' });
        return;
      }
      
      // Update room state with the category that includes creator info
      room.addCustomCategory(categoryWithCreator, playerData.userId);
      
      // Send targeted category update to users who have completed setup
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
      socket.emit('categoryError', { message: 'Category must have a name' });
    }
  }
}

module.exports = CategoryHandler;