const jwt = require('jsonwebtoken');
const User = require('../models/User');

// ✅ Middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // Check header exists and starts with Bearer
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Access token required' });
    }

    // Extract token
    const token = authHeader.split(' ')[1];

    // Verify token using same secret as token generation
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find the user in DB
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({ message: 'Invalid token or user not found' });
    }

    // Optional: if user account is deactivated
    if (user.isActive === false) {
      return res.status(403).json({ message: 'Account is deactivated' });
    }

    // Attach user to request for next middleware
    req.user = user;
    next();
  } catch (error) {
    console.error('JWT verification failed:', error.message);

    // Expired token
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired, please login again' });
    }

    // Invalid or malformed token
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid or malformed token' });
    }

    return res.status(500).json({ message: 'Authentication error' });
  }
};

// ✅ Role-based authorization
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    next();
  };
};

// ✅ Allow owner or admin access
const authorizeOwnerOrAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  // ✅ Handle case where _id might be ObjectId, ensure toString()
  if (req.user.role === 'admin' || req.user._id.toString() === req.params.id) {
    return next();
  }

  return res.status(403).json({ message: 'Access denied' });
};

module.exports = {
  authenticateToken,
  authorizeRoles,
  authorizeOwnerOrAdmin,
};
