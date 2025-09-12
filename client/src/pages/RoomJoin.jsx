import React from 'react';
import styles from './RoomJoin.module.scss';
import logo from '../assets/images/survey-sez.png';

function RoomJoin({ roomId, onRoomJoin }) {
  return (
    <div className={styles.container}>
      <img src={logo} alt="Survey Sez" className={styles.logo} />
      <div>
        <h2 className={styles.subtitle}>Join a Room</h2>
        <form className={styles.form} onSubmit={onRoomJoin}>
          <input 
            name="roomInput"
            type="text" 
            placeholder="Enter room name"
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