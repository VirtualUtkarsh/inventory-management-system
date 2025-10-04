// server/models/bin.js
const mongoose = require('mongoose');

const binSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Bin name is required'],
    unique: true,
    trim: true,
    maxlength: [50, 'Bin name cannot exceed 50 characters'],
    match: [/^[A-Za-z0-9\-_\s]+$/, 'Bin name can only contain letters, numbers, hyphens, underscores, and spaces']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
      default: null
  }
}, {
  timestamps: true
});

// Index for better performance
binSchema.index({ name: 1, isActive: 1 });

module.exports = mongoose.model('Bin', binSchema);