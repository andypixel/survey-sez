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
  
  const isOnGuessingTeam = (teamName) => {
    return currentGame?.currentGuessingTeam === teamName;
  };
  
  return (
    <div className={styles.container}>
      <div className={styles.teams}>
        {Object.values(teams).map(team => (
          <div key={team.name} className={styles.team}>
            <div className={`${styles.teamHeader} ${isOnGuessingTeam(team.name) ? styles.guessingTeam : ''}`}>
              <h4 className={styles.teamName}>{team.name}</h4>
              {currentGame?.teamScores && (
                <span className={styles.teamScore}>{currentGame.teamScores[team.name] || 0} pts</span>
              )}
            </div>
            <div className={styles.players}>
              {team.players.map(playerData => {
                const userId = typeof playerData === 'string' ? playerData : playerData.userId;
                const persistentName = typeof playerData === 'object' ? playerData.name : null;
                
                const connectedPlayer = getPlayerByUserId(userId);
                const categoryCount = getPlayerCategoryCount(userId);
                const isOnline = !!connectedPlayer;
                
                const displayName = connectedPlayer?.name || persistentName || 'Unknown Player';
                
                const playerClasses = [
                  styles.player,
                  isAnnouncer(userId) && styles.announcer,
                  isCurrentUser(userId) && styles.currentUser,
                  isOnGuessingTeam(team.name) && styles.guessingTeam,
                  !isOnline && styles.offline
                ].filter(Boolean).join(' ');
                
                return (
                  <div key={userId} className={playerClasses}>
                    <div className={styles.playerInfo}>
                      <div className={styles.playerName}>{displayName}</div>
                      <div className={styles.categoryCount}>
                        {categoryCount} {categoryCount === 1 ? 'category' : 'categories'}
                      </div>
                    </div>
                    <div className={styles.playerBadges}>
                      {isAnnouncer(userId) && (
                        <span className={styles.announcerIcon} title="Current Announcer">📢</span>
                      )}
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
}

export default RoomSummary;