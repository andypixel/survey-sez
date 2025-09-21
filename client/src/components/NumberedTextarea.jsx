import React, { useState, useRef } from 'react';
import styles from './NumberedTextarea.module.scss';

function NumberedTextarea({ name, placeholder, defaultValue = '', rows = 5 }) {
  const [value, setValue] = useState(defaultValue);
  const textareaRef = useRef(null);
  
  const handleChange = (e) => {
    const lines = e.target.value.split('\n');
    const truncatedValue = lines.slice(0, 10).join('\n');
    setValue(truncatedValue);
  };
  
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      const lines = value.split('\n');
      if (lines.length >= 10) {
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
}

export default NumberedTextarea;