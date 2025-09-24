import React, { useState } from 'react';
import styles from './UserSetup.module.scss';
import { getSchemas } from '../utils/schemas';

function UserSetup({ roomSetupData, existingUserData, onUserSetup, setupError }) {
  const [validationError, setValidationError] = useState('');
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const teamChoice = formData.get('teamChoice');
    const newTeamName = formData.get('newTeamName');
    
    // Only validate new team names with runtime schema
    if (teamChoice === 'new') {
      try {
        const schemas = await getSchemas();
        schemas.teamName.parse(newTeamName);
        setValidationError('');
      } catch (error) {
        setValidationError(error.errors[0].message);
        return;
      }
    }
    
    // Pass raw data to parent - no encoding
    onUserSetup(e);
  };
  
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Join Room: {roomSetupData.roomId}</h1>
      <form className={styles.form} onSubmit={handleSubmit}>
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
        
        {(setupError || validationError) && (
          <div className={styles.error}>
            {setupError || validationError}
          </div>
        )}
      </form>
    </div>
  );
}

export default UserSetup;