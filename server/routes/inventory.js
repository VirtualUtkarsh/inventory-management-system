const express = require('express');
const router = express.Router();

const Inventory = require('../models/Inventory');
const AuditLog = require('../models/AuditLog');
const { 
  getInventory,
  updateQuantity,
  getInventoryStats,
  getLowStock,
  searchInventory
} = require('../controllers/inventoryController');

const { auth } = require('../middleware/auth');

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

// @route   PUT /api/inventory/quantity
// @desc    Update item quantity
// @access  Private
router.put('/quantity', updateQuantity);


// ================= Legacy routes with Audit Log ================= //

// @route   POST /api/inventory/inset
// @desc    Add inbound inventory
// @access  Private
router.post('/inset', async (req, res) => {
  const { sku, name, bin, quantity = 1 } = req.body;

  try {
    const item = await Inventory.updateStock(sku, quantity, bin, name);

    // Audit log
    await new AuditLog({
      actionType: 'CREATE',
      collection: 'Inventory',
      documentId: item._id,
      changes: { sku, quantity, bin },
      user: { id: req.user.id, name: req.user.name }
    }).save();

    res.json(item);
  } catch (err) {
    console.error(err.message);
    res.status(400).json({ msg: err.message });
  }
});

// @route   POST /api/inventory/outset
// @desc    Remove outbound inventory
// @access  Private
router.post('/outset', async (req, res) => {
  const { sku, quantity = 1 } = req.body;

  try {
    const item = await Inventory.updateStock(sku, -quantity);

    // Audit log
    await new AuditLog({
      actionType: 'UPDATE',
      collection: 'Inventory',
      documentId: item._id,
      changes: { quantity: -quantity },
      user: { id: req.user.id, name: req.user.name }
    }).save();

    res.json(item);
  } catch (err) {
    console.error(err.message);
    res.status(400).json({ msg: err.message });
  }
});

module.exports = router;
