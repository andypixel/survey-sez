import React from 'react';
import styles from './CategoriesDisplay.module.scss';

const CategoriesDisplay = React.memo(function CategoriesDisplay({ categories, myUserId, onAddCategory, categoryError }) {
  const [submitCount, setSubmitCount] = React.useState(0);
  const defaultEntries = React.useMemo(() => 
    Array.from({length: 10}, () => Math.floor(1000 + Math.random() * 9000)).join(', '),
    [submitCount]
  );
  
  const handleSubmit = (e) => {
    onAddCategory(e);
    setSubmitCount(prev => prev + 1);
  };
  const myUserKey = Object.keys(categories?.userCustom || {}).find(key => key.endsWith(`-${myUserId}`));
  const myCategories = myUserKey ? categories.userCustom[myUserKey] : [];
  
  return (
    <div className={styles.container}>
      <h3 className={styles.title}>My Categories</h3>
      
      <div>
        <div className={styles.categoriesGrid}>
          {myCategories.map(category => (
            <div key={category.id} className={styles.categoryCard}>
              <div className={styles.categoryName}>{category.name}</div>
              <div className={styles.categoryEntries}>
                {category.entries?.slice(0, 3).join(', ')}...
              </div>
            </div>
          ))}
        </div>
        
        <div>
          <form onSubmit={handleSubmit} className={styles.form}>
            <input 
              name="categoryName"
              type="text" 
              placeholder="Category name"
              className={styles.nameInput}
              required
            />
            <input 
              name="categoryEntries"
              type="text" 
              placeholder="Optional: comma-separated entries"
              className={styles.entriesInput}
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
      </div>
    </div>
  );
});

export default CategoriesDisplay;