import React from 'react';
import styles from './UserStatus.module.scss';

function UserStatus({ gameState, myId, myUserId }) {
  const myPlayer = gameState.players[myId];
  
  if (!myPlayer) {
    console.log('UserStatus - No player found for myId:', myId, 'Available players:', Object.keys(gameState.players));
    return null;
  }
  
  // Use the player's actual userId from server, not client localStorage
  const actualUserId = myPlayer.userId || myUserId;
  const userKey = `${gameState.roomId}-${actualUserId}`;
  const myCategories = gameState.categories.userCustom[userKey] || [];
  
  const isAnnouncer = gameState.currentGame && myId === gameState.currentGame.currentAnnouncer;
  console.log('UserStatus - Player:', myPlayer.name, 'UserId:', actualUserId, 'isAnnouncer:', isAnnouncer);
  
  return (
    <div className={styles.container}>
      <div className={styles.userInfo}>
        <span className={styles.name}>{myPlayer.name || 'Unknown'}</span>
        <span className={styles.team}>Team: {myPlayer.team}</span>
        {isAnnouncer && <span className={styles.role}>ANNOUNCER</span>}
        <span className={styles.categories}>Custom Categories: {myCategories.length}</span>
      </div>
    </div>
  );
}

export default UserStatus;