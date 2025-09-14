// server/models/Inset.js
const mongoose = require('mongoose');
const Inventory = require('./Inventory');

const insetSchema = new mongoose.Schema({
  // Manual SKU part (like TS1156, FHST24, SHORT78)
  baseSku: {
    type: String,
    required: [true, 'Base SKU is required'],
    trim: true,
    uppercase: true
  },
  
  // CHANGED: Manual SKU_ID input field (no longer auto-generated)
  skuId: {
    type: String,
    required: [true, 'SKU ID is required'],
    unique: true,
    trim: true,
    uppercase: true
  },
  
  // Metadata fields
  size: {
    type: String,
    required: [true, 'Size is required'],
    trim: true,
    uppercase: true
  },
  
  color: {
    type: String,
    required: [true, 'Color is required'],
    trim: true,
    uppercase: true
  },
  
  pack: {
    type: String,
    required: [true, 'Pack is required'],
    trim: true
  },
  
  category: {
    type: String,
    required: [true, 'Category is required'],
    trim: true
  },
  
  // REMOVED: name field - no longer needed
  // REMOVED: orderNo field - no longer needed
  
  bin: {
    type: String,
    required: true,
    trim: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  user: {
    id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    name: {
      type: String,
      required: true
    }
  }
}, { timestamps: true });

// REMOVED: Pre-save middleware for auto SKU generation
// Users will now manually enter the complete SKU ID

// Update inventory after inset is saved (uncomment if needed)
// Note: Removed 'name' parameter since it no longer exists
// insetSchema.post('save', async function (doc, next) {
//   try {
//     await Inventory.updateStock(doc.skuId, doc.quantity, doc.bin);
//     console.log('✅ Inventory increased for SKU_ID:', doc.skuId);
//     next();
//   } catch (error) {
//     console.error('❌ Failed to update inventory:', error.message);
//     next(error);
//   }
// });

module.exports = mongoose.model('Inset', insetSchema);