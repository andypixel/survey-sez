import React, { useState, useEffect } from 'react';
import styles from './Timer.module.scss';

function Timer({ timerState, onTimeUp }) {
  const [localTimeLeft, setLocalTimeLeft] = useState(0);

  useEffect(() => {
    if (!timerState || timerState.isPaused) return;

    // Sync with server time
    setLocalTimeLeft(Math.ceil(timerState.timeRemaining / 1000));

    const interval = setInterval(() => {
      setLocalTimeLeft(prev => {
        if (prev <= 1) {
          onTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timerState?.timeRemaining, timerState?.isPaused, onTimeUp]);

  useEffect(() => {
    if (timerState?.isPaused) {
      setLocalTimeLeft(Math.ceil(timerState.timeRemaining / 1000));
    }
  }, [timerState?.isPaused, timerState?.timeRemaining]);

  if (!timerState) return null;

  const timeLeft = timerState.isPaused ? 
    Math.ceil(timerState.timeRemaining / 1000) : 
    localTimeLeft;

  const getTimerClass = () => {
    if (timeLeft <= 5) return styles.critical;
    if (timeLeft <= 10) return styles.warning;
    return styles.normal;
  };

  return (
    <div className={`${styles.timer} ${getTimerClass()} ${timerState.isPaused ? styles.paused : ''}`}>
      Time: {timeLeft}s {timerState.isPaused && '(PAUSED)'}
    </div>
  );
}

export default Timer;