import React from 'react';
import styles from './UserSetup.module.scss';

function UserSetup({ roomSetupData, existingUserData, onUserSetup, setupError }) {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Join Room: {roomSetupData.roomId}</h1>
      <form className={styles.form} onSubmit={onUserSetup}>
        <div className={styles.field}>
          <label className={styles.label}>Your Name:</label>
          <input 
            name="playerName"
            type="text" 
            placeholder="Enter your name"
            defaultValue={existingUserData?.name || ''}
            className={styles.input}
            required
          />
        </div>
        
        <div className={styles.field}>
          <label className={styles.label}>Team:</label>
          <div className={styles.teamOptions}>
            {roomSetupData.existingTeams.map(team => (
              <div key={team} className={styles.teamOption}>
                <input type="radio" name="teamChoice" value={team} id={team} />
                <label htmlFor={team}>Join "{team}"</label>
              </div>
            ))}
            {roomSetupData.canCreateTeam && (
              <div className={styles.teamOption}>
                <input type="radio" name="teamChoice" value="new" id="new" />
                <label htmlFor="new">Create new team:</label>
                <input 
                  name="newTeamName"
                  type="text" 
                  placeholder="Team name"
                  className={styles.newTeamInput}
                />
              </div>
            )}
          </div>
        </div>
        
        <button type="submit" className={styles.button}>
          Join Game
        </button>
        
        {setupError && (
          <div className={styles.error}>
            {setupError}
          </div>
        )}
      </form>
    </div>
  );
}

export default UserSetup;