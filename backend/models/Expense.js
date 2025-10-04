const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0.01, 'Amount must be greater than 0']
  },
  currency: {
    type: String,
    required: [true, 'Currency is required'],
    uppercase: true,
    length: [3, 'Currency must be 3 characters (ISO code)']
  },
  amountInCompanyCurrency: {
    type: Number,
    required: true
  },
  exchangeRate: {
    type: Number,
    required: true
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  expenseDate: {
    type: Date,
    required: [true, 'Expense date is required']
  },
  receipt: {
    filename: String,
    originalName: String,
    path: String,
    size: Number,
    mimetype: String
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'partially_approved'],
    default: 'pending'
  },
  approvalHistory: [{
    approver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    action: {
      type: String,
      enum: ['approved', 'rejected'],
      required: true
    },
    comment: {
      type: String,
      trim: true,
      maxlength: [500, 'Comment cannot exceed 500 characters']
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    step: {
      type: Number,
      required: true
    }
  }],
  currentApprover: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  approvalStep: {
    type: Number,
    default: 0
  },
  totalApprovers: {
    type: Number,
    default: 0
  },
  approvedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  rejectedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  finalApprovalDate: {
    type: Date,
    default: null
  },
  rejectionReason: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Index for better query performance
expenseSchema.index({ employee: 1, status: 1 });
expenseSchema.index({ company: 1, status: 1 });
expenseSchema.index({ currentApprover: 1, status: 1 });
expenseSchema.index({ expenseDate: -1 });
expenseSchema.index({ createdAt: -1 });

// Virtual for approval percentage
expenseSchema.virtual('approvalPercentage').get(function() {
  if (this.totalApprovers === 0) return 0;
  return Math.round((this.approvedBy.length / this.totalApprovers) * 100);
});

// Ensure virtual fields are serialized
expenseSchema.set('toJSON', {
  virtuals: true
});

module.exports = mongoose.model('Expense', expenseSchema);
