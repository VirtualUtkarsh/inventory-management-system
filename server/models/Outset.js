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
  },
  // NEW: Add batch support
  batchId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
    index: true
  },
  // NEW: Add batch metadata
  batchInfo: {
    totalItems: { type: Number, default: 1 },
    itemIndex: { type: Number, default: 1 },
    isBatch: { type: Boolean, default: false }
  }
}, { 
  timestamps: true, 
  toJSON: { virtuals: true }, 
  toObject: { virtuals: true } 
});

// Existing indexes
outsetSchema.index({ skuId: 1 });
outsetSchema.index({ customerName: 1 });
outsetSchema.index({ invoiceNo: 1 });
outsetSchema.index({ createdAt: -1 });
outsetSchema.index({ baseSku: 1 });

// NEW: Batch-related indexes
outsetSchema.index({ batchId: 1 });
outsetSchema.index({ 'batchInfo.isBatch': 1 });

// Compound indexes for better query performance
outsetSchema.index({ customerName: 1, invoiceNo: 1 });
outsetSchema.index({ skuId: 1, bin: 1 });
outsetSchema.index({ batchId: 1, createdAt: -1 });

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

// NEW: Virtual to check if this is part of a batch
outsetSchema.virtual('isPartOfBatch').get(function() {
  return this.batchId !== null && this.batchId !== undefined;
});

// NEW: Static method to get batch summary
outsetSchema.statics.getBatchSummary = function(batchId) {
  return this.aggregate([
    { $match: { batchId: mongoose.Types.ObjectId(batchId) } },
    {
      $group: {
        _id: '$batchId',
        totalItems: { $sum: 1 },
        totalQuantity: { $sum: '$quantity' },
        customerName: { $first: '$customerName' },
        invoiceNo: { $first: '$invoiceNo' },
        createdAt: { $first: '$createdAt' },
        user: { $first: '$user' },
        uniqueSkus: { $addToSet: '$skuId' },
        uniqueBins: { $addToSet: '$bin' },
        items: { $push: '$$ROOT' }
      }
    },
    {
      $project: {
        batchId: '$_id',
        totalItems: 1,
        totalQuantity: 1,
        customerName: 1,
        invoiceNo: 1,
        createdAt: 1,
        user: 1,
        uniqueSkuCount: { $size: '$uniqueSkus' },
        uniqueBinCount: { $size: '$uniqueBins' },
        items: 1
      }
    }
  ]);
};

// NEW: Static method to get recent batches
outsetSchema.statics.getRecentBatches = function(limit = 10) {
  return this.aggregate([
    { $match: { batchId: { $ne: null } } },
    {
      $group: {
        _id: '$batchId',
        totalItems: { $sum: 1 },
        totalQuantity: { $sum: '$quantity' },
        customerName: { $first: '$customerName' },
        invoiceNo: { $first: '$invoiceNo' },
        createdAt: { $first: '$createdAt' },
        user: { $first: '$user' }
      }
    },
    { $sort: { createdAt: -1 } },
    { $limit: limit }
  ]);
};

// Pre-save middleware to set batch info
outsetSchema.pre('save', function(next) {
  if (this.batchId) {
    this.batchInfo.isBatch = true;
  }
  next();
});

module.exports = mongoose.model('Outset', outsetSchema);