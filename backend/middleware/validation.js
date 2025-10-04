const { body, param, query, validationResult } = require('express-validator');

// Handle validation errors
exports.handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// User validation rules
exports.validateUser = [
  body('firstName')
    .trim()
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ max: 50 })
    .withMessage('First name cannot exceed 50 characters'),
  
  body('lastName')
    .trim()
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ max: 50 })
    .withMessage('Last name cannot exceed 50 characters'),
  
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  
  body('role')
    .optional()
    .isIn(['admin', 'manager', 'employee'])
    .withMessage('Role must be admin, manager, or employee')
];

// Login validation rules
exports.validateLogin = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// Expense validation rules
exports.validateExpense = [
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be a positive number'),
  
  body('currency')
    .isLength({ min: 3, max: 3 })
    .withMessage('Currency must be a 3-character ISO code')
    .isUppercase()
    .withMessage('Currency must be uppercase'),
  
  body('category')
    .trim()
    .notEmpty()
    .withMessage('Category is required'),
  
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  
  body('expenseDate')
    .isISO8601()
    .withMessage('Expense date must be a valid date')
    .custom((value) => {
      const date = new Date(value);
      const now = new Date();
      if (date > now) {
        throw new Error('Expense date cannot be in the future');
      }
      return true;
    })
];

// Company validation rules
exports.validateCompany = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Company name is required')
    .isLength({ max: 100 })
    .withMessage('Company name cannot exceed 100 characters'),
  
  body('country')
    .trim()
    .notEmpty()
    .withMessage('Country is required'),
  
  body('currency')
    .isLength({ min: 3, max: 3 })
    .withMessage('Currency must be a 3-character ISO code')
    .isUppercase()
    .withMessage('Currency must be uppercase')
];

// Approval validation rules
exports.validateApproval = [
  body('action')
    .isIn(['approved', 'rejected'])
    .withMessage('Action must be either approved or rejected'),
  
  body('comment')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Comment cannot exceed 500 characters')
];

// MongoDB ObjectId validation
exports.validateObjectId = (paramName) => [
  param(paramName)
    .isMongoId()
    .withMessage(`Invalid ${paramName} ID format`)
];

// Pagination validation
exports.validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
];
