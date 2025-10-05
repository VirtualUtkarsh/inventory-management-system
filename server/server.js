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
// Add this import for admin bootstrap
const { checkAndCreateAdmin } = require('./utils/adminbootstrap');

// Load environment variables
dotenv.config();

const app = express();

// ====================
// Middleware (MUST come BEFORE routes)
// ====================

const corsOptions = {
  origin: [
    'http://localhost:3000',
    // 'https://inventory-frontend-3trd.onrender.com',
    'https://inventory-management-system-jhci.onrender.com',
    /\.devtunnels\.ms$/,
    /.*\.vercel\.app$/,
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
app.options('*', cors(corsOptions));

// ✅ Essential middleware - MUST come before routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// ====================
// Routes (AFTER middleware)
// ====================

app.use('/api/admin', adminRoutes);
app.use('/api', apiRoutes);
app.use('/api/outsets', outsetRoutes);
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
// Database & Server Startup
// ====================

async function startServer() {
  try {
    // Connect to database
    await connectDB();
    
    // Check and create admin user if needed
    await checkAndCreateAdmin();
    
    // Start cleanup service
    cleanupService.start();

    // Start the server
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🌐 Local: http://localhost:${PORT}`);
    });
    
  } catch (error) {
    console.error('❌ Server startup failed:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

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