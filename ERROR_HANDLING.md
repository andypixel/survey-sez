# Error Handling System

A comprehensive Winston-based error handling system for Survey-Sez with structured logging, custom error types, and graceful error recovery.

## Overview

The error handling system provides:
- **Structured logging** with Winston (console + file rotation)
- **Custom error classes** with context and metadata
- **React Error Boundary** for component error recovery
- **Socket error handling** with proper client feedback
- **HTTP error middleware** for Express endpoints
- **Performance monitoring** and async error wrapping

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client Errors │    │  Server Errors  │    │   Log Storage   │
│                 │    │                 │    │                 │
│ • Error Boundary│    │ • Custom Errors │    │ • Console (dev) │
│ • Socket Events │───▶│ • ErrorHandler  │───▶│ • Files (prod)  │
│ • localStorage  │    │ • Winston Logger│    │ • Rotation      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Server-Side Usage

### Custom Error Classes

```javascript
const { ValidationError, GameError, StorageError } = require('./utils/CustomErrors');

// Validation errors (400 status)
throw new ValidationError('Invalid category name', 'categoryName', userInput, { userId, roomId });

// Game logic errors (400 status)  
throw new GameError('Game not started', 'ONBOARDING', { roomId, action: 'beginTurn' });

// Storage errors (500 status)
throw new StorageError('Failed to save data', 'saveCategories', { categoryCount: 5 });
```

### Logging System

```javascript
const Logger = require('./utils/Logger');

// Basic logging with context
Logger.error('Operation failed', error, { userId, operation: 'saveData' });
Logger.warn('Validation warning', { field: 'email', value: 'invalid@' });
Logger.info('User action', { action: 'login', userId });
Logger.debug('Debug info', { step: 'validation', data });

// Specialized logging methods
Logger.userEvent('CONNECTED', socketId, roomId, { userAgent });
Logger.gameEvent('GAME_STARTED', roomId, { playerCount: 4 });
Logger.performance('saveCategories', 150, { categoryCount: 10 });
Logger.validationError('email', 'invalid@email', 'Invalid format', { userId });
```

### Socket Error Handling

```javascript
const ErrorHandler = require('./utils/ErrorHandler');

// Wrap socket handlers (recommended pattern)
socket.on('addCategory', async (data) => {
  try {
    await CategoryHandler.handleAddCategory(socket, io, userSession, data);
  } catch (error) {
    ErrorHandler.handleSocketError(socket, 'addCategory', error, { userId, roomId });
  }
});

// Performance monitoring
const saveData = ErrorHandler.withPerformanceLogging('saveUserData', async () => {
  return await storage.saveUser(userId, userData);
});
```

### HTTP Error Middleware

```javascript
// Add to Express app (already configured in server.js)
app.use(ErrorHandler.expressErrorHandler);

// Async route error handling
app.get('/api/data', async (req, res, next) => {
  try {
    const data = await getData();
    res.json(data);
  } catch (error) {
    next(error); // Passes to error middleware
  }
});
```

## Client-Side Usage

### Error Boundary

```jsx
// Wrap components that might throw errors
<ErrorBoundary>
  <GameRoom />
</ErrorBoundary>

// Multiple boundaries for complex apps
<ErrorBoundary fallback={<HeaderError />}>
  <Header />
</ErrorBoundary>
<ErrorBoundary fallback={<MainError />}>
  <MainContent />
</ErrorBoundary>
```

### Error Handler Utility

```javascript
import ErrorHandler from './utils/ErrorHandler';

// Handle async operations
const handleSubmit = async () => {
  await ErrorHandler.withErrorHandling(
    async () => {
      const result = await api.submitData(formData);
      return result;
    },
    'FormSubmission',
    setErrorMessage
  );
};

// Manual error handling
try {
  await riskyOperation();
} catch (error) {
  ErrorHandler.handle(error, 'RiskyOperation', setErrorMessage);
}

// View stored errors (debugging)
const errors = ErrorHandler.getStoredErrors();
console.log('Recent errors:', errors);
```

### Socket Error Events

```javascript
// Listen for server error events (already configured in App.jsx)
socket.on('categoryError', (error) => {
  ErrorHandler.handleSocketError(error, 'Category', setCategoryError);
});

socket.on('gameError', (error) => {
  ErrorHandler.handleSocketError(error, 'Game', (msg) => alert(msg));
});
```

## Log Files & Monitoring

### Development
- **Console output** with colors and timestamps
- **Debug level** logging (all messages)
- **No file output** (logs to terminal only)

### Production
- **File rotation** with daily logs
- **Error logs**: `logs/error-YYYY-MM-DD.log` (14 days retention)
- **Combined logs**: `logs/combined-YYYY-MM-DD.log` (7 days retention)
- **Info level** logging (no debug messages)

### Debug Endpoints
- **`/debug/errors`** - View recent error logs
- **`/debug/state`** - Raw application state
- **`/admin`** - Admin panel with error log access

## Testing & Temporary Tools

### ⚠️ REMOVE BEFORE PRODUCTION

The following files are for testing only and should be removed:

```bash
# Remove these files when error handling is validated:
rm server/test-errors.js
rm client/src/components/ErrorTestPanel.jsx

# Remove test imports from:
# - server.js (lines with test-errors)
# - client/src/App.jsx (ErrorTestPanel import and usage)
```

### Test Panel Usage

**Client Tests** (Error Test Panel):
- **Error Boundary** - Test React error boundary
- **Async Error** - Test async error handling
- **Socket Error** - Test socket error handling
- **View/Clear Errors** - Debug localStorage errors

**Server Tests** (Links in panel):
- **Validation/Game/Storage** - Test HTTP error types
- **All Logs** - Test logging levels
- **Async Fail** - Test async HTTP errors

**Category Form Tests**:
- **"FORCE_STORAGE_ERROR"** - Trigger StorageError
- **"FORCE_ROOM_ERROR"** - Trigger RoomError  
- **"FORCE_GENERIC_ERROR"** - Trigger generic Error
- **Empty category** - Trigger ValidationError

## Extension Guidelines

### Adding New Error Types

```javascript
// 1. Add to CustomErrors.js
class PaymentError extends BaseError {
  constructor(message, transactionId, context = {}) {
    super(message, 'PAYMENT_ERROR', 402, { transactionId, ...context });
  }
}

// 2. Add error code
const ERROR_CODES = {
  // ... existing codes
  PAYMENT_FAILED: 'PAYMENT_FAILED'
};

// 3. Update ErrorHandler.getErrorEventType() if needed
case 'processPayment':
  return 'paymentError';
```

### Adding New Socket Events

```javascript
// 1. Add socket handler with error wrapping
socket.on('newEvent', async (data) => {
  try {
    await Handler.handleNewEvent(socket, io, data);
  } catch (error) {
    ErrorHandler.handleSocketError(socket, 'newEvent', error, { data });
  }
});

// 2. Add client listener
socket.on('newEventError', (error) => {
  ErrorHandler.handleSocketError(error, 'NewEvent', setErrorState);
});
```

### Adding Specialized Logging

```javascript
// Add to Logger class
static paymentEvent(action, transactionId, amount, context = {}) {
  this.info(`Payment ${action}`, {
    type: 'PAYMENT_EVENT',
    action,
    transactionId,
    amount,
    ...context
  });
}
```

### External Logging Services

```javascript
// Replace ErrorHandler.reportError() method
static reportError(errorData) {
  // Send to external service
  if (process.env.NODE_ENV === 'production') {
    fetch('/api/external-logging', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(errorData)
    });
  }
  
  // Keep localStorage for debugging
  try {
    const errors = JSON.parse(localStorage.getItem('survey-sez-errors') || '[]');
    errors.push(errorData);
    if (errors.length > 50) errors.splice(0, errors.length - 50);
    localStorage.setItem('survey-sez-errors', JSON.stringify(errors));
  } catch (e) {
    // Ignore localStorage errors
  }
}
```

## Best Practices

### Error Context
Always provide relevant context:
```javascript
// ❌ Poor context
throw new ValidationError('Invalid input');

// ✅ Rich context  
throw new ValidationError('Category name too long', 'categoryName', userInput, {
  userId, roomId, maxLength: 50, actualLength: userInput.length
});
```

### Error Recovery
Provide actionable error messages:
```javascript
// ❌ Generic message
throw new GameError('Cannot start game');

// ✅ Actionable message
throw new GameError('Cannot start game: need at least 2 players per team', gameState, {
  currentPlayers: { team1: 1, team2: 3 },
  required: { minPerTeam: 2 }
});
```

### Performance Monitoring
Wrap expensive operations:
```javascript
const result = await ErrorHandler.withPerformanceLogging('complexOperation', async () => {
  // Expensive operation here
  return await processLargeDataset(data);
});
```

### Graceful Degradation
Handle errors without breaking user experience:
```javascript
try {
  await saveToCloud(data);
} catch (error) {
  Logger.warn('Cloud save failed, using local storage', error);
  await saveToLocal(data);
}
```

This error handling system provides production-ready error management with comprehensive logging, structured error types, and graceful recovery mechanisms.