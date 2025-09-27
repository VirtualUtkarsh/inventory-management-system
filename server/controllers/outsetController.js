const Outset = require('../models/Outset');
const Inventory = require('../models/Inventory');
const AuditLog = require('../models/AuditLog');
const mongoose = require('mongoose');

// Existing single outset functionality (keep as is)
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
      bin: 'Bin Location'
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

    // Check if inventory item exists for SPECIFIC SKU+bin combination
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

    // Update inventory for specific SKU+bin combination (negative quantity for outbound)
    const updatedInventoryItem = await Inventory.updateStock(
      skuId, 
      -quantity, 
      bin
    );

    console.log('Inventory updated successfully, creating outset record...');

    // Create outset record
    const outsetData = {
      skuId: skuId.trim(),
      quantity: Number(quantity),
      bin: bin.trim(),
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

    // Handle duplicate key errors
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

// NEW: Batch outbound functionality
const createBatchOutset = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    console.log('=== BATCH OUTSET CREATION START ===');
    console.log('Request body:', req.body);

    const { items, customerName, invoiceNo, user } = req.body;
    
    // Validation
    if (!items || !Array.isArray(items) || items.length === 0) {
      await session.abortTransaction();
      return res.status(400).json({ 
        message: 'Items array is required and cannot be empty' 
      });
    }

    if (!customerName) {
      await session.abortTransaction();
      return res.status(400).json({ 
        message: 'Customer name is required for batch outbound' 
      });
    }

    if (!invoiceNo) {
      await session.abortTransaction();
      return res.status(400).json({ 
        message: 'Invoice number is required for batch outbound' 
      });
    }

    // Generate batch ID for this transaction
    const batchId = new mongoose.Types.ObjectId();
    const batchUser = user || {
      id: req.userId,
      name: req.username
    };

    const results = [];
    const errors = [];
    const auditLogs = [];

    console.log(`Processing batch of ${items.length} items...`);

    // Validate all items first before processing any
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const { skuId, quantity, bin } = item;

      if (!skuId || !quantity || !bin) {
        errors.push({
          item: i + 1,
          error: 'SKU ID, quantity, and bin are required for each item'
        });
        continue;
      }

      if (Number(quantity) <= 0) {
        errors.push({
          item: i + 1,
          error: `Invalid quantity: ${quantity}. Must be greater than 0`
        });
        continue;
      }

      // Check inventory availability
      const inventoryItem = await Inventory.findOne({ 
        skuId: skuId, 
        bin: bin 
      }).session(session);

      if (!inventoryItem) {
        const otherBins = await Inventory.getBinsBySku(skuId);
        if (otherBins.length > 0) {
          errors.push({
            item: i + 1,
            error: `${skuId} not found in bin ${bin}. Available in: ${otherBins.map(b => `${b.bin}(${b.quantity})`).join(', ')}`
          });
        } else {
          errors.push({
            item: i + 1,
            error: `Product ${skuId} not found in inventory`
          });
        }
        continue;
      }

      if (inventoryItem.quantity < quantity) {
        errors.push({
          item: i + 1,
          error: `Insufficient stock for ${skuId} in bin ${bin}. Available: ${inventoryItem.quantity}, Requested: ${quantity}`
        });
        continue;
      }
    }

    // If there are validation errors, return them
    if (errors.length > 0) {
      await session.abortTransaction();
      return res.status(400).json({
        message: 'Validation failed for some items',
        errors,
        validatedItems: items.length,
        failedItems: errors.length
      });
    }

    console.log('All items validated successfully, processing...');

    // Process each item (all validations passed)
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const { skuId, quantity, bin } = item;

      try {
        // Get inventory item
        const inventoryItem = await Inventory.findOne({ 
          skuId: skuId, 
          bin: bin 
        }).session(session);

        // Update inventory using updateStock method
        const qty = Number(quantity);
        const updatedInventoryItem = await Inventory.updateStock(skuId, -qty, bin);

        // Create outset record
        const outsetData = {
          skuId: skuId.trim(),
          name: inventoryItem.name,
          quantity: Number(quantity),
          bin: bin.trim(),
          customerName: customerName.trim(),
          invoiceNo: invoiceNo.trim(),
          baseSku: inventoryItem.baseSku,
          size: inventoryItem.size,
          color: inventoryItem.color,
          pack: inventoryItem.pack,
          category: inventoryItem.category,
          user: batchUser,
          batchId: batchId // Add batch identifier
        };

        const outset = new Outset(outsetData);
        const savedOutset = await outset.save({ session });

        results.push({
          item: i + 1,
          skuId: skuId,
          bin: bin,
          quantity: quantity,
          outsetId: savedOutset._id,
          success: true
        });

        // Prepare audit log
        auditLogs.push({
          actionType: 'BATCH_STOCK_DECREASE',
          collectionName: 'Outset',
          documentId: savedOutset._id,
          changes: {
            skuId: skuId,
            bin: bin,
            quantity: -quantity,
            customerName: customerName,
            invoiceNo: invoiceNo,
            batchId: batchId,
            oldStock: inventoryItem.quantity,
            newStock: updatedInventoryItem.quantity
          },
          user: batchUser
        });

        console.log(`✓ Processed item ${i + 1}: ${skuId} from ${bin}`);

      } catch (itemError) {
        console.error(`Error processing item ${i + 1}:`, itemError);
        errors.push({
          item: i + 1,
          error: `Processing error: ${itemError.message}`
        });
      }
    }

    // Save all audit logs
    if (auditLogs.length > 0) {
      await AuditLog.insertMany(auditLogs, { session });
    }

    await session.commitTransaction();

    console.log('=== BATCH OUTSET CREATION SUCCESS ===');
    console.log(`Successfully processed ${results.length} items`);

    res.status(201).json({
      message: `Batch outbound completed successfully`,
      batchId: batchId,
      customerName: customerName,
      invoiceNo: invoiceNo,
      totalItems: items.length,
      successfulItems: results.length,
      failedItems: errors.length,
      results: results,
      errors: errors.length > 0 ? errors : undefined,
      summary: {
        totalQuantityShipped: results.reduce((sum, r) => sum + r.quantity, 0),
        uniqueSkus: [...new Set(results.map(r => r.skuId))].length,
        uniqueBins: [...new Set(results.map(r => r.bin))].length
      }
    });

  } catch (error) {
    await session.abortTransaction();
    console.error('=== BATCH OUTSET CREATION ERROR ===');
    console.error('Error details:', error);

    res.status(500).json({ 
      message: 'Failed to process batch outbound',
      error: error.message
    });
  } finally {
    session.endSession();
  }
};

// Get all outsets (outbound history) - keep as is
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

// NEW: Get batch outbound summary
const getBatchSummary = async (req, res) => {
  try {
    const { batchId } = req.params;
    
    if (!batchId) {
      return res.status(400).json({ message: 'Batch ID is required' });
    }

    const batchItems = await Outset.find({ batchId: batchId })
      .sort({ createdAt: 1 })
      .lean();

    if (batchItems.length === 0) {
      return res.status(404).json({ message: 'Batch not found' });
    }

    const summary = {
      batchId: batchId,
      customerName: batchItems[0].customerName,
      invoiceNo: batchItems[0].invoiceNo,
      createdAt: batchItems[0].createdAt,
      user: batchItems[0].user,
      totalItems: batchItems.length,
      totalQuantity: batchItems.reduce((sum, item) => sum + item.quantity, 0),
      uniqueSkus: [...new Set(batchItems.map(item => item.skuId))].length,
      uniqueBins: [...new Set(batchItems.map(item => item.bin))].length,
      items: batchItems
    };

    res.status(200).json(summary);

  } catch (error) {
    console.error('Error fetching batch summary:', error);
    res.status(500).json({ 
      message: 'Failed to fetch batch summary',
      error: error.message
    });
  }
};

module.exports = {
  createOutset,
  createBatchOutset,
  getOutsets,
  getBatchSummary
};