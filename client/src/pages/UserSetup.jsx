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
              <label key={team} className={styles.teamOption} htmlFor={team}>
                <input type="radio" name="teamChoice" value={team} id={team} />
                <span>Join "{team}"</span>
              </label>
            ))}
            {roomSetupData.canCreateTeam && (
              <label className={`${styles.teamOption} ${styles.newTeamOption}`} htmlFor="newTeamName">
                <input type="radio" name="teamChoice" value="new" id="new" />
                <input 
                  name="newTeamName"
                  type="text" 
                  placeholder="Create new team"
                  className={styles.newTeamInput}
                  id="newTeamName"
                  onFocus={(e) => {
                    document.getElementById('new').checked = true;
                  }}
                />
              </label>
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