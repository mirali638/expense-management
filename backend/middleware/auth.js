const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes - verify JWT token
exports.protect = async (req, res, next) => {
  try {
    let token;

    // Check for token in headers
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // Check for token in cookies
    if (!token && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({
        status: 'error',
        message: 'Access denied. No token provided.'
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Get user from token
      const user = await User.findById(decoded.id).select('+password');
      
      if (!user) {
        return res.status(401).json({
          status: 'error',
          message: 'Token is valid but user no longer exists.'
        });
      }

      if (!user.isActive) {
        return res.status(401).json({
          status: 'error',
          message: 'User account is deactivated.'
        });
      }

      // Grant access to protected route
      req.user = user;
      next();
    } catch (error) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid token.'
      });
    }
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: 'Server error during authentication.'
    });
  }
};

// Restrict to certain roles
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: 'You do not have permission to perform this action.'
      });
    }
    next();
  };
};

// Check if user is admin or manager
exports.isAdminOrManager = (req, res, next) => {
  if (req.user.role === 'admin' || req.user.role === 'manager') {
    return next();
  }
  return res.status(403).json({
    status: 'error',
    message: 'Access denied. Admin or Manager role required.'
  });
};

// Check if user can approve expenses
exports.canApprove = async (req, res, next) => {
  try {
    const user = req.user;
    
    // Admin can approve anything
    if (user.role === 'admin') {
      return next();
    }
    
    // Manager can approve if they are a manager approver
    if (user.role === 'manager' && user.isManagerApprover) {
      return next();
    }
    
    return res.status(403).json({
      status: 'error',
      message: 'You do not have permission to approve expenses.'
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: 'Server error during authorization check.'
    });
  }
};

// Check if user owns the resource or is admin
exports.isOwnerOrAdmin = (req, res, next) => {
  const resourceUserId = req.params.userId || req.body.userId || req.query.userId;
  
  if (req.user.role === 'admin' || req.user._id.toString() === resourceUserId) {
    return next();
  }
  
  return res.status(403).json({
    status: 'error',
    message: 'You can only access your own resources.'
  });
};
