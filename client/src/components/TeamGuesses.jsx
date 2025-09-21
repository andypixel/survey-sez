import React from 'react';
import styles from './TeamGuesses.module.scss';

function TeamGuesses({ responses, myUserId, gameState }) {
  return (
    <div className={styles.guesses}>
      <h4>Team Guesses:</h4>
      <div className={styles.guessesFeed}>
        {responses.slice().reverse().map((response, index) => {
          const myPlayer = Object.values(gameState.players).find(p => p.userId === myUserId);
          const isMyGuess = response.player === myPlayer?.name;
          return (
            <div key={index} className={styles.guess}>
              {response.player && (
                <span className={`${styles.playerName} ${isMyGuess ? styles.myPlayerName : ''}`}>
                  {response.player}:&nbsp;
                </span>
              )}
              <span className={styles.guessText}>{response.text}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default TeamGuesses;