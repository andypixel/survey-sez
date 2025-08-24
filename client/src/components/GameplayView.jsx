import React, { useState } from 'react';
import styles from './GameplayView.module.scss';
import { useWorkflows } from '../contexts/WorkflowContext';
import TeamGuesses from './TeamGuesses';
import CategoryItems from './CategoryItems';

function GameplayView({ gameState, myId, myUserId, isAnnouncer, isGuessingTeam }) {
  const { gameplay } = useWorkflows();
  const currentGame = gameState.currentGame;
  const [guessInput, setGuessInput] = useState('');
  const handleGuessSubmit = (e) => {
    e.preventDefault();
    if (guessInput.trim()) {
      gameplay.handleSubmitGuess(guessInput);
      setGuessInput('');
    }
  };

  const handleEntryToggle = (entry) => {
    gameplay.handleToggleEntry(entry);
  };

  // Convert server array back to Set for component compatibility
  const markedEntries = new Set(currentGame.markedEntries || []);
  
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
            <CategoryItems 
              category={currentGame.currentCategory}
              responses={currentGame.responses}
              markedEntries={markedEntries}
              onEntryToggle={handleEntryToggle}
              showCheckboxes={true}
            />
            {currentGame.turnPhase === 'ACTIVE_GUESSING' && (
              <div className={styles.timer}>
                Time: {gameState.gameSettings.timeLimit}s
              </div>
            )}
            <TeamGuesses responses={currentGame.responses} />
            {currentGame.turnPhase === 'ACTIVE_GUESSING' && (
              <button 
                className={styles.endButton}
                onClick={() => gameplay.handleEndTurn()}
              >
                End Turn
              </button>
            )}
            {currentGame.turnPhase === 'RESULTS' && (
              <button 
                className={styles.continueButton}
                onClick={() => gameplay.handleContinueTurn()}
              >
                Continue
              </button>
            )}
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
            {currentGame.turnPhase === 'RESULTS' && (
              <CategoryItems 
                category={currentGame.currentCategory}
                responses={currentGame.responses}
                markedEntries={markedEntries}
                onEntryToggle={handleEntryToggle}
                showCheckboxes={false}
              />
            )}
            {currentGame.turnPhase === 'ACTIVE_GUESSING' && (
              <div className={styles.timer}>
                Time: {gameState.gameSettings.timeLimit}s
              </div>
            )}
            <TeamGuesses responses={currentGame.responses} />
            {currentGame.turnPhase === 'ACTIVE_GUESSING' && (
              <form className={styles.guessForm} onSubmit={handleGuessSubmit}>
                <input 
                  type="text" 
                  placeholder="Enter your guess..."
                  className={styles.guessInput}
                  value={guessInput}
                  onChange={(e) => setGuessInput(e.target.value)}
                />
                <button type="submit" className={styles.guessButton}>
                  Submit
                </button>
              </form>
            )}
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
          {currentGame.turnPhase === 'RESULTS' && (
            <CategoryItems 
              category={currentGame.currentCategory}
              responses={currentGame.responses}
              markedEntries={markedEntries}
              onEntryToggle={handleEntryToggle}
              showCheckboxes={false}
            />
          )}
          {currentGame.turnPhase === 'ACTIVE_GUESSING' && (
            <div className={styles.timer}>
              Time: {gameState.gameSettings.timeLimit}s
            </div>
          )}
          <TeamGuesses responses={currentGame.responses} />
        </div>
      )}
    </div>
  );
}

export default GameplayView;