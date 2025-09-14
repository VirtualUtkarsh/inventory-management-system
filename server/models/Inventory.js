// server/models/Inventory.js
const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  // SKU_ID (from inset/outset)
  skuId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  
  quantity: {
    type: Number,
    required: true,
    min: 0
  },
  
  bin: {
    type: String,
    required: true,
    default: 'DEFAULT'
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

// Simplified static method for stock updates
inventorySchema.statics.updateStock = async function(skuId, change, bin) {
  let item = await this.findOne({ skuId });
  
  if (item) {
    // Update existing item
    item.quantity += change;
    if (item.quantity < 0) throw new Error('Insufficient stock');
    if (bin) item.bin = bin;
  } else {
    // Create new item
    if (change <= 0) throw new Error('Cannot remove non-existent item');
    item = new this({ 
      skuId,
      quantity: change,
      bin: bin || 'DEFAULT'
    });
  }
  
  item.lastUpdated = Date.now();
  await item.save();
  return item;
};

module.exports = mongoose.model('Inventory', inventorySchema);