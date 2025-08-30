const Inset = require('../models/Inset');
const Inventory = require('../models/Inventory');

// Create a new inset (inbound entry)
const createInset = async (req, res) => {
  try {
    console.log('=== INSET CREATION START ===');
    console.log('Request body:', req.body);
    console.log('User from auth middleware:', req.userId, req.username);

    // Extract data from request body
    const { 
      baseSku, 
      size, 
      color, 
      pack, 
      category, 
      name, 
      orderNo, 
      bin, 
      quantity, 
      user 
    } = req.body;

    // Validation - Check all required fields
    const requiredFields = {
      baseSku: 'Base SKU',
      size: 'Size',
      color: 'Color', 
      pack: 'Pack',
      category: 'Category',
      name: 'Item Name',
      orderNo: 'Order Number',
      bin: 'Bin Location',
      quantity: 'Quantity'
    };

    // Check for missing fields
    for (const [field, label] of Object.entries(requiredFields)) {
      if (!req.body[field] || req.body[field] === '' || req.body[field] === 0) {
        console.log(`❌ Validation failed - ${label} is missing:`, req.body[field]);
        return res.status(400).json({ 
          message: `${label} is required`,
          field: field,
          received: req.body[field]
        });
      }
    }

    // Additional quantity validation
    if (Number(quantity) <= 0) {
      console.log('❌ Validation failed - invalid quantity:', quantity);
      return res.status(400).json({ 
        message: 'Quantity must be greater than 0',
        received: quantity
      });
    }

    console.log('✅ All validation passed');

    // Create the inset document
    const insetData = {
      baseSku: baseSku.trim().toUpperCase(),
      size: size.trim().toUpperCase(),
      color: color.trim().toUpperCase(),
      pack: pack.trim(),
      category: category.trim(),
      name: name.trim(),
      orderNo: orderNo.trim(),
      bin: bin.trim().toUpperCase(),
      quantity: Number(quantity),
      user: {
        id: user?.id || req.userId,
        name: user?.name || req.username || 'System'
      }
    };

    console.log('Creating inset with data:', insetData);

    const inset = new Inset(insetData);
    const savedInset = await inset.save();
    
    console.log('✅ Inset saved successfully:', savedInset._id);
    console.log('Generated SKU ID:', savedInset.skuId);

    // Update inventory after inset is saved
    try {
      console.log('📦 Updating inventory...');
      const inventoryItem = await Inventory.updateStock(
        savedInset.skuId,
        savedInset.quantity,
        savedInset.bin,
        savedInset.name,
        savedInset.baseSku,
        savedInset.size,
        savedInset.color,
        savedInset.pack,
        savedInset.category
      );
      console.log('✅ Inventory updated:', inventoryItem.skuId);
    } catch (invError) {
      console.error('❌ Failed to update inventory:', invError.message);
      // Continue - don't fail the inset creation if inventory update fails
    }

    console.log('=== INSET CREATION SUCCESS ===');
    res.status(201).json({
      message: 'Inset recorded successfully',
      inset: savedInset
    });

  } catch (error) {
    console.error('=== INSET CREATION ERROR ===');
    console.error('Error details:', error);

    // Handle mongoose validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        message: 'Validation Error', 
        errors: errors,
        details: error.errors
      });
    }

    // Handle duplicate SKU error
    if (error.code === 11000) {
      const duplicateField = Object.keys(error.keyPattern)[0];
      return res.status(400).json({ 
        message: `A record with this ${duplicateField} already exists`,
        duplicateField: duplicateField,
        value: error.keyValue[duplicateField]
      });
    }

    // Generic server error
    res.status(500).json({ 
      message: 'Server Error during inset creation',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Get all insets (inbound history)
const getInsets = async (req, res) => {
  try {
    console.log('=== FETCHING INSETS ===');
    
    const insets = await Inset.find()
      .sort({ createdAt: -1 }) // Latest first
      .lean(); // For better performance
    
    console.log(`✅ Found ${insets.length} insets`);
    
    res.status(200).json(insets);
  } catch (error) {
    console.error('=== FETCH INSETS ERROR ===');
    console.error('Error details:', error);
    
    res.status(500).json({ 
      message: 'Failed to fetch inset history',
      error: error.message
    });
  }
};

module.exports = {
  createInset,
  getInsets
};