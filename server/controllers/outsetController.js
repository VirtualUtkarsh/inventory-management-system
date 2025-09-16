const Outset = require('../models/Outset');
const Inventory = require('../models/Inventory');
const AuditLog = require('../models/AuditLog');

// Create a new outset (outbound entry)
const createOutset = async (req, res) => {
  try {
    console.log('=== OUTSET CREATION START ===');
    console.log('Request body:', req.body);
    console.log('User from auth middleware:', req.userId, req.username);

    const { skuId, quantity, customerName, invoiceNo, bin, user } = req.body;

    // Validation - Check all required fields
    const requiredFields = {
      skuId: 'SKU ID',
      quantity: 'Quantity',
      customerName: 'Customer Name',
      invoiceNo: 'Invoice Number',
      bin: 'Bin Location'  // Now required since we need to know which bin to deduct from
    };

    // Check for missing fields
    for (const [field, label] of Object.entries(requiredFields)) {
      if (!req.body[field] || req.body[field] === '' || req.body[field] === 0) {
        console.log(`Validation failed - ${label} is missing:`, req.body[field]);
        return res.status(400).json({ 
          message: `${label} is required`,
          field: field,
          received: req.body[field]
        });
      }
    }

    // Additional quantity validation
    if (Number(quantity) <= 0) {
      console.log('Validation failed - invalid quantity:', quantity);
      return res.status(400).json({ 
        message: 'Quantity must be greater than 0',
        received: quantity
      });
    }

    console.log('All validation passed');

    // FIXED: Check if inventory item exists for SPECIFIC SKU+bin combination
    console.log(`Looking for inventory: SKU=${skuId}, Bin=${bin}`);
    const inventoryItem = await Inventory.findOne({ skuId: skuId, bin: bin });
    
    if (!inventoryItem) {
      console.log('Inventory item not found for skuId + bin combination:', skuId, bin);
      
      // Check if SKU exists in other bins to provide helpful error message
      const otherBins = await Inventory.getBinsBySku(skuId);
      if (otherBins.length > 0) {
        return res.status(404).json({ 
          message: `Product not found in bin ${bin}. Available in bins: ${otherBins.map(b => `${b.bin}(${b.quantity})`).join(', ')}`,
          skuId: skuId,
          requestedBin: bin,
          availableBins: otherBins
        });
      } else {
        return res.status(404).json({ 
          message: 'Product not found in inventory',
          skuId: skuId
        });
      }
    }

    if (inventoryItem.quantity < quantity) {
      console.log(`Insufficient stock in bin ${bin} - Available: ${inventoryItem.quantity}, Requested: ${quantity}`);
      
      // Check total availability across all bins for helpful error message
      const totalAvailable = await Inventory.getTotalQuantityBySku(skuId);
      const allBins = await Inventory.getBinsBySku(skuId);
      
      return res.status(400).json({ 
        message: `Insufficient stock in bin ${bin}. Only ${inventoryItem.quantity} available in this bin`,
        available: inventoryItem.quantity,
        requested: quantity,
        totalAcrossAllBins: totalAvailable,
        availableInOtherBins: allBins.filter(b => b.bin !== bin)
      });
    }

    console.log('Stock check passed, updating inventory...');

    // FIXED: Update inventory for specific SKU+bin combination (negative quantity for outbound)
    const updatedInventoryItem = await Inventory.updateStock(
      skuId, 
      -quantity, 
      bin  // Use the specific bin that was selected
    );

    console.log('Inventory updated successfully, creating outset record...');

    // Create outset record
    const outsetData = {
      skuId: skuId.trim(),
      quantity: Number(quantity),
      bin: bin.trim(), // Store the specific bin used
      customerName: customerName.trim(),
      invoiceNo: invoiceNo.trim(),
      user: user || {
        id: req.userId,
        name: req.username
      }
    };

    console.log('Creating outset with data:', outsetData);

    const outset = new Outset(outsetData);
    const savedOutset = await outset.save();

    console.log('Outset saved successfully:', savedOutset._id);

    // Create audit log
    const log = new AuditLog({
      actionType: 'STOCK_DECREASE',
      collectionName: 'Outset',
      documentId: savedOutset._id,
      changes: {
        skuId: skuId,
        bin: bin,
        quantity: -quantity,
        customerName: customerName,
        invoiceNo: invoiceNo,
        oldStock: inventoryItem.quantity,
        newStock: updatedInventoryItem.quantity
      },
      user: user || {
        id: req.userId,
        name: req.username
      }
    });
    await log.save();

    // Log current inventory state for this SKU across all bins
    const allBins = await Inventory.getBinsBySku(skuId);
    console.log(`📊 Current inventory for SKU ${skuId} after outbound:`, allBins);

    console.log('=== OUTSET CREATION SUCCESS ===');
    res.status(201).json({
      message: 'Outbound record created successfully',
      outset: savedOutset,
      inventoryUpdate: {
        skuId: skuId,
        bin: bin,
        oldQuantity: inventoryItem.quantity,
        newQuantity: updatedInventoryItem.quantity,
        removed: quantity
      }
    });

  } catch (err) {
    console.error('=== OUTSET CREATION ERROR ===');
    console.error('Error details:', err);

    // Handle specific inventory errors
    if (err.message && err.message.includes('Insufficient stock')) {
      return res.status(400).json({ message: err.message });
    }

    if (err.message && err.message.includes('not found')) {
      return res.status(404).json({ message: 'Product not found in inventory' });
    }

    // Handle mongoose validation errors
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(error => error.message);
      return res.status(400).json({ 
        message: 'Validation Error', 
        errors: errors,
        details: err.errors
      });
    }

    // Handle duplicate key errors (SKU+bin combination already exists in outsets)
    if (err.code === 11000) {
      return res.status(400).json({ 
        message: 'Duplicate outbound record detected',
        error: err.message
      });
    }

    // Generic server error
    res.status(500).json({ 
      message: 'Failed to create outbound record',
      error: err.message
    });
  }
};

// Get all outsets (outbound history)
const getOutsets = async (req, res) => {
  try {
    console.log('=== FETCHING OUTSETS ===');
    
    const outsets = await Outset.find()
      .sort({ createdAt: -1 }) // Latest first
      .lean(); // For better performance
    
    console.log(`Found ${outsets.length} outsets`);
    
    res.status(200).json(outsets);
  } catch (err) {
    console.error('=== FETCH OUTSETS ERROR ===');
    console.error('Error details:', err);
    
    res.status(500).json({ 
      message: 'Failed to fetch outset history',
      error: err.message
    });
  }
};

module.exports = {
  createOutset,
  getOutsets
};