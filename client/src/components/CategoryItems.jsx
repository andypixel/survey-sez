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
                <input 
                  type="checkbox" 
                  checked={isManuallyMarked}
                  onChange={() => onEntryToggle(entry)}
                  className={styles.entryCheckbox}
                />
              )}
              <span className={styles.entryText}>{entry}</span>
              {isAutoGuessed && <span className={styles.autoGuessed}>(auto)</span>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default CategoryItems;