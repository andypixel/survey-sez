
import React from 'react';
import styles from './GameInfo.module.scss';
import { useWorkflows } from '../contexts/WorkflowContext';

function StatusDisplay({ isAnnouncer, isGuessingTeam }) {
  if (isAnnouncer) return <div className={styles.status}>You're the announcer!</div>;
  if (isGuessingTeam) return <div className={styles.status}>Your team is guessing!</div>;
  return <div className={styles.status}>Spectating</div>;
}

function RoundInfo({ currentTurn, turnsPerTeam }) {
  const currentRound = Math.floor(currentTurn / 2) + 1;
  return <div className={styles.round}>Round {currentRound} of {turnsPerTeam}</div>;
}

function AnnouncerInfo({ announcerName }) {
  return <div className={styles.announcer}>Announcer: {announcerName}</div>;
}

function CategorySelection({ selectedCategory, canSkipCategory, skipsUsed, onBeginTurn, onSkipCategory }) {
  return (
    <div className={styles.categorySelection}>
      <div className={styles.categoryPreview}>
        <span className={styles.categoryLabel}>Category:</span>
        <span className={styles.categoryName}>{selectedCategory?.name || 'Loading...'}</span>
      </div>
      <div className={styles.announcerButtons}>
        <button 
          className={styles.beginButton}
          onClick={onBeginTurn}
          disabled={!selectedCategory}
        >
          Start Turn
        </button>
        {canSkipCategory && (
          <button 
            className={styles.skipCategoryButton}
            onClick={onSkipCategory}
            disabled={!selectedCategory}
          >
            Skip ({2 - skipsUsed} left)
          </button>
        )}
      </div>
    </div>
  );
}

function GameInfo({ gameState, myId, isAnnouncer, isGuessingTeam }) {
  const { gameplay } = useWorkflows();
  const currentTurn = gameState.currentGame.currentTurn;
  const turnsPerTeam = gameState.gameSettings.turnsPerTeam;
  const announcerName = gameState.players[gameState.currentGame.currentAnnouncer]?.name;
  const selectedCategory = gameState.currentGame.selectedCategory;
  const canSkipCategory = gameState.currentGame.canSkipCategory;
  const skipsUsed = gameState.currentGame.skipsUsed;

  return (
    <div className={styles.gameInfo}>
      <StatusDisplay isAnnouncer={isAnnouncer} isGuessingTeam={isGuessingTeam} />
      <RoundInfo currentTurn={currentTurn} turnsPerTeam={turnsPerTeam} />
      {!isAnnouncer && <AnnouncerInfo announcerName={announcerName} />}
      {isAnnouncer && !gameState.currentGame.currentCategory && (
        <CategorySelection
          selectedCategory={selectedCategory}
          canSkipCategory={canSkipCategory}
          skipsUsed={skipsUsed}
          onBeginTurn={gameplay.handleBeginTurn}
          onSkipCategory={gameplay.handleSkipCategory}
        />
      )}
    </div>
  );
}

export default GameInfo;