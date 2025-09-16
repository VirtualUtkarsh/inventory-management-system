// fix.js
const mongoose = require('mongoose');

// Replace this with your actual MongoDB connection string
const MONGO_URI='mongodb+srv://vaishnawtushar:Password0@cluster0.a8zbi.mongodb.net/inventoryjune';


async function run() {
    try {
        await mongoose.connect(MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('✅ Connected to MongoDB');

        const inventoryCollection = mongoose.connection.collection('inventories');

        // Drop the old index on skuId
        try {
            await inventoryCollection.dropIndex('skuId_1');
            console.log('✅ Old index "skuId_1" dropped');
        } catch (err) {
            if (err.codeName === 'IndexNotFound') {
                console.log('ℹ️ Old index "skuId_1" not found, skipping drop');
            } else {
                throw err;
            }
        }

        // Create the new unique index on skuId and bin
        await inventoryCollection.createIndex({ skuId: 1, bin: 1 }, { unique: true });
        console.log('✅ New unique index on { skuId: 1, bin: 1 } created');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('✅ Disconnected from MongoDB');
        process.exit(0);
    }
}

run();
