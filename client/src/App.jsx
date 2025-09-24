import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import RoomJoin from './pages/RoomJoin.jsx';
import UserSetup from './pages/UserSetup.jsx';
import GameRoom from './pages/GameRoom.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import ErrorTestPanel from './components/ErrorTestPanel.jsx';
import RoomJoinWorkflow from './workflows/RoomJoinWorkflow';
import UserSetupWorkflow from './workflows/UserSetupWorkflow';
import GameplayWorkflow from './workflows/GameplayWorkflow';
import { getGlobalUserId, getUserName, saveUserName, getUserData, saveUserData } from './utils/storage';
import ErrorHandler from './utils/ErrorHandler';
import { WorkflowProvider } from './contexts/WorkflowContext';

const socket = io(process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3001');

function App() {
  const [gameState, setGameState] = useState({ players: {}, teams: {}, categories: { universal: [], userCustom: {} } });
  const [myId, setMyId] = useState('');
  const [myUserId, setMyUserId] = useState('');
  const [roomId, setRoomId] = useState('');
  const [isInRoom, setIsInRoom] = useState(false);
  const [categoryError, setCategoryError] = useState('');
  const [showUserSetup, setShowUserSetup] = useState(false);
  const [roomSetupData, setRoomSetupData] = useState(null);
  const [setupError, setSetupError] = useState('');

  // Storage utilities for localStorage operations
  const storage = { getUserName, saveUserName, getUserData, saveUserData };
  
  // Initialize workflow classes once
  const [workflows] = useState(() => {
    const roomJoinWorkflow = new RoomJoinWorkflow(socket, {}, storage);
    const userSetupWorkflow = new UserSetupWorkflow(socket, {}, storage);
    const gameplayWorkflow = new GameplayWorkflow(socket, {}, storage);
    
    return {
      roomJoin: roomJoinWorkflow,
      userSetup: userSetupWorkflow,
      gameplay: gameplayWorkflow
    };
  });
  
  // Update workflow callbacks on every render (they always have current state)
  workflows.roomJoin.callbacks = {
    setRoomId, setIsInRoom, setGameState, setShowUserSetup, setRoomSetupData,
    setSetupError, setCategoryError, getMyId: () => myId, getMyUserId: () => myUserId,
    getRoomId: () => roomId, getGameState: () => gameState
  };
  workflows.userSetup.callbacks = workflows.roomJoin.callbacks;
  workflows.gameplay.callbacks = workflows.roomJoin.callbacks;

  useEffect(() => {
    setMyUserId(getGlobalUserId());
    const room = workflows.roomJoin.initializeFromUrl();
    if (room) setRoomId(room);
  }, []);

  useEffect(() => {
    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
      setMyId(socket.id);
      if (roomId) {
        socket.emit('joinRoom', roomId);
      }
    });
    
    socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });
    
    socket.on('reconnect', () => {
      console.log('Socket reconnected, syncing with server...');
      if (roomId) {
        socket.emit('joinRoom', roomId);
      }
    });

    socket.on('roomSetup', (data) => workflows.userSetup.handleRoomSetup(data));
    socket.on('gameState', (state) => {
      console.log('Received gameState from server:', state.gameState, state.roomId);
      workflows.gameplay.handleGameState(state);
    });
    socket.on('categoryAdded', (data) => workflows.gameplay.handleCategoryAdded(data));
    socket.on('categorySuccess', () => workflows.gameplay.handleCategorySuccess());
    socket.on('roomSetup', (data) => {
      if (showUserSetup) {
        workflows.userSetup.handleRoomSetupUpdate(data);
      } else {
        workflows.userSetup.handleRoomSetup(data);
      }
    });
    
    socket.on('categoryError', (error) => {
      ErrorHandler.handleSocketError(error, 'Category', setCategoryError);
    });
    
    socket.on('setupError', (error) => {
      ErrorHandler.handleSocketError(error, 'Setup', setSetupError);
    });
    
    socket.on('gameError', (error) => {
      ErrorHandler.handleSocketError(error, 'Game', (msg) => {
        // For game errors, we'll use alert for now but could be improved with a toast system
        alert(msg);
      });
    });

    return () => {
      socket.off('connect');
      socket.off('roomSetup');
      socket.off('gameState');
      socket.off('categoryError');
      socket.off('setupError');
      socket.off('categoryAdded');
      socket.off('categorySuccess');
      socket.off('gameError');
      socket.off('disconnect');
      socket.off('reconnect');
    };
  }, [roomId, myId]);
  
  return (
    <ErrorBoundary>
      {process.env.NODE_ENV === 'development' && <ErrorTestPanel socket={socket} />}
      <WorkflowProvider workflows={workflows}>
        {showUserSetup && roomSetupData ? (
          <UserSetup 
            roomSetupData={roomSetupData}
            existingUserData={getUserData(roomSetupData.roomId)}
            onUserSetup={(e) => workflows.userSetup.handleUserSetup(e)}
            setupError={setupError}
          />
        ) : !isInRoom ? (
          <RoomJoin 
            roomId={roomId}
            onRoomJoin={(e) => workflows.roomJoin.handleRoomJoin(e)}
          />
        ) : (
          <GameRoom 
            gameState={gameState}
            roomId={roomId}
            myId={myId}
            myUserId={myUserId}
            onAddCategory={(e) => workflows.gameplay.handleAddCategory(e)}
            onStartGame={(e) => workflows.gameplay.handleStartGame(e)}
            onRestartGame={() => workflows.gameplay.handleRestartGame()}
            onSkipAnnouncer={() => workflows.gameplay.handleSkipAnnouncer()}
            onToggleReady={() => workflows.gameplay.handleToggleReady()}
            categoryError={categoryError}
          />
        )}
      </WorkflowProvider>
    </ErrorBoundary>
  );
}

export default App;