const GAME_RULES = require('../config/GameRules');
const Logger = require('../utils/Logger');
const ErrorHandler = require('../utils/ErrorHandler');
const { ValidationError, StorageError, RoomError, ERROR_CODES } = require('../utils/CustomErrors');

/**
 * Handles category-related socket events
 */
class CategoryHandler {
  /**
   * Register all category event handlers for a socket
   */
  static register(socket, io, userSession, getOrCreateRoom, storage, categoriesData, userSessions) {
    socket.on('addCategory', async (data) => {
      try {
        await this.handleAddCategory(socket, io, userSession, getOrCreateRoom, storage, categoriesData, userSessions, data);
      } catch (error) {
        ErrorHandler.handleSocketError(socket, 'addCategory', error, { userId: userSession.userId, roomId: userSession.currentRoom });
      }
    });
  }

  /**
   * Handle adding custom category
   */
  static async handleAddCategory(socket, io, userSession, getOrCreateRoom, storage, categoriesData, userSessions, data) {
    // TEST: Force different error types based on category name
    if (data.name === 'FORCE_STORAGE_ERROR') {
      throw new StorageError('Forced storage error for testing', 'testOperation', { test: true });
    }
    if (data.name === 'FORCE_ROOM_ERROR') {
      throw new RoomError('Forced room error for testing', 'test-room', { test: true });
    }
    if (data.name === 'FORCE_GENERIC_ERROR') {
      throw new Error('Forced generic error for testing');
    }
    
    const roomId = userSession.currentRoom;
    const playerData = userSession.getUserData(roomId);
    
    if (roomId && playerData && data.name) {
      const room = getOrCreateRoom(roomId);
      
      // Generate unique ID using timestamp to avoid collisions with special characters
      const timestamp = Date.now();
      const fullId = `${roomId}-${playerData.userId}-${timestamp}`;
      
      const newCategory = {
        id: fullId,
        name: data.name,
        entries: data.entries || []
      };
      
      // Validate category first
      const validationResult = room.validateCustomCategory(newCategory, playerData.userId);
      
      if (!validationResult.success) {
        const error = new ValidationError(
          validationResult.error,
          'category',
          data.name,
          { roomId, userId: playerData.userId }
        );
        throw error;
      }
      
      Logger.debug('Category validation passed', {
        categoryName: data.name,
        userId: playerData.userId,
        roomId
      });
      
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
        Logger.info('Category saved successfully', {
          categoryName: categoryWithCreator.name,
          userId: playerData.userId,
          roomId
        });
      } catch (error) {
        throw new StorageError(
          'Failed to save category to persistent storage',
          'saveCategories',
          { categoryName: categoryWithCreator.name, userId: playerData.userId, roomId }
        );
      }
      
      // Update room state immediately to sync with persistent storage
      room.addCustomCategory(categoryWithCreator, playerData.userId);
      
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
      Logger.debug('Sending categorySuccess to socket', { socketId: socket.id });
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
      let errorMessage = 'Invalid category data';
      if (!roomId) errorMessage = 'User not in a room';
      else if (!playerData) errorMessage = 'User not properly set up';
      else if (!data.name) errorMessage = 'Category must have a name';
      
      throw new ValidationError(
        errorMessage,
        'category',
        data,
        { roomId, userId: playerData?.userId }
      );
    }
  }
}

module.exports = CategoryHandler;