import React from 'react';
import styles from './GameOverView.module.scss';

function GameOverView({ gameState, onRestart }) {
  const { teams, finalGameData } = gameState;
  
  // Determine winner
  const teamScores = Object.entries(finalGameData?.teamScores || {});
  const sortedTeams = teamScores.sort(([,a], [,b]) => b - a);
  const [, winnerScore] = sortedTeams[0];
  const [, runnerUpScore] = sortedTeams[1] || ['', 0];
  const isTie = winnerScore === runnerUpScore;

  return (
    <div className={styles.container}>
      <h1>Game Over!</h1>
      
      {/* Final Scores */}
      <div className={styles.finalScores}>
        <h2>Final Scores</h2>
        <div className={styles.scoreBoard}>
          {sortedTeams.map(([teamName, score], index) => (
            <div 
              key={teamName} 
              className={`${styles.teamResult} ${index === 0 && !isTie ? styles.winner : ''}`}
            >
              <span className={styles.teamName}>{teamName}</span>
              <span className={styles.teamScore}>{score} points</span>
              {index === 0 && !isTie && <span className={styles.winnerBadge}>🏆 Winner!</span>}
            </div>
          ))}
          {isTie && (
            <div className={styles.tieMessage}>
              🤝 It's a tie!
            </div>
          )}
        </div>
      </div>

      {/* Game History */}
      <div className={styles.gameHistory}>
        <h3>Game History</h3>
        <div className={styles.historyList}>
          {finalGameData?.playedCategories?.map((categoryData, index) => (
            <div key={index} className={styles.categoryHistory}>
              <div className={styles.categoryHeader}>
                <h4>{categoryData.category.name}</h4>
                <span className={styles.turnInfo}>
                  Turn {index + 1} - {categoryData.team} ({categoryData.score} points)
                </span>
              </div>
              <div className={styles.categoryDetails}>
                <div className={styles.entries}>
                  <ul>
                    {categoryData.category.entries.map((entry, i) => (
                      <li 
                        key={i} 
                        className={categoryData.correctEntries?.includes(entry) ? styles.correct : ''}
                      >
                        {entry}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className={styles.guesses}>
                  <strong>Team Guesses:</strong>
                  <div className={styles.guessList}>
                    {categoryData.responses?.map((response, i) => (
                      <span key={i} className={styles.guess}>{response.text}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )) || (
            <p className={styles.noHistory}>No game history available</p>
          )}
        </div>
      </div>

      {/* Restart Button */}
      <div className={styles.actions}>
        <button className={styles.restartButton} onClick={onRestart}>
          Start New Game
        </button>
      </div>
    </div>
  );
}

export default GameOverView;