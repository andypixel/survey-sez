/**
 * Centralized error handling for consistent UX
 */
class ErrorHandler {
  /**
   * Handle errors with consistent logging and user feedback
   * @param {Error|string} error - Error object or message
   * @param {string} context - Where the error occurred
   * @param {Function} setErrorState - React state setter for error display
   */
  static handle(error, context, setErrorState) {
    const message = typeof error === 'string' ? error : error.message;
    const errorData = {
      message,
      context,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      ...(typeof error === 'object' && {
        stack: error.stack,
        name: error.name
      })
    };
    
    if (process.env.NODE_ENV === 'development') {
      console.group(`🚨 Error in ${context}`);
      console.error('Message:', message);
      console.error('Full Error:', error);
      console.error('Context Data:', errorData);
      console.groupEnd();
    } else {
      console.error(`[${context}] ${message}`);
    }
    
    // Set error state for UI display
    if (setErrorState) {
      setErrorState(message);
      // Auto-clear after 5 seconds
      setTimeout(() => setErrorState(''), 5000);
    }

    // Could send to external logging service here
    this.reportError(errorData);
  }

  /**
   * Handle socket errors specifically
   * @param {Object} errorData - Error data from socket event
   * @param {string} context - Context where error occurred
   * @param {Function} setErrorState - React state setter
   */
  static handleSocketError(errorData, context, setErrorState) {
    const enhancedError = {
      ...errorData,
      type: 'SOCKET_ERROR',
      context
    };
    
    this.handle(errorData.message || 'Unknown socket error', `Socket:${context}`, setErrorState);
  }

  /**
   * Handle validation errors
   * @param {string} message - Validation error message
   * @param {Function} setErrorState - React state setter
   */
  static handleValidation(message, setErrorState) {
    this.handle(message, 'Validation', setErrorState);
  }

  /**
   * Handle async operations with error catching
   * @param {Function} asyncFn - Async function to execute
   * @param {string} context - Context for error reporting
   * @param {Function} setErrorState - Error state setter
   */
  static async withErrorHandling(asyncFn, context, setErrorState) {
    try {
      return await asyncFn();
    } catch (error) {
      this.handle(error, context, setErrorState);
      throw error; // Re-throw for caller to handle if needed
    }
  }

  /**
   * Report error to external service (placeholder)
   * @param {Object} errorData - Error information
   */
  static reportError(errorData) {
    // Could send this to a logging service
    // For now, just store in localStorage for debugging
    try {
      const errors = JSON.parse(localStorage.getItem('survey-sez-errors') || '[]');
      errors.push(errorData);
      // Keep only last 50 errors
      if (errors.length > 50) {
        errors.splice(0, errors.length - 50);
      }
      localStorage.setItem('survey-sez-errors', JSON.stringify(errors));
    } catch (e) {
      // Ignore localStorage errors
    }
  }

  /**
   * Get stored errors for debugging
   */
  static getStoredErrors() {
    try {
      return JSON.parse(localStorage.getItem('survey-sez-errors') || '[]');
    } catch (e) {
      return [];
    }
  }

  /**
   * Clear stored errors
   */
  static clearStoredErrors() {
    localStorage.removeItem('survey-sez-errors');
  }
}

export default ErrorHandler;