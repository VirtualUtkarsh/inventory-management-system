const Inset = require('../models/Inset');
const Inventory = require('../models/Inventory');
const AuditLog = require('../models/AuditLog');

// Create a new inset and update inventory + log audit
const createInset = async (req, res) => {
  try {
    console.log('=== INSET CREATION START ===');
    console.log('Request body:', req.body);
    console.log('User ID:', req.userId);
    console.log('Username:', req.username);

    const { sku, orderNo, bin, quantity, name } = req.body;

    // Basic validation
    if (!sku || !orderNo || !bin || !quantity || !name) {
      console.log('❌ Validation failed - missing fields');
      return res.status(400).json({ message: 'All fields are required' });
    }

    console.log('✅ Validation passed');

    // Step 1: Update inventory
    console.log('📦 Updating inventory...');
    const inventoryItem = await Inventory.updateStock(sku, parseInt(quantity), bin);
    console.log('✅ Inventory updated:', inventoryItem);

    // Step 2: Create Inset document
    const inset = new Inset({
      sku,
      name,
      orderNo,
      bin,
      quantity: parseInt(quantity),
      user: {
        id: req.userId,
        name: req.username
      }
    });

    await inset.save();
    console.log('✅ Inset saved to database');

    // Step 3: Create audit log
    const log = new AuditLog({
      actionType: 'CREATE',
      collectionName: 'Inset',
      documentId: inset._id,
      user: {
        id: req.userId,
        name: req.username
      }
    });

    await log.save();
    console.log('✅ Audit log created');

    console.log('=== INSET CREATION SUCCESS ===');
    res.status(201).json({
      message: 'Inset recorded successfully',
      inset,
      inventoryItem
    });

  } catch (err) {
    console.error('=== INSET CREATION ERROR ===');
    console.error('Error:', err);

    res.status(500).json({
      message: 'Server Error',
      error: err.message,
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
};

// Get all insets
const getInsets = async (req, res) => {
  try {
    const insets = await Inset.find()
      .sort({ createdAt: -1 })
      .populate('user.id', 'name'); // Populate only the user name

    res.status(200).json(insets);
  } catch (err) {
    console.error('Error in getInsets:', err.message);
    res.status(500).json({
      message: 'Server Error',
      error: err.message
    });
  }
};

module.exports = {
  createInset,
  getInsets
};
