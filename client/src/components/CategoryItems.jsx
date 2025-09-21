import React from 'react';
import styles from './CategoryItems.module.scss';
import { getCachedGameRules } from '../utils/gameRules';

function CategoryItems({ category, responses, markedEntries, onEntryToggle, showCheckboxes = false, turnPhase = null, isAnnouncer = false }) {
  const gameRules = getCachedGameRules();
  
  return (
    <div className={styles.categoryDetails}>
      <div className={styles.entriesGrid}>
        {[...category.entries].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase())).map((entry, index) => {
          const isAutoGuessed = responses.some(response => 
            response.text.toLowerCase() === entry.toLowerCase()
          );
          const isManuallyMarked = markedEntries.has(entry);
          const isGuessed = isAutoGuessed || isManuallyMarked;
          const isTurnSummary = turnPhase === gameRules?.TURN_PHASES?.TURN_SUMMARY;
          const showIncorrect = isTurnSummary && !isGuessed;
          const showPill = isAnnouncer || isTurnSummary;
          
          const entryClasses = [
            styles.entryItem,
            isGuessed && styles.guessedEntry,
            (isTurnSummary || !isAnnouncer) && styles.readOnly
          ].filter(Boolean).join(' ');
          
          return (
            <div key={entry} className={entryClasses}>
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