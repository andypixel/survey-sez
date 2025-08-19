import React from 'react';
import TeamsDisplay from '../components/TeamsDisplay.jsx';
import CategoriesDisplay from '../components/CategoriesDisplay.jsx';
import styles from './GameRoom.module.scss';

function GameRoom({ gameState, roomId, myId, myUserId, onAddCategory, categoryError }) {
  return (
    <div className={styles.container}>
      <h1>Survey Sez Prototype</h1>
      <p className={styles.roomInfo}>Room: <strong>{roomId}</strong></p>
      
      <TeamsDisplay 
        teams={gameState.teams} 
        players={gameState.players} 
        myId={myId} 
      />
      
      <div className={styles.gameConfig}>
        <h3>Game Configuration</h3>
        <div className={styles.configForm}>
          <div className={styles.inputGroup}>
            <label>Turn Timer (seconds):</label>
            <input 
              type="number" 
              defaultValue={30}
              min={10}
              max={120}
            />
          </div>
          <div className={styles.inputGroup}>
            <label>Number of Rounds:</label>
            <input 
              type="number" 
              defaultValue={10}
              min={1}
              max={50}
            />
          </div>
          <button className={styles.startButton}>
            Start Game
          </button>
        </div>
        <p className={styles.playersOnline}>Players Online: {Object.keys(gameState.players).length}</p>
      </div>
      
      <CategoriesDisplay 
        categories={gameState.categories}
        myUserId={myUserId}
        onAddCategory={onAddCategory}
        categoryError={categoryError}
      />
    </div>
  );
}

export default GameRoom;