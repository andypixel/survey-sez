# Survey-Sez Architecture Overview

*This document provides technical details about the system design. For getting started, see [README.md](README.md). For development tasks, see [DEV_GUIDE.md](DEV_GUIDE.md).*

## High-Level Architecture

```
┌─────────────────┐    WebSocket    ┌─────────────────┐    JSON Files
│   React Client  │ ◄──────────────► │   Node.js       │ ◄─────────────►
│   (Port 3000)   │                 │   Server        │    data/
│                 │                 │   (Port 3001)   │
└─────────────────┘                 └─────────────────┘
```

## Client Architecture (React)

### File Structure
```
client/src/
├── components/          # Reusable UI components
│   ├── CategoriesDisplay.jsx    # Shows user's custom categories + add form
│   ├── CategoryItems.jsx        # Displays category entries with toggle pills for announcer
│   ├── GameHeader.jsx           # Reusable header with game name, room, and player count
│   ├── GameInfo.jsx             # Shows current game status and round information
│   ├── GameplayView.jsx         # Main gameplay interface (announcer/guesser/spectator views)
│   ├── TeamGuesses.jsx          # Displays team guesses with player attribution
│   ├── TeamsDisplay.jsx         # Shows teams and players with visual states
│   ├── Timer.jsx                # Game timer with color-coded states
│   └── RoomSummary.jsx          # Shows room overview with teams, scores, and player tiles
├── contexts/            # React Context providers
│   └── WorkflowContext.jsx      # Provides workflow instances to components
├── pages/               # Full-page components
│   ├── GameRoom.jsx             # Main game room (onboarding + gameplay + game over)
│   ├── RoomJoin.jsx             # Room entry form
│   └── UserSetup.jsx            # Name + team selection
├── styles/              # Global styling
│   └── colors.scss              # Centralized color system with semantic variables
├── workflows/           # Business logic classes
│   ├── GameplayWorkflow.js      # Handles game actions (categories, turns)
│   ├── RoomJoinWorkflow.js      # Handles room joining
│   └── UserSetupWorkflow.js     # Handles user setup
├── utils/
│   ├── ErrorHandler.js          # Error handling utilities
│   └── storage.js               # localStorage utilities
└── App.jsx              # Main app component, socket setup
```

### Key Concepts

**Workflows**: Business logic classes that handle socket events and state updates
- Each workflow manages a specific phase of the app
- They receive socket instance, callbacks, and storage utilities
- Provided to components via React Context (WorkflowProvider/useWorkflows)

**State Flow**: 
1. User action → Component calls workflow method
2. Workflow emits socket event to server
3. Server processes and broadcasts updated state
4. Client receives `gameState` event and updates React state

## Server Architecture (Node.js + Socket.IO)

### File Structure
```
server/
├── config/              # Game configuration
│   └── GameRules.js         # Centralized game rules and validation
├── handlers/            # Socket event handlers
│   ├── GameHandler.js       # Game start, begin turn events
│   ├── CategoryHandler.js   # Add category events
│   └── RoomHandler.js       # Join room, user setup events
├── GameRoom.js          # Room management + GameplayManager
├── UserSession.js       # User session tracking
└── storage/
    └── JsonFileStorage.js    # File-based persistence
server.js                # Main server, handler registration
data/                    # JSON data files (git-ignored)
├── categories.json      # Universal + custom categories
├── rooms.json           # Room states
└── users.json           # User sessions
```

### Key Classes

**GameRoom**: Manages room state, players, teams, game lifecycle
- `gameState`: 'ONBOARDING' | 'GAMEPLAY' | 'SUMMARY'
- `connectedSockets`: Maps socket IDs to user IDs (temporary connections)
- `players`: User data keyed by user ID (persistent across reconnections)
- `teams`: Stores persistent player data including names for offline display
- `currentGame`: GameplayManager instance during gameplay
- `categories`: { universal: [], userCustom: {} }

**GameplayManager**: Handles turn-based gameplay logic
- `currentTurn`: Which turn we're on (alternates teams)
- `currentAnnouncer`: Socket ID of current announcer
- `selectedCategory`: Category chosen for announcer to see
- `currentCategory`: Category being played (after "Begin Turn")

**UserSession**: Tracks user data across reconnections
- Maps socket IDs to persistent user IDs
- Stores user data per room

## Data Flow Examples

### Adding a Custom Category
1. User fills form in `CategoriesDisplay`
2. Form calls `gameplayWorkflow.handleAddCategory()`
3. Workflow emits `addCategory` event
4. Server validates, saves to storage, updates room state
5. Server emits `categoryAdded` to other players
6. All clients update their category lists

### Starting a Turn (Announcer)
1. `GameplayManager.initializeFirstTurn()` selects category for announcer
2. Announcer sees category name + "Begin Turn" button
3. Announcer clicks → `gameplayWorkflow.handleBeginTurn()`
4. Server validates announcer, calls `currentGame.beginTurn()`
5. Server broadcasts updated `gameState` with `currentCategory` set
6. All players see the active turn interface

## State Structure

### Client GameState
```javascript
{
  roomId: string,
  players: { [socketId]: { id, userId, name, team } }, // Client format (converted from userId-keyed data)
  teams: { [teamName]: { name, players: [{ userId, name }] } }, // Stores persistent player data
  gameState: 'ONBOARDING' | 'GAMEPLAY' | 'SUMMARY',
  gameSettings: { timeLimit: number, turnsPerTeam: number },
  categories: {
    universal: [{ id, name, entries }],
    userCustom: { 
      "[roomId]-[userId]": [{ id, name, entries, createdBy }] 
    }
  },
  currentGame: {
    currentTurn: number,
    currentGuessingTeam: string,
    currentAnnouncer: socketId,
    selectedCategory: category,    // For announcer preview
    currentCategory: category,     // Active turn category
    responses: [{ text, userId }],
    isComplete: boolean
  }
}
```

### Storage Keys
- **Categories**: `[roomId]-[userId]` for user-scoped custom categories
- **LocalStorage**: `survey-sez-user-[roomId]` for user data per room
- **Global User ID**: `survey-sez-global-user-id` for persistent identity

## Socket Events

### Client → Server
- `joinRoom(roomId)` - Join/create room
- `userSetup({ playerName, team, userId })` - Complete user setup
- `startGame({ timeLimit, rounds })` - Start gameplay phase
- `addCategory({ name, entries })` - Add custom category
- `beginTurn()` - Announcer starts turn

### Server → Client
- `roomSetup({ roomId, existingTeams, canCreateTeam })` - Room info for setup
- `gameState(fullState)` - Complete game state update
- `categoryAdded({ userKey, category })` - New category from other user
- `categoryError({ message })` - Category validation error
- `setupError({ message })` - Setup validation error
- `gameError({ message })` - Game action error

## Development Patterns

### Adding New Features
1. Update state structure in `GameRoom.js` if needed
2. Add socket event handler in `server.js`
3. Add workflow method for client-side logic
4. Update UI components to use new state/methods
5. Test with multiple browser tabs

### Debugging
- `/debug/state` endpoint shows all server state
- Console logs in workflows show client-side flow
- Socket events logged on both client and server

### Common Gotchas
- **User IDs vs Socket IDs**: Server stores players by user ID (persistent), converts to socket ID format for client compatibility
- **Reconnection handling**: `connectedSockets` maps current socket → user ID, player data survives disconnection
- **State sync**: Server is source of truth, client does optimistic updates
- **Team membership**: Stores user IDs with persistent names for offline display
- **Offline players**: Names persist in team data even when disconnected
- **Category scoping**: Custom categories are user-scoped, not team-scoped
- **Workflow access**: Use `useWorkflows()` hook within WorkflowProvider, not global window access