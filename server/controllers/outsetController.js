const Outset = require('../models/Outset');
const Inventory = require('../models/Inventory');
const AuditLog = require('../models/AuditLog');
const mongoose = require('mongoose');

// Existing single outset functionality (keep as is)
const createOutset = async (req, res) => {
  try {
    console.log('=== OUTSET CREATION START ===');
    const { skuId, quantity, customerName, invoiceNo, bin, user } = req.body;

    // Validation
    const requiredFields = { skuId: 'SKU ID', quantity: 'Quantity', customerName: 'Customer Name', invoiceNo: 'Invoice Number', bin: 'Bin Location' };
    for (const [field, label] of Object.entries(requiredFields)) {
      if (!req.body[field] || req.body[field] === '' || req.body[field] === 0) {
        return res.status(400).json({ message: `${label} is required`, field: field, received: req.body[field] });
      }
    }

    if (Number(quantity) <= 0) {
      return res.status(400).json({ message: 'Quantity must be greater than 0', received: quantity });
    }

    // Check inventory
    const inventoryItem = await Inventory.findOne({ skuId: skuId, bin: bin });
    
    if (!inventoryItem) {
      const otherBins = await Inventory.getBinsBySku(skuId);
      if (otherBins.length > 0) {
        return res.status(404).json({ 
          message: `Product not found in bin ${bin}. Available in bins: ${otherBins.map(b => `${b.bin}(${b.quantity})`).join(', ')}`,
          availableBins: otherBins
        });
      }
      return res.status(404).json({ message: 'Product not found in inventory' });
    }

    if (inventoryItem.quantity < quantity) {
      return res.status(400).json({ 
        message: `Insufficient stock in bin ${bin}. Only ${inventoryItem.quantity} available`,
        available: inventoryItem.quantity,
        requested: quantity
      });
    }

    // Update inventory
    const updatedInventoryItem = await Inventory.updateStock(skuId, -quantity, bin);

    // Create outset record
    const outset = new Outset({
      skuId: skuId.trim(),
      quantity: Number(quantity),
      bin: bin.trim(),
      customerName: customerName.trim(),
      invoiceNo: invoiceNo.trim(),
      user: user || { id: req.userId, name: req.username }
    });
    const savedOutset = await outset.save();

    // Create audit log (async, don't wait)
    AuditLog.create({
      actionType: 'STOCK_DECREASE',
      collectionName: 'Outset',
      documentId: savedOutset._id,
      changes: {
        skuId, bin, quantity: -quantity, customerName, invoiceNo,
        oldStock: inventoryItem.quantity,
        newStock: updatedInventoryItem.quantity
      },
      user: user || { id: req.userId, name: req.username }
    }).catch(err => console.error('Audit log error:', err));

    res.status(201).json({
      message: 'Outbound record created successfully',
      outset: savedOutset,
      inventoryUpdate: {
        skuId, bin,
        oldQuantity: inventoryItem.quantity,
        newQuantity: updatedInventoryItem.quantity,
        removed: quantity
      }
    });

  } catch (err) {
    console.error('OUTSET ERROR:', err);
    res.status(500).json({ message: 'Failed to create outbound record', error: err.message });
  }
};

// OPTIMIZED: Batch outbound functionality
const createBatchOutset = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    console.log('=== BATCH OUTSET START ===', new Date().toISOString());
    const startTime = Date.now();

    const { items, customerName, invoiceNo, user } = req.body;
    
    // Quick validation
    if (!items?.length || !customerName || !invoiceNo) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Items, customer name, and invoice number required' });
    }

    const batchId = new mongoose.Types.ObjectId();
    const batchUser = user || { id: req.userId, name: req.username };

    // 🚀 OPTIMIZATION 1: Batch fetch all inventory items at once
    const inventoryQuery = items.map(item => ({ skuId: item.skuId, bin: item.bin }));
    const inventoryItems = await Inventory.find({
      $or: inventoryQuery
    }).session(session).lean();

    // Create inventory lookup map for O(1) access
    const inventoryMap = new Map();
    inventoryItems.forEach(inv => {
      inventoryMap.set(`${inv.skuId}-${inv.bin}`, inv);
    });

    console.log(`📦 Fetched ${inventoryItems.length} inventory items in ${Date.now() - startTime}ms`);

    // 🚀 OPTIMIZATION 2: Validate all items first (fast)
    const errors = [];
    const validatedItems = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const { skuId, quantity, bin } = item;

      if (!skuId || !quantity || !bin || quantity <= 0) {
        errors.push({ item: i + 1, error: 'Invalid item data' });
        continue;
      }

      const inventoryItem = inventoryMap.get(`${skuId}-${bin}`);

      if (!inventoryItem) {
        errors.push({ item: i + 1, error: `${skuId} not found in bin ${bin}` });
        continue;
      }

      if (inventoryItem.quantity < quantity) {
        errors.push({ 
          item: i + 1, 
          error: `Insufficient stock for ${skuId} in ${bin}. Available: ${inventoryItem.quantity}` 
        });
        continue;
      }

      validatedItems.push({
        ...item,
        inventoryItem,
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

    console.log(`✓ Validated ${validatedItems.length} items in ${Date.now() - startTime}ms`);

    // 🚀 OPTIMIZATION 3: Bulk inventory updates
    const bulkInventoryOps = validatedItems.map(item => ({
      updateOne: {
        filter: { skuId: item.skuId, bin: item.bin },
        update: { $inc: { quantity: -Number(item.quantity) } }
      }
    }));

    if (bulkInventoryOps.length > 0) {
      await Inventory.bulkWrite(bulkInventoryOps, { session });
      console.log(`✓ Updated ${bulkInventoryOps.length} inventory items in ${Date.now() - startTime}ms`);
    }

    // 🚀 OPTIMIZATION 4: Bulk insert outset records
    const outsetRecords = validatedItems.map(item => ({
      skuId: item.skuId.trim(),
      name: item.inventoryItem.name,
      quantity: Number(item.quantity),
      bin: item.bin.trim(),
      customerName: customerName.trim(),
      invoiceNo: invoiceNo.trim(),
      baseSku: item.inventoryItem.baseSku,
      size: item.inventoryItem.size,
      color: item.inventoryItem.color,
      pack: item.inventoryItem.pack,
      category: item.inventoryItem.category,
      user: batchUser,
      batchId: batchId
    }));

    const savedOutsets = await Outset.insertMany(outsetRecords, { session });
    console.log(`✓ Created ${savedOutsets.length} outset records in ${Date.now() - startTime}ms`);

    // 🚀 OPTIMIZATION 5: Async audit logs (don't block response)
    const auditLogs = savedOutsets.map((outset, idx) => ({
      actionType: 'BATCH_STOCK_DECREASE',
      collectionName: 'Outset',
      documentId: outset._id,
      changes: {
        skuId: outset.skuId,
        bin: outset.bin,
        quantity: -outset.quantity,
        customerName,
        invoiceNo,
        batchId,
        oldStock: validatedItems[idx].inventoryItem.quantity,
        newStock: validatedItems[idx].inventoryItem.quantity - outset.quantity
      },
      user: batchUser
    }));

    // Insert audit logs without awaiting (faster response)
    AuditLog.insertMany(auditLogs, { session }).catch(err => 
      console.error('Audit log error:', err)
    );

    await session.commitTransaction();

    const totalTime = Date.now() - startTime;
    console.log(`=== BATCH OUTSET SUCCESS in ${totalTime}ms ===`);

    res.status(201).json({
      message: 'Batch outbound completed successfully',
      batchId: batchId,
      customerName,
      invoiceNo,
      totalItems: items.length,
      successfulItems: savedOutsets.length,
      processingTime: `${totalTime}ms`,
      summary: {
        totalQuantityShipped: savedOutsets.reduce((sum, r) => sum + r.quantity, 0),
        uniqueSkus: [...new Set(savedOutsets.map(r => r.skuId))].length,
        uniqueBins: [...new Set(savedOutsets.map(r => r.bin))].length
      }
    });

  } catch (error) {
    await session.abortTransaction();
    console.error('BATCH OUTSET ERROR:', error);
    res.status(500).json({ message: 'Failed to process batch outbound', error: error.message });
  } finally {
    session.endSession();
  }
};

// Delete single outset (optimized)
const deleteOutset = async (req, res) => {
  try {
    const { id } = req.params;
    const outset = await Outset.findById(id);
    
    if (!outset) {
      return res.status(404).json({ message: 'Outbound record not found' });
    }

    const inventoryItem = await Inventory.findOne({ skuId: outset.skuId, bin: outset.bin });
    const oldQuantity = inventoryItem ? inventoryItem.quantity : 0;

    // Restore inventory
    const updatedInventory = await Inventory.updateStock(outset.skuId, outset.quantity, outset.bin);

    // Delete outset
    await Outset.findByIdAndDelete(id);

    // Async audit log
    AuditLog.create({
      actionType: 'STOCK_INCREASE_DELETION',
      collectionName: 'Outset',
      documentId: outset._id,
      changes: {
        action: 'DELETE_OUTBOUND',
        skuId: outset.skuId,
        bin: outset.bin,
        quantity: outset.quantity,
        oldStock: oldQuantity,
        newStock: updatedInventory.quantity
      },
      user: { id: req.userId, name: req.username }
    }).catch(err => console.error('Audit log error:', err));

    res.status(200).json({ 
      message: 'Outbound deleted and inventory restored',
      inventoryUpdate: {
        skuId: outset.skuId,
        bin: outset.bin,
        oldQuantity,
        newQuantity: updatedInventory.quantity,
        restored: outset.quantity
      }
    });

  } catch (error) {
    console.error('DELETE ERROR:', error);
    res.status(500).json({ message: 'Failed to delete outbound record', error: error.message });
  }
};

// Delete batch outset (optimized)
const deleteBatchOutset = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { batchId } = req.params;
    
    if (!batchId) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Batch ID required' });
    }

    const batchItems = await Outset.find({ batchId }).session(session).lean();

    if (batchItems.length === 0) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Batch not found' });
    }

    // 🚀 Bulk restore inventory
    const bulkOps = batchItems.map(item => ({
      updateOne: {
        filter: { skuId: item.skuId, bin: item.bin },
        update: { $inc: { quantity: Number(item.quantity) } }
      }
    }));

    await Inventory.bulkWrite(bulkOps, { session });

    // Delete all outsets in batch
    await Outset.deleteMany({ batchId }).session(session);

    // Async audit logs
    const auditLogs = batchItems.map(item => ({
      actionType: 'BATCH_STOCK_INCREASE_DELETION',
      collectionName: 'Outset',
      documentId: item._id,
      changes: {
        action: 'DELETE_BATCH_OUTBOUND',
        batchId,
        skuId: item.skuId,
        bin: item.bin,
        restoredQuantity: item.quantity
      },
      user: { id: req.userId, name: req.username }
    }));

    AuditLog.insertMany(auditLogs, { session }).catch(err => 
      console.error('Audit log error:', err)
    );

    await session.commitTransaction();

    res.status(200).json({
      message: `Batch deleted. ${batchItems.length} items restored`,
      batchId,
      deletedItems: batchItems.length,
      summary: {
        totalQuantityRestored: batchItems.reduce((sum, r) => sum + r.quantity, 0)
      }
    });

  } catch (error) {
    await session.abortTransaction();
    console.error('BATCH DELETE ERROR:', error);
    res.status(500).json({ message: 'Failed to delete batch', error: error.message });
  } finally {
    session.endSession();
  }
};

// Get outsets (optimized with pagination)
const getOutsets = async (req, res) => {
  try {
    const { limit = 100, skip = 0 } = req.query;
    
    const outsets = await Outset.find()
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .lean()
      .select('-__v'); // Exclude version field
    
    res.status(200).json(outsets);
  } catch (err) {
    console.error('FETCH ERROR:', err);
    res.status(500).json({ message: 'Failed to fetch outsets', error: err.message });
  }
};

// Get batch summary (optimized)
const getBatchSummary = async (req, res) => {
  try {
    const { batchId } = req.params;
    
    if (!batchId) {
      return res.status(400).json({ message: 'Batch ID required' });
    }

    const batchItems = await Outset.find({ batchId })
      .sort({ createdAt: 1 })
      .lean()
      .select('-__v');

    if (batchItems.length === 0) {
      return res.status(404).json({ message: 'Batch not found' });
    }

    res.status(200).json({
      batchId,
      customerName: batchItems[0].customerName,
      invoiceNo: batchItems[0].invoiceNo,
      createdAt: batchItems[0].createdAt,
      totalItems: batchItems.length,
      totalQuantity: batchItems.reduce((sum, item) => sum + item.quantity, 0),
      uniqueSkus: [...new Set(batchItems.map(item => item.skuId))].length,
      items: batchItems
    });

  } catch (error) {
    console.error('BATCH SUMMARY ERROR:', error);
    res.status(500).json({ message: 'Failed to fetch batch summary', error: error.message });
  }
};

module.exports = {
  createOutset,
  createBatchOutset,
  getOutsets,
  getBatchSummary,
  deleteBatchOutset,
  deleteOutset
};