const mongoose = require('mongoose');

const outsetSchema = new mongoose.Schema({
  sku: {
    type: String,
    required: true
  },
  orderNo: {
    type: String,
    required: true
  },
  bin: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  customerName: {
    type: String,
    required: true
  },
  invoiceNo: {
    type: String,
    required: true
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

module.exports = mongoose.model('Outset', outsetSchema);
