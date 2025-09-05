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
              {team.players.map(playerData => {
                const userId = typeof playerData === 'string' ? playerData : playerData.userId;
                const persistentName = typeof playerData === 'object' ? playerData.name : null;
                
                // Find currently connected player
                const playerEntry = Object.entries(players).find(([socketId, player]) => 
                  player.userId === userId
                );
                const connectedPlayer = playerEntry ? playerEntry[1] : null;
                const socketId = playerEntry ? playerEntry[0] : null;
                const isOnline = !!connectedPlayer;
                const isCurrentUser = socketId === myId;
                
                const displayName = connectedPlayer?.name || persistentName || 'Unknown Player';
                
                return (
                  <div 
                    key={userId} 
                    className={`${styles.playerContainer} ${isCurrentUser ? styles.currentUser : ''} ${!isOnline ? styles.offline : ''}`}
                  >
                    <div className={styles.playerCircle}>
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                    <div className={styles.playerName}>
                      {displayName}
                    </div>
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