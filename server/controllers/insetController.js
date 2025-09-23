// server/controllers/insetController.js
const Inset = require('../models/Inset');
const Inventory = require('../models/Inventory');
const InboundExcelImportService = require('../utils/InboundExcelImportService');

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
// Import inbound records from Excel
const importInboundExcel = async (req, res) => {
  try {
    console.log('=== INBOUND EXCEL IMPORT START ===');
    console.log('User:', req.userId, req.username);

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No Excel file uploaded. Please select a file.'
      });
    }

    console.log('📄 File received:', {
      filename: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype
    });

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
    console.log('🚀 Starting Excel processing...');
    const results = await importService.importInboundExcel(req.file.buffer);

    console.log('📊 Import completed:', {
      totalRows: results.totalRows,
      successCount: results.successCount,
      errorCount: results.errorCount,
      warningCount: results.warnings.length
    });

    let statusCode = 200;
    let success = true;

    if (results.errorCount > 0 && results.successCount === 0) {
      statusCode = 400;
      success = false;
    } else if (results.errorCount > 0) {
      statusCode = 207;
    }

    // ✅ Flattened response for frontend
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
      stats: results.stats,          // contains successRate, createdBinsCount, warningCount
      createdBins: results.createdBins,
      summary: results.summary
    });

    console.log('=== INBOUND EXCEL IMPORT END ===');

  } catch (error) {
    console.error('=== INBOUND EXCEL IMPORT ERROR ===');
    console.error('Error details:', error);

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
  deleteInset,
  importInboundExcel
};