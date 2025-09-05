import React from 'react';
import styles from './CategoriesDisplay.module.scss';

const CategoriesDisplay = React.memo(function CategoriesDisplay({ categories, myUserId, onAddCategory, categoryError, usedCategoryIds = [] }) {
  const defaultEntries = React.useMemo(() => {
    // Only auto-populate entries in debug mode
    if (process.env.REACT_APP_DEBUG_MODE === 'true') {
      return Array.from({length: 10}, () => Math.floor(1000 + Math.random() * 9000)).join('\n');
    }
    return '';
  }, []);
  
  const handleSubmit = (e) => {
    onAddCategory(e);
  };
  const myUserKey = Object.keys(categories?.userCustom || {}).find(key => key.endsWith(`-${myUserId}`));
  const myCategories = myUserKey ? categories.userCustom[myUserKey] : [];
  const availableCount = myCategories.filter(category => !usedCategoryIds.includes(category.id)).length;
  
  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Your Categories</h3>
      
      <div className={styles.categoriesLayout}>
        {/* Category Input Area (Left Side) */}
        <div className={styles.inputArea}>
          <form onSubmit={handleSubmit} className={styles.form}>
            <input 
              name="categoryName"
              type="text" 
              placeholder="Category name"
              className={styles.nameInput}
              required
            />
            <textarea 
              name="categoryEntries"
              placeholder="Optional: one entry per line"
              className={styles.entriesInput}
              rows={5}
              defaultValue={defaultEntries}
            />
            <button type="submit" className={styles.button}>
              Add Category
            </button>
          </form>
          {categoryError && (
            <div className={styles.error}>
              {categoryError}
            </div>
          )}
          <p className={styles.categoryCount}>
            {myCategories.length} Categories Created
          </p>
        </div>
        
        {/* Your Category List (Right Side) */}
        <div className={styles.categoryList}>
          <p className={styles.availabilityCount}>
            {availableCount} of {myCategories.length} available
          </p>
          <div className={styles.categoriesGrid}>
            {myCategories.map(category => {
              const isUsed = usedCategoryIds.includes(category.id);
              return (
                <div key={category.id} className={`${styles.categoryCard} ${isUsed ? styles.used : ''}`}>
                  <div className={styles.categoryHeader}>
                    <span className={styles.categoryName}>{category.name}</span>
                    <span className={`${styles.statusBadge} ${isUsed ? styles.usedBadge : styles.availableBadge}`}>
                      {isUsed ? '✓ Used' : 'Available'}
                    </span>
                  </div>
                  <div className={styles.categoryEntries}>
                    {category.entries?.map((entry, index) => (
                      <div key={index} className={styles.entry}>{entry}</div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
});

export default CategoriesDisplay;