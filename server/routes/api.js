const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const { auth } = require('../middleware/auth');
const authRoutes = require('./auth'); // Import your auth routes
const inventoryController = require('../controllers/inventoryController');
const insetController = require('../controllers/insetController');
const outsetController = require('../controllers/outsetController');
const adminRoutes = require('./admin'); // Make sure this file exists

// Auth routes - this will handle /api/auth/register and /api/auth/login
router.use('/auth', authRoutes);

// Protected routes (require authentication)
router.get('/inventory', auth, inventoryController.getInventory);
router.post('/inventory/update', auth, inventoryController.updateQuantity);

router.post('/insets', auth, insetController.createInset);
router.get('/insets', auth, insetController.getAllInsets);

router.post('/outsets', auth, outsetController.createOutset);
router.get('/outsets', auth, outsetController.getOutsets);

// Admin routes (require authentication + admin role)
router.use('/admin', adminRoutes);

module.exports = router;