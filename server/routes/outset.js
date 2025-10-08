// server/routes/outset.js
const express = require('express');
const router = express.Router();
const { 
  createOutset, 
  createBatchOutset, 
  getOutsets, 
  getBatchSummary,
  deleteOutset,
  deleteBatchOutset
} = require('../controllers/outsetController');
const { auth, requireAdmin } = require('../middleware/auth');

// IMPORTANT: Specific routes must come BEFORE generic routes

// @route   POST /api/outsets/batch
// @desc    Create multiple outbound records in one transaction  
// @access  Private
router.post('/batch', auth, createBatchOutset);

// @route   GET /api/outsets/batch/:batchId
// @desc    Get batch outbound summary
// @access  Private
router.get('/batch/:batchId', auth, getBatchSummary);

// @route   DELETE /api/outsets/batch/:batchId
// @desc    Delete entire batch and restore inventory (ADMIN ONLY)
// @access  Private/Admin
router.delete('/batch/:batchId', auth, requireAdmin, deleteBatchOutset);

// @route   GET /api/outsets
// @desc    Get all outbound records
// @access  Private
router.get('/', auth, getOutsets);

// @route   POST /api/outsets
// @desc    Create single outbound record
// @access  Private
router.post('/', auth, createOutset);

// @route   DELETE /api/outsets/:id
// @desc    Delete a specific outset (ADMIN ONLY - restores inventory)
// @access  Private/Admin
router.delete('/:id', auth, requireAdmin, deleteOutset);

module.exports = router;