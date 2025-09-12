import React from 'react';
import styles from './GameInfo.module.scss';
import { useWorkflows } from '../contexts/WorkflowContext';

function GameInfo({ gameState, myId, isAnnouncer, isGuessingTeam }) {
  const { gameplay } = useWorkflows();
  const currentRound = Math.floor(gameState.currentGame.currentTurn / 2) + 1;
  const totalRounds = gameState.gameSettings.turnsPerTeam;
  const announcerName = gameState.players[gameState.currentGame.currentAnnouncer]?.name;

  const getStatusText = () => {
    if (isAnnouncer) {
      return "You're the announcer!";
    }
    if (isGuessingTeam) {
      return "Your team is guessing!";
    }
    return "Spectating";
  };

  return (
    <div className={styles.gameInfo}>
      <div className={styles.status}>{getStatusText()}</div>
      <div className={styles.round}>Round {currentRound} of {totalRounds}</div>
      {!isAnnouncer && (
        <div className={styles.announcer}>Announcer: {announcerName}</div>
      )}
      
      {/* Category Selection for Announcer */}
      {isAnnouncer && !gameState.currentGame.currentCategory && (
        <div className={styles.categorySelection}>
          <div className={styles.categoryPreview}>
            <span className={styles.categoryLabel}>Category:</span>
            <span className={styles.categoryName}>{gameState.currentGame.selectedCategory?.name || 'Loading...'}</span>
          </div>
          <div className={styles.announcerButtons}>
            <button 
              className={styles.beginButton}
              onClick={() => gameplay.handleBeginTurn()}
              disabled={!gameState.currentGame.selectedCategory}
            >
              Start Guessing
            </button>
            {gameState.currentGame.canSkipCategory && (
              <button 
                className={styles.skipCategoryButton}
                onClick={() => gameplay.handleSkipCategory()}
                disabled={!gameState.currentGame.selectedCategory}
              >
                Skip ({2 - gameState.currentGame.skipsUsed} left)
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default GameInfo;