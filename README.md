# Survey-Sez

A real-time multiplayer word-guessing game where teams compete in turn-based rounds. Players create custom categories and take turns being the "Announcer" who reveals category items while their team guesses.

## Features
- Real-time multiplayer gameplay with WebSocket connections
- Turn-based team competition with rotating announcers (minimum 2 players per team)
- Custom category creation with validation (1-10 entries, unique names per room)
- Unique player and team names within each room
- Emergency reset functionality preserving used categories
- Three-phase game lifecycle: Onboarding → Gameplay → Summary
- Persistent user sessions across reconnections
- Synchronized timer system preventing desync issues

## Quick Start

```bash
# Install dependencies (both backend and frontend)
npm install && cd client && npm install && cd ..

# Start both servers with one command
npm run dev-all
```

Open multiple browser tabs to `http://localhost:3000` to test multiplayer.

## Game Overview

**Onboarding Phase**: Players join teams (max 2) and create custom categories  
**Gameplay Phase**: Teams alternate turns with rotating announcers revealing category items  
**Summary Phase**: Review all played categories and responses  

See [GAME_LIFECYCLE.md](GAME_LIFECYCLE.md) for detailed game rules.

## Development

### Commands
- `npm run dev-all` - Start both backend and frontend
- `npm run dev` - Backend only (port 3001)
- `npm run reset-data` - Clear and reinitialize data files
- `npm run init-data` - Create initial data files

### Debugging
- Visit `http://localhost:3001/debug/state` to view server state
- Check browser console for client-side logs
- Server logs show socket events and errors

### Documentation
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - System design, data flow, file structure
- **[DEV_GUIDE.md](DEV_GUIDE.md)** - Common development tasks and patterns
- **[GAME_LIFECYCLE.md](GAME_LIFECYCLE.md)** - Complete game rules and phases

## Tech Stack
- **Backend**: Node.js, Express, Socket.IO, JSON file storage
- **Frontend**: React, Socket.IO client, SCSS modules
- **Real-time**: WebSocket connections for instant multiplayer updates
- **Deployment**: Heroku-ready with automatic frontend build

## Deployment

```bash
heroku create your-app-name
git push heroku main
```

The app automatically builds the React frontend and serves it from the Node.js backend.