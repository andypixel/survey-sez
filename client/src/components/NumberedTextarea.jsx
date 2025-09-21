import React, { useState, useRef, forwardRef, useImperativeHandle, useEffect } from 'react';
import styles from './NumberedTextarea.module.scss';
import { getGameRules } from '../utils/gameRules';

const NumberedTextarea = forwardRef(function NumberedTextarea({ name, placeholder, defaultValue = '', rows = 5 }, ref) {
  const [value, setValue] = useState(defaultValue);
  const [gameRules, setGameRules] = useState(null);
  const textareaRef = useRef(null);
  
  useEffect(() => {
    getGameRules().then(setGameRules);
  }, []);
  
  useImperativeHandle(ref, () => ({
    clearValue: () => setValue('')
  }));
  
  const handleChange = (e) => {
    const lines = e.target.value.split('\n');
    const maxEntries = gameRules?.VALIDATION.MAX_CATEGORY_ENTRIES || 10;
    const truncatedValue = lines.slice(0, maxEntries).join('\n');
    setValue(truncatedValue);
  };
  
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      const lines = value.split('\n');
      const maxEntries = gameRules?.VALIDATION.MAX_CATEGORY_ENTRIES || 10;
      if (lines.length >= maxEntries) {
        e.preventDefault();
      }
    }
  };
  
  const lines = value.split('\n');
  const lineNumbers = Array.from({ length: Math.max(rows, lines.length) }, (_, i) => i + 1);
  
  return (
    <div className={styles.container}>
      <div className={styles.lineNumbers}>
        {lineNumbers.map(num => (
          <div key={num} className={styles.lineNumber}>{num}</div>
        ))}
      </div>
      <textarea
        ref={textareaRef}
        name={name}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={styles.textarea}
        rows={rows}
      />
    </div>
  );
});

export default NumberedTextarea;