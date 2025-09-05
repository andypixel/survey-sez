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
      <h3 className={styles.title}>My Categories</h3>
      
      <div>
        <div>
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
        </div>
        
        <div className={styles.categoriesGrid}>
          <p className={styles.categoryCount}>({availableCount} available)</p>
          {myCategories.map(category => {
            const isUsed = usedCategoryIds.includes(category.id);
            return (
              <div key={category.id} className={`${styles.categoryCard} ${isUsed ? styles.used : ''}`}>
                <div className={styles.categoryName}>
                  {category.name}
                  {isUsed && <span className={styles.usedBadge}>USED</span>}
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
  );
});

export default CategoriesDisplay;