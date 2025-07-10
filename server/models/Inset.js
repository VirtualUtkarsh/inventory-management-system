const mongoose = require('mongoose');
const Inventory = require('./Inventory'); // required to access updateStock()

const insetSchema = new mongoose.Schema({
  sku: {
    type: String,
    required: true,
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

// ✅ Use Inventory.updateStock in post-save
insetSchema.post('save', async function(doc, next) {
  try {
    await Inventory.updateStock(doc.sku, doc.quantity, doc.bin);
    console.log('✅ Inventory increased for SKU:', doc.sku);
    next();
  } catch (error) {
    console.error('❌ Failed to update inventory:', error.message);
    next(error); // Still save inset, but log the error
  }
});

module.exports = mongoose.model('Inset', insetSchema);
