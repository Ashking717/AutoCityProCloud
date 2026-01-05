const mongoose = require('mongoose');
require('dotenv').config();

async function fixIndexes() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Connected to MongoDB');
    
    const db = mongoose.connection.db;
    const collection = db.collection('accounts');
    
    // Get all current indexes
    const indexes = await collection.indexes();
    console.log('\nCurrent indexes:');
    indexes.forEach(idx => {
      console.log(`  - ${idx.name}:`, idx.key);
    });
    
    // Drop ALL indexes except _id
    console.log('\nDropping old indexes...');
    for (const index of indexes) {
      if (index.name !== '_id_') {
        try {
          await collection.dropIndex(index.name);
          console.log(`  ✓ Dropped: ${index.name}`);
        } catch (err) {
          console.log(`  ✗ Failed to drop ${index.name}:`, err.message);
        }
      }
    }
    
    // Create new indexes
    console.log('\nCreating new indexes...');
    
    try {
      await collection.createIndex({ outletId: 1, accountNumber: 1 }, { unique: true });
      console.log('  ✓ Created: outletId_1_accountNumber_1 (unique)');
    } catch (err) {
      console.log('  ✗ Failed to create outletId_1_accountNumber_1:', err.message);
    }
    
    try {
      await collection.createIndex({ outletId: 1, accountName: 1 });
      console.log('  ✓ Created: outletId_1_accountName_1');
    } catch (err) {
      console.log('  ✗ Failed to create outletId_1_accountName_1:', err.message);
    }
    
    try {
      await collection.createIndex({ accountType: 1 });
      console.log('  ✓ Created: accountType_1');
    } catch (err) {
      console.log('  ✗ Failed to create accountType_1:', err.message);
    }
    
    // Verify new indexes
    const newIndexes = await collection.indexes();
    console.log('\nFinal indexes:');
    newIndexes.forEach(idx => {
      console.log(`  - ${idx.name}:`, idx.key, idx.unique ? '(unique)' : '');
    });
    
    console.log('\n✅ All indexes fixed successfully!');
    
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

fixIndexes();
