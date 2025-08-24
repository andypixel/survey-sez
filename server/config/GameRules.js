/**
 * Centralized game rules and configuration
 * Makes game mechanics easily modifiable without code changes
 */
const GAME_RULES = {
  // Team configuration
  MAX_TEAMS: 2,
  MIN_TEAMS_TO_START: 2,
  
  // Turn configuration
  MAX_SKIPS_PER_TURN: 2,
  DEFAULT_TIME_LIMIT: 30, // seconds
  DEFAULT_ROUNDS: 3,
  
  // Game phases
  PHASES: {
    ONBOARDING: 'ONBOARDING',
    GAMEPLAY: 'GAMEPLAY', 
    SUMMARY: 'SUMMARY'
  },
  
  // Turn phases (for future expansion)
  TURN_PHASES: {
    CATEGORY_SELECTION: 'CATEGORY_SELECTION',
    ACTIVE_GUESSING: 'ACTIVE_GUESSING',
    RESULTS: 'RESULTS'
  },
  
  // Validation rules
  VALIDATION: {
    MIN_CATEGORY_NAME_LENGTH: 1,
    MAX_CATEGORY_NAME_LENGTH: 50,
    MIN_PLAYER_NAME_LENGTH: 1,
    MAX_PLAYER_NAME_LENGTH: 20
  }
};

module.exports = GAME_RULES;