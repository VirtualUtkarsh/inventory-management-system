// server/controllers/insetController.js - OPTIMIZED VERSION
const Inset = require('../models/Inset');
const Inventory = require('../models/Inventory');
const InboundExcelImportService = require('../utils/InboundExcelImportService');
const mongoose = require('mongoose');

// 🚀 NEW: Batch inbound creation (like batch outbound)
const createBatchInset = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const startTime = Date.now();
    const { items, user } = req.body;
    
    // Quick validation
    if (!items?.length) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Items array is required' });
    }

    const batchId = new mongoose.Types.ObjectId();
    const batchUser = user || { id: req.userId, name: req.username };

    // Validate all items first
    const errors = [];
    const validatedItems = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const { skuId, bin, quantity } = item;

      if (!skuId || !bin || !quantity || quantity <= 0) {
        errors.push({ item: i + 1, error: 'Invalid item data' });
        continue;
      }

      validatedItems.push({
        skuId: skuId.trim().toUpperCase(),
        bin: bin.trim().toUpperCase(),
        quantity: Number(quantity),
        index: i
      });
    }

    if (errors.length > 0) {
      await session.abortTransaction();
      return res.status(400).json({
        message: 'Validation failed',
        errors,
        failedItems: errors.length
      });
    }

    // 🚀 Bulk inventory updates
    const bulkInventoryOps = validatedItems.map(item => ({
      updateOne: {
        filter: { skuId: item.skuId, bin: item.bin },
        update: { 
          $inc: { quantity: item.quantity },
          $set: { lastUpdated: Date.now() }
        },
        upsert: true
      }
    }));

    if (bulkInventoryOps.length > 0) {
      await Inventory.bulkWrite(bulkInventoryOps, { session });
    }

    // 🚀 Bulk insert inset records
    const insetRecords = validatedItems.map(item => ({
      skuId: item.skuId,
      bin: item.bin,
      quantity: item.quantity,
      user: batchUser,
      batchId: batchId
    }));

    const savedInsets = await Inset.insertMany(insetRecords, { session });

    await session.commitTransaction();

    const totalTime = Date.now() - startTime;

    res.status(201).json({
      message: 'Batch inbound completed successfully',
      batchId: batchId,
      totalItems: items.length,
      successfulItems: savedInsets.length,
      processingTime: `${totalTime}ms`,
      summary: {
        totalQuantityAdded: savedInsets.reduce((sum, r) => sum + r.quantity, 0),
        uniqueSkus: [...new Set(savedInsets.map(r => r.skuId))].length,
        uniqueBins: [...new Set(savedInsets.map(r => r.bin))].length
      }
    });

  } catch (error) {
    await session.abortTransaction();
    console.error('BATCH INSET ERROR:', error);
    res.status(500).json({ 
      message: 'Failed to process batch inbound', 
      error: error.message 
    });
  } finally {
    session.endSession();
  }
};

// Optimized single inset (reduced logging for production)
const createInset = async (req, res) => {
  try {
    const { skuId, bin, quantity, user } = req.body;

    // Validation
    const requiredFields = { skuId: 'SKU ID', bin: 'Bin Location', quantity: 'Quantity' };
    for (const [field, label] of Object.entries(requiredFields)) {
      if (!req.body[field] || req.body[field] === '' || req.body[field] === 0) {
        return res.status(400).json({ 
          message: `${label} is required`,
          field: field
        });
      }
    }

    if (Number(quantity) <= 0) {
      return res.status(400).json({ 
        message: 'Quantity must be greater than 0'
      });
    }

    const insetData = {
      skuId: skuId.trim().toUpperCase(),
      bin: bin.trim().toUpperCase(),
      quantity: Number(quantity),
      user: {
        id: user?.id || req.userId,
        name: user?.name || req.username || 'System'
      }
    };

    const inset = new Inset(insetData);
    const savedInset = await inset.save();

    // Update inventory
    const inventoryItem = await Inventory.updateStock(
      savedInset.skuId,
      savedInset.quantity,
      savedInset.bin
    );

    res.status(201).json({
      message: 'Inset recorded successfully',
      inset: savedInset,
      inventoryUpdate: {
        skuId: inventoryItem.skuId,
        bin: inventoryItem.bin,
        quantity: inventoryItem.quantity
      }
    });

  } catch (error) {
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        message: 'Validation Error', 
        errors: errors
      });
    }

    if (error.code === 11000) {
      return res.status(400).json({ 
        message: 'Duplicate record detected'
      });
    }

    res.status(500).json({ 
      message: 'Server Error during inset creation',
      error: error.message
    });
  }
};

// Import inbound records from Excel
const importInboundExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No Excel file uploaded. Please select a file.'
      });
    }

    const allowedMimeTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];

    if (!allowedMimeTypes.includes(req.file.mimetype)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid file type. Please upload an Excel file (.xlsx or .xls)'
      });
    }

    const maxSize = 10 * 1024 * 1024;
    if (req.file.size > maxSize) {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 10MB.'
      });
    }

    const importService = new InboundExcelImportService(req.userId, req.username);
    const results = await importService.importInboundExcel(req.file.buffer);

    let statusCode = 200;
    let success = true;

    if (results.errorCount > 0 && results.successCount === 0) {
      statusCode = 400;
      success = false;
    } else if (results.errorCount > 0) {
      statusCode = 207;
    }

    res.status(statusCode).json({
      success,
      message: success
        ? `Import completed. ${results.successCount} records processed successfully.`
        : 'Import partially failed. Please check the errors and try again.',
      totalRows: results.totalRows,
      processedRows: results.processedRows,
      successCount: results.successCount,
      errorCount: results.errorCount,
      warnings: results.warnings,
      errors: results.errors,
      stats: results.stats,
      createdBins: results.createdBins,
      summary: results.summary
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to process Excel file',
      error: error.message,
      totalRows: 0,
      processedRows: 0,
      successCount: 0,
      errorCount: 1,
      warnings: [],
      errors: [{ row: 0, message: error.message, type: 'SYSTEM_ERROR' }],
      stats: { successRate: '0%', createdBinsCount: 0, warningCount: 0 },
      createdBins: [],
      summary: []
    });
  }
};

// Get all insets (with pagination support)
const getAllInsets = async (req, res) => {
  try {
    const { limit = 100, skip = 0 } = req.query;
    
    const insets = await Inset.find()
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .lean()
      .select('-__v');

    res.status(200).json(insets);
  } catch (error) {
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
      { new: true, runValidators: true }
    );

    if (!updatedInset) {
      return res.status(404).json({ message: 'Inset not found' });
    }

    res.status(200).json({ 
      message: 'Inset updated successfully', 
      inset: updatedInset 
    });

  } catch (error) {
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

// Delete inset (with inventory reversal)
const deleteInset = async (req, res) => {
  try {
    const { id } = req.params;
    const inset = await Inset.findById(id);
    
    if (!inset) {
      return res.status(404).json({ message: 'Inbound record not found' });
    }

    const inventoryItem = await Inventory.findOne({ 
      skuId: inset.skuId, 
      bin: inset.bin 
    });

    if (!inventoryItem) {
      return res.status(400).json({ 
        message: `Cannot delete: Inventory record not found for SKU ${inset.skuId} in bin ${inset.bin}`
      });
    }

    const newQuantity = inventoryItem.quantity - inset.quantity;

    if (newQuantity < 0) {
      return res.status(400).json({ 
        message: `Cannot delete: Reversal would result in negative inventory. Current stock: ${inventoryItem.quantity}`,
        currentStock: inventoryItem.quantity,
        inboundQuantity: inset.quantity
      });
    }

    const updatedInventory = await Inventory.updateStock(
      inset.skuId,
      -inset.quantity,
      inset.bin
    );

    await Inset.findByIdAndDelete(id);

    res.status(200).json({ 
      message: 'Inbound record deleted and inventory reversed successfully',
      deletedInset: {
        id: inset._id,
        skuId: inset.skuId,
        bin: inset.bin,
        quantity: inset.quantity
      },
      inventoryUpdate: {
        skuId: inset.skuId,
        bin: inset.bin,
        oldQuantity: inventoryItem.quantity,
        newQuantity: updatedInventory.quantity,
        reversed: inset.quantity
      }
    });

  } catch (error) {
    res.status(500).json({ 
      message: 'Failed to delete inbound record', 
      error: error.message 
    });
  }
};

module.exports = {
  createInset,
  createBatchInset, // 🚀 NEW
  getAllInsets,
  getInsetById,
  updateInset,
  deleteInset,
  importInboundExcel
};