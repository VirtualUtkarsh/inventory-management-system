const express = require('express');
const router = express.Router();

const Inventory = require('../models/Inventory');
const AuditLog = require('../models/AuditLog');
const { 
  getInventory,
  updateQuantity,
  getInventoryStats,
  getLowStock,
  searchInventory,
  getInventoryBySKU  // NEW: Added the new endpoint
} = require('../controllers/inventoryController');

const { auth } = require('../middleware/auth');

const multer = require('multer');
const { importInventoryExcel } = require('../controllers/inventoryController');

// Configure multer for file upload (memory storage for Excel processing)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1 // Only one file at a time
  },
  fileFilter: (req, file, cb) => {
    // Accept Excel files
    if (file.mimetype.includes('spreadsheet') || 
        file.mimetype.includes('excel') ||
        file.originalname.match(/\.(xlsx|xls)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files (.xlsx, .xls) are allowed'), false);
    }
  }
});
// Add this route to your existing routes (after your current routes):

// @route   POST /api/inventory/import-excel
// @desc    Import inventory from Excel file
// @access  Private
router.post('/import-excel', upload.single('excelFile'), importInventoryExcel);

// Error handling middleware for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large',
        details: 'File size must be less than 10MB'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files',
        details: 'Please upload only one file at a time'
      });
    }
  }
  
  if (error.message.includes('Only Excel files')) {
    return res.status(400).json({
      success: false,
      message: 'Invalid file type',
      details: error.message
    });
  }
  
  next(error);
});

// Apply authentication middleware to all routes
router.use(auth);

// ================= Controller-based routes ================= //

// @route   GET /api/inventory
// @desc    Get all inventory items
// @access  Private
router.get('/', getInventory);

// @route   GET /api/inventory/stats
// @desc    Get inventory statistics
// @access  Private
router.get('/stats', getInventoryStats);

// @route   GET /api/inventory/low-stock
// @desc    Get low stock items
// @access  Private
router.get('/low-stock', getLowStock);

// @route   GET /api/inventory/search
// @desc    Search inventory items
// @access  Private
router.get('/search', searchInventory);

// @route   GET /api/inventory/sku/:skuId
// @desc    Get all bins for a specific SKU
// @access  Private
router.get('/sku/:skuId', getInventoryBySKU);

// @route   PUT /api/inventory/quantity
// @desc    Update item quantity
// @access  Private
router.put('/quantity', updateQuantity);

// ================= FIXED Legacy routes with Audit Log ================= //

// @route   POST /api/inventory/inset
// @desc    Add inbound inventory
// @access  Private
router.post('/inset', async (req, res) => {
  const { sku, skuId, name, bin, quantity = 1 } = req.body;
  
  // Use skuId if provided, otherwise fall back to sku for backward compatibility
  const productSku = skuId || sku;

  try {
    if (!productSku || !bin) {
      return res.status(400).json({ 
        msg: 'SKU ID and bin location are required',
        required: ['skuId (or sku)', 'bin'],
        received: { skuId: productSku, bin }
      });
    }

    const item = await Inventory.updateStock(productSku, quantity, bin);

    // Audit log
    await new AuditLog({
      actionType: 'STOCK_INCREASE',
      collectionName: 'Inventory',
      documentId: item._id,
      changes: { 
        skuId: productSku, 
        bin: bin,
        quantity: quantity 
      },
      user: { 
        id: req.userId, 
        name: req.username 
      }
    }).save();

    res.json({
      message: 'Inventory updated successfully',
      item: item
    });
  } catch (err) {
    console.error('Legacy inset error:', err.message);
    res.status(400).json({ 
      msg: err.message,
      details: 'Make sure SKU and bin combination is valid'
    });
  }
});

// @route   POST /api/inventory/outset
// @desc    Remove outbound inventory
// @access  Private
router.post('/outset', async (req, res) => {
  const { sku, skuId, bin, quantity = 1 } = req.body;
  
  // Use skuId if provided, otherwise fall back to sku for backward compatibility
  const productSku = skuId || sku;

  try {
    if (!productSku) {
      return res.status(400).json({ 
        msg: 'SKU ID is required',
        received: { skuId: productSku }
      });
    }

    // If no bin specified, try to find any bin with this SKU
    let targetBin = bin;
    if (!targetBin) {
      const availableBins = await Inventory.getBinsBySku(productSku);
      if (availableBins.length === 0) {
        return res.status(404).json({ 
          msg: 'Product not found in inventory',
          skuId: productSku 
        });
      }
      
      // Find first bin with sufficient stock
      const suitableBin = availableBins.find(b => b.quantity >= quantity);
      if (!suitableBin) {
        return res.status(400).json({ 
          msg: 'Insufficient stock in any bin',
          availableBins: availableBins,
          requested: quantity
        });
      }
      
      targetBin = suitableBin.bin;
    }

    const item = await Inventory.updateStock(productSku, -quantity, targetBin);

    // Audit log
    await new AuditLog({
      actionType: 'STOCK_DECREASE',
      collectionName: 'Inventory',
      documentId: item._id,
      changes: { 
        skuId: productSku,
        bin: targetBin, 
        quantity: -quantity 
      },
      user: { 
        id: req.userId, 
        name: req.username 
      }
    }).save();

    res.json({
      message: 'Inventory updated successfully',
      item: item,
      removedFrom: targetBin
    });
  } catch (err) {
    console.error('Legacy outset error:', err.message);
    res.status(400).json({ 
      msg: err.message,
      details: 'Make sure SKU has sufficient stock in the specified bin'
    });
  }
});

// ================= Helper routes for debugging ================= //

// @route   GET /api/inventory/debug/all
// @desc    Get ALL inventory items including zero stock (for debugging)
// @access  Private
router.get('/debug/all', async (req, res) => {
  try {
    const allItems = await Inventory.find()
      .sort({ skuId: 1, bin: 1 })
      .lean();
    
    // Group by SKU for easier debugging
    const grouped = {};
    allItems.forEach(item => {
      if (!grouped[item.skuId]) {
        grouped[item.skuId] = [];
      }
      grouped[item.skuId].push({
        bin: item.bin,
        quantity: item.quantity,
        _id: item._id,
        lastUpdated: item.lastUpdated
      });
    });
    
    res.json({
      totalRecords: allItems.length,
      uniqueSKUs: Object.keys(grouped).length,
      items: allItems,
      groupedBySKU: grouped
    });
  } catch (err) {
    console.error('Debug inventory error:', err);
    res.status(500).json({ msg: err.message });
  }
});

module.exports = router;