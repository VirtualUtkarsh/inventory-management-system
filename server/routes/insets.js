const express = require('express');
const router = express.Router();
const { createInset, getInsets } = require('../controllers/insetController');
const authMiddleware = require('../middleware/auth'); // if auth is required

// Use authMiddleware if needed
router.post('/', authMiddleware, createInset);
router.get('/', authMiddleware, getInsets);
router.post('/test', (req, res) => {
  res.json({ message: 'Route is working', body: req.body });
});
module.exports = router;

