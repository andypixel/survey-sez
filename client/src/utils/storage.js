/**
 * Client-side storage utilities for user data persistence
 * Uses localStorage to maintain user identity and room-specific data
 */

/**
 * Get or create a persistent global user ID
 * @returns {string} Unique user identifier
 */
export const getGlobalUserId = () => {
  let userId = localStorage.getItem('gameUserId');
  if (!userId) {
    // TODO: Use more robust ID generation (UUID) for production
    userId = 'user_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('gameUserId', userId);
  }
  return userId;
};

/**
 * Get user data for a specific room
 * @param {string} roomId - Room identifier
 * @returns {Object|null} User data or null if not found
 */
export const getUserData = (roomId) => {
  const data = localStorage.getItem(`gameUser_${roomId}`);
  return data ? JSON.parse(data) : null;
};

/**
 * Save user data for a specific room
 * @param {string} roomId - Room identifier
 * @param {Object} userData - User data to save
 */
export const saveUserData = (roomId, userData) => {
  localStorage.setItem(`gameUser_${roomId}`, JSON.stringify(userData));
};