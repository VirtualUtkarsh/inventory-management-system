// server/utils/adminBootstrap.js

const User = require('../models/User');

async function checkAndCreateAdmin() {
  try {
    console.log('🔍 Checking for admin user...');
    
    // Check if any admin user exists (same logic as your bootstrap-admin.js)
    const existingAdmin = await User.findOne({ 
      $or: [
        { role: 'admin' },
        { email: 'admin123@inventory.com' }
      ]
    });

    if (existingAdmin) {
      console.log('✅ Admin user already exists.');
      console.log(`   Name: ${existingAdmin.name}`);
      console.log(`   Email: ${existingAdmin.email}`);
      return;
    }

    // No admin found, create one
    console.log('⚠️  No admin user found. Creating default admin user...');
    
    const adminUser = new User({
      name: 'Admin User',
      email: 'admin123@inventory.com',
      password: '12345678', // Plain text - will be hashed by pre-save hook
      role: 'admin',
      status: 'approved'
    });

    await adminUser.save();

    console.log('🎉 Default admin user created successfully!');
    console.log('📋 Admin Credentials:');
    console.log('   Email: admin123@inventory.com');
    console.log('   Password: 12345678');
    console.log('   Status: Admin & Approved');
    console.log('');
    console.log('⚠️  IMPORTANT: Change the default password after first login!');

  } catch (error) {
    console.error('❌ Error checking/creating admin user:', error.message);
    
    // Handle specific mongoose validation errors
    if (error.name === 'ValidationError') {
      console.log('📝 Validation errors:');
      for (let field in error.errors) {
        console.log(`   - ${field}: ${error.errors[field].message}`);
      }
    }
    
    // Don't throw the error to prevent server startup failure
    console.log('⚠️  Server will continue without admin user creation.');
  }
}

module.exports = { checkAndCreateAdmin };