import React from 'react';
import TeamsDisplay from '../components/TeamsDisplay.jsx';
import CategoriesDisplay from '../components/CategoriesDisplay.jsx';
import GameplayView from '../components/GameplayView.jsx';
import GameOverView from '../components/GameOverView.jsx';
import RoomSummary from '../components/RoomSummary.jsx';
import GameHeader from '../components/GameHeader.jsx';
import GameInfo from '../components/GameInfo.jsx';
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
        <GameHeader 
          roomId={roomId}
          playersCount={Object.keys(gameState.players).length}
        />
        
        <GameInfo 
          gameState={gameState}
          myId={myId}
          isAnnouncer={isAnnouncer}
          isGuessingTeam={isGuessingTeam}
        />
        
        <div className={styles.gameplayLayout}>
          <div className={styles.mainGameSection}>
            <GameplayView 
              gameState={gameState}
              myId={myId}
              myUserId={myUserId}
              isAnnouncer={isAnnouncer}
              isGuessingTeam={isGuessingTeam}
            />
          </div>
          
          <div className={styles.sidebarSection}>
            <RoomSummary gameState={gameState} myUserId={myUserId} />
            
            {/* Emergency Reset button - available to all players during gameplay */}
            <div className={styles.emergencySection}>
              <button 
                className={styles.emergencyButton}
                onClick={() => {
                  if (window.confirm('Emergency reset will end this game but keep used categories. Continue?')) {
                    // Handle emergency reset - you'll need to add this to the parent component
                    console.log('Emergency reset requested');
                  }
                }}
              >
                Emergency Reset
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Show onboarding view
  return (
    <div className={styles.container}>
      <GameHeader 
        roomId={roomId}
        playersCount={Object.keys(gameState.players).length}
      />
      
      {/* Tagline */}
      <p className={styles.tagline}>
        Create categories with 10 answers each. Other players will try to guess them!
      </p>
      
      {/* Teams Section */}
      <TeamsDisplay 
        teams={gameState.teams} 
        players={gameState.players} 
        myId={myId} 
      />
      
      {/* Start Game Button */}
      <div className={styles.startGameSection}>
        <form id="startGameForm" onSubmit={onStartGame}>
          <button type="submit" className={styles.startGameButton}>
            Start Game
          </button>
        </form>
        <p className={styles.startGameTooltip}>
          Anyone can start once categories are ready!
        </p>
      </div>
      
      {/* Game Configuration (Collapsible) */}
      <details className={styles.gameConfig}>
        <summary className={styles.gameConfigSummary}>⚙️ Game Settings</summary>
        <div className={styles.gameConfigContent}>
          <div className={styles.inputGroup}>
            <label>Turn Timer (seconds):</label>
            <input 
              name="timeLimit"
              type="number" 
              defaultValue={30}
              min={10}
              max={120}
              form="startGameForm"
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
              form="startGameForm"
            />
          </div>
        </div>
      </details>
      
      {/* Categories Section */}
      <CategoriesDisplay 
        categories={gameState.categories}
        myUserId={myUserId}
        onAddCategory={onAddCategory}
        categoryError={categoryError}
        usedCategoryIds={gameState.usedCategoryIds}
      />
    </div>
  );
}

export default GameRoom;