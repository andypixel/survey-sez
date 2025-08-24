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
    
    // Always log for debugging
    console.error(`[${context}]`, error);
    
    // Set error state for UI display
    if (setErrorState) {
      setErrorState(message);
      // Auto-clear after 5 seconds
      setTimeout(() => setErrorState(''), 5000);
    }
  }

  /**
   * Handle socket errors specifically
   * @param {Object} errorData - Error data from socket event
   * @param {string} context - Context where error occurred
   * @param {Function} setErrorState - React state setter
   */
  static handleSocketError(errorData, context, setErrorState) {
    this.handle(errorData.message || 'Unknown socket error', context, setErrorState);
  }

  /**
   * Handle validation errors
   * @param {string} message - Validation error message
   * @param {Function} setErrorState - React state setter
   */
  static handleValidation(message, setErrorState) {
    this.handle(message, 'Validation', setErrorState);
  }
}

export default ErrorHandler;