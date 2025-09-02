/**
 * Manages timeout logic for various game phases and UI elements
 */
class TimeoutManager {
  constructor() {
    this.timeouts = new Map(); // key -> { startTime, duration, condition }
  }

  /**
   * Start a timeout with optional condition check
   * @param {string} key - Unique identifier for this timeout
   * @param {number} duration - Timeout duration in milliseconds
   * @param {Function} conditionFn - Optional function to check additional conditions
   */
  startTimeout(key, duration, conditionFn = null) {
    this.timeouts.set(key, {
      startTime: Date.now(),
      duration: duration,
      condition: conditionFn
    });
  }

  /**
   * Check if a timeout has elapsed
   * @param {string} key - Timeout identifier
   * @returns {boolean} True if timeout has elapsed or condition is met
   */
  hasElapsed(key) {
    const timeout = this.timeouts.get(key);
    if (!timeout) return false;

    const timeElapsed = Date.now() - timeout.startTime >= timeout.duration;
    const conditionMet = timeout.condition ? timeout.condition() : false;

    return timeElapsed || conditionMet;
  }

  /**
   * Clear a specific timeout
   * @param {string} key - Timeout identifier
   */
  clearTimeout(key) {
    this.timeouts.delete(key);
  }
}

module.exports = TimeoutManager;