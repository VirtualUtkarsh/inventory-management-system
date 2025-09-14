const express = require('express');
const router = express.Router();
const { createInset, getAllInsets } = require('../controllers/insetController');
const { auth } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(auth);

// @route   POST /api/insets
// @desc    Create a new inset (inbound entry)
// @access  Private
router.post('/', createInset);

// @route   GET /api/insets  
// @desc    Get all insets (inbound history)
// @access  Private
router.get('/', getAllInsets);

module.exports = router;