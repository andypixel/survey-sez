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
 * Get user's preferred name from localStorage (convenience only)
 * @returns {string|null} User's preferred name or null
 */
export const getUserName = () => {
  return localStorage.getItem('userName');
};

/**
 * Save user's preferred name to localStorage (convenience only)
 * @param {string} name - User's preferred name
 */
export const saveUserName = (name) => {
  localStorage.setItem('userName', name);
};

/**
 * Get user data for a specific room (convenience for auto-rejoin)
 * @param {string} roomId - Room identifier
 * @returns {Object|null} User data or null if not found
 */
export const getUserData = (roomId) => {
  try {
    const data = localStorage.getItem(`gameUser_${roomId}`);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error reading user data from localStorage:', error);
    return null;
  }
};

/**
 * Save user data for a specific room (convenience for auto-rejoin)
 * @param {string} roomId - Room identifier
 * @param {Object} userData - User data to save
 */
export const saveUserData = (roomId, userData) => {
  try {
    localStorage.setItem(`gameUser_${roomId}`, JSON.stringify(userData));
  } catch (error) {
    console.error('Error saving user data to localStorage:', error);
  }
};