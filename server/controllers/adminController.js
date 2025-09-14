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

// DELETE /api/admin/:id
const deleteUser = async (req, res) => {
  try {
    const deletedUser = await User.findByIdAndDelete(req.params.id);
    if (!deletedUser)
      return res.status(404).json({ message: 'User not found' });
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
  approveUser,
  rejectUser,
  deleteUser,
  getCleanupStats,
  triggerManualCleanup,
  getCleanupHistory,
  toggleCleanupService
};
