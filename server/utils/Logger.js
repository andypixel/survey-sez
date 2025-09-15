/**
 * Simple structured logging for playtest debugging
 * Logs to console (captured by Railway) with structured format
 */
class Logger {
  static log(level, event, data = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      event,
      ...data
    };
    
    // Console output for Railway logs
    console.log(`[${level}] ${event}:`, JSON.stringify(logEntry));
    
    // TODO: Add external logging service (e.g., LogRocket, Sentry) for production
  }

  static info(event, data = {}) {
    this.log('INFO', event, data);
  }

  static warn(event, data = {}) {
    this.log('WARN', event, data);
  }

  static error(event, error, data = {}) {
    this.log('ERROR', event, {
      ...data,
      error: error.message,
      stack: error.stack
    });
  }

  // Game-specific logging helpers
  static gameEvent(event, roomId, data = {}) {
    this.info(`GAME_${event}`, {
      roomId,
      ...data
    });
  }

  static userEvent(event, userId, roomId, data = {}) {
    this.info(`USER_${event}`, {
      userId,
      roomId,
      ...data
    });
  }
}

module.exports = Logger;