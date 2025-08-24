import React from 'react';
import styles from './GameplayView.module.scss';
import { useWorkflows } from '../contexts/WorkflowContext';

function GameplayView({ gameState, myId, myUserId, isAnnouncer, isGuessingTeam }) {
  const { gameplay } = useWorkflows();
  const currentGame = gameState.currentGame;
  
  if (isAnnouncer) {
    return (
      <div className={styles.container}>
        <h2>You are the Announcer</h2>
        <div className={styles.gameInfo}>
          <p>Round: {Math.floor(currentGame.currentTurn / 2) + 1} / {gameState.gameSettings.turnsPerTeam}</p>
          <p>Turn: {currentGame.currentTurn + 1}</p>
        </div>
        
        {currentGame.currentCategory ? (
          <div className={styles.announcerView}>
            <h3>{currentGame.currentCategory.name}</h3>
            <div className={styles.categoryDetails}>
              <h4>Category Items:</h4>
              <ul>
                {currentGame.currentCategory.entries.map((entry, index) => (
                  <li key={index}>{entry}</li>
                ))}
              </ul>
            </div>
            <div className={styles.timer}>
              Time: {gameState.gameSettings.timeLimit}s
            </div>
            <div className={styles.guesses}>
              <h4>Team Guesses:</h4>
              <div className={styles.guessesFeed}>
                {currentGame.responses.map((response, index) => (
                  <div key={index} className={styles.guess}>
                    {response.text}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className={styles.categorySelection}>
            <div className={styles.categoryPreview}>
              <span className={styles.categoryLabel}>Category:</span>
              <span className={styles.categoryName}>{currentGame.selectedCategory?.name || 'Loading...'}</span>
            </div>
            <button 
              className={styles.beginButton}
              onClick={() => gameplay.handleBeginTurn()}
              disabled={!currentGame.selectedCategory}
            >
              Begin Turn
            </button>
          </div>
        )}
      </div>
    );
  }
  
  if (isGuessingTeam) {
    return (
      <div className={styles.container}>
        <h2>Your team is guessing!</h2>
        <div className={styles.gameInfo}>
          <p>Round: {Math.floor(currentGame.currentTurn / 2) + 1} / {gameState.gameSettings.turnsPerTeam}</p>
          <p>Announcer: {gameState.players[currentGame.currentAnnouncer]?.name}</p>
        </div>
        
        {currentGame.currentCategory && (
          <div className={styles.guesserView}>
            <h3>Category: {currentGame.currentCategory.name}</h3>
            <div className={styles.timer}>
              Time: {gameState.gameSettings.timeLimit}s
            </div>
            <div className={styles.guesses}>
              <h4>Team Guesses:</h4>
              <div className={styles.guessesFeed}>
                {currentGame.responses.map((response, index) => (
                  <div key={index} className={styles.guess}>
                    {response.text}
                  </div>
                ))}
              </div>
              <form className={styles.guessForm}>
                <input 
                  type="text" 
                  placeholder="Enter your guess..."
                  className={styles.guessInput}
                />
                <button type="submit" className={styles.guessButton}>
                  Submit
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }
  
  // Spectating team view
  return (
    <div className={styles.container}>
      <h2>Spectating</h2>
      <div className={styles.gameInfo}>
        <p>Round: {Math.floor(currentGame.currentTurn / 2) + 1} / {gameState.gameSettings.turnsPerTeam}</p>
        <p>Guessing Team: {currentGame.currentGuessingTeam}</p>
        <p>Announcer: {gameState.players[currentGame.currentAnnouncer]?.name}</p>
      </div>
      
      {currentGame.currentCategory && (
        <div className={styles.spectatorView}>
          <h3>Category: {currentGame.currentCategory.name}</h3>
          <div className={styles.timer}>
            Time: {gameState.gameSettings.timeLimit}s
          </div>
          <div className={styles.guesses}>
            <h4>Team Guesses:</h4>
            <div className={styles.guessesFeed}>
              {currentGame.responses.map((response, index) => (
                <div key={index} className={styles.guess}>
                  {response.text}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GameplayView;