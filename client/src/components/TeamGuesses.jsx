import React from 'react';
import styles from './GameplayView.module.scss';

function TeamGuesses({ responses }) {
  return (
    <div className={styles.guesses}>
      <h4>Team Guesses:</h4>
      <div className={styles.guessesFeed}>
        {responses.map((response, index) => (
          <div key={index} className={styles.guess}>
            <span className={styles.guessText}>{response.text}</span>
            {response.player && <span className={styles.playerName}>- {response.player}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

export default TeamGuesses;