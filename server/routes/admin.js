console.log('✅ Admin routes loaded');
const express = require('express');
const router = express.Router();
// const { getPendingUsers, approveUser, rejectUser, deleteUser } = require('../controllers/adminController');
const { getPendingUsers, getApprovedUsers, approveUser, rejectUser, deleteUser } = require('../controllers/adminController');
const { auth, requireAdmin } = require('../middleware/auth');

router.use(auth, requireAdmin);
// Make sure this user is authenticated

// You can optionally restrict these to only admins:
router.get('/approved-users', getApprovedUsers);
router.get('/pending-users', getPendingUsers);
router.put('/:id/approve', approveUser);
router.put('/:id/reject', rejectUser);
router.delete('/:id', deleteUser);

module.exports = router;
