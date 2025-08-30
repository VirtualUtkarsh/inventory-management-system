// server/models/Inventory.js
const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  // Auto-generated SKU_ID (from inset/outset)
  skuId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  
  // Individual components for filtering
  baseSku: {
    type: String,
    required: true,
    trim: true,
    uppercase: true
  },
  
  size: {
    type: String,
    required: true,
    trim: true,
    uppercase: true
  },
  
  color: {
    type: String,
    required: true,
    trim: true,
    uppercase: true
  },
  
  pack: {
    type: String,
    required: true,
    trim: true
  },
  
  category: {
    type: String,
    required: true,
    trim: true
  },
  
  // Original fields
  name: {
    type: String,
    required: true,
    default: function() {
      return `Item ${this.skuId}`;
    }
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

// Static method for stock updates
inventorySchema.statics.updateStock = async function(skuId, change, bin, name, baseSku, size, color, pack, category) {
  let item = await this.findOne({ skuId });

  if (item) {
    item.quantity += change;
    if (item.quantity < 0) throw new Error('Insufficient stock');
    if (bin) item.bin = bin;
    if (name) item.name = name;
  } else {
    if (change <= 0) throw new Error('Cannot remove non-existent item');
    item = new this({ 
      skuId,
      baseSku,
      size,
      color,
      pack,
      category,
      name: name || `Item ${skuId}`,
      quantity: change,
      bin: bin || 'DEFAULT'
    });
  }

  item.lastUpdated = Date.now();
  await item.save();
  return item;
};

module.exports = mongoose.model('Inventory', inventorySchema);