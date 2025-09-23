const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: './.env' });

// Import your User model
const User = require('./models/User');

// Database connection
const connectDB = async () => {
  try {
    // Try different possible environment variable names
    const mongoUri = process.env.MONGO_URI || 
                    process.env.MONGODB_URI || 
                    process.env.DATABASE_URL || 
                    process.env.MONGO_URL;
    
    if (!mongoUri) {
      console.error('❌ MongoDB connection string not found in environment variables');
      console.log('📝 Please check your .env file contains one of:');
      console.log('   - MONGO_URI=your_connection_string');
      console.log('   - MONGODB_URI=your_connection_string');
      console.log('   - DATABASE_URL=your_connection_string');
      console.log('   - MONGO_URL=your_connection_string');
      process.exit(1);
    }

    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB Connected');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

// Create initial admin user
const createInitialAdmin = async () => {
  try {
    // Check if any admin user already exists
    const existingAdmin = await User.findOne({ 
      $or: [
        { role: 'admin' },
        { email: 'admin123@inventory.com' }
      ]
    });

    if (existingAdmin) {
      console.log('⚠️  Admin user already exists:');
      console.log(`   Name: ${existingAdmin.name}`);
      console.log(`   Email: ${existingAdmin.email}`);
      console.log('   No new admin created.');
      return;
    }

    // Create admin user object - let the User model handle password hashing
    const adminUser = new User({
      name: 'Admin User',
      email: 'admin123@inventory.com',
      password: '12345678', // Plain text - will be hashed by pre-save hook
      role: 'admin',
      status: 'approved'
    });

    // Save the admin user
    await adminUser.save();

    console.log('🎉 Initial admin user created successfully!');
    console.log('📋 Admin Credentials:');
    console.log('   Email: admin123@inventory.com');
    console.log('   Password: 12345678');
    console.log('   Status: Admin & Approved');
    console.log('');
    console.log('⚠️  IMPORTANT: Change the default password after first login!');

  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
    
    // Handle specific mongoose validation errors
    if (error.name === 'ValidationError') {
      console.log('📝 Validation errors:');
      for (let field in error.errors) {
        console.log(`   - ${field}: ${error.errors[field].message}`);
      }
    }
  }
};

// Main execution
const init = async () => {
  console.log('🚀 Initializing Bootstrap Admin...\n');
  
  await connectDB();
  await createInitialAdmin();
  
  console.log('\n✨ Bootstrap process completed!');
  process.exit(0);
};

// Handle errors and cleanup
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Promise Rejection:', err.message);
  process.exit(1);
});

// Run the initialization
init().catch((error) => {
  console.error('❌ Bootstrap failed:', error.message);
  process.exit(1);
});