const mongoose = require('mongoose');

const outsetSchema = new mongoose.Schema({
  skuId: {
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
  // Product metadata for better tracking and filtering
  baseSku: {
    type: String,
    trim: true,
    uppercase: true
  },
  size: {
    type: String,
    trim: true,
    uppercase: true
  },
  color: {
    type: String,
    trim: true,
    uppercase: true
  },
  pack: {
    type: String,
    trim: true
  },
  category: {
    type: String,
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
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for efficient queries
outsetSchema.index({ skuId: 1 });
outsetSchema.index({ customerName: 1 });
outsetSchema.index({ invoiceNo: 1 });
outsetSchema.index({ createdAt: -1 });
outsetSchema.index({ baseSku: 1 });

// Virtual for formatted creation date
outsetSchema.virtual('formattedDate').get(function() {
  return this.createdAt.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
});

module.exports = mongoose.model('Outset', outsetSchema);