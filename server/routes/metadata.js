// server/routes/metadata.js
const express = require('express');
const router = express.Router();
const { auth, requireAdmin } = require('../middleware/auth');
const metadataController = require('../controllers/metadataController');

// Public routes (accessible to all authenticated users)
router.get('/all', auth, metadataController.getAllMetadata);
router.get('/bins', auth, metadataController.bins.getAll); // MOVED HERE - accessible to all users

// Admin-only routes for managing metadata
router.use(auth, requireAdmin); // All routes below require admin access

// Product Sizes
router.get('/sizes', metadataController.sizes.getAll);
router.post('/sizes', metadataController.sizes.create);
router.put('/sizes/:id', metadataController.sizes.update);
router.delete('/sizes/:id', metadataController.sizes.delete);

// Colors
router.get('/colors', metadataController.colors.getAll);
router.post('/colors', metadataController.colors.create);
router.put('/colors/:id', metadataController.colors.update);
router.delete('/colors/:id', metadataController.colors.delete);

// Packs
router.get('/packs', metadataController.packs.getAll);
router.post('/packs', metadataController.packs.create);
router.put('/packs/:id', metadataController.packs.update);
router.delete('/packs/:id', metadataController.packs.delete);

// Categories
router.get('/categories', metadataController.categories.getAll);
router.post('/categories', metadataController.categories.create);
router.put('/categories/:id', metadataController.categories.update);
router.delete('/categories/:id', metadataController.categories.delete);

// Bins management (admin-only - for creating/updating/deleting bins)
router.post('/bins', metadataController.bins.create);
router.put('/bins/:id', metadataController.bins.update);
router.delete('/bins/:id', metadataController.bins.delete);

module.exports = router;