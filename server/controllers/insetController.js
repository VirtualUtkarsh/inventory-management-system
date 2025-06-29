const Inset = require('../models/Inset'); // Make sure this matches your model file name
const Inventory = require('../models/Inventory');
const AuditLog = require('../models/AuditLog');

const createInset = async (req, res) => {
  try {
    console.log('=== INSET CREATION START ===');
    console.log('Request body:', req.body);
    console.log('User ID:', req.userId);
    console.log('Username:', req.username);

    const { sku, orderNo, bin, quantity } = req.body;

    // Validate required fields
    if (!sku || !orderNo || !bin || !quantity) {
      console.log('❌ Validation failed - missing fields');
      return res.status(400).json({ message: 'All fields are required' });
    }

    console.log('✅ Validation passed');

    // Step 1: Update inventory
    console.log('📦 Updating inventory...');
    const inventoryItem = await Inventory.updateStock(sku, parseInt(quantity), bin);
    console.log('✅ Inventory updated:', inventoryItem);

    // Step 2: Create inset record
    console.log('📝 Creating inset record...');
    const inset = new Inset({
      sku,
      orderNo,
      bin,
      quantity: parseInt(quantity),
      user: {
        id: req.userId,
        name: req.username
      }
    });
    console.log('Inset object created:', inset);
    
    await inset.save();
    console.log('✅ Inset saved to database');

// Step 3: Create audit log
console.log('📋 Creating audit log...');
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
    console.error('Error details:', err);
    console.error('Error message:', err.message);
    console.error('Error stack:', err.stack);
    
    res.status(500).json({ 
      message: 'Server Error',
      error: err.message,
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
};

const getInsets = async (req, res) => {
  try {
    const insets = await Inset.find().sort({ createdAt: -1 });
    res.json(insets);
  } catch (err) {
    console.error('Error in getInsets:', err.message);
    res.status(500).json({ 
      message: 'Server Error',
      error: err.message 
    });
  }
};

module.exports = { createInset, getInsets };