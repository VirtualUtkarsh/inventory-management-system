const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Authentication middleware
const auth = async (req, res, next) => {
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204); // Allow preflight requests
  }

  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Token missing' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) return res.status(401).json({ error: 'User not found' });
    if (user.status !== 'approved') return res.status(403).json({ error: 'Account not approved' });

    req.user = user;
    req.userId = user._id;
    req.username = user.name;
    req.token = token;

    next();
  } catch (error) {
    res.status(401).json({ error: 'Please authenticate' });
  }
};


// Admin role checker middleware
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access only.' });
  }
  next();
};

module.exports = { auth, requireAdmin };
