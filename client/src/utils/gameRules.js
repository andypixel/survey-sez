/**
 * Client-side game rules fetcher
 * Single source of truth from server API
 */

let gameRulesCache = null;

export const getGameRules = async () => {
  if (gameRulesCache) {
    return gameRulesCache;
  }
  
  try {
    const response = await fetch('/api/game-rules');
    gameRulesCache = await response.json();
    return gameRulesCache;
  } catch (error) {
    console.error('Failed to fetch game rules:', error);
    // Fallback to prevent app crashes
    return {
      VALIDATION: {
        MAX_CATEGORY_ENTRIES: 10
      }
    };
  }
};

// For synchronous access (use only after initial fetch)
export const getCachedGameRules = () => {
  return gameRulesCache || {
    VALIDATION: {
      MAX_CATEGORY_ENTRIES: 10
    }
  };
};