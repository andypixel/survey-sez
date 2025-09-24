import React from 'react';
import styles from './ErrorBoundary.module.scss';

/**
 * React Error Boundary component that catches JavaScript errors in component tree
 * Displays fallback UI instead of crashing the entire application
 * 
 * @class ErrorBoundary
 * @extends {React.Component}
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null 
    };
  }

  /**
   * Static method called when an error is thrown during rendering
   * @param {Error} error - The error that was thrown
   * @returns {Object} New state to trigger fallback UI
   */
  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  /**
   * Lifecycle method called when an error is caught
   * @param {Error} error - The error that was thrown
   * @param {Object} errorInfo - Object with componentStack key
   */
  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    this.logErrorToService(error, errorInfo);
  }

  /**
   * Log error details to external service or local storage
   * @param {Error} error - The error object
   * @param {Object} errorInfo - React error info with component stack
   */
  logErrorToService(error, errorInfo) {
    const errorData = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    // For now, just log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.group('🚨 Error Boundary Report');
      console.error('Error:', error);
      console.error('Error Info:', errorInfo);
      console.error('Full Report:', errorData);
      console.groupEnd();
    }

    // Could send to external service here
    // fetch('/api/errors', { method: 'POST', body: JSON.stringify(errorData) });
  }

  /**
   * Reset error boundary state to retry rendering
   * Clears error state and attempts to render children again
   */
  handleRetry = () => {
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null 
    });
  };

  render() {
    if (this.state.hasError) {
      // Custom error UI
      return (
        <div className={styles.errorContainer}>
          <h2 className={styles.errorTitle}>
            🚨 Something went wrong
          </h2>
          <p className={styles.errorMessage}>
            We're sorry, but something unexpected happened. 
            You can try refreshing the page or going back to the home screen.
          </p>
          
          <div className={styles.buttonContainer}>
            <button 
              onClick={this.handleRetry}
              className={styles.retryButton}
            >
              Try Again
            </button>
            <button 
              onClick={() => window.location.href = '/'}
              className={styles.homeButton}
            >
              Go Home
            </button>
          </div>

          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details className={styles.errorDetails}>
              <summary className={styles.errorDetailsSummary}>
                Error Details (Development Only)
              </summary>
              <pre className={styles.errorDetailsContent}>
                {this.state.error.toString()}
                {this.state.errorInfo.componentStack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;