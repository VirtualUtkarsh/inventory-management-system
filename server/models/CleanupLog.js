// server/models/CleanupLog.js
const mongoose = require('mongoose');

const cleanupLogSchema = new mongoose.Schema({
  cleanupDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  
  itemsRemoved: {
    type: Number,
    required: true,
    default: 0
  },
  
  actualItemsRemoved: {
    type: Number,
    default: 0
  },
  
  removedItems: [{
    skuId: {
      type: String,
      required: true
    },
    bin: {
      type: String,
      required: true
    },
    lastUpdated: {
      type: Date,
      required: true
    },
    daysInactive: {
      type: Number,
      required: true
    }
  }],
  
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  },
  
  error: {
    type: String,
    default: null
  },
  
  executionTime: {
    type: Number, // in milliseconds
    default: 0
  }
}, { 
  timestamps: true 
});

// Index for faster queries
cleanupLogSchema.index({ cleanupDate: -1 });
cleanupLogSchema.index({ status: 1 });

module.exports = mongoose.model('CleanupLog', cleanupLogSchema);