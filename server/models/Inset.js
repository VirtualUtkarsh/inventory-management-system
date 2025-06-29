const mongoose = require('mongoose');

const insetSchema = new mongoose.Schema({
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

module.exports = mongoose.model('Inset', insetSchema);
