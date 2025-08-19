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
              {team.players.map(playerId => (
                <div 
                  key={playerId} 
                  className={`${styles.player} ${playerId === myId ? styles.currentUser : styles.otherUser}`}
                >
                  {players[playerId]?.name || 'Unknown'}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

export default TeamsDisplay;