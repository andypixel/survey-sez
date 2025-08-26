import React, { useState, useEffect } from 'react';
import styles from './Timer.module.scss';

function Timer({ timeLimit, isPaused, onTimeUp }) {
  const [timeLeft, setTimeLeft] = useState(timeLimit);

  useEffect(() => {
    setTimeLeft(timeLimit);
  }, [timeLimit]);

  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          onTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isPaused, onTimeUp]);

  const getTimerClass = () => {
    if (timeLeft <= 5) return styles.critical;
    if (timeLeft <= 10) return styles.warning;
    return styles.normal;
  };

  return (
    <div className={`${styles.timer} ${getTimerClass()} ${isPaused ? styles.paused : ''}`}>
      Time: {timeLeft}s {isPaused && '(PAUSED)'}
    </div>
  );
}

export default Timer;