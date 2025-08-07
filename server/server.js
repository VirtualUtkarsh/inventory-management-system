const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const morgan = require('morgan');
const cors = require('cors');
const connectDB = require('./config/db');
const adminRoutes = require('./routes/admin'); 
const apiRoutes = require('./routes/api'); // Centralized route file
const outsetRoutes = require('./routes/outset');

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// CORS Configuration - MUST BE BEFORE ROUTES
const corsOptions = {
  origin: 'http://localhost:3000', // your frontend origin
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// Apply CORS middleware FIRST
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Handle preflight across all routes

// Other middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(morgan('dev'));

// Routes - AFTER middleware
app.use('/api/admin', adminRoutes);
app.use('/api', apiRoutes);
app.use('/api/outset', outsetRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('💥 Server error:', err.stack);
  res.status(500).json({ 
    message: 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// Catch-all for undefined routes
app.use('*', (req, res) => {
  res.status(404).json({ message: `Route ${req.originalUrl} not found` });
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});