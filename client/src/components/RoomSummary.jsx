import React from 'react';
import styles from './RoomSummary.module.scss';

function RoomSummary({ gameState, myUserId }) {
  const { teams, players, categories, roomId, currentGame } = gameState;
  
  const getPlayerCategoryCount = (userId) => {
    const userKey = `${roomId}-${userId}`;
    return categories.userCustom[userKey]?.length || 0;
  };
  
  const getPlayerByUserId = (userId) => {
    return Object.values(players).find(player => player.userId === userId);
  };
  
  const isAnnouncer = (userId) => {
    return currentGame?.currentAnnouncerUserId === userId;
  };
  
  const isCurrentUser = (userId) => {
    return userId === myUserId;
  };
  
  return (
    <div className={styles.container}>
      <h3>Room Summary</h3>
      <div className={styles.teams}>
        {Object.values(teams).map(team => (
          <div key={team.name} className={styles.team}>
            <h4 className={styles.teamName}>{team.name}</h4>
            <div className={styles.players}>
              {team.players.map(playerData => {
                const userId = typeof playerData === 'string' ? playerData : playerData.userId;
                const persistentName = typeof playerData === 'object' ? playerData.name : null;
                
                const connectedPlayer = getPlayerByUserId(userId);
                const categoryCount = getPlayerCategoryCount(userId);
                const isOnline = !!connectedPlayer;
                
                const displayName = connectedPlayer?.name || persistentName || 'Unknown Player';
                
                return (
                  <div key={userId} className={`${styles.player} ${isAnnouncer(userId) ? styles.announcer : ''} ${isCurrentUser(userId) ? styles.currentUser : ''} ${!isOnline ? styles.offline : ''}`}>
                    <span className={styles.playerName}>
                      {displayName}
                      {isAnnouncer(userId) && <span className={styles.announcerBadge}>📢</span>}
                    </span>
                    <span className={styles.categoryCount}>
                      {categoryCount} categories
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default RoomSummary;