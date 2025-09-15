const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const morgan = require('morgan');
const cors = require('cors');
const connectDB = require('./config/db');
const adminRoutes = require('./routes/admin');
const apiRoutes = require('./routes/api');
const outsetRoutes = require('./routes/outset');
const insetRoutes = require('./routes/insets');
const inventoryRoutes = require('./routes/inventory');
const metadataRoutes = require('./routes/metadata');
const cleanupService = require('./utils/cleanupService');

// Load environment variables
dotenv.config();

const app = express();

// ====================
// Middleware
// ====================

const corsOptions = {
  origin: [
    'http://localhost:3000',
    'https://hr1jqkkg-3000.inc1.devtunnels.ms',
    /\.devtunnels\.ms$/,
    'https://inventory-frontend.vercel.app',
    'https://inventoryyy-3xwmu6i43-utkarsh-singhs-projects-ab9afad9.vercel.app' // ✅ Your deployed frontend URL
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept'
  ],
  credentials: true
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Preflight requests

// ✅ ADD THESE MISSING MIDDLEWARE LINES:
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(morgan('dev'));

// ====================
// Routes
// ====================

app.use('/api/admin', adminRoutes);
app.use('/api', apiRoutes);
app.use('/api/outset', outsetRoutes);
app.use('/api/insets', insetRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/metadata', metadataRoutes);

// Fallback for unknown routes
app.use('*', (req, res) => {
  res.status(404).json({
    message: `Route ${req.originalUrl} not found`,
    info: 'This is the backend API. Frontend is deployed separately.'
  });
});

// ====================
// Error Handler
// ====================

app.use((err, req, res, next) => {
  console.error('💥 Server error:', err.stack);
  res.status(500).json({
    message: 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// ====================
// Database & Server
// ====================

connectDB()
  .then(() => {
    cleanupService.start();

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🌐 Local: http://localhost:${PORT}`);
    });
  })
  .catch(error => {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  });

// ====================
// Graceful Shutdown
// ====================

process.on('SIGINT', () => {
  console.log('⚙️ Received SIGINT. Shutting down gracefully...');
  cleanupService.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('⚙️ Received SIGTERM. Shutting down gracefully...');
  cleanupService.stop();
  process.exit(0);
});