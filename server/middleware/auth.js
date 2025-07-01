const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization').replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findOne({ _id: decoded.id });

    if (!user) {
      throw new Error();
    }

    req.user = user;
    req.userId = user._id;         
    req.username = user.name;      
    req.token = token;

    console.log('Authenticated user:', req.userId, req.username); 
    next();
  } catch (error) {
    res.status(401).send({ error: 'Please authenticate' });
  }
};

module.exports = auth;
