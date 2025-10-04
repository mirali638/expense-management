const express = require('express');
const User = require('../models/User');
const Company = require('../models/Company');
const { protect, restrictTo, isAdminOrManager } = require('../middleware/auth');
const { validateUser, validateObjectId, validatePagination, handleValidationErrors } = require('../middleware/validation');

const router = express.Router();

// @desc    Get all users (Admin only)
// @route   GET /api/users
// @access  Private/Admin
router.get('/', protect, restrictTo('admin'), validatePagination, handleValidationErrors, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const users = await User.find({ company: req.user.company })
      .populate('manager', 'firstName lastName email')
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments({ company: req.user.company });

    res.status(200).json({
      status: 'success',
      results: users.length,
      total,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      data: {
        users
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
});

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private
router.get('/:id', protect, validateObjectId('id'), handleValidationErrors, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('company', 'name country currency')
      .populate('manager', 'firstName lastName email')
      .select('-password');

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Check if user can access this resource
    if (req.user.role !== 'admin' && user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        user
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
});

// @desc    Create new user (Admin only)
// @route   POST /api/users
// @access  Private/Admin
router.post('/', protect, restrictTo('admin'), validateUser, handleValidationErrors, async (req, res) => {
  try {
    const { firstName, lastName, email, password, role, manager, isManagerApprover } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        status: 'error',
        message: 'User already exists with this email'
      });
    }

    // Validate manager if provided
    if (manager) {
      const managerUser = await User.findById(manager);
      if (!managerUser || managerUser.company.toString() !== req.user.company.toString()) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid manager'
        });
      }
    }

    const user = await User.create({
      firstName,
      lastName,
      email,
      password,
      role: role || 'employee',
      company: req.user.company,
      manager: manager || null,
      isManagerApprover: isManagerApprover || false
    });

    const populatedUser = await User.findById(user._id)
      .populate('manager', 'firstName lastName email')
      .select('-password');

    res.status(201).json({
      status: 'success',
      data: {
        user: populatedUser
      }
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
});

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private
router.put('/:id', protect, validateObjectId('id'), handleValidationErrors, async (req, res) => {
  try {
    const { firstName, lastName, email, role, manager, isManagerApprover, isActive } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Check permissions
    if (req.user.role !== 'admin' && user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied'
      });
    }

    // Only admin can change role, manager, and active status
    if (req.user.role !== 'admin') {
      if (role !== undefined || manager !== undefined || isActive !== undefined || isManagerApprover !== undefined) {
        return res.status(403).json({
          status: 'error',
          message: 'Only admin can modify role, manager, or active status'
        });
      }
    }

    // Check if email is being changed and if it's already taken
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          status: 'error',
          message: 'Email is already taken'
        });
      }
    }

    // Validate manager if provided
    if (manager) {
      const managerUser = await User.findById(manager);
      if (!managerUser || managerUser.company.toString() !== req.user.company.toString()) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid manager'
        });
      }
    }

    // Update user
    user.firstName = firstName || user.firstName;
    user.lastName = lastName || user.lastName;
    user.email = email || user.email;
    
    if (req.user.role === 'admin') {
      user.role = role !== undefined ? role : user.role;
      user.manager = manager !== undefined ? manager : user.manager;
      user.isManagerApprover = isManagerApprover !== undefined ? isManagerApprover : user.isManagerApprover;
      user.isActive = isActive !== undefined ? isActive : user.isActive;
    }

    await user.save();

    const updatedUser = await User.findById(user._id)
      .populate('manager', 'firstName lastName email')
      .select('-password');

    res.status(200).json({
      status: 'success',
      data: {
        user: updatedUser
      }
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
});

// @desc    Delete user (Admin only)
// @route   DELETE /api/users/:id
// @access  Private/Admin
router.delete('/:id', protect, restrictTo('admin'), validateObjectId('id'), handleValidationErrors, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Prevent admin from deleting themselves
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot delete your own account'
      });
    }

    // Check if user belongs to the same company
    if (user.company.toString() !== req.user.company.toString()) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied'
      });
    }

    await User.findByIdAndDelete(req.params.id);

    res.status(200).json({
      status: 'success',
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
});

// @desc    Get team members (Manager only)
// @route   GET /api/users/team
// @access  Private/Manager
router.get('/team', protect, isAdminOrManager, async (req, res) => {
  try {
    let query = { company: req.user.company };

    // If user is manager (not admin), only show their direct reports
    if (req.user.role === 'manager') {
      query.manager = req.user._id;
    }

    const teamMembers = await User.find(query)
      .populate('manager', 'firstName lastName email')
      .select('-password')
      .sort({ firstName: 1 });

    res.status(200).json({
      status: 'success',
      results: teamMembers.length,
      data: {
        teamMembers
      }
    });
  } catch (error) {
    console.error('Get team members error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
});

// @desc    Get managers for dropdown
// @route   GET /api/users/managers
// @access  Private
router.get('/managers', protect, async (req, res) => {
  try {
    const managers = await User.find({
      company: req.user.company,
      role: { $in: ['admin', 'manager'] },
      isActive: true
    })
    .select('firstName lastName email role')
    .sort({ firstName: 1 });

    res.status(200).json({
      status: 'success',
      results: managers.length,
      data: {
        managers
      }
    });
  } catch (error) {
    console.error('Get managers error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
});

module.exports = router;
