import React, { useState } from 'react';
import styles from './GameplayView.module.scss';
import { useWorkflows } from '../contexts/WorkflowContext';
import TeamGuesses from './TeamGuesses';
import CategoryItems from './CategoryItems';
import ScoreDisplay from './ScoreDisplay';

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
      
      <ScoreDisplay gameState={gameState} showTurnScore={true} />
      
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
            Begin Turn
          </button>
        </div>
      )}
      
      {/* Active Game Content */}
      {currentGame.currentCategory && (
        <div className={styles.gameView}>
          <h3>Category: {currentGame.currentCategory.name}</h3>
          
          {/* Category Items - Announcer always sees, others only in RESULTS */}
          {(isAnnouncer || currentGame.turnPhase === 'RESULTS') && (
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
            <div className={styles.timer}>
              Time: {gameState.gameSettings.timeLimit}s
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
              />
              <button type="submit" className={styles.guessButton}>
                Submit
              </button>
            </form>
          )}
          
          {/* Announcer Controls */}
          {isAnnouncer && currentGame.turnPhase === 'ACTIVE_GUESSING' && (
            <button 
              className={styles.endButton}
              onClick={() => gameplay.handleEndTurn()}
            >
              End Turn
            </button>
          )}
          
          {isAnnouncer && currentGame.turnPhase === 'RESULTS' && (
            <button 
              className={styles.continueButton}
              onClick={() => gameplay.handleContinueTurn()}
            >
              Continue
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default GameplayView;