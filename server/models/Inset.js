// server/models/Inset.js
const mongoose = require('mongoose');
const Inventory = require('./Inventory');

const insetSchema = new mongoose.Schema({
  // Manual SKU ID input field (complete SKU entered by user)
  skuId: {
    type: String,
    required: [true, 'SKU ID is required'],
    // unique: true,
    trim: true,
    uppercase: true
  },
  
  // bin: {
  //   type: String,
  //   required: true,
  //   trim: true
  // },
  bin: {
    type: String,
    ref: 'Bin',
    required: true
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

// Update inventory after inset is saved (uncomment if needed)
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