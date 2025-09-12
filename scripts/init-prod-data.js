const RedisStorage = require('../server/storage/RedisStorage');
const fs = require('fs');
const path = require('path');

async function initProdData() {
  console.log('Initializing production data...');
  
  const storage = new RedisStorage();
  
  // Check if categories already exist
  const existingCategories = await storage.getCategories();
  if (existingCategories.universal && existingCategories.universal.length > 0) {
    console.log('Categories already exist, skipping initialization');
    return;
  }
  
  // Load categories from local file
  const categoriesPath = path.join(__dirname, '../data/categories.json');
  if (fs.existsSync(categoriesPath)) {
    const categories = JSON.parse(fs.readFileSync(categoriesPath, 'utf8'));
    await storage.saveCategories(categories);
    console.log('Categories initialized from local data');
  } else {
    // Fallback: create minimal categories
    const defaultCategories = {
      universal: [
        {
          id: 'round-things',
          name: 'Round things',
          entries: ['Wheels', 'Coins', 'Pizza', 'Clock faces', 'Donuts', 'Plates', 'Balls', 'Manhole covers', 'CDs', 'Steering wheels']
        }
      ],
      custom: {},
      usedUniversalCategoryIds: []
    };
    await storage.saveCategories(defaultCategories);
    console.log('Default categories created');
  }
  
  console.log('Production data initialization complete');
}

// Run if called directly
if (require.main === module) {
  initProdData().catch(console.error);
}

module.exports = initProdData;