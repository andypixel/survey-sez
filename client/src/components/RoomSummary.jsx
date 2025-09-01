import React from 'react';
import styles from './RoomSummary.module.scss';

function RoomSummary({ gameState }) {
  const { teams, players, categories, roomId } = gameState;
  
  const getPlayerCategoryCount = (userId) => {
    const userKey = `${roomId}-${userId}`;
    return categories.userCustom[userKey]?.length || 0;
  };
  
  const getPlayerByUserId = (userId) => {
    return Object.values(players).find(player => player.userId === userId);
  };
  
  return (
    <div className={styles.container}>
      <h3>Room Summary</h3>
      <div className={styles.teams}>
        {Object.values(teams).map(team => (
          <div key={team.name} className={styles.team}>
            <h4 className={styles.teamName}>{team.name}</h4>
            <div className={styles.players}>
              {team.players.map(userId => {
                const player = getPlayerByUserId(userId);
                const categoryCount = getPlayerCategoryCount(userId);
                return (
                  <div key={userId} className={styles.player}>
                    <span className={styles.playerName}>
                      {player?.name || 'Unknown'}
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