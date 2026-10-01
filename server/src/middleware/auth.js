import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const authenticate = async (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ message: 'Not authenticated' });

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.id);
    if (!user || !user.isActive) return res.status(401).json({ message: 'Not authenticated' });

    // Everything downstream trusts req.user, never the request body.
    req.user = {
      id: user._id.toString(),
      role: user.role,
      brokerageId: user.brokerageId ? user.brokerageId.toString() : null,
      name: user.name,
    };
    next();
  } catch {
    res.status(401).json({ message: 'Not authenticated' });
  }
};

export const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  next();
};