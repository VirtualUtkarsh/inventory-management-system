const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const morgan = require('morgan');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');
const adminRoutes = require('./routes/admin');
const apiRoutes = require('./routes/api');
const outsetRoutes = require('./routes/outset');
const insetRoutes = require('./routes/insets');
const inventoryRoutes = require('./routes/inventory');
const metadataRoutes = require('./routes/metadata');
const cleanupService = require('./utils/cleanupService'); // ✅ Added here

// Load environment variables
dotenv.config();

const app = express();

// Connect to MongoDB and start server after connection
connectDB()
  .then(() => {
    // Start the cleanup service
    cleanupService.start();

    // Start the server
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🌐 Local: http://localhost:${PORT}`);
      console.log(`🔗 Tunnel: https://hr1jqkkg-5000.inc1.devtunnels.ms`);
    });
  })
  .catch(error => {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  });

// ====================
// Middleware & Routes
// ====================

// Enhanced CORS Configuration for port forwarding
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'https://hr1jqkkg-5000.inc1.devtunnels.ms',
    'https://hr1jqkkg-3000.inc1.devtunnels.ms',
    /\.devtunnels\.ms$/, // Allow any devtunnels domain
    /^https:\/\/.*\.inc1\.devtunnels\.ms$/ // Match your tunnel pattern
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers'
  ],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(morgan('dev'));

// Debugging middleware and test routes here ...
// (unchanged from your current server.js)

// Routes
app.use('/api/admin', adminRoutes);
app.use('/api', apiRoutes);
app.use('/api/outset', outsetRoutes);
app.use('/api/insets', insetRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/metadata', metadataRoutes);

// Static files for React
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
  });
} else {
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/test-login')) {
      res.json({ 
        message: `Route ${req.originalUrl} not found`,
        info: 'This is the backend server. Frontend should be running on port 3000.',
        endpoints: ['/api/auth/login', '/api/auth/register', '/test-login']
      });
    } else {
      res.status(404).json({ message: `Route ${req.originalUrl} not found` });
    }
  });
}

// Global error handler
app.use((err, req, res, next) => {
  console.error('💥 Server error:', err.stack);
  res.status(500).json({
    message: 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// ==========================
// Graceful Shutdown Handling
// ==========================

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
