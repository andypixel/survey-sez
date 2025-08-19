# Real-time Game Prototype

A minimal multiplayer game prototype using Node.js, React, and Socket.IO.

## Features
- Real-time multiplayer interaction
- Shared game state across all clients
- Click-to-move player system
- Global score counter
- Instant updates via WebSocket

## Local Development

1. Install backend dependencies:
```bash
npm install
```

2. Install frontend dependencies:
```bash
cd client && npm install
```

3. Start the backend server (automatically initializes data files):
```bash
npm run dev
```

4. In another terminal, start the React frontend:
```bash
cd client && npm start
```

5. Open multiple browser tabs to `http://localhost:3000` to test multiplayer

### Data Management
- Development data is stored in `data/` directory (not committed to git)
- Run `npm run init-data` to create initial data files
- Run `npm run reset-data` to clear and reinitialize data files

## Heroku Deployment

1. Create a Heroku app:
```bash
heroku create your-game-name
```

2. Deploy:
```bash
git add .
git commit -m "Initial commit"
git push heroku main
```

The app will automatically build the React frontend and serve it from the Node.js backend.

## Architecture
- **Backend**: Express.js server with Socket.IO for WebSocket connections
- **Frontend**: React app with Socket.IO client
- **State**: In-memory storage (easily replaceable with Redis/MongoDB)
- **Deployment**: Heroku with automatic GitHub integration