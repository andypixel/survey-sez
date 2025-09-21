# Survey-Sez

A real-time multiplayer word-guessing game where teams compete in turn-based rounds. Players create custom categories and take turns being the "Announcer" who reveals category items while their team guesses.

## Features
- Real-time multiplayer gameplay with WebSocket connections
- Turn-based team competition with rotating announcers (minimum 2 players per team)
- Custom category creation with numbered entry input (1-10 entries, unique names per room)
- Player readiness system - coordinate when all players are done creating categories
- Unique player and team names within each room
- Category usage tracking - used categories persist across games within a room
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

**Onboarding Phase**: Players join teams (max 2), create custom categories, and indicate readiness  
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
- **Backend**: Node.js 20.x, Express, Socket.IO
- **Frontend**: React, Socket.IO client, SCSS modules  
- **Database**: Redis (production), JSON files (development)
- **Real-time**: WebSocket connections for instant multiplayer updates
- **Hosting**: Railway with automatic GitHub CI/CD
- **Build**: Automatic React build and Node.js deployment

## Production Deployment

### Current Production Setup
- **Hosting**: Railway (railway.app)
- **Database**: Redis (Railway-managed)
- **CI/CD**: Automatic deployment from GitHub main branch
- **Environment**: Node.js 20.x with npm 9.x

### Initial Deployment Steps

1. **Create Railway Project**:
   - Go to [railway.app](https://railway.app) and sign up with GitHub
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your survey-sez repository
   - Wait for initial deployment

2. **Add Redis Database**:
   - In Railway project → "New" → "Database" → "Redis"
   - Railway automatically provides `REDIS_URL` environment variable

3. **Set Environment Variables**:
   - Go to app service → Variables tab
   - Add: `NODE_ENV=production`
   - Verify `REDIS_URL` is automatically set

4. **Generate Domain**:
   - App service → Settings → Networking → "Generate Domain"
   - Your app will be available at `your-app-name.railway.app`

### Automatic CI/CD
- **Trigger**: Any push to `main` branch
- **Build Process**: 
  1. Railway detects Node.js project
  2. Runs `npm ci` to install dependencies
  3. Runs `npm run build` (builds React frontend)
  4. Starts with `npm start`
- **Build Time**: ~2-3 minutes
- **Zero Configuration**: Uses `railway.json` for deployment settings

### Production Architecture
```
GitHub (main branch)
    ↓ (automatic)
Railway Build System
    ↓
Node.js App Server ←→ Redis Database
    ↓
Public Domain (railway.app)
```

### Data Storage
- **Development**: JSON files in `data/` directory (git-ignored)
- **Production**: Redis key-value store
- **Categories**: 70 universal categories pre-loaded
- **Persistence**: All game state, rooms, and user sessions stored in Redis

### Monitoring & Debugging
- **Logs**: Railway dashboard → Deployments → View Logs
- **Admin Panel**: `your-app.railway.app/admin`
- **Debug Endpoints**:
  - `/debug/state` - Raw application state (JSON)
  - `/debug/pretty` - Human-readable state (HTML)
  - `/debug/redis-safe` - Database overview (no spoilers)
  - `/debug/redis` - Full database contents (spoilers!)

### Environment Differences
| Feature | Development | Production |
|---------|-------------|------------|
| Storage | JSON files | Redis |
| Categories | 3 basic | 70 universal |
| CORS | localhost:3000 | Disabled |
| Debug | All endpoints | Production only |
| Build | Dev server | Static files |

### Deployment Troubleshooting
- **Build Fails**: Check Railway logs for npm/build errors
- **App Won't Start**: Verify `NODE_ENV=production` is set
- **Redis Errors**: Ensure Redis service is running and `REDIS_URL` is set
- **404 Errors**: Check that React build completed successfully

### Alternative Deployment (Heroku)
For Heroku deployment (legacy support):
```bash
heroku create your-app-name
heroku addons:create heroku-redis:mini
git push heroku main
```