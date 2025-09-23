// server/utils/cleanupService.js
const Inventory = require('../models/Inventory');
const CleanupLog = require('../models/CleanupLog');

class CleanupService {
  constructor() {
    this.isRunning = false;
    this.intervalId = null;
  }

  // Start the cleanup service
  start() {
    if (this.isRunning) {
      console.log('🧹 Cleanup service is already running');
      return;
    }

    console.log('🧹 Starting inventory cleanup service...');
    this.isRunning = true;

    // Run immediately on start
    this.performCleanup();

    // Then run every 24 hours (86400000 milliseconds)
    this.intervalId = setInterval(() => {
      this.performCleanup();
    }, 24 * 60 * 60 * 1000);

    console.log('✅ Cleanup service started - will run every 24 hours');
  }

  // Stop the cleanup service
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('🛑 Cleanup service stopped');
  }

  // Main cleanup function
  async performCleanup() {
    try {
      console.log('🧹 Starting inventory cleanup process...');
      
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Find items with quantity 0 that haven't been updated for more than 30 days
      const itemsToDelete = await Inventory.find({
        quantity: 0,
        lastUpdated: { $lt: thirtyDaysAgo }
      });

      if (itemsToDelete.length === 0) {
        console.log('✅ No zero-stock items >30 days');
        return;
      }

      console.log(`🗑️  Found ${itemsToDelete.length} zero-stock items older than 30 days`);

      // Create cleanup log entry
      const cleanupLog = new CleanupLog({
        itemsRemoved: itemsToDelete.length,
        removedItems: itemsToDelete.map(item => ({
          skuId: item.skuId,
          bin: item.bin,
          lastUpdated: item.lastUpdated,
          daysInactive: Math.floor((new Date() - item.lastUpdated) / (1000 * 60 * 60 * 24))
        })),
        cleanupDate: new Date(),
        status: 'pending'
      });

      // Delete the items
      const deleteResult = await Inventory.deleteMany({
        _id: { $in: itemsToDelete.map(item => item._id) }
      });

      // Update cleanup log
      cleanupLog.status = 'completed';
      cleanupLog.actualItemsRemoved = deleteResult.deletedCount;
      await cleanupLog.save();

      console.log(`✅ Successfully removed ${deleteResult.deletedCount} zero-stock items`);
      
      // Log details for each removed item
      itemsToDelete.forEach(item => {
        const daysInactive = Math.floor((new Date() - item.lastUpdated) / (1000 * 60 * 60 * 24));
        console.log(`   📦 Removed: ${item.skuId} (Bin: ${item.bin}) - inactive for ${daysInactive} days`);
      });

    } catch (error) {
      console.error('❌ Cleanup process failed:', error);
      
      // Log the error
      try {
        const errorLog = new CleanupLog({
          itemsRemoved: 0,
          removedItems: [],
          cleanupDate: new Date(),
          status: 'failed',
          error: error.message
        });
        await errorLog.save();
      } catch (logError) {
        console.error('❌ Failed to log cleanup error:', logError);
      }
    }
  }

  // Manual cleanup trigger (for admin use)
  async manualCleanup() {
    console.log('🔧 Manual cleanup triggered...');
    await this.performCleanup();
  }

  // Get cleanup statistics
  async getCleanupStats() {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const [totalZeroStock, eligibleForCleanup, recentCleanups] = await Promise.all([
        Inventory.countDocuments({ quantity: 0 }),
        Inventory.countDocuments({
          quantity: 0,
          lastUpdated: { $lt: thirtyDaysAgo }
        }),
        CleanupLog.find({ cleanupDate: { $gte: thirtyDaysAgo } })
          .sort({ cleanupDate: -1 })
          .limit(5)
      ]);

      return {
        totalZeroStock,
        eligibleForCleanup,
        recentCleanups,
        serviceRunning: this.isRunning
      };
    } catch (error) {
      console.error('❌ Failed to get cleanup stats:', error);
      return null;
    }
  }
}

// Export singleton instance
const cleanupService = new CleanupService();
module.exports = cleanupService;