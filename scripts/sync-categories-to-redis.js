const RedisStorage = require('../server/storage/RedisStorage');
const fs = require('fs');
const path = require('path');

async function syncCategoriesToRedis() {
  console.log('🔄 Starting one-time category sync to Redis...');
  
  // Load local categories.json
  const categoriesPath = path.join(__dirname, '../data/categories.json');
  if (!fs.existsSync(categoriesPath)) {
    console.error('❌ Local categories.json not found. Run npm run init-data first.');
    process.exit(1);
  }
  
  const localCategories = JSON.parse(fs.readFileSync(categoriesPath, 'utf8'));
  console.log(`📁 Loaded ${localCategories.universal.length} universal categories from local file`);
  console.log(`📊 Used categories: ${localCategories.usedUniversalCategoryIds.length}`);
  
  // Connect to Redis
  const storage = new RedisStorage();
  
  try {
    // Get current Redis data
    const redisCategories = await storage.getCategories();
    console.log(`☁️  Current Redis has ${redisCategories.universal.length} universal categories`);
    console.log(`☁️  Current Redis used: ${redisCategories.usedUniversalCategoryIds.length}`);
    
    // Sync the data
    await storage.saveCategories(localCategories);
    console.log('✅ Categories synced to Redis successfully!');
    
    // Verify sync
    const verifyCategories = await storage.getCategories();
    console.log(`✅ Verification: Redis now has ${verifyCategories.universal.length} universal categories`);
    console.log(`✅ Verification: Redis used categories: ${verifyCategories.usedUniversalCategoryIds.length}`);
    
    console.log('\n🎉 Sync complete! You can now safely run "npm run reset-data" locally.');
    
  } catch (error) {
    console.error('❌ Sync failed:', error.message);
    process.exit(1);
  }
  
  process.exit(0);
}

// Run if called directly
if (require.main === module) {
  syncCategoriesToRedis().catch(console.error);
}

module.exports = syncCategoriesToRedis;