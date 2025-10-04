const express = require('express');
const Company = require('../models/Company');
const User = require('../models/User');
const { protect, restrictTo } = require('../middleware/auth');
const { validateCompany, handleValidationErrors } = require('../middleware/validation');

const router = express.Router();

// @desc    Get company details
// @route   GET /api/companies
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const company = await Company.findById(req.user.company)
      .populate('admin', 'firstName lastName email');

    if (!company) {
      return res.status(404).json({
        status: 'error',
        message: 'Company not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        company
      }
    });
  } catch (error) {
    console.error('Get company error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
});

// @desc    Update company details (Admin only)
// @route   PUT /api/companies
// @access  Private/Admin
router.put('/', protect, restrictTo('admin'), validateCompany, handleValidationErrors, async (req, res) => {
  try {
    const { name, country, currency, settings } = req.body;

    const company = await Company.findById(req.user.company);
    
    if (!company) {
      return res.status(404).json({
        status: 'error',
        message: 'Company not found'
      });
    }

    // Update company
    company.name = name || company.name;
    company.country = country || company.country;
    company.currency = currency || company.currency;
    
    if (settings) {
      company.settings = { ...company.settings, ...settings };
    }

    await company.save();

    const updatedCompany = await Company.findById(company._id)
      .populate('admin', 'firstName lastName email');

    res.status(200).json({
      status: 'success',
      data: {
        company: updatedCompany
      }
    });
  } catch (error) {
    console.error('Update company error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
});

// @desc    Get company statistics (Admin only)
// @route   GET /api/companies/stats
// @access  Private/Admin
router.get('/stats', protect, restrictTo('admin'), async (req, res) => {
  try {
    const companyId = req.user.company;

    // Get user statistics
    const totalUsers = await User.countDocuments({ company: companyId });
    const activeUsers = await User.countDocuments({ company: companyId, isActive: true });
    const adminUsers = await User.countDocuments({ company: companyId, role: 'admin' });
    const managerUsers = await User.countDocuments({ company: companyId, role: 'manager' });
    const employeeUsers = await User.countDocuments({ company: companyId, role: 'employee' });

    // Get expense statistics (you'll need to import Expense model)
    const Expense = require('../models/Expense');
    const totalExpenses = await Expense.countDocuments({ company: companyId });
    const pendingExpenses = await Expense.countDocuments({ company: companyId, status: 'pending' });
    const approvedExpenses = await Expense.countDocuments({ company: companyId, status: 'approved' });
    const rejectedExpenses = await Expense.countDocuments({ company: companyId, status: 'rejected' });

    // Get total expense amount
    const expenseStats = await Expense.aggregate([
      { $match: { company: companyId } },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amountInCompanyCurrency' },
          avgAmount: { $avg: '$amountInCompanyCurrency' },
          maxAmount: { $max: '$amountInCompanyCurrency' },
          minAmount: { $min: '$amountInCompanyCurrency' }
        }
      }
    ]);

    const stats = {
      users: {
        total: totalUsers,
        active: activeUsers,
        byRole: {
          admin: adminUsers,
          manager: managerUsers,
          employee: employeeUsers
        }
      },
      expenses: {
        total: totalExpenses,
        pending: pendingExpenses,
        approved: approvedExpenses,
        rejected: rejectedExpenses,
        amounts: expenseStats[0] || {
          totalAmount: 0,
          avgAmount: 0,
          maxAmount: 0,
          minAmount: 0
        }
      }
    };

    res.status(200).json({
      status: 'success',
      data: {
        stats
      }
    });
  } catch (error) {
    console.error('Get company stats error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
});

// @desc    Update company settings (Admin only)
// @route   PUT /api/companies/settings
// @access  Private/Admin
router.put('/settings', protect, restrictTo('admin'), async (req, res) => {
  try {
    const { approvalRules, expenseCategories, maxExpenseAmount } = req.body;

    const company = await Company.findById(req.user.company);
    
    if (!company) {
      return res.status(404).json({
        status: 'error',
        message: 'Company not found'
      });
    }

    // Update settings
    if (approvalRules !== undefined) {
      company.settings.approvalRules = { ...company.settings.approvalRules, ...approvalRules };
    }
    
    if (expenseCategories !== undefined) {
      company.settings.expenseCategories = expenseCategories;
    }
    
    if (maxExpenseAmount !== undefined) {
      company.settings.maxExpenseAmount = maxExpenseAmount;
    }

    await company.save();

    res.status(200).json({
      status: 'success',
      data: {
        settings: company.settings
      }
    });
  } catch (error) {
    console.error('Update company settings error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
});

module.exports = router;
