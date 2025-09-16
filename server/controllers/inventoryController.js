const Inventory = require('../models/Inventory');
const AuditLog = require('../models/AuditLog');

const getInventory = async (req, res) => {
  try {
    console.log('=== FETCHING INVENTORY ===');
    
    // Get all inventory items sorted by SKU ID, then by bin
    // This will show multiple records for same SKU in different bins
    const inventory = await Inventory.find({ quantity: { $gt: 0 } }) // Only items with stock
      .sort({ skuId: 1, bin: 1 })
      .lean(); // For better performance

    console.log(`Found ${inventory.length} inventory items (SKU+bin combinations)`);
    
    // Log the inventory structure for debugging
    const skuGroups = {};
    inventory.forEach(item => {
      if (!skuGroups[item.skuId]) skuGroups[item.skuId] = [];
      skuGroups[item.skuId].push({ bin: item.bin, quantity: item.quantity });
    });
    console.log('📊 Inventory by SKU:', skuGroups);
    
    res.status(200).json(inventory);
  } catch (err) {
    console.error('Error fetching inventory:', err);
    res.status(500).json({ 
      message: 'Failed to fetch inventory',
      error: err.message 
    });
  }
};

// FIXED: Update quantity for specific SKU+bin combination
const updateQuantity = async (req, res) => {
  try {
    console.log('=== UPDATING INVENTORY QUANTITY ===');
    console.log('Request body:', req.body);
    
    const { skuId, change, bin, reason } = req.body;

    // Validation
    if (!skuId) {
      return res.status(400).json({ message: 'SKU ID is required' });
    }
    
    if (!bin) {
      return res.status(400).json({ message: 'Bin location is required' });
    }
    
    if (!change || change === 0) {
      return res.status(400).json({ message: 'Quantity change is required and cannot be zero' });
    }

    // FIXED: Find by both SKU and bin
    const item = await Inventory.findOne({ skuId: skuId, bin: bin });
    
    if (!item) {
      // Check if SKU exists in other bins
      const otherBins = await Inventory.getBinsBySku(skuId);
      if (otherBins.length > 0) {
        return res.status(404).json({ 
          message: `SKU ${skuId} not found in bin ${bin}`,
          availableInBins: otherBins
        });
      } else {
        return res.status(404).json({ message: 'SKU not found in inventory' });
      }
    }

    const oldQuantity = item.quantity;
    const newQuantity = oldQuantity + change;

    if (newQuantity < 0) {
      return res.status(400).json({ 
        message: `Insufficient stock in bin ${bin}`,
        currentStock: oldQuantity,
        requestedChange: change 
      });
    }

    // Update the item
    item.quantity = newQuantity;
    item.lastUpdated = new Date();
    
    await item.save();

    // Create audit log
    const log = new AuditLog({
      actionType: change > 0 ? 'STOCK_INCREASE' : 'STOCK_DECREASE',
      collectionName: 'Inventory',
      documentId: item._id,
      changes: {
        skuId: item.skuId,
        bin: item.bin,
        oldQuantity: oldQuantity,
        newQuantity: newQuantity,
        change: change,
        reason: reason || 'Manual adjustment'
      },
      user: {
        id: req.userId,
        name: req.username
      }
    });
    
    await log.save();

    console.log(`✅ Updated ${skuId} in bin ${bin}: ${oldQuantity} → ${newQuantity}`);

    res.status(200).json({
      message: 'Inventory updated successfully',
      item: item,
      change: {
        from: oldQuantity,
        to: newQuantity,
        difference: change
      }
    });

  } catch (err) {
    console.error('Error updating inventory:', err);
    res.status(500).json({ 
      message: 'Failed to update inventory',
      error: err.message 
    });
  }
};

// ENHANCED: Get inventory statistics with bin awareness
const getInventoryStats = async (req, res) => {
  try {
    console.log('=== FETCHING INVENTORY STATS ===');
    
    const stats = await Inventory.aggregate([
      {
        $group: {
          _id: null,
          totalRecords: { $sum: 1 }, // Total SKU+bin combinations
          totalQuantity: { $sum: '$quantity' },
          lowStockRecords: {
            $sum: {
              $cond: [
                { $and: [{ $gt: ['$quantity', 0] }, { $lt: ['$quantity', 10] }] },
                1,
                0
              ]
            }
          },
          outOfStockRecords: {
            $sum: {
              $cond: [{ $eq: ['$quantity', 0] }, 1, 0]
            }
          },
          uniqueBins: { $addToSet: '$bin' },
          uniqueSKUs: { $addToSet: '$skuId' }
        }
      },
      {
        $project: {
          _id: 0,
          totalRecords: 1,
          totalQuantity: 1,
          lowStockRecords: 1,
          outOfStockRecords: 1,
          uniqueBinsCount: { $size: '$uniqueBins' },
          uniqueSKUsCount: { $size: '$uniqueSKUs' }
        }
      }
    ]);

    // Additional aggregation to get SKUs by bin distribution
    const skusByBin = await Inventory.aggregate([
      { $match: { quantity: { $gt: 0 } } },
      {
        $group: {
          _id: '$skuId',
          binCount: { $sum: 1 },
          bins: { $push: { bin: '$bin', quantity: '$quantity' } },
          totalQuantity: { $sum: '$quantity' }
        }
      },
      {
        $group: {
          _id: null,
          multiLocationSKUs: {
            $sum: { $cond: [{ $gt: ['$binCount', 1] }, 1, 0] }
          },
          singleLocationSKUs: {
            $sum: { $cond: [{ $eq: ['$binCount', 1] }, 1, 0] }
          }
        }
      }
    ]);

    const result = {
      ...(stats[0] || {
        totalRecords: 0,
        totalQuantity: 0,
        lowStockRecords: 0,
        outOfStockRecords: 0,
        uniqueBinsCount: 0,
        uniqueSKUsCount: 0
      }),
      ...(skusByBin[0] || {
        multiLocationSKUs: 0,
        singleLocationSKUs: 0
      })
    };

    console.log('✅ Stats calculated:', result);
    res.status(200).json(result);

  } catch (err) {
    console.error('Error fetching inventory stats:', err);
    res.status(500).json({ 
      message: 'Failed to fetch inventory statistics',
      error: err.message 
    });
  }
};

// ENHANCED: Get low stock items with bin information
const getLowStock = async (req, res) => {
  try {
    const threshold = parseInt(req.query.threshold) || 10;
    
    const lowStockItems = await Inventory.find({
      quantity: { $gt: 0, $lt: threshold }
    }).sort({ quantity: 1, skuId: 1, bin: 1 });

    // Group by SKU for better presentation
    const groupedLowStock = {};
    lowStockItems.forEach(item => {
      if (!groupedLowStock[item.skuId]) {
        groupedLowStock[item.skuId] = [];
      }
      groupedLowStock[item.skuId].push({
        bin: item.bin,
        quantity: item.quantity,
        _id: item._id
      });
    });

    res.status(200).json({
      items: lowStockItems,
      groupedBySKU: groupedLowStock,
      summary: {
        totalLowStockRecords: lowStockItems.length,
        uniqueSKUsAffected: Object.keys(groupedLowStock).length
      }
    });
  } catch (err) {
    console.error('Error fetching low stock items:', err);
    res.status(500).json({ 
      message: 'Failed to fetch low stock items',
      error: err.message 
    });
  }
};

// ENHANCED: Search inventory with bin awareness
const searchInventory = async (req, res) => {
  try {
    const { q, bin } = req.query;
    
    let query = { quantity: { $gt: 0 } }; // Only items with stock
    
    // Text search
    if (q) {
      query.skuId = { $regex: q, $options: 'i' };
    }
    
    // Filter by bin
    if (bin) {
      query.bin = { $regex: bin, $options: 'i' };
    }
    
    const results = await Inventory.find(query)
      .sort({ skuId: 1, bin: 1 })
      .limit(100); // Limit results for performance

    // Also provide grouped results by SKU
    const groupedResults = {};
    results.forEach(item => {
      if (!groupedResults[item.skuId]) {
        groupedResults[item.skuId] = [];
      }
      groupedResults[item.skuId].push({
        bin: item.bin,
        quantity: item.quantity,
        _id: item._id
      });
    });

    res.status(200).json({
      items: results,
      groupedBySKU: groupedResults,
      summary: {
        totalRecords: results.length,
        uniqueSKUs: Object.keys(groupedResults).length
      }
    });
  } catch (err) {
    console.error('Error searching inventory:', err);
    res.status(500).json({ 
      message: 'Failed to search inventory',
      error: err.message 
    });
  }
};

// NEW: Get inventory for a specific SKU across all bins
const getInventoryBySKU = async (req, res) => {
  try {
    const { skuId } = req.params;
    
    const items = await Inventory.find({ 
      skuId: skuId, 
      quantity: { $gt: 0 } 
    }).sort({ bin: 1 });
    
    if (items.length === 0) {
      return res.status(404).json({ message: 'SKU not found or out of stock' });
    }
    
    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
    
    res.status(200).json({
      skuId: skuId,
      totalQuantity: totalQuantity,
      binLocations: items.map(item => ({
        bin: item.bin,
        quantity: item.quantity,
        _id: item._id,
        lastUpdated: item.lastUpdated
      })),
      summary: {
        binCount: items.length,
        totalQuantity: totalQuantity
      }
    });
  } catch (err) {
    console.error('Error fetching inventory by SKU:', err);
    res.status(500).json({ 
      message: 'Failed to fetch inventory for SKU',
      error: err.message 
    });
  }
};

module.exports = { 
  getInventory, 
  updateQuantity, 
  getInventoryStats, 
  getLowStock, 
  searchInventory,
  getInventoryBySKU 
};