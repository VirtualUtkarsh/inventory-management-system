// server/routes/insets.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const { 
  createInset, 
  getAllInsets, 
  getInsetById, 
  updateInset, 
  deleteInset,
  importInboundExcel 
} = require('../controllers/insetController');
const { auth, requireAdmin } = require('../middleware/auth');

// Configure multer for file upload (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Check file type
    const allowedMimeTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel' // .xls
    ];
    
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Please upload an Excel file (.xlsx or .xls)'), false);
    }
  }
});

// @route   POST /api/insets
// @desc    Create a new inset (inbound entry)
// @access  Private
router.post('/', auth, createInset);

// @route   GET /api/insets  
// @desc    Get all insets (inbound history)
// @access  Private
router.get('/', auth, getAllInsets);

// @route   GET /api/insets/:id
// @desc    Get a specific inset by ID
// @access  Private
router.get('/:id', auth, getInsetById);

// @route   PUT /api/insets/:id
// @desc    Update a specific inset
// @access  Private
router.put('/:id', auth, updateInset);

// @route   DELETE /api/insets/:id
// @desc    Delete a specific inset (ADMIN ONLY - reverses inventory)
// @access  Private/Admin
router.delete('/:id', auth, requireAdmin, deleteInset);

// @route   POST /api/insets/import-excel
// @desc    Import inbound records from Excel file
// @access  Private
router.post('/import-excel', auth, upload.single('excelFile'), importInboundExcel);

// Error handling middleware for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 10MB.'
      });
    }
  }
  
  if (error.message === 'Invalid file type. Please upload an Excel file (.xlsx or .xls)') {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }

  // For other errors, pass to global error handler
  next(error);
});

module.exports = router;