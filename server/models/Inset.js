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
  
  // Auto-generated SKU_ID in format: BASESKU-SIZE-COLOR-PACK
  skuId: {
    type: String,
    unique: true,
    trim: true
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
  
  // Original fields
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  orderNo: {
    type: String,
    required: true,
    trim: true
  },
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

// Pre-save middleware to generate SKU_ID
insetSchema.pre('save', function(next) {
  if (this.baseSku && this.size && this.color && this.pack) {
    this.skuId = `${this.baseSku}-${this.size}-${this.color}-${this.pack}`;
  }
  next();
});

// Update inventory after inset is saved (uncomment if needed)
// insetSchema.post('save', async function (doc, next) {
//   try {
//     await Inventory.updateStock(doc.skuId, doc.quantity, doc.bin, doc.name);
//     console.log('✅ Inventory increased for SKU_ID:', doc.skuId);
//     next();
//   } catch (error) {
//     console.error('❌ Failed to update inventory:', error.message);
//     next(error);
//   }
// });

module.exports = mongoose.model('Inset', insetSchema);