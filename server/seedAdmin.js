// server/seedAdmin.js
const mongoose = require('mongoose');
const bcryptjs = require('bcryptjs');
const dotenv = require('dotenv');

// Load environment variables from config/.env
dotenv.config({ path: './.env' });

// Import your User model (adjust the path if needed)
const User = require('./models/User');

const createAdminUser = async () => {
  try {
    console.log('🔗 Connecting to MongoDB Atlas...');
    
    // Connect to MongoDB Atlas
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Connected to MongoDB Atlas successfully!');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      console.log('❌ Admin user already exists:');
      console.log('   Email:', existingAdmin.email);
      console.log('   Username:', existingAdmin.username);
      await mongoose.disconnect();
      process.exit(0);
    }

    // Check total users count
    const totalUsers = await User.countDocuments();
    console.log(`📊 Current users in database: ${totalUsers}`);

    // Hash password
    const salt = await bcryptjs.genSalt(10);
    const hashedPassword = await bcryptjs.hash('admin123', salt);

    // Create admin user with all required fields
    const adminUser = new User({
      username: 'admin',
      email: 'admin@inventory.com',
      password: hashedPassword,
      role: 'admin',
      isApproved: true, // Admin is auto-approved
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await adminUser.save();
    
    console.log('🎉 Admin user created successfully!');
    console.log('📧 Email: admin@inventory.com');
    console.log('👤 Username: admin');
    console.log('🔑 Password: admin123');
    console.log('🔐 Role: admin');
    console.log('✅ Status: Approved');
    console.log('');
    console.log('⚠️  IMPORTANT: Change these credentials after first login!');
    console.log('');
    console.log('📝 Next steps:');
    console.log('   1. Login with these credentials');
    console.log('   2. Change the password immediately');
    console.log('   3. You can now approve other users who register');

  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
    if (error.code === 11000) {
      console.error('   This email/username already exists in the database');
    }
  } finally {
    await mongoose.disconnect();
    console.log('📝 Disconnected from MongoDB');
    process.exit(0);
  }
};

// Run the function
createAdminUser();