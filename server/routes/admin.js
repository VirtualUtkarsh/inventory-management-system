const express = require('express');
const router = express.Router();
const { auth, requireAdmin } = require('../middleware/auth');
const {
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
} = require('../controllers/adminController');

console.log('✅ Admin routes loaded');

// Apply auth and admin middleware to all routes
router.use(auth);
router.use(requireAdmin);

// =======================
// User Management Routes
// =======================

// Get users by status
router.get('/pending-users', getPendingUsers);
router.get('/approved-users', getApprovedUsers);
router.get('/all-users', getAllUsers);

// User status management
router.put('/:id/approve', approveUser);
router.put('/:id/reject', rejectUser);
router.put('/:id/toggle-status', toggleUserStatus);

// Admin role management
router.put('/:id/toggle-admin', toggleAdminRole);

// Delete user
router.delete('/:id', deleteUser);

// =======================
// Cleanup Management Routes
// =======================

// Cleanup statistics and control
router.get('/cleanup-stats', getCleanupStats);
router.post('/cleanup/manual', triggerManualCleanup);
router.get('/cleanup-history', getCleanupHistory);
router.post('/cleanup/toggle', toggleCleanupService);

module.exports = router;