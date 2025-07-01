const express = require('express');
const router = express.Router();
const Inventory = require('../models/Inventory');
const AuditLog = require('../models/AuditLog');
const auth = require('../middleware/auth');

// @route   GET /api/inventory
// @desc    Get all inventory items
router.get('/', auth, async (req, res) => {
  try {
    const inventory = await Inventory.find().sort({ sku: 1 });
    res.json(inventory);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST /api/inventory/inset
// @desc    Add inbound inventory
router.post('/inset', auth, async (req, res) => {
  const { sku, name, bin, quantity = 1 } = req.body;

  try {
    const item = await Inventory.updateStock(sku, quantity, bin, name);
    
    // Audit log
    await new AuditLog({
      actionType: 'CREATE',
      collection: 'Inventory',
      documentId: item._id,
      changes: { 
        sku,
        quantity: quantity,
        bin
      },
      user: {
        id: req.user.id,
        name: req.user.name
      }
    }).save();

    res.json(item);
  } catch (err) {
    console.error(err.message);
    res.status(400).json({ msg: err.message });
  }
});

// @route   POST /api/inventory/outset
// @desc    Remove outbound inventory
router.post('/outset', auth, async (req, res) => {
  const { sku, quantity = 1 } = req.body;

  try {
    const item = await Inventory.updateStock(sku, -quantity);
    
    // Audit log
    await new AuditLog({
      actionType: 'UPDATE',
      collection: 'Inventory',
      documentId: item._id,
      changes: { 
        quantity: -quantity 
      },
      user: {
        id: req.user.id,
        name: req.user.name
      }
    }).save();

    res.json(item);
  } catch (err) {
    console.error(err.message);
    res.status(400).json({ msg: err.message });
  }
});

module.exports = router;
