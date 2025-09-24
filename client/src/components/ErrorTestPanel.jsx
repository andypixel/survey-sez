import React, { useState } from 'react';
import ErrorHandler from '../utils/ErrorHandler';

// Component that throws error during render
function ErrorThrowingComponent({ shouldThrow }) {
  if (shouldThrow) {
    throw new Error('Test Error Boundary - component render error');
  }
  return <div>No error</div>;
}

/**
 * Test panel for error handling - REMOVE IN PRODUCTION
 */
function ErrorTestPanel({ socket }) {
  const [shouldThrowError, setShouldThrowError] = useState(false);
  
  const testClientError = () => {
    // This will show React's error overlay in dev mode
    setTimeout(() => {
      throw new Error('Test client error - this should show React error overlay in dev mode');
    }, 0);
  };
  
  const testErrorBoundary = () => {
    // This will trigger the Error Boundary
    setShouldThrowError(true);
  };

  const testAsyncError = async () => {
    await ErrorHandler.withErrorHandling(
      async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        throw new Error('Test async client error');
      },
      'AsyncTest',
      (msg) => alert(msg)
    );
  };

  const testSocketErrors = () => {
    socket.emit('testSocketError', { test: 'data' });
  };

  const testValidationSocket = () => {
    socket.emit('testValidationError', 'invalid-data');
  };

  const testAsyncSocket = () => {
    socket.emit('testAsyncSocketError', { async: true });
  };

  const viewStoredErrors = () => {
    const errors = ErrorHandler.getStoredErrors();
    console.log('Stored errors:', errors);
    alert(`Found ${errors.length} stored errors. Check console for details.`);
  };

  const clearStoredErrors = () => {
    ErrorHandler.clearStoredErrors();
    alert('Stored errors cleared');
  };

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      background: '#f0f0f0',
      border: '1px solid #ccc',
      padding: '10px',
      borderRadius: '5px',
      fontSize: '12px',
      zIndex: 1000
    }}>
      <h4>🧪 Error Test Panel</h4>
      
      <div style={{ marginBottom: '10px' }}>
        <strong>Client Errors:</strong><br/>
        <button onClick={testErrorBoundary}>Error Boundary</button>
        <button onClick={testClientError}>Dev Overlay</button>
        <button onClick={testAsyncError}>Async Error</button>
      </div>
      
      {/* This will trigger Error Boundary when shouldThrowError is true */}
      <ErrorThrowingComponent shouldThrow={shouldThrowError} />

      <div style={{ marginBottom: '10px' }}>
        <strong>Socket Errors:</strong><br/>
        <button onClick={testSocketErrors}>Socket Error</button>
        <button onClick={testValidationSocket}>Validation</button>
        <button onClick={testAsyncSocket}>Async Socket</button>
      </div>

      <div style={{ marginBottom: '10px' }}>
        <strong>Server Tests:</strong><br/>
        <a href="http://localhost:3001/test/errors/validation" target="_blank">Validation</a> |{' '}
        <a href="http://localhost:3001/test/errors/game" target="_blank">Game</a> |{' '}
        <a href="http://localhost:3001/test/errors/storage" target="_blank">Storage</a><br/>
        <a href="http://localhost:3001/test/logging/all-levels" target="_blank">All Logs</a> |{' '}
        <a href="http://localhost:3001/test/async/failure" target="_blank">Async Fail</a>
      </div>

      <div>
        <strong>Debug:</strong><br/>
        <button onClick={viewStoredErrors}>View Errors</button>
        <button onClick={clearStoredErrors}>Clear</button>
      </div>
    </div>
  );
}

export default ErrorTestPanel;