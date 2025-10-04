const express = require('express');
const Expense = require('../models/Expense');
const User = require('../models/User');
const ApprovalRule = require('../models/ApprovalRule');
const { protect, canApprove } = require('../middleware/auth');
const { validateApproval, validateObjectId, validatePagination, handleValidationErrors } = require('../middleware/validation');

const router = express.Router();

// @desc    Get expenses pending approval
// @route   GET /api/approvals/pending
// @access  Private
router.get('/pending', protect, canApprove, validatePagination, handleValidationErrors, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    let query = {
      company: req.user.company,
      status: 'pending'
    };

    // Filter by current approver
    if (req.user.role === 'manager') {
      query.currentApprover = req.user._id;
    }

    const expenses = await Expense.find(query)
      .populate('employee', 'firstName lastName email')
      .populate('currentApprover', 'firstName lastName email')
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
    console.error('Get pending approvals error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
});

// @desc    Approve or reject expense
// @route   PUT /api/approvals/:id
// @access  Private
router.put('/:id', protect, canApprove, validateObjectId('id'), validateApproval, handleValidationErrors, async (req, res) => {
  try {
    const { action, comment } = req.body;

    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      return res.status(404).json({
        status: 'error',
        message: 'Expense not found'
      });
    }

    // Check if user is the current approver
    if (expense.currentApprover.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        status: 'error',
        message: 'You are not the current approver for this expense'
      });
    }

    // Check if expense is still pending
    if (expense.status !== 'pending') {
      return res.status(400).json({
        status: 'error',
        message: 'Expense is no longer pending approval'
      });
    }

    // Add to approval history
    expense.approvalHistory.push({
      approver: req.user._id,
      action,
      comment: comment || '',
      step: expense.approvalStep,
      timestamp: new Date()
    });

    if (action === 'approved') {
      expense.approvedBy.push(req.user._id);
    } else {
      expense.rejectedBy.push(req.user._id);
      expense.status = 'rejected';
      expense.rejectionReason = comment || 'No reason provided';
      expense.finalApprovalDate = new Date();
    }

    // Determine next step
    if (action === 'approved') {
      await processApprovalWorkflow(expense);
    }

    await expense.save();

    const updatedExpense = await Expense.findById(expense._id)
      .populate('employee', 'firstName lastName email')
      .populate('currentApprover', 'firstName lastName email')
      .populate('approvalHistory.approver', 'firstName lastName email');

    res.status(200).json({
      status: 'success',
      data: {
        expense: updatedExpense
      }
    });
  } catch (error) {
    console.error('Process approval error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
});

// @desc    Get approval history for expense
// @route   GET /api/approvals/:id/history
// @access  Private
router.get('/:id/history', protect, validateObjectId('id'), handleValidationErrors, async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id)
      .populate('approvalHistory.approver', 'firstName lastName email role')
      .select('approvalHistory status');

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

    res.status(200).json({
      status: 'success',
      data: {
        history: expense.approvalHistory,
        status: expense.status
      }
    });
  } catch (error) {
    console.error('Get approval history error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
});

// @desc    Get approval statistics
// @route   GET /api/approvals/stats
// @access  Private
router.get('/stats', protect, canApprove, async (req, res) => {
  try {
    const companyId = req.user.company;
    let matchQuery = { company: companyId };

    // Filter by approver if manager
    if (req.user.role === 'manager') {
      matchQuery.currentApprover = req.user._id;
    }

    const stats = await Expense.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          pendingCount: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          approvedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] }
          },
          rejectedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] }
          },
          totalAmount: {
            $sum: { $cond: [{ $eq: ['$status', 'approved'] }, '$amountInCompanyCurrency', 0] }
          }
        }
      }
    ]);

    const result = stats[0] || {
      pendingCount: 0,
      approvedCount: 0,
      rejectedCount: 0,
      totalAmount: 0
    };

    res.status(200).json({
      status: 'success',
      data: {
        stats: result
      }
    });
  } catch (error) {
    console.error('Get approval stats error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
});

// @desc    Override approval (Admin only)
// @route   PUT /api/approvals/:id/override
// @access  Private/Admin
router.put('/:id/override', protect, validateObjectId('id'), async (req, res) => {
  try {
    const { action, comment } = req.body;

    if (req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'Only admin can override approvals'
      });
    }

    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      return res.status(404).json({
        status: 'error',
        message: 'Expense not found'
      });
    }

    // Add override to approval history
    expense.approvalHistory.push({
      approver: req.user._id,
      action: action === 'approved' ? 'approved' : 'rejected',
      comment: `[ADMIN OVERRIDE] ${comment || 'No reason provided'}`,
      step: expense.approvalStep + 1,
      timestamp: new Date()
    });

    expense.status = action === 'approved' ? 'approved' : 'rejected';
    expense.finalApprovalDate = new Date();
    expense.currentApprover = null;

    if (action === 'rejected') {
      expense.rejectionReason = comment || 'Rejected by admin override';
    }

    await expense.save();

    const updatedExpense = await Expense.findById(expense._id)
      .populate('employee', 'firstName lastName email')
      .populate('approvalHistory.approver', 'firstName lastName email role');

    res.status(200).json({
      status: 'success',
      data: {
        expense: updatedExpense
      }
    });
  } catch (error) {
    console.error('Override approval error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
});

// Helper function to process approval workflow
async function processApprovalWorkflow(expense) {
  try {
    // Get approval rules
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
      const rule = rules[0];
      approvers = rule.approvers.sort((a, b) => a.step - b.step);
      approvalType = rule.approvalType;
    } else {
      // Default workflow
      const employee = await User.findById(expense.employee);
      if (employee.manager && employee.manager.isManagerApprover) {
        approvers = [{
          user: employee.manager,
          step: 1,
          isRequired: true
        }];
      }
    }

    // Check if all required approvers have approved
    const requiredApprovers = approvers.filter(approver => approver.isRequired);
    const approvedRequiredCount = expense.approvedBy.filter(approverId => 
      requiredApprovers.some(approver => approver.user.toString() === approverId.toString())
    ).length;

    // Check approval conditions based on type
    let isApproved = false;

    switch (approvalType) {
      case 'sequential':
        // All approvers must approve in sequence
        if (expense.approvalStep >= approvers.length) {
          isApproved = true;
        } else {
          // Move to next approver
          expense.approvalStep += 1;
          expense.currentApprover = approvers[expense.approvalStep - 1].user;
        }
        break;

      case 'parallel':
        // All required approvers must approve
        isApproved = approvedRequiredCount >= requiredApprovers.length;
        break;

      case 'percentage':
        // Check percentage of approvers
        const percentageRequired = rules[0]?.approvalSettings?.percentageRequired || 100;
        const approvalPercentage = (expense.approvedBy.length / expense.totalApprovers) * 100;
        isApproved = approvalPercentage >= percentageRequired;
        break;

      case 'specific_approver':
        // Check if specific approver has approved
        const specificApprover = rules[0]?.approvalSettings?.specificApproverCanApprove;
        isApproved = expense.approvedBy.some(approverId => 
          approverId.toString() === specificApprover?.toString()
        );
        break;

      case 'hybrid':
        // Combination of percentage and specific approver
        const hybridPercentage = rules[0]?.approvalSettings?.percentageRequired || 60;
        const hybridSpecificApprover = rules[0]?.approvalSettings?.specificApproverCanApprove;
        
        const hybridApprovalPercentage = (expense.approvedBy.length / expense.totalApprovers) * 100;
        const hasSpecificApproval = expense.approvedBy.some(approverId => 
          approverId.toString() === hybridSpecificApprover?.toString()
        );
        
        isApproved = hybridApprovalPercentage >= hybridPercentage || hasSpecificApproval;
        break;

      default:
        isApproved = approvedRequiredCount >= requiredApprovers.length;
    }

    if (isApproved) {
      expense.status = 'approved';
      expense.finalApprovalDate = new Date();
      expense.currentApprover = null;
    } else if (approvalType === 'sequential' && expense.approvalStep <= approvers.length) {
      // Continue with sequential approval
      // currentApprover already set above
    } else {
      // For parallel/percentage approvals, check if we need more approvers
      const remainingApprovers = approvers.filter(approver => 
        !expense.approvedBy.some(approvedId => approvedId.toString() === approver.user.toString()) &&
        !expense.rejectedBy.some(rejectedId => rejectedId.toString() === approver.user.toString())
      );

      if (remainingApprovers.length > 0) {
        expense.currentApprover = remainingApprovers[0].user;
      } else {
        // No more approvers, check if we can approve
        if (approvalType === 'percentage' || approvalType === 'hybrid') {
          const finalPercentage = (expense.approvedBy.length / expense.totalApprovers) * 100;
          const requiredPercentage = rules[0]?.approvalSettings?.percentageRequired || 100;
          
          if (finalPercentage >= requiredPercentage) {
            expense.status = 'approved';
            expense.finalApprovalDate = new Date();
            expense.currentApprover = null;
          } else {
            expense.status = 'rejected';
            expense.rejectionReason = 'Insufficient approvals';
            expense.finalApprovalDate = new Date();
            expense.currentApprover = null;
          }
        }
      }
    }
  } catch (error) {
    console.error('Error processing approval workflow:', error);
  }
}

module.exports = router;
