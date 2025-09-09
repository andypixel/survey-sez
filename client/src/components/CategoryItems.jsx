import React from 'react';
import styles from './CategoryItems.module.scss';

function CategoryItems({ category, responses, markedEntries, onEntryToggle, showCheckboxes = false }) {
  return (
    <div className={styles.categoryDetails}>
      <h4>Category Items:</h4>
      <ul>
        {category.entries.map((entry, index) => {
          const isAutoGuessed = responses.some(response => 
            response.text.toLowerCase() === entry.toLowerCase()
          );
          const isManuallyMarked = markedEntries.has(entry);
          const isGuessed = isAutoGuessed || isManuallyMarked;
          
          return (
            <li key={index} className={`${styles.entryItem} ${isGuessed ? styles.guessedEntry : ''}`}>
              {showCheckboxes && (
                <label className={styles.entryLabel}>
                  <input 
                    type="checkbox" 
                    checked={isManuallyMarked}
                    onChange={() => !isAutoGuessed && onEntryToggle(entry)}
                    disabled={isAutoGuessed}
                    className={styles.entryCheckbox}
                    aria-label={`Mark ${entry} as ${isManuallyMarked ? 'incorrect' : 'correct'}`}
                  />
                  <div className={`${styles.entryPill} ${
                    isAutoGuessed ? styles.autoChecked : 
                    isManuallyMarked ? styles.checked : ''
                  }`}>
                    {isAutoGuessed ? '🔒' : isManuallyMarked ? '✓' : ''}
                  </div>
                </label>
              )}
              <span 
                className={styles.entryText}
                onClick={() => showCheckboxes && !isAutoGuessed && onEntryToggle(entry)}
              >
                {entry}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default CategoryItems;