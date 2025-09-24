# Testing & Cleanup Guide

## ⚠️ Temporary Testing Files - REMOVE BEFORE PRODUCTION

The error handling system includes temporary testing tools that **MUST BE REMOVED** before deploying to production.

### Files to Remove

```bash
# 1. Remove test files
rm server/test-errors.js
rm client/src/components/ErrorTestPanel.jsx

# 2. Remove CSS module (if no other components use it)
rm client/src/components/ErrorTestPanel.module.scss  # (doesn't exist yet)
```

### Code to Remove

#### server.js
Remove these lines:
```javascript
// REMOVE: Test imports
const { addTestErrorEndpoints, addTestSocketEvents } = require('./server/test-errors');

// REMOVE: Test endpoints registration
if (process.env.NODE_ENV !== 'production') {
  addTestErrorEndpoints(app);
}

// REMOVE: Test socket events registration  
if (process.env.NODE_ENV !== 'production') {
  addTestSocketEvents(io);
}
```

#### client/src/App.jsx
Remove these lines:
```javascript
// REMOVE: Test panel import
import ErrorTestPanel from './components/ErrorTestPanel.jsx';

// REMOVE: Test panel in render
{process.env.NODE_ENV === 'development' && <ErrorTestPanel socket={socket} />}
```

#### server/handlers/CategoryHandler.js
Remove test error triggers:
```javascript
// REMOVE: Test error triggers in handleAddCategory
if (data.name === 'FORCE_STORAGE_ERROR') {
  throw new StorageError('Forced storage error for testing', 'testOperation', { test: true });
}
if (data.name === 'FORCE_ROOM_ERROR') {
  throw new RoomError('Forced room error for testing', 'test-room', { test: true });
}
if (data.name === 'FORCE_GENERIC_ERROR') {
  throw new Error('Forced generic error for testing');
}
```

### Verification Checklist

After removing test files, verify:

- [ ] **Server starts** without errors
- [ ] **Client builds** without import errors  
- [ ] **No test endpoints** accessible (404 on `/test/*`)
- [ ] **Error handling still works** for real errors
- [ ] **No test panel** visible in UI
- [ ] **Category form works** normally (no test triggers)

## Testing Error Handling (Production-Safe)

### Manual Testing Methods

**1. Network Disconnection**
- Disconnect internet while using app
- Verify graceful handling and reconnection

**2. Invalid Form Data**
- Submit empty category names
- Submit categories with no entries
- Verify validation errors appear

**3. Browser Developer Tools**
- Simulate network failures
- Check console for proper error logging
- Verify localStorage error storage

**4. Server Restart**
- Restart server while clients connected
- Verify reconnection and state sync

### Monitoring in Production

**1. Log Files**
```bash
# View recent errors
tail -f logs/error-$(date +%Y-%m-%d).log

# View all logs
tail -f logs/combined-$(date +%Y-%m-%d).log
```

**2. Debug Endpoints** (Production-Safe)
- `/debug/errors` - Recent error logs
- `/debug/state` - Application state
- `/admin` - Admin panel

**3. Client-Side Debugging**
```javascript
// In browser console
ErrorHandler.getStoredErrors()  // View client errors
localStorage.getItem('survey-sez-errors')  // Raw error data
```

## Error Handling Validation

### Test Scenarios

**1. Socket Errors**
- Invalid socket event data
- Server-side validation failures
- Network interruptions during events

**2. HTTP Errors**  
- Invalid API requests
- Server errors during HTTP calls
- Timeout scenarios

**3. Client Errors**
- Component rendering errors
- Async operation failures
- Invalid state transitions

**4. Storage Errors**
- Database connection failures
- File system errors (development)
- Data corruption scenarios

### Expected Behaviors

**Client-Side:**
- Error messages appear in UI
- App doesn't crash or show white screen
- Users can recover with "Try Again" or navigation
- Errors stored in localStorage for debugging

**Server-Side:**
- Structured logs with full context
- Errors don't crash server
- Proper HTTP status codes returned
- Socket errors sent to appropriate clients

**Production:**
- Log files created and rotated
- No sensitive data in client error messages
- Performance metrics logged
- Graceful degradation when possible

## Performance Impact

### Development vs Production

**Development:**
- More verbose logging (debug level)
- Console output with colors
- Additional error context
- Test endpoints available

**Production:**
- Optimized logging (info level and above)
- File-based logging with rotation
- Minimal error context to clients
- No test endpoints

### Monitoring Overhead

**Minimal Impact:**
- Structured logging: ~1-2ms per log entry
- Error handling: ~0.5ms per wrapped operation
- File rotation: Handled by Winston automatically
- Memory usage: <10MB for log buffers

**Optimization Tips:**
- Use appropriate log levels
- Avoid logging in tight loops
- Let Winston handle file rotation
- Monitor log file sizes in production

## Troubleshooting

### Common Issues After Cleanup

**1. Import Errors**
```
Module not found: Can't resolve './components/ErrorTestPanel.jsx'
```
**Fix:** Remove import statement from App.jsx

**2. Server Start Errors**
```
Cannot find module './server/test-errors'
```
**Fix:** Remove require statement from server.js

**3. Missing Error Handling**
```
Errors not appearing in UI after cleanup
```
**Fix:** Verify ErrorBoundary and socket error listeners still in place

**4. Log Files Not Created**
```
No logs directory in production
```
**Fix:** Ensure NODE_ENV=production and check file permissions

### Debug Commands

```bash
# Check for remaining test code
grep -r "test-errors" server/
grep -r "ErrorTestPanel" client/src/
grep -r "FORCE_.*_ERROR" server/

# Verify error handling works
curl http://localhost:3001/debug/errors
curl http://localhost:3001/admin

# Check log files
ls -la logs/
tail logs/error-*.log
```

This cleanup process ensures the error handling system remains robust while removing all testing artifacts before production deployment.