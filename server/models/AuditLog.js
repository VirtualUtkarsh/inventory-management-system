const mongoose = require('mongoose');

const actionTypes = ['CREATE', 'UPDATE', 'DELETE', 'STOCK_DECREASE','BATCH_STOCK_DECREASE'];  // Added 'STOCK_DECREASE'
const collectionNames = ['Inventory', 'Inset', 'Outset'];

const auditLogSchema = new mongoose.Schema({
  actionType: {
    type: String,
    required: true  ,
    enum: actionTypes
  },
  collectionName: {
    type: String,
    required: true,
    enum: collectionNames
  },
  documentId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  changes: {
    oldValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed
  },
  user: {
    id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User ',
      required: true
    },
    name: {
      type: String,
      required: true
    }
  }
}, { timestamps: true });

module.exports = mongoose.model('AuditLog', auditLogSchema);
