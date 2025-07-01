const express = require('express');
const router = express.Router();
const Outset = require('../models/Outset');
const Inventory = require('../models/Inventory');
const auth = require('../middleware/auth');

// @route   POST /api/outset
// @desc    Create outbound record
router.post('/', auth, async (req, res) => {
  try {
    const { sku, quantity, customerName, invoiceNo, bin } = req.body;

    // Verify item exists and has sufficient quantity
    const inventoryItem = await Inventory.findOne({ sku });
    if (!inventoryItem) {
      return res.status(400).json({ message: 'Item not found in inventory' });
    }

    if (inventoryItem.quantity < quantity) {
      return res.status(400).json({ 
        message: `Insufficient stock. Only ${inventoryItem.quantity} available` 
      });
    }

    // Create outset record
    const outset = new Outset({
      sku,
      name: inventoryItem.name,
      quantity,
      bin,
      customerName,
      invoiceNo,
      user: {
        id: req.user.id,
        name: req.user.name
      }
    });

    await outset.save();
    res.status(201).json(outset);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// @route   GET /api/outset
// @desc    Get all outbound records
router.get('/', auth, async (req, res) => {
  try {
    const outsets = await Outset.find().sort({ createdAt: -1 });
    res.json(outsets);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;
