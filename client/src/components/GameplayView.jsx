import React, { useState } from 'react';
import styles from './GameplayView.module.scss';
import { useWorkflows } from '../contexts/WorkflowContext';
import TeamGuesses from './TeamGuesses';
import CategoryItems from './CategoryItems';
import ScoreDisplay from './ScoreDisplay';
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
  
  // Role-specific content
  const getTitle = () => {
    if (isAnnouncer) return 'You are the Announcer';
    if (isGuessingTeam) return 'Your team is guessing!';
    return 'Spectating';
  };
  
  const getGameInfo = () => {
    const baseInfo = (
      <p>Round: {Math.floor(currentGame.currentTurn / 2) + 1} / {gameState.gameSettings.turnsPerTeam}</p>
    );
    
    if (isAnnouncer) {
      return (
        <>
          {baseInfo}
          <p>Turn: {currentGame.currentTurn + 1}</p>
        </>
      );
    }
    
    if (isGuessingTeam) {
      return (
        <>
          {baseInfo}
          <p>Announcer: {gameState.players[currentGame.currentAnnouncer]?.name}</p>
        </>
      );
    }
    
    return (
      <>
        {baseInfo}
        <p>Guessing Team: {currentGame.currentGuessingTeam}</p>
        <p>Announcer: {gameState.players[currentGame.currentAnnouncer]?.name}</p>
      </>
    );
  };

  return (
    <div className={styles.container}>
      <h2>{getTitle()}</h2>
      <div className={styles.gameInfo}>
        {getGameInfo()}
      </div>
      
      <ScoreDisplay gameState={gameState} showTurnScore={true} isAnnouncer={isAnnouncer} />
      
      {/* Category Selection (Announcer only, before turn starts) */}
      {isAnnouncer && !currentGame.currentCategory && (
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
            Start Guessing
          </button>
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
      
      {/* Emergency Reset button - available to all players during gameplay */}
      <div className={styles.emergencySection}>
        <button 
          className={styles.emergencyButton}
          onClick={() => {
            if (window.confirm('Emergency reset will end this game but keep used categories. Continue?')) {
              gameplay.handleEmergencyReset();
            }
          }}
        >
          Emergency Reset
        </button>
      </div>
      
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
          
          {/* Team Guesses - always visible during active game */}
          <TeamGuesses responses={currentGame.responses} />
          
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