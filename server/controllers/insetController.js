// server/controllers/insetController.js
const Inset = require('../models/Inset');
const Inventory = require('../models/Inventory');

// Create a new inset (inbound entry)
const createInset = async (req, res) => {
  try {
    console.log('=== INSET CREATION START ===');
    console.log('Request body:', req.body);
    console.log('User from auth middleware:', req.userId, req.username);

    // Extract data from request body - only simplified fields
    const { 
      skuId, 
      bin, 
      quantity, 
      user 
    } = req.body;

    // Validation - Check only required simplified fields
    const requiredFields = {
      skuId: 'SKU ID',
      bin: 'Bin Location',
      quantity: 'Quantity'
    };

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

    // Quantity validation
    if (Number(quantity) <= 0) {
      console.log('❌ Validation failed - invalid quantity:', quantity);
      return res.status(400).json({ 
        message: 'Quantity must be greater than 0',
        received: quantity
      });
    }

    console.log('✅ All validation passed');

    // Create inset document with simplified structure
    const insetData = {
      skuId: skuId.trim().toUpperCase(),
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
    console.log('SKU ID:', savedInset.skuId, 'Bin:', savedInset.bin);

    // Update inventory - FIXED to handle SKU+bin combinations properly
    try {
      console.log('📦 Updating inventory...');
      console.log(`Looking for existing inventory: SKU=${savedInset.skuId}, Bin=${savedInset.bin}`);
      
      const inventoryItem = await Inventory.updateStock(
        savedInset.skuId,
        savedInset.quantity,
        savedInset.bin
      );
      
      console.log('✅ Inventory updated:', {
        skuId: inventoryItem.skuId,
        bin: inventoryItem.bin,
        quantity: inventoryItem.quantity
      });
      
      // Log current inventory state for this SKU across all bins
      const allBins = await Inventory.getBinsBySku(savedInset.skuId);
      console.log(`📊 Current inventory for SKU ${savedInset.skuId}:`, allBins);
      
    } catch (invError) {
      console.error('❌ Failed to update inventory:', invError.message);
      // Continue with inset creation even if inventory update fails
      console.log('⚠️  Inset recorded but inventory update failed');
    }

    console.log('=== INSET CREATION SUCCESS ===');
    res.status(201).json({
      message: 'Inset recorded successfully',
      inset: savedInset
    });

  } catch (error) {
    console.error('=== INSET CREATION ERROR ===');
    console.error('Error details:', error);

    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        message: 'Validation Error', 
        errors: errors,
        details: error.errors
      });
    }

    if (error.code === 11000) {
      // Handle duplicate key error - could be from inset or inventory
      const duplicateField = Object.keys(error.keyPattern || {})[0];
      if (duplicateField) {
        return res.status(400).json({ 
          message: `A record with this ${duplicateField} already exists`,
          duplicateField: duplicateField,
          value: error.keyValue[duplicateField]
        });
      } else {
        return res.status(400).json({ 
          message: 'Duplicate record detected. This SKU+bin combination may already exist.',
          error: error.message
        });
      }
    }

    res.status(500).json({ 
      message: 'Server Error during inset creation',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Get all insets
const getAllInsets = async (req, res) => {
  try {
    const insets = await Inset.find()
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json(insets);
  } catch (error) {
    console.error('Get insets error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch insets', 
      error: error.message 
    });
  }
};

// Get inset by ID
const getInsetById = async (req, res) => {
  try {
    const { id } = req.params;
    const inset = await Inset.findById(id);

    if (!inset) {
      return res.status(404).json({ message: 'Inset not found' });
    }

    res.status(200).json(inset);
  } catch (error) {
    console.error('Get inset by ID error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch inset', 
      error: error.message 
    });
  }
};

// Update inset
const updateInset = async (req, res) => {
  try {
    const { id } = req.params;
    const { skuId, bin, quantity } = req.body;

    // Validation
    if (!skuId || !bin || !quantity) {
      return res.status(400).json({ 
        message: 'SKU ID, bin location, and quantity are required' 
      });
    }

    if (quantity <= 0) {
      return res.status(400).json({ 
        message: 'Quantity must be greater than 0' 
      });
    }

    const updatedInset = await Inset.findByIdAndUpdate(
      id,
      {
        skuId: skuId.trim().toUpperCase(),
        bin: bin.trim().toUpperCase(),
        quantity: Number(quantity)
      },
      { 
        new: true, 
        runValidators: true 
      }
    );

    if (!updatedInset) {
      return res.status(404).json({ message: 'Inset not found' });
    }

    res.status(200).json({ 
      message: 'Inset updated successfully', 
      inset: updatedInset 
    });

  } catch (error) {
    console.error('Update inset error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: 'This record combination already exists.' 
      });
    }
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: validationErrors 
      });
    }
    
    res.status(500).json({ 
      message: 'Failed to update inset', 
      error: error.message 
    });
  }
};

// Delete inset
const deleteInset = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedInset = await Inset.findByIdAndDelete(id);

    if (!deletedInset) {
      return res.status(404).json({ message: 'Inset not found' });
    }

    res.status(200).json({ 
      message: 'Inset deleted successfully', 
      inset: deletedInset 
    });

  } catch (error) {
    console.error('Delete inset error:', error);
    res.status(500).json({ 
      message: 'Failed to delete inset', 
      error: error.message 
    });
  }
};

module.exports = {
  createInset,
  getAllInsets,
  getInsetById,
  updateInset,
  deleteInset
};