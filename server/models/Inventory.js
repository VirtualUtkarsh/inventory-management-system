const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  sku: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true,
    default: function() {
      return `Item ${this.sku}`; // Auto-generate name if not provided
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
inventorySchema.statics.updateStock = async function(sku, change, bin, name) {
  let item = await this.findOne({ sku });

  if (item) {
    item.quantity += change;
    if (item.quantity < 0) throw new Error('Insufficient stock');
    if (bin) item.bin = bin;
    if (name) item.name = name;
  } else {
    if (change <= 0) throw new Error('Cannot remove non-existent item');
    item = new this({ 
      sku,
      name: name || `Item ${sku}`,
      quantity: change,
      bin: bin || 'DEFAULT'
    });
  }

  item.lastUpdated = Date.now();
  await item.save();
  return item;
};

module.exports = mongoose.model('Inventory', inventorySchema);
