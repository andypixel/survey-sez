import React from 'react';
import styles from './GameInfo.module.scss';

function GameInfo({ gameState, myId, isAnnouncer, isGuessingTeam }) {
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
    </div>
  );
}

export default GameInfo;