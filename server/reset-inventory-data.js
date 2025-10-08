const mongoose = require('mongoose');
const connectDB = require('./config/db'); // Use the connectDB function from your app

// Import the Models for deletion
const Inventory = require('./models/Inventory');
const Inset = require('./models/Inset');
const AuditLog = require('./models/AuditLog'); // Optional, but recommended for cleanup

// --- The Core Reset Function ---
const runReset = async () => {
    // 1. Establish database connection
    await connectDB();
    console.log("Database connection established for data reset.");

    try {
        // --- 2. DELETE INVENTORY DATA ---
        console.log("\n🗑️  Starting Inventory (inventories) deletion...");
        const invResult = await Inventory.deleteMany({});
        console.log(`✅ Success: Deleted ${invResult.deletedCount} Inventory records.`);

        // --- 3. DELETE INBOUND DATA ---
        console.log("\n🗑️  Starting Inbound (insets) deletion...");
        const insetResult = await Inset.deleteMany({});
        console.log(`✅ Success: Deleted ${insetResult.deletedCount} Inset (Inbound) records.`);
        
        // --- 4. CLEANUP AUDIT LOGS (Recommended step to avoid orphaned records) ---
        // This clears audit records related to Inventory and Inset actions.
        console.log("\n🧹 Starting AuditLog cleanup for Inventory and Inset actions...");
        const auditCleanupResult = await AuditLog.deleteMany({
            collectionName: { $in: ['Inventory', 'Inset'] }
        });
        console.log(`✅ Success: Deleted ${auditCleanupResult.deletedCount} AuditLog records related to Inventory/Inset.`);

        // --- 5. VERIFICATION ---
        const finalInvCount = await Inventory.countDocuments({});
        const finalInsetCount = await Inset.countDocuments({});
        console.log(`\n🎉 Reset Complete: Inventory count: ${finalInvCount}, Inset count: ${finalInsetCount}.`);
        
        // Final confirmation that bins are untouched (implicitly confirmed as we didn't run delete on the Bin model)
        console.log("The 'Bin' data remains untouched. Please manually check the database if confirmation is required.");

    } catch (error) {
        console.error("\n❌ CRITICAL ERROR DURING RESET PROCESS:", error);
    } finally {
        // 6. Close the connection
        await mongoose.connection.close();
        console.log("\nDatabase connection closed.");
    }
};

runReset();