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
  
  // Timeout configuration
  TIMEOUTS: {
    RESULTS_PHASE: 30000, // 30 seconds for reveal button
    TURN_SUMMARY_PHASE: 30000, // 30 seconds for next turn button
  },
  
  // Game phases
  PHASES: {
    ONBOARDING: 'ONBOARDING',
    GAMEPLAY: 'GAMEPLAY', 
    GAME_OVER: 'GAME_OVER'
  },
  
  // Turn phases (within GAMEPLAY)
  TURN_PHASES: {
    CATEGORY_SELECTION: 'CATEGORY_SELECTION',
    ACTIVE_GUESSING: 'ACTIVE_GUESSING',
    RESULTS: 'RESULTS',
    TURN_SUMMARY: 'TURN_SUMMARY'
  },
  
  // Validation rules
  VALIDATION: {
    MIN_CATEGORY_NAME_LENGTH: 1,
    MAX_CATEGORY_NAME_LENGTH: 50,
    MIN_PLAYER_NAME_LENGTH: 1,
    MAX_PLAYER_NAME_LENGTH: 20
  },
  
  // Timeout keys
  TIMEOUT_KEYS: {
    RESULTS_PHASE: 'results_phase',
    TURN_SUMMARY_PHASE: 'turn_summary_phase'
  }
};

module.exports = GAME_RULES;