import React, { useState } from 'react';
import styles from './GameplayView.module.scss';
import { useWorkflows } from '../contexts/WorkflowContext';
import TeamGuesses from './TeamGuesses';
import CategoryItems from './CategoryItems';

import Timer from './Timer';

function GameplayView({ gameState, myId, myUserId, isAnnouncer, isGuessingTeam }) {
  const { gameplay } = useWorkflows();
  const currentGame = gameState.currentGame;
  const [guessInput, setGuessInput] = useState('');


  const handleGuessSubmit = (e) => {
    e.preventDefault();
    if (guessInput.trim() && !currentGame.isPaused) {
      gameplay.handleSubmitGuess(guessInput);
      setGuessInput('');
    }
  };

  const handleEntryToggle = (entry) => {
    if (!currentGame.isPaused) {
      gameplay.handleToggleEntry(entry);
    }
  };

  const handlePauseToggle = () => {
    if (currentGame.isPaused) {
      gameplay.handleResumeGame();
    } else {
      gameplay.handlePauseGame();
    }
  };

  // Convert server array back to Set for component compatibility
  const markedEntries = new Set(currentGame.markedEntries || []);
  
  // Determine player role for display
  const isSpectator = !isAnnouncer && !isGuessingTeam;
  const canGuess = isGuessingTeam && !isAnnouncer;

  return (
    <div className={styles.container}>
      

      
      {/* Category Selection (Announcer only, before turn starts) */}
      {isAnnouncer && !currentGame.currentCategory && (
        <div className={styles.categorySelection}>
          <div className={styles.categoryPreview}>
            <span className={styles.categoryLabel}>Category:</span>
            <span className={styles.categoryName}>{currentGame.selectedCategory?.name || 'Loading...'}</span>
          </div>
          <div className={styles.announcerButtons}>
            <button 
              className={styles.beginButton}
              onClick={() => gameplay.handleBeginTurn()}
              disabled={!currentGame.selectedCategory}
            >
              Start Guessing
            </button>
            {/* Skip button - only for universal categories, max 2 per turn */}
            {currentGame.canSkipCategory && (
              <button 
                className={styles.skipCategoryButton}
                onClick={() => gameplay.handleSkipCategory()}
                disabled={!currentGame.selectedCategory}
              >
                Skip ({2 - currentGame.skipsUsed} left)
              </button>
            )}
          </div>
        </div>
      )}
      
      {/* Skip Announcer button - available to all players during category selection */}
      {!currentGame.currentCategory && (
        <div className={styles.skipSection}>
          <button 
            className={styles.skipButton}
            onClick={() => gameplay.handleSkipAnnouncer()}
          >
            Skip This Announcer
          </button>
        </div>
      )}
      
      {/* Active Game Content */}
      {currentGame.currentCategory && (
        <div className={styles.gameView}>
          <h3>Category: {currentGame.currentCategory.name}</h3>
          
          {/* Category Items - Announcer always sees, others only in TURN_SUMMARY */}
          {(isAnnouncer || currentGame.turnPhase === 'TURN_SUMMARY') && (
            <CategoryItems 
              category={currentGame.currentCategory}
              responses={currentGame.responses}
              markedEntries={markedEntries}
              onEntryToggle={handleEntryToggle}
              showCheckboxes={isAnnouncer}
              turnPhase={currentGame.turnPhase}
              isAnnouncer={isAnnouncer}
            />
          )}
          
          {/* Timer - only during ACTIVE_GUESSING */}
          {currentGame.turnPhase === 'ACTIVE_GUESSING' && (
            <div className={styles.timerSection}>
              <Timer 
                timerState={currentGame.timerState}
                onTimeUp={() => !currentGame.isPaused && gameplay.handleEndGuessing()}
              />
              <button 
                className={styles.pauseButton}
                onClick={handlePauseToggle}
              >
                {currentGame.isPaused ? 'Resume' : 'Pause'}
              </button>
            </div>
          )}
          
          {/* Guess Form - only for non-announcer guessing team members during ACTIVE_GUESSING */}
          {canGuess && currentGame.turnPhase === 'ACTIVE_GUESSING' && (
            <form className={styles.guessForm} onSubmit={handleGuessSubmit}>
              <input 
                type="text" 
                placeholder="Enter your guess..."
                className={styles.guessInput}
                value={guessInput}
                onChange={(e) => setGuessInput(e.target.value)}
                disabled={currentGame.isPaused}
              />
              <button type="submit" className={styles.guessButton} disabled={currentGame.isPaused}>
                Submit
              </button>
            </form>
          )}
          
          {/* Team Guesses - always visible during active game */}
          <TeamGuesses responses={currentGame.responses} />
          
          {/* Announcer Controls */}
          {isAnnouncer && currentGame.turnPhase === 'ACTIVE_GUESSING' && (
            <button 
              className={styles.endButton}
              onClick={() => gameplay.handleEndGuessing()}
              disabled={currentGame.isPaused}
            >
              End Guessing
            </button>
          )}
          
          {currentGame.turnPhase === 'RESULTS' && (isAnnouncer || currentGame.canAllPlayersReveal) && (
            <button 
              className={styles.revealButton}
              onClick={() => gameplay.handleRevealResults()}
            >
              {currentGame.canAllPlayersReveal ? 'Reveal (Timeout/Offline)' : 'Reveal'}
            </button>
          )}
          
          {currentGame.turnPhase === 'TURN_SUMMARY' && (
            <button 
              className={styles.continueButton}
              onClick={() => gameplay.handleContinueTurn()}
            >
              Next Turn
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default GameplayView;