import React from 'react';
import TeamsDisplay from '../components/TeamsDisplay.jsx';
import CategoriesDisplay from '../components/CategoriesDisplay.jsx';
import GameplayView from '../components/GameplayView.jsx';
import GameOverView from '../components/GameOverView.jsx';
import RoomSummary from '../components/RoomSummary.jsx';
import styles from './GameRoom.module.scss';

function GameRoom({ gameState, roomId, myId, myUserId, onAddCategory, categoryError, onStartGame, onRestartGame }) {
  // Show game over view if game is complete
  if (gameState.gameState === 'GAME_OVER') {
    return (
      <div className={styles.container}>
        <GameOverView 
          gameState={gameState}
          onRestart={onRestartGame}
        />
      </div>
    );
  }
  
  // Show gameplay view if game is in progress
  if (gameState.gameState === 'GAMEPLAY' && gameState.currentGame) {
    console.log('GameRoom - Game in progress:', gameState.gameState, gameState.currentGame);
    const myPlayer = gameState.players[myId];
    const myTeam = myPlayer?.team;
    const currentGuessingTeam = gameState.currentGame.currentGuessingTeam;
    const currentAnnouncer = gameState.currentGame.currentAnnouncer;
    
    const isGuessingTeam = myTeam === currentGuessingTeam;
    const isAnnouncer = myId === currentAnnouncer;
    
    console.log('GameRoom - myTeam:', myTeam, 'currentGuessingTeam:', currentGuessingTeam, 'isGuessingTeam:', isGuessingTeam);
    console.log('GameRoom - myId:', myId, 'currentAnnouncer:', currentAnnouncer, 'isAnnouncer:', isAnnouncer);
    
    return (
      <div className={styles.container}>
        <h1>Survey Sez - Game in Progress</h1>
        <p className={styles.roomInfo}>Room: <strong>{roomId}</strong></p>
        
        <RoomSummary gameState={gameState} myUserId={myUserId} />
        
        <GameplayView 
          gameState={gameState}
          myId={myId}
          myUserId={myUserId}
          isAnnouncer={isAnnouncer}
          isGuessingTeam={isGuessingTeam}
        />
      </div>
    );
  }
  
  // Show onboarding view
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
        <form className={styles.configForm} onSubmit={onStartGame}>
          <div className={styles.inputGroup}>
            <label>Turn Timer (seconds):</label>
            <input 
              name="timeLimit"
              type="number" 
              defaultValue={30}
              min={10}
              max={120}
            />
          </div>
          <div className={styles.inputGroup}>
            <label>Number of Rounds:</label>
            <input 
              name="rounds"
              type="number" 
              defaultValue={10}
              min={1}
              max={50}
            />
          </div>
          <button type="submit" className={styles.startButton}>
            Start Game
          </button>
        </form>
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