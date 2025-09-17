// server/models/Inventory.js
const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  // SKU_ID (from inset/outset)
  skuId: {
    type: String,
    required: true,
    trim: true
    // REMOVED unique: true - this was the problem!
  },
  
  quantity: {
    type: Number,
    required: true,
    min: 0
  },
  
  bin: {
    type: String,
    required: true
  },
  
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true } 
});

// COMPOUND UNIQUE INDEX - This ensures same SKU can exist in different bins
// but prevents duplicate SKU+bin combinations
inventorySchema.index({ skuId: 1, bin: 1 }, { unique: true });

// Fixed static method for stock updates
inventorySchema.statics.updateStock = async function (skuId, change, bin) {
  const item = await this.findOneAndUpdate(
    { skuId, bin },
    { 
      $inc: { quantity: change }, 
      $set: { lastUpdated: Date.now() } 
    },
    { new: true, upsert: true }
  );

  if (item.quantity < 0) {
    throw new Error(`Insufficient stock in bin ${bin}. Current: ${item.quantity}, Change: ${change}`);
  }

  return item;
};


// Helper method to get total quantity across all bins for a SKU
inventorySchema.statics.getTotalQuantityBySku = async function(skuId) {
  const items = await this.find({ skuId: skuId });
  return items.reduce((total, item) => total + item.quantity, 0);
};

// Helper method to get all bins for a specific SKU
inventorySchema.statics.getBinsBySku = async function(skuId) {
  const items = await this.find({ skuId: skuId, quantity: { $gt: 0 } });
  return items.map(item => ({
    bin: item.bin,
    quantity: item.quantity,
    _id: item._id
  }));
};

module.exports = mongoose.model('Inventory', inventorySchema);