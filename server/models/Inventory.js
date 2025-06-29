const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  sku: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
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
}, { timestamps: true });

/**
 * Static method to update or create inventory
 * @param {string} sku - Stock Keeping Unit
 * @param {number} change - Quantity change (+ve for insert, -ve for removal)
 * @param {string} bin - Bin location (optional)
 * @returns {Object} Updated or created inventory item
 */
inventorySchema.statics.updateStock = async function(sku, change, bin) {
  let item = await this.findOne({ sku }); // ✅ Use 'let' to allow reassignment

  if (item) {
    item.quantity += change;

    if (item.quantity < 0) {
      throw new Error('Insufficient stock');
    }

    if (bin) item.bin = bin;
  } else {
    if (change <= 0) {
      throw new Error('Cannot remove stock for non-existent item');
    }

    item = new this({
      sku,
      name: `Item ${sku}`, // Default name
      quantity: change,
      bin: bin || 'DEFAULT'
    });
  }

  item.lastUpdated = Date.now();
  await item.save();
  return item;
};

module.exports = mongoose.model('Inventory', inventorySchema);
