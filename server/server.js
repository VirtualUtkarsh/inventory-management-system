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

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

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

// Apply CORS middleware FIRST
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Debug middleware to see incoming requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - Origin: ${req.get('Origin')} - Host: ${req.get('Host')}`);
  if (req.path.includes('login') || req.path.includes('auth')) {
    console.log('🔐 Auth request body:', req.body);
  }
  next();
});

// Other middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(morgan('dev'));

// TEST ROUTE for authentication debugging - REMOVE AFTER TESTING
app.post('/test-login', async (req, res) => {
  try {
    const User = require('./models/User');
    const bcrypt = require('bcryptjs');
    
    console.log('🧪 Test login attempt:', req.body);
    
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password required' });
    }
    
    // Find user
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(400).json({ message: 'User not found in database' });
    }
    
    console.log('👤 Found user:', { 
      email: user.email, 
      role: user.role, 
      status: user.status,
      isApproved: user.isApproved,
      hasPassword: !!user.password
    });
    
    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    console.log('🔑 Password match:', isMatch);
    
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid password' });
    }
    
    // Check approval status
    if (user.status !== 'approved' && !user.isApproved) {
      return res.status(403).json({ 
        message: 'Account not approved', 
        status: user.status, 
        isApproved: user.isApproved 
      });
    }
    
    res.json({ 
      message: 'TEST LOGIN SUCCESSFUL!', 
      user: { 
        id: user._id, 
        email: user.email, 
        role: user.role,
        status: user.status,
        isApproved: user.isApproved
      } 
    });
    
  } catch (error) {
    console.error('❌ Test login error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Routes - AFTER middleware
app.use('/api/admin', adminRoutes);
app.use('/api', apiRoutes);
app.use('/api/outset', outsetRoutes);
app.use('/api/insets', insetRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/metadata', metadataRoutes);

// Serve static files from React build (for production)
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
  
  // Serve React app for all non-API routes
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
  });
} else {
  // In development, provide info for non-API routes
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

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('💥 Server error:', err.stack);
  res.status(500).json({
    message: 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Local: http://localhost:${PORT}`);
  console.log(`🔗 Tunnel: https://hr1jqkkg-5000.inc1.devtunnels.ms`);
});