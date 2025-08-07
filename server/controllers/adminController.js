const User = require('../models/User');

// GET /api/admin/pending-users
const getPendingUsers = async (req, res) => {
  try {
    const users = await User.find({ status: 'pending' }).select('-password');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch pending users' });
  }
};

// GET /api/admin/approved-users - NEW FUNCTION
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
    if (!updatedUser) return res.status(404).json({ message: 'User not found' });
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
    if (!updatedUser) return res.status(404).json({ message: 'User not found' });
    res.json({ message: `User ${updatedUser.name} rejected` });
  } catch (err) {
    res.status(500).json({ message: 'Failed to reject user' });
  }
};

// DELETE /api/admin/:id
const deleteUser = async (req, res) => {
  try {
    const deletedUser = await User.findByIdAndDelete(req.params.id);
    if (!deletedUser) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete user' });
  }
};

module.exports = {
  getPendingUsers,
  getApprovedUsers, // NEW EXPORT
  approveUser,
  rejectUser,
  deleteUser,
};