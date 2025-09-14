// server/fixAdmin.js
const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: './.env' });

// Import User model
const User = require('../models/User');

const fixAdminUser = async () => {
  try {
    console.log('🔗 Connecting to MongoDB Atlas...');
    
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Connected successfully!');

    // Find and update the admin user
    const adminEmail = 'vaishnawtushar@gmail.com';
    
    const updatedAdmin = await User.findOneAndUpdate(
      { email: adminEmail },
      { 
        $set: { 
          isApproved: true,
          status: 'approved',
          username: 'admin',
          role: 'admin'
        } 
      },
      { new: true }
    );

    if (!updatedAdmin) {
      console.log('❌ Admin user not found!');
      return;
    }

    console.log('🎉 Admin user fixed successfully!');
    console.log('📧 Email:', updatedAdmin.email);
    console.log('👤 Username:', updatedAdmin.username);
    console.log('🔐 Role:', updatedAdmin.role);
    console.log('✅ Status:', updatedAdmin.status);
    console.log('✅ isApproved:', updatedAdmin.isApproved);

    console.log('\n🔑 You can now login with:');
    console.log('   Email: vaishnawtushar@gmail.com');
    console.log('   Password: [your existing password]');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n📝 Disconnected from MongoDB');
    process.exit(0);
  }
};

fixAdminUser();