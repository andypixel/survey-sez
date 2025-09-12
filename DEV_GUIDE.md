# Developer Quick Reference

*For basic setup, see [README.md](README.md)*

## Common Development Tasks

### Adding a New Socket Event

1. **Add to appropriate handler** (e.g., `server/handlers/GameHandler.js`):
```javascript
// In register() method:
socket.on('myNewEvent', (data) => {
  this.handleMyNewEvent(socket, io, userSession, getOrCreateRoom, debouncedSave, data);
});

// Add handler method:
static handleMyNewEvent(socket, io, userSession, getOrCreateRoom, debouncedSave, data) {
  // Handle event
  io.to(roomId).emit('responseEvent', result);
}
```

2. **Client workflow** (e.g., `GameplayWorkflow.js`):
```javascript
handleMyAction() {
  this.socket.emit('myNewEvent', { data });
}
```

3. **Component** uses workflow via context:
```javascript
// Import hook
import { useWorkflows } from '../contexts/WorkflowContext';

// In component
const { gameplay } = useWorkflows();

// Use workflow
onClick={() => gameplay.handleMyAction()}
```

### Adding New Game State

1. **Update GameRoom/GameplayManager** state structure
2. **Update getState()** method to include new property
3. **Client receives** via `gameState` event automatically
4. **Components access** via `gameState.newProperty`

### Debugging Checklist

- [ ] Check `/debug/state` for server state
- [ ] Check browser console for client logs
- [ ] Verify socket events in Network tab
- [ ] Test with multiple browser tabs
- [ ] Check `data/` files for persistence issues

### State Flow Patterns

**Optimistic Updates** (categories):
1. Component updates local state immediately
2. Send socket event to server
3. Server validates and broadcasts to others
4. If error, revert local state

**Server Authority** (game state):
1. Component sends action to server
2. Server processes and broadcasts new state
3. All clients (including sender) update from server

### File Locations for Common Changes

| Task | Files to Modify |
|------|----------------|
| Add UI component | `client/src/components/` |
| Add game logic | `server/GameRoom.js` |
| Add socket event | `server/handlers/` + workflow file |
| Add new page/phase | `client/src/pages/` + `App.jsx` routing |
| Change data structure | `server/storage/` + update getState() |
| Modify game rules | `server/config/GameRules.js` |
| Modify scoring logic | `server/GameRoom.js` GameplayManager class |

### Testing Multiplayer

1. Open 3+ browser tabs to same room
2. Create 2 teams with multiple players each
3. Test all user roles: announcer, guesser, spectator
4. Test reconnection by refreshing tabs
5. Check that state syncs correctly across all tabs

### Data Storage

#### Development Environment
- **Storage**: JSON files in `data/` directory (git-ignored)
- **Categories**: 3 basic universal categories for testing
- **Initialization**: `npm run init-data` creates default files
- **Reset**: `npm run reset-data` clears and reinitializes

#### Production Environment  
- **Storage**: Redis key-value database (Railway-managed)
- **Categories**: 70 universal categories pre-loaded
- **Persistence**: All data persists across deployments
- **Keys Structure**:
  - `categories` - All category data (JSON string)
  - `room:{roomId}` - Individual room state (JSON string)
  - `user:{userId}` - User session data (JSON string)

#### Data Scoping
- **Global**: Universal categories, used category tracking
- **Room-scoped**: Game state, teams, players, room settings
- **User-scoped**: Custom categories, session data

#### Storage Classes
- `JsonFileStorage` - Development file-based storage
- `RedisStorage` - Production Redis-based storage
- Auto-selected based on `NODE_ENV` environment variable

### Game Configuration

Modify game rules in `server/config/GameRules.js`:
```javascript
const GAME_RULES = {
  MAX_TEAMS: 2,              // Maximum teams per room
  DEFAULT_TIME_LIMIT: 30,    // Default turn time in seconds
  DEFAULT_ROUNDS: 3,         // Default number of rounds
  VALIDATION: {
    MAX_CATEGORY_NAME_LENGTH: 50  // Category name limits
  }
};
```

### Performance Notes

#### Current Limitations
- Room iteration doesn't scale beyond ~100 concurrent rooms
- In-memory room objects (consider Redis for room state too)
- Debounced saves prevent excessive database writes (5 second delay)
- Periodic saves every 30 seconds as backup

#### Optimizations
- Socket rooms used for efficient broadcasting
- User data persists across reconnections (stored by user ID, not socket ID)
- Redis connection pooling and error handling
- Automatic cleanup of disconnected sessions

#### Production Scaling Considerations
- **Current**: Single Railway instance with Redis
- **Next**: Multiple app instances sharing Redis state
- **Future**: Separate Redis instances for different data types
- **Monitoring**: Use Railway metrics and Redis monitoring