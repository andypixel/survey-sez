import React, { useState, useEffect } from 'react';
import styles from './Timer.module.scss';

function Timer({ timeLimit, isActive, onTimeUp }) {
  const [timeLeft, setTimeLeft] = useState(timeLimit);

  useEffect(() => {
    setTimeLeft(timeLimit);
  }, [timeLimit]);

  useEffect(() => {
    if (!isActive) return;

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
  }, [isActive, onTimeUp]);

  const getTimerClass = () => {
    if (timeLeft <= 5) return styles.critical;
    if (timeLeft <= 10) return styles.warning;
    return styles.normal;
  };

  return (
    <div className={`${styles.timer} ${getTimerClass()}`}>
      Time: {timeLeft}s
    </div>
  );
}

export default Timer;