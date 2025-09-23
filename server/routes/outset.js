const express = require('express');
const router = express.Router();
const Outset = require('../models/Outset');
const Inventory = require('../models/Inventory');
const AuditLog = require('../models/AuditLog');
const {auth} = require('../middleware/auth');

// @route   POST /api/outset
// @desc    Create outbound record
router.post('/', auth, async (req, res) => {
  try {
    console.log('=== OUTSET CREATION START ===');
    console.log('Request body:', req.body);
    
    const { skuId, quantity, customerName, invoiceNo, bin } = req.body;

    // Validation
    if (!skuId || !quantity || !customerName || !invoiceNo) {
      return res.status(400).json({ 
        message: 'SKU ID, quantity, customer name, and invoice number are required' 
      });
    }

    if (Number(quantity) <= 0) {
      return res.status(400).json({ 
        message: 'Quantity must be greater than 0' 
      });
    }

    // Check if inventory item exists and has sufficient stock
    const inventoryItem = await Inventory.findOne({ skuId });
    if (!inventoryItem) {
      return res.status(404).json({ 
        message: 'Product not found in inventory',
        skuId: skuId
      });
    }

    if (inventoryItem.quantity < quantity) {
      return res.status(400).json({ 
        message: `Insufficient stock. Only ${inventoryItem.quantity} available`,
        available: inventoryItem.quantity,
        requested: quantity
      });
    }

    console.log('Stock validation passed, proceeding with updates...');

    // **FIX: Update inventory using the updateStock method**
    const updatedInventoryItem = await Inventory.updateStock(
      skuId, 
      -quantity, // Negative for outbound
      bin || inventoryItem.bin,
      inventoryItem.name,
      inventoryItem.baseSku,
      inventoryItem.size,
      inventoryItem.color,
      inventoryItem.pack,
      inventoryItem.category
    );

    console.log('Inventory updated successfully, creating outset record...');

    // Create outset record
    const outset = new Outset({
      skuId,
      name: inventoryItem.name,
      quantity: Number(quantity),
      bin: bin || inventoryItem.bin,
      customerName: customerName.trim(),
      invoiceNo: invoiceNo.trim(),
      // Include metadata for better tracking
      baseSku: inventoryItem.baseSku,
      size: inventoryItem.size,
      color: inventoryItem.color,
      pack: inventoryItem.pack,
      category: inventoryItem.category,
      user: {
        id: req.user.id,
        name: req.user.name
      }
    });

    const savedOutset = await outset.save();

    // Create audit log
    const log = new AuditLog({
      actionType: 'STOCK_DECREASE',
      collectionName: 'Outset',
      documentId: savedOutset._id,
      changes: {
        skuId: skuId,
        quantity: -quantity,
        customerName: customerName,
        invoiceNo: invoiceNo,
        oldStock: inventoryItem.quantity,
        newStock: updatedInventoryItem.quantity
      },
      user: {
        id: req.user.id,
        name: req.user.name
      }
    });
    await log.save();

    console.log('=== OUTSET CREATION SUCCESS ===');

    res.status(201).json({
      message: 'Outbound record created successfully',
      outset: savedOutset,
      inventoryUpdate: {
        skuId: skuId,
        oldQuantity: inventoryItem.quantity,
        newQuantity: updatedInventoryItem.quantity,
        removed: quantity
      }
    });

  } catch (error) {
    console.error('=== OUTSET CREATION ERROR ===');
    console.error('Error details:', error);

    // Handle specific errors
    if (error.message && error.message.includes('Insufficient stock')) {
      return res.status(400).json({ message: error.message });
    }

    if (error.message && error.message.includes('not found')) {
      return res.status(404).json({ message: 'Product not found in inventory' });
    }

    res.status(500).json({ 
      message: 'Failed to create outbound record',
      error: error.message
    });
  }
});

// @route   GET /api/outset
// @desc    Get all outbound records
router.get('/', auth, async (req, res) => {
  try {
    const outsets = await Outset.find().sort({ createdAt: -1 });
    res.json(outsets);
  } catch (error) {
    console.error('Error fetching outsets:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;