#!/bin/bash

# Kill any existing server processes
echo "Killing existing server processes..."

# Kill by process name
pkill -f "node.*server.js" 2>/dev/null || true
pkill -f "nodemon.*server.js" 2>/dev/null || true

# Kill by port
lsof -ti:3001 | xargs kill -9 2>/dev/null || true
lsof -ti:3000 | xargs kill -9 2>/dev/null || true

# Wait a moment for processes to die
sleep 2

echo "Server processes killed."