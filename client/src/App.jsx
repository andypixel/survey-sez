import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import RoomJoin from './pages/RoomJoin.jsx';
import UserSetup from './pages/UserSetup.jsx';
import GameRoom from './pages/GameRoom.jsx';
import RoomJoinWorkflow from './workflows/RoomJoinWorkflow';
import UserSetupWorkflow from './workflows/UserSetupWorkflow';
import GameplayWorkflow from './workflows/GameplayWorkflow';
import { getGlobalUserId, getUserData, saveUserData } from './utils/storage';

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

  // Storage utilities
  const storage = { getUserData, saveUserData };
  
  // Workflow callbacks
  const callbacks = {
    setRoomId, setIsInRoom, setGameState, setShowUserSetup, setRoomSetupData,
    setSetupError, setCategoryError, getMyId: () => myId, getMyUserId: () => myUserId,
    getRoomId: () => roomId, getGameState: () => gameState
  };
  
  // Initialize workflows
  const roomJoinWorkflow = new RoomJoinWorkflow(socket, callbacks);
  const userSetupWorkflow = new UserSetupWorkflow(socket, callbacks, storage);
  const gameplayWorkflow = new GameplayWorkflow(socket, callbacks, storage);

  useEffect(() => {
    setMyUserId(getGlobalUserId());
    const room = roomJoinWorkflow.initializeFromUrl();
    if (room) setRoomId(room);
  }, []);

  useEffect(() => {
    socket.on('connect', () => {
      setMyId(socket.id);
      if (roomId) {
        socket.emit('joinRoom', roomId);
      }
    });

    socket.on('roomSetup', (data) => userSetupWorkflow.handleRoomSetup(data));
    socket.on('gameState', (state) => gameplayWorkflow.handleGameState(state));
    socket.on('categoryAdded', (data) => gameplayWorkflow.handleCategoryAdded(data));
    socket.on('roomSetup', (data) => {
      if (showUserSetup) {
        userSetupWorkflow.handleRoomSetupUpdate(data);
      } else {
        userSetupWorkflow.handleRoomSetup(data);
      }
    });
    
    socket.on('categoryError', (error) => {
      setCategoryError(error.message);
      setTimeout(() => setCategoryError(''), 3000);
    });
    
    socket.on('setupError', (error) => {
      setSetupError(error.message);
      setTimeout(() => setSetupError(''), 3000);
    });

    return () => {
      socket.off('connect');
      socket.off('roomSetup');
      socket.off('gameState');
      socket.off('categoryError');
      socket.off('setupError');
      socket.off('categoryAdded');

    };
  }, [roomId, myId]);
  
  if (showUserSetup && roomSetupData) {
    const existingUserData = getUserData(roomSetupData.roomId);
    return (
      <UserSetup 
        roomSetupData={roomSetupData}
        existingUserData={existingUserData}
        onUserSetup={(e) => userSetupWorkflow.handleUserSetup(e)}
        setupError={setupError}
      />
    );
  }
  
  if (!isInRoom) {
    return (
      <RoomJoin 
        roomId={roomId}
        onRoomJoin={(e) => roomJoinWorkflow.handleRoomJoin(e)}
      />
    );
  }

  return (
    <GameRoom 
      gameState={gameState}
      roomId={roomId}
      myId={myId}
      myUserId={myUserId}
      onAddCategory={(e) => gameplayWorkflow.handleAddCategory(e)}
      categoryError={categoryError}
    />
  );
}

export default App;