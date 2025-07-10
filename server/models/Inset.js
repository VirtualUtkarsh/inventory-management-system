const mongoose = require('mongoose');
const Inventory = require('./Inventory'); // Required to access updateStock()

const insetSchema = new mongoose.Schema({
  sku: {
    type: String,
    required: true,
    trim: true
  },
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

// 📦 Automatically update inventory after inset is saved
insetSchema.post('save', async function (doc, next) {
  try {
    await Inventory.updateStock(doc.sku, doc.quantity, doc.bin);
    console.log('✅ Inventory increased for SKU:', doc.sku);
    next();
  } catch (error) {
    console.error('❌ Failed to update inventory:', error.message);
    next(error);
  }
});

module.exports = mongoose.model('Inset', insetSchema);
