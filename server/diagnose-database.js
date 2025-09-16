// diagnose-database.js
const mongoose = require('mongoose');

const MONGO_URI = 'mongodb+srv://vaishnawtushar:Password0@cluster0.a8zbi.mongodb.net/inventoryjune';

async function diagnoseDatabaseIssues() {
  try {
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Get list of all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('\n📋 Collections in database:');
    collections.forEach(collection => {
      console.log(`- ${collection.name}`);
    });

    // Check Users collection
    console.log('\n👥 USERS COLLECTION DIAGNOSIS:');
    const usersCollection = mongoose.connection.collection('users');
    
    const userCount = await usersCollection.countDocuments();
    console.log(`Total users: ${userCount}`);

    if (userCount > 0) {
      // Get sample user structure
      const sampleUser = await usersCollection.findOne();
      console.log('Sample user structure:', JSON.stringify(sampleUser, null, 2));

      // Check indexes on users collection
      const userIndexes = await usersCollection.indexes();
      console.log('User collection indexes:');
      userIndexes.forEach(index => {
        console.log(`- ${JSON.stringify(index.key)} (unique: ${index.unique || false})`);
      });

      // Check users by status
      const usersByStatus = await usersCollection.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]).toArray();
      console.log('Users by status:');
      usersByStatus.forEach(stat => {
        console.log(`- ${stat._id}: ${stat.count}`);
      });

      // Check users by role
      const usersByRole = await usersCollection.aggregate([
        { $group: { _id: '$role', count: { $sum: 1 } } }
      ]).toArray();
      console.log('Users by role:');
      usersByRole.forEach(stat => {
        console.log(`- ${stat._id}: ${stat.count}`);
      });

      // Find admin users
      const adminUsers = await usersCollection.find({ role: 'admin' }).toArray();
      console.log(`Admin users found: ${adminUsers.length}`);
      adminUsers.forEach(admin => {
        console.log(`- Admin: ${admin.name} (${admin.email}) - Status: ${admin.status}`);
      });

    } else {
      console.log('❌ No users found in database!');
    }

    // Check Inventory collection
    console.log('\n📦 INVENTORY COLLECTION DIAGNOSIS:');
    const inventoryCollection = mongoose.connection.collection('inventories');
    
    const inventoryCount = await inventoryCollection.countDocuments();
    console.log(`Total inventory items: ${inventoryCount}`);

    if (inventoryCount > 0) {
      // Check inventory indexes
      const inventoryIndexes = await inventoryCollection.indexes();
      console.log('Inventory collection indexes:');
      inventoryIndexes.forEach(index => {
        console.log(`- ${JSON.stringify(index.key)} (unique: ${index.unique || false})`);
      });

      // Sample inventory item
      const sampleInventory = await inventoryCollection.findOne();
      console.log('Sample inventory structure:', JSON.stringify(sampleInventory, null, 2));

      // Check for duplicate skuId+bin combinations
      const duplicateCheck = await inventoryCollection.aggregate([
        { $group: { _id: { skuId: '$skuId', bin: '$bin' }, count: { $sum: 1 } } },
        { $match: { count: { $gt: 1 } } }
      ]).toArray();
      
      if (duplicateCheck.length > 0) {
        console.log('❌ Found duplicate skuId+bin combinations:');
        duplicateCheck.forEach(dup => {
          console.log(`- SKU: ${dup._id.skuId}, Bin: ${dup._id.bin} (${dup.count} duplicates)`);
        });
      } else {
        console.log('✅ No duplicate skuId+bin combinations found');
      }
    }

    // Check other collections
    const otherCollections = ['insets', 'outsets', 'bins'];
    for (const collName of otherCollections) {
      try {
        const collection = mongoose.connection.collection(collName);
        const count = await collection.countDocuments();
        console.log(`\n📊 ${collName.toUpperCase()} collection: ${count} documents`);
        
        if (count > 0) {
          const sample = await collection.findOne();
          console.log(`Sample ${collName} structure:`, JSON.stringify(sample, null, 2));
        }
      } catch (err) {
        console.log(`❌ Error checking ${collName} collection:`, err.message);
      }
    }

  } catch (error) {
    console.error('❌ Database diagnosis error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
    process.exit(0);
  }
}

diagnoseDatabaseIssues();