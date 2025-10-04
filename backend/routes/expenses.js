const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Expense = require('../models/Expense');
const User = require('../models/User');
const Company = require('../models/Company');
const ApprovalRule = require('../models/ApprovalRule');
const { protect, restrictTo, isAdminOrManager } = require('../middleware/auth');
const { validateExpense, validateObjectId, validatePagination, handleValidationErrors } = require('../middleware/validation');
const { convertCurrency } = require('../utils/currency');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = process.env.UPLOAD_PATH || './uploads';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'receipt-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 // 5MB default
  },
  fileFilter: fileFilter
});

// @desc    Get all expenses
// @route   GET /api/expenses
// @access  Private
router.get('/', protect, validatePagination, handleValidationErrors, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const { status, category, startDate, endDate } = req.query;

    let query = { company: req.user.company };

    // Filter by user role
    if (req.user.role === 'employee') {
      query.employee = req.user._id;
    } else if (req.user.role === 'manager') {
      // Manager can see their team's expenses
      const teamMembers = await User.find({ manager: req.user._id }).select('_id');
      const teamMemberIds = teamMembers.map(member => member._id);
      query.employee = { $in: teamMemberIds };
    }

    // Apply filters
    if (status) {
      query.status = status;
    }
    if (category) {
      query.category = category;
    }
    if (startDate || endDate) {
      query.expenseDate = {};
      if (startDate) query.expenseDate.$gte = new Date(startDate);
      if (endDate) query.expenseDate.$lte = new Date(endDate);
    }

    const expenses = await Expense.find(query)
      .populate('employee', 'firstName lastName email')
      .populate('currentApprover', 'firstName lastName email')
      .populate('approvedBy', 'firstName lastName email')
      .populate('rejectedBy', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Expense.countDocuments(query);

    res.status(200).json({
      status: 'success',
      results: expenses.length,
      total,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      data: {
        expenses
      }
    });
  } catch (error) {
    console.error('Get expenses error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
});

// @desc    Get single expense
// @route   GET /api/expenses/:id
// @access  Private
router.get('/:id', protect, validateObjectId('id'), handleValidationErrors, async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id)
      .populate('employee', 'firstName lastName email')
      .populate('currentApprover', 'firstName lastName email')
      .populate('approvedBy', 'firstName lastName email')
      .populate('rejectedBy', 'firstName lastName email')
      .populate('approvalHistory.approver', 'firstName lastName email');

    if (!expense) {
      return res.status(404).json({
        status: 'error',
        message: 'Expense not found'
      });
    }

    // Check permissions
    if (req.user.role === 'employee' && expense.employee._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied'
      });
    }

    if (req.user.role === 'manager') {
      const teamMembers = await User.find({ manager: req.user._id }).select('_id');
      const teamMemberIds = teamMembers.map(member => member._id.toString());
      if (!teamMemberIds.includes(expense.employee._id.toString())) {
        return res.status(403).json({
          status: 'error',
          message: 'Access denied'
        });
      }
    }

    res.status(200).json({
      status: 'success',
      data: {
        expense
      }
    });
  } catch (error) {
    console.error('Get expense error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
});

// @desc    Create new expense
// @route   POST /api/expenses
// @access  Private
router.post('/', protect, upload.single('receipt'), validateExpense, handleValidationErrors, async (req, res) => {
  try {
    const { amount, currency, category, description, expenseDate } = req.body;

    // Get company details
    const company = await Company.findById(req.user.company);
    if (!company) {
      return res.status(404).json({
        status: 'error',
        message: 'Company not found'
      });
    }

    // Convert currency if needed
    let amountInCompanyCurrency = amount;
    let exchangeRate = 1;

    if (currency !== company.currency) {
      const conversion = await convertCurrency(amount, currency, company.currency);
      amountInCompanyCurrency = conversion.convertedAmount;
      exchangeRate = conversion.exchangeRate;
    }

    // Check if amount exceeds company limit
    if (amountInCompanyCurrency > company.settings.maxExpenseAmount) {
      return res.status(400).json({
        status: 'error',
        message: `Expense amount exceeds company limit of ${company.settings.maxExpenseAmount} ${company.currency}`
      });
    }

    // Create expense
    const expenseData = {
      employee: req.user._id,
      company: req.user.company,
      amount: parseFloat(amount),
      currency: currency.toUpperCase(),
      amountInCompanyCurrency,
      exchangeRate,
      category,
      description,
      expenseDate: new Date(expenseDate)
    };

    // Add receipt if uploaded
    if (req.file) {
      expenseData.receipt = {
        filename: req.file.filename,
        originalName: req.file.originalname,
        path: req.file.path,
        size: req.file.size,
        mimetype: req.file.mimetype
      };
    }

    const expense = await Expense.create(expenseData);

    // Determine approval workflow
    await determineApprovalWorkflow(expense);

    const populatedExpense = await Expense.findById(expense._id)
      .populate('employee', 'firstName lastName email')
      .populate('currentApprover', 'firstName lastName email');

    res.status(201).json({
      status: 'success',
      data: {
        expense: populatedExpense
      }
    });
  } catch (error) {
    console.error('Create expense error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
});

// @desc    Update expense
// @route   PUT /api/expenses/:id
// @access  Private
router.put('/:id', protect, validateObjectId('id'), handleValidationErrors, async (req, res) => {
  try {
    const { amount, currency, category, description, expenseDate } = req.body;

    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      return res.status(404).json({
        status: 'error',
        message: 'Expense not found'
      });
    }

    // Check permissions
    if (req.user.role === 'employee' && expense.employee.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied'
      });
    }

    // Only allow updates if expense is pending
    if (expense.status !== 'pending') {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot update expense that is not pending'
      });
    }

    // Get company details
    const company = await Company.findById(req.user.company);

    // Convert currency if needed
    let amountInCompanyCurrency = amount;
    let exchangeRate = 1;

    if (currency !== company.currency) {
      const conversion = await convertCurrency(amount, currency, company.currency);
      amountInCompanyCurrency = conversion.convertedAmount;
      exchangeRate = conversion.exchangeRate;
    }

    // Update expense
    expense.amount = parseFloat(amount);
    expense.currency = currency.toUpperCase();
    expense.amountInCompanyCurrency = amountInCompanyCurrency;
    expense.exchangeRate = exchangeRate;
    expense.category = category;
    expense.description = description;
    expense.expenseDate = new Date(expenseDate);

    await expense.save();

    // Re-determine approval workflow
    await determineApprovalWorkflow(expense);

    const updatedExpense = await Expense.findById(expense._id)
      .populate('employee', 'firstName lastName email')
      .populate('currentApprover', 'firstName lastName email');

    res.status(200).json({
      status: 'success',
      data: {
        expense: updatedExpense
      }
    });
  } catch (error) {
    console.error('Update expense error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
});

// @desc    Delete expense
// @route   DELETE /api/expenses/:id
// @access  Private
router.delete('/:id', protect, validateObjectId('id'), handleValidationErrors, async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    
    if (!expense) {
      return res.status(404).json({
        status: 'error',
        message: 'Expense not found'
      });
    }

    // Check permissions
    if (req.user.role === 'employee' && expense.employee.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied'
      });
    }

    // Only allow deletion if expense is pending
    if (expense.status !== 'pending') {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot delete expense that is not pending'
      });
    }

    // Delete receipt file if exists
    if (expense.receipt && expense.receipt.path) {
      try {
        fs.unlinkSync(expense.receipt.path);
      } catch (error) {
        console.error('Error deleting receipt file:', error);
      }
    }

    await Expense.findByIdAndDelete(req.params.id);

    res.status(200).json({
      status: 'success',
      message: 'Expense deleted successfully'
    });
  } catch (error) {
    console.error('Delete expense error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
});

// @desc    Get expense statistics
// @route   GET /api/expenses/stats
// @access  Private
router.get('/stats', protect, async (req, res) => {
  try {
    let matchQuery = { company: req.user.company };

    // Filter by user role
    if (req.user.role === 'employee') {
      matchQuery.employee = req.user._id;
    } else if (req.user.role === 'manager') {
      const teamMembers = await User.find({ manager: req.user._id }).select('_id');
      const teamMemberIds = teamMembers.map(member => member._id);
      matchQuery.employee = { $in: teamMemberIds };
    }

    const stats = await Expense.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalExpenses: { $sum: 1 },
          totalAmount: { $sum: '$amountInCompanyCurrency' },
          avgAmount: { $avg: '$amountInCompanyCurrency' },
          pendingCount: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          approvedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] }
          },
          rejectedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] }
          }
        }
      }
    ]);

    const result = stats[0] || {
      totalExpenses: 0,
      totalAmount: 0,
      avgAmount: 0,
      pendingCount: 0,
      approvedCount: 0,
      rejectedCount: 0
    };

    res.status(200).json({
      status: 'success',
      data: {
        stats: result
      }
    });
  } catch (error) {
    console.error('Get expense stats error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
});

// Helper function to determine approval workflow
async function determineApprovalWorkflow(expense) {
  try {
    // Get company and employee details
    const company = await Company.findById(expense.company);
    const employee = await User.findById(expense.employee);

    // Find applicable approval rules
    const rules = await ApprovalRule.find({
      company: expense.company,
      isActive: true,
      $or: [
        { 'conditions.amountThreshold': { $lte: expense.amountInCompanyCurrency } },
        { 'conditions.amountThreshold': { $exists: false } }
      ]
    }).sort({ priority: -1, 'conditions.amountThreshold': -1 });

    let approvers = [];
    let approvalType = 'sequential';

    if (rules.length > 0) {
      // Use the highest priority rule
      const rule = rules[0];
      approvers = rule.approvers.sort((a, b) => a.step - b.step);
      approvalType = rule.approvalType;
    } else {
      // Default workflow: manager approval if employee has manager
      if (employee.manager && employee.manager.isManagerApprover) {
        approvers = [{
          user: employee.manager,
          step: 1,
          isRequired: true
        }];
      }
    }

    // Set up approval workflow
    expense.totalApprovers = approvers.length;
    expense.approvalStep = 0;
    expense.approvedBy = [];
    expense.rejectedBy = [];
    expense.approvalHistory = [];

    if (approvers.length > 0) {
      expense.currentApprover = approvers[0].user;
      expense.approvalStep = 1;
    } else {
      // No approvers needed, auto-approve
      expense.status = 'approved';
      expense.finalApprovalDate = new Date();
    }

    await expense.save();
  } catch (error) {
    console.error('Error determining approval workflow:', error);
  }
}

module.exports = router;
