
import jwt from 'jsonwebtoken';
import User from '../src/models/User.js';

export const protect = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) throw new Error('No token provided');

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user) throw new Error('User not found');

    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
};

export const adminOnly = (req, res, next) => {
  if (req.user.role !== 'libarian') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

export const developerOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Developer access required' });
  }
  next();
};