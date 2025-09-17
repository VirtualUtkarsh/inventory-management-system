const User = require('../models/User');
const cleanupService = require('../utils/cleanupService');
const CleanupLog = require('../models/CleanupLog');

// =======================
// User management handlers
// =======================

// GET /api/admin/pending-users
const getPendingUsers = async (req, res) => {
  try {
    const users = await User.find({ status: 'pending' }).select('-password');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch pending users' });
  }
};

// GET /api/admin/approved-users
const getApprovedUsers = async (req, res) => {
  try {
    const users = await User.find({ status: 'approved' }).select('-password');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch approved users' });
  }
};

// GET /api/admin/all-users - NEW: Get all users with their roles
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}).select('-password');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch users' });
  }
};

// PUT /api/admin/:id/approve
const approveUser = async (req, res) => {
  try {
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { status: 'approved' },
      { new: true }
    );
    if (!updatedUser)
      return res.status(404).json({ message: 'User not found' });
    res.json({ message: `User ${updatedUser.name} approved` });
  } catch (err) {
    res.status(500).json({ message: 'Failed to approve user' });
  }
};

// PUT /api/admin/:id/reject
const rejectUser = async (req, res) => {
  try {
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { status: 'rejected' },
      { new: true }
    );
    if (!updatedUser)
      return res.status(404).json({ message: 'User not found' });
    res.json({ message: `User ${updatedUser.name} rejected` });
  } catch (err) {
    res.status(500).json({ message: 'Failed to reject user' });
  }
};

// PUT /api/admin/:id/toggle-admin - NEW: Toggle admin privileges
const toggleAdminRole = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent user from removing their own admin privileges
    if (user._id.toString() === req.user._id.toString() && user.role === 'admin') {
      return res.status(400).json({ 
        message: 'Cannot remove admin privileges from yourself' 
      });
    }

    // Toggle role between user and admin
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { role: newRole },
      { new: true }
    ).select('-password');

    res.json({ 
      message: `User ${updatedUser.name} is now ${newRole === 'admin' ? 'an admin' : 'a regular user'}`,
      user: updatedUser
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to toggle admin role' });
  }
};

// PUT /api/admin/:id/toggle-status - NEW: Toggle user approval status
const toggleUserStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent admin from changing their own status
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ 
        message: 'Cannot change your own approval status' 
      });
    }

    // Cycle through statuses: pending -> approved -> rejected -> pending
    let newStatus;
    switch (user.status) {
      case 'pending':
        newStatus = 'approved';
        break;
      case 'approved':
        newStatus = 'rejected';
        break;
      case 'rejected':
        newStatus = 'pending';
        break;
      default:
        newStatus = 'pending';
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { status: newStatus },
      { new: true }
    ).select('-password');

    res.json({ 
      message: `User ${updatedUser.name} status changed to ${newStatus}`,
      user: updatedUser
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to toggle user status' });
  }
};

// DELETE /api/admin/:id
const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent admin from deleting themselves
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ 
        message: 'Cannot delete your own account' 
      });
    }

    // Check if this is the last admin
    if (user.role === 'admin') {
      const adminCount = await User.countDocuments({ role: 'admin' });
      if (adminCount <= 1) {
        return res.status(400).json({ 
          message: 'Cannot delete the last admin user' 
        });
      }
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete user' });
  }
};

// =======================
// Cleanup management handlers
// =======================

// GET /api/admin/cleanup-stats
const getCleanupStats = async (req, res) => {
  try {
    const stats = await cleanupService.getCleanupStats();
    if (!stats) {
      return res.status(500).json({
        message: 'Failed to retrieve cleanup statistics'
      });
    }
    res.status(200).json({
      message: 'Cleanup statistics retrieved successfully',
      stats
    });
  } catch (error) {
    console.error('Get cleanup stats error:', error);
    res.status(500).json({
      message: 'Failed to get cleanup statistics',
      error: error.message
    });
  }
};

// POST /api/admin/cleanup/manual
const triggerManualCleanup = async (req, res) => {
  try {
    console.log(`Manual cleanup triggered by admin: ${req.username}`);

    // Run cleanup in background
    cleanupService.manualCleanup().catch(error => {
      console.error('Manual cleanup failed:', error);
    });

    res.status(200).json({
      message: 'Manual cleanup initiated. Check cleanup logs for results.',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Trigger manual cleanup error:', error);
    res.status(500).json({
      message: 'Failed to trigger manual cleanup',
      error: error.message
    });
  }
};

// GET /api/admin/cleanup-history
const getCleanupHistory = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const [cleanupLogs, totalCount] = await Promise.all([
      CleanupLog.find()
        .sort({ cleanupDate: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      CleanupLog.countDocuments()
    ]);

    res.status(200).json({
      message: 'Cleanup history retrieved successfully',
      data: {
        cleanupLogs,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalCount / limit),
          totalCount,
          hasNext: skip + cleanupLogs.length < totalCount,
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Get cleanup history error:', error);
    res.status(500).json({
      message: 'Failed to get cleanup history',
      error: error.message
    });
  }
};

// POST /api/admin/cleanup/toggle
const toggleCleanupService = async (req, res) => {
  try {
    const { action } = req.body; // 'start' or 'stop'

    if (action === 'start') {
      cleanupService.start();
      res.status(200).json({
        message: 'Cleanup service started successfully',
        status: 'running'
      });
    } else if (action === 'stop') {
      cleanupService.stop();
      res.status(200).json({
        message: 'Cleanup service stopped successfully',
        status: 'stopped'
      });
    } else {
      res.status(400).json({
        message: 'Invalid action. Use "start" or "stop"'
      });
    }
  } catch (error) {
    console.error('Toggle cleanup service error:', error);
    res.status(500).json({
      message: 'Failed to toggle cleanup service',
      error: error.message
    });
  }
};

// =======================
// Export all handlers
// =======================

module.exports = {
  getPendingUsers,
  getApprovedUsers,
  getAllUsers,
  approveUser,
  rejectUser,
  toggleAdminRole,
  toggleUserStatus,
  deleteUser,
  getCleanupStats,
  triggerManualCleanup,
  getCleanupHistory,
  toggleCleanupService
};