const express = require('express');
const router = express.Router();
const { 
  createOutset, 
  createBatchOutset, 
  getOutsets, 
  getBatchSummary 
} = require('../controllers/outsetController');
const { auth } = require('../middleware/auth');

// IMPORTANT: Specific routes must come BEFORE generic routes

// @route   POST /api/outsets/batch
// @desc    Create multiple outbound records in one transaction  
router.post('/batch', auth, createBatchOutset);

// @route   GET /api/outsets/batch/:batchId
// @desc    Get batch outbound summary
router.get('/batch/:batchId', auth, getBatchSummary);

// @route   GET /api/outsets
// @desc    Get all outbound records
router.get('/', auth, getOutsets);

// @route   POST /api/outsets
// @desc    Create single outbound record (existing functionality)
router.post('/', auth, createOutset);

module.exports = router;