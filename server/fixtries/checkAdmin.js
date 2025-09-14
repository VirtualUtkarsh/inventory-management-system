// server/checkAdmin.js
const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: './.env' });

// Import User model
const User = require('../models/User');

const checkAdminUser = async () => {
  try {
    console.log('🔗 Connecting to MongoDB Atlas...');
    
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Connected successfully!');

    // Find all admin users
    const adminUsers = await User.find({ role: 'admin' });
    console.log(`\n📊 Found ${adminUsers.length} admin user(s):`);
    
    adminUsers.forEach((admin, index) => {
      console.log(`\n👤 Admin ${index + 1}:`);
      console.log('   Email:', admin.email);
      console.log('   Username:', admin.username);
      console.log('   Role:', admin.role);
      console.log('   Approved:', admin.isApproved);
      console.log('   Created:', admin.createdAt);
      console.log('   ID:', admin._id);
    });

    // Check all users and their status
    const allUsers = await User.find({});
    console.log(`\n📋 Total users in database: ${allUsers.length}`);
    
    const approvedUsers = allUsers.filter(user => user.isApproved);
    const pendingUsers = allUsers.filter(user => !user.isApproved);
    
    console.log(`✅ Approved users: ${approvedUsers.length}`);
    console.log(`⏳ Pending approval: ${pendingUsers.length}`);

    if (pendingUsers.length > 0) {
      console.log('\n⏳ Pending users:');
      pendingUsers.forEach(user => {
        console.log(`   - ${user.email} (${user.username || 'no username'})`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n📝 Disconnected from MongoDB');
    process.exit(0);
  }
};

checkAdminUser();