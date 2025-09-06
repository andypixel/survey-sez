import React from 'react';
import styles from './GameHeader.module.scss';

function GameHeader({ roomId, playersCount }) {
  return (
    <div className={styles.header}>
      <div className={styles.headerLeft}>
        <h1 className={styles.gameName}>Survey Sez</h1>
        <p className={styles.roomName}>Room: {roomId}</p>
      </div>
      <div className={styles.headerRight}>
        <span className={styles.playersOnline}>
          👥 {playersCount} Players Online
        </span>
      </div>
    </div>
  );
}

export default GameHeader;