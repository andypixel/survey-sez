import React from 'react';
import styles from './ScoreDisplay.module.scss';

function ScoreDisplay({ gameState, showTurnScore = false, isAnnouncer = false }) {
  const { currentGame, teams } = gameState;
  
  if (!currentGame) return null;

  return (
    <div className={styles.scoreDisplay}>
      <h4>Scores</h4>
      <div className={styles.teamScores}>
        {Object.keys(teams).map(teamName => (
          <div key={teamName} className={styles.teamScore}>
            <span className={styles.teamName}>{teamName}:</span>
            <span className={styles.score}>{currentGame.teamScores[teamName] || 0}</span>
          </div>
        ))}
      </div>
      
      {showTurnScore && (currentGame.turnPhase === 'RESULTS' || currentGame.turnPhase === 'TURN_SUMMARY') && (
        <div className={styles.turnScore}>
          <strong>
            This Turn: {(isAnnouncer || currentGame.turnPhase === 'TURN_SUMMARY') ? `${currentGame.currentTurnScore} points` : '???'}
          </strong>
        </div>
      )}
    </div>
  );
}

export default ScoreDisplay;