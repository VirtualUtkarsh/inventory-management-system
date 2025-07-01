const mongoose = require('mongoose');

const outsetSchema = new mongoose.Schema({
  sku: {
    type: String,
    required: true,
    trim: true
  },
  name: {
    type: String,
    trim: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  bin: {
    type: String,
    required: true,
    trim: true
  },
  customerName: {
    type: String,
    required: true,
    trim: true
  },
  invoiceNo: {
    type: String,
    required: true,
    trim: true
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

// Auto-update inventory on outset creation
outsetSchema.post('save', async function(doc) {
  const Inventory = mongoose.model('Inventory');
  try {
    await Inventory.findOneAndUpdate(
      { sku: doc.sku },
      { $inc: { quantity: -doc.quantity } }
    );
  } catch (error) {
    console.error('Failed to update inventory:', error);
    throw error; // Prevent outset from saving if inventory update fails
  }
});

module.exports = mongoose.model('Outset', outsetSchema);
