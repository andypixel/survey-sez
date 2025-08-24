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

### Testing Multiplayer

1. Open 3+ browser tabs to same room
2. Create 2 teams with multiple players each
3. Test all user roles: announcer, guesser, spectator
4. Test reconnection by refreshing tabs
5. Check that state syncs correctly across all tabs

### Data Storage

- **Development**: JSON files in `data/` (git-ignored)
- **Categories**: Global universal + user-scoped custom
- **Rooms**: Full room state including teams and game progress
- **Users**: Session data for reconnection handling

### Performance Notes

- Room iteration doesn't scale (see TODOs in server.js)
- In-memory storage - replace with Redis for production
- Debounced saves prevent excessive file writes
- Socket rooms used for efficient broadcasting
- User data persists across reconnections (stored by user ID, not socket ID)