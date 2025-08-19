import React from 'react';
import styles from './RoomJoin.module.scss';

function RoomJoin({ roomId, onRoomJoin }) {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Real-time Game Prototype</h1>
      <div>
        <h2 className={styles.subtitle}>Join a Room</h2>
        <form className={styles.form} onSubmit={onRoomJoin}>
          <input 
            name="roomInput"
            type="text" 
            placeholder="Enter room name (e.g., abc-123)"
            className={styles.input}
            defaultValue={roomId}
          />
          <button type="submit" className={styles.button}>
            Join Room
          </button>
        </form>
        <p className={styles.hint}>
          Or visit a direct room URL: /room/your-room-name
        </p>
      </div>
    </div>
  );
}

export default RoomJoin;