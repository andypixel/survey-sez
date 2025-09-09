import React from 'react';
import styles from './CategoryItems.module.scss';

function CategoryItems({ category, responses, markedEntries, onEntryToggle, showCheckboxes = false, turnPhase = null, isAnnouncer = false }) {
  return (
    <div className={styles.categoryDetails}>
      <h4>Category Items:</h4>
      <div className={styles.entriesGrid}>
        {[...category.entries].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase())).map((entry, index) => {
          const isAutoGuessed = responses.some(response => 
            response.text.toLowerCase() === entry.toLowerCase()
          );
          const isManuallyMarked = markedEntries.has(entry);
          const isGuessed = isAutoGuessed || isManuallyMarked;
          const isTurnSummary = turnPhase === 'TURN_SUMMARY';
          const showIncorrect = isTurnSummary && !isGuessed;
          const showPill = isAnnouncer || isTurnSummary;
          
          return (
            <div key={entry} className={`${styles.entryItem} ${isGuessed ? styles.guessedEntry : ''} ${isTurnSummary || !isAnnouncer ? styles.readOnly : ''}`}>
              {showPill && (
                <label className={styles.entryLabel}>
                  {showCheckboxes && (
                    <input 
                      type="checkbox" 
                      checked={isManuallyMarked}
                      onChange={() => !isAutoGuessed && onEntryToggle(entry)}
                      disabled={isAutoGuessed || isTurnSummary}
                      className={styles.entryCheckbox}
                      aria-label={`Mark ${entry} as ${isManuallyMarked ? 'incorrect' : 'correct'}`}
                    />
                  )}
                  <div className={`${styles.entryPill} ${
                    showIncorrect ? styles.incorrect :
                    isAutoGuessed ? styles.autoChecked : 
                    isManuallyMarked ? styles.checked : ''
                  } ${isTurnSummary ? styles.readOnly : ''}`}>
                    {showIncorrect ? '✗' :
                     isAutoGuessed ? '🔒' : 
                     isManuallyMarked ? '✓' : ''}
                  </div>
                </label>
              )}
              <span 
                className={styles.entryText}
                onClick={() => isAnnouncer && showCheckboxes && !isAutoGuessed && !isTurnSummary && onEntryToggle(entry)}
              >
                {entry}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default CategoryItems;