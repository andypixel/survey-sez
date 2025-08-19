import React from 'react';
import styles from './TeamsDisplay.module.scss';

const TeamsDisplay = React.memo(function TeamsDisplay({ teams, players, myId }) {
  return (
    <div className={styles.container}>
      <h3>Teams</h3>
      <div className={styles.teamsGrid}>
        {Object.entries(teams || {}).map(([teamName, team]) => (
          <div key={teamName} className={styles.team}>
            <strong>{teamName}</strong>
            <div className={styles.playerList}>
              {team.players.map(userId => {
                // Find player by userId since teams store userIds but players object is keyed by socketId
                const playerEntry = Object.entries(players).find(([socketId, player]) => 
                  player.userId === userId
                );
                const player = playerEntry ? playerEntry[1] : null;
                const socketId = playerEntry ? playerEntry[0] : null;
                
                return (
                  <div 
                    key={userId} 
                    className={`${styles.player} ${socketId === myId ? styles.currentUser : styles.otherUser}`}
                  >
                    {player?.name || 'Unknown'}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

export default TeamsDisplay;