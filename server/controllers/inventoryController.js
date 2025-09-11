const Inventory = require('../models/Inventory');
const AuditLog = require('../models/AuditLog');

const getInventory = async (req, res) => {
  try {
    console.log('=== FETCHING INVENTORY ===');
    
    // Get all inventory items sorted by SKU ID
    const inventory = await Inventory.find()
      .sort({ skuId: 1 })
      .lean(); // For better performance

    console.log(`Found ${inventory.length} inventory items`);
    
    res.status(200).json(inventory);
  } catch (err) {
    console.error('Error fetching inventory:', err);
    res.status(500).json({ 
      message: 'Failed to fetch inventory',
      error: err.message 
    });
  }
};

const updateQuantity = async (req, res) => {
  try {
    console.log('=== UPDATING INVENTORY QUANTITY ===');
    console.log('Request body:', req.body);
    
    const { skuId, change, bin, reason } = req.body;

    // Validation
    if (!skuId) {
      return res.status(400).json({ message: 'SKU ID is required' });
    }
    
    if (!change || change === 0) {
      return res.status(400).json({ message: 'Quantity change is required and cannot be zero' });
    }

    // Find and update the inventory item
    const item = await Inventory.findOne({ skuId });
    
    if (!item) {
      return res.status(404).json({ message: 'Inventory item not found' });
    }

    const oldQuantity = item.quantity;
    const newQuantity = oldQuantity + change;

    if (newQuantity < 0) {
      return res.status(400).json({ 
        message: 'Insufficient stock',
        currentStock: oldQuantity,
        requestedChange: change 
      });
    }

    // Update the item
    item.quantity = newQuantity;
    if (bin) item.bin = bin;
    item.lastUpdated = new Date();
    
    await item.save();

    // Create audit log
    const log = new AuditLog({
      actionType: change > 0 ? 'STOCK_INCREASE' : 'STOCK_DECREASE',
      collectionName: 'Inventory',
      documentId: item._id,
      changes: {
        skuId: item.skuId,
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

    console.log(`✅ Updated ${skuId}: ${oldQuantity} → ${newQuantity}`);

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

// Get inventory statistics
const getInventoryStats = async (req, res) => {
  try {
    console.log('=== FETCHING INVENTORY STATS ===');
    
    const stats = await Inventory.aggregate([
      {
        $group: {
          _id: null,
          totalItems: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' },
          lowStockItems: {
            $sum: {
              $cond: [
                { $and: [{ $gt: ['$quantity', 0] }, { $lt: ['$quantity', 10] }] },
                1,
                0
              ]
            }
          },
          outOfStockItems: {
            $sum: {
              $cond: [{ $eq: ['$quantity', 0] }, 1, 0]
            }
          },
          uniqueBins: { $addToSet: '$bin' },
          uniqueBaseSKUs: { $addToSet: '$baseSku' },
          uniqueCategories: { $addToSet: '$category' }
        }
      },
      {
        $project: {
          _id: 0,
          totalItems: 1,
          totalQuantity: 1,
          lowStockItems: 1,
          outOfStockItems: 1,
          uniqueBinsCount: { $size: '$uniqueBins' },
          uniqueBaseSKUsCount: { $size: '$uniqueBaseSKUs' },
          uniqueCategoriesCount: { $size: '$uniqueCategories' }
        }
      }
    ]);

    const result = stats[0] || {
      totalItems: 0,
      totalQuantity: 0,
      lowStockItems: 0,
      outOfStockItems: 0,
      uniqueBinsCount: 0,
      uniqueBaseSKUsCount: 0,
      uniqueCategoriesCount: 0
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

// Get low stock items
const getLowStock = async (req, res) => {
  try {
    const threshold = parseInt(req.query.threshold) || 10;
    
    const lowStockItems = await Inventory.find({
      quantity: { $gt: 0, $lt: threshold }
    }).sort({ quantity: 1 });

    res.status(200).json(lowStockItems);
  } catch (err) {
    console.error('Error fetching low stock items:', err);
    res.status(500).json({ 
      message: 'Failed to fetch low stock items',
      error: err.message 
    });
  }
};

// Search inventory
const searchInventory = async (req, res) => {
  try {
    const { q, baseSku, size, color, category } = req.query;
    
    let query = {};
    
    // Text search
    if (q) {
      query.$or = [
        { skuId: { $regex: q, $options: 'i' } },
        { name: { $regex: q, $options: 'i' } },
        { baseSku: { $regex: q, $options: 'i' } }
      ];
    }
    
    // Filter by attributes
    if (baseSku) query.baseSku = baseSku;
    if (size) query.size = size;
    if (color) query.color = { $regex: color, $options: 'i' };
    if (category) query.category = category;
    
    const results = await Inventory.find(query)
      .sort({ skuId: 1 })
      .limit(100); // Limit results for performance

    res.status(200).json(results);
  } catch (err) {
    console.error('Error searching inventory:', err);
    res.status(500).json({ 
      message: 'Failed to search inventory',
      error: err.message 
    });
  }
};

module.exports = { 
  getInventory, 
  updateQuantity, 
  getInventoryStats, 
  getLowStock, 
  searchInventory 
};