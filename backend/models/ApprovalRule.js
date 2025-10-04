const mongoose = require('mongoose');

const approvalRuleSchema = new mongoose.Schema({
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  name: {
    type: String,
    required: [true, 'Rule name is required'],
    trim: true,
    maxlength: [100, 'Rule name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  conditions: {
    amountThreshold: {
      type: Number,
      default: 0
    },
    categories: [{
      type: String,
      trim: true
    }],
    departments: [{
      type: String,
      trim: true
    }]
  },
  approvers: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    step: {
      type: Number,
      required: true
    },
    isRequired: {
      type: Boolean,
      default: true
    },
    canOverride: {
      type: Boolean,
      default: false
    }
  }],
  approvalType: {
    type: String,
    enum: ['sequential', 'parallel', 'percentage', 'specific_approver', 'hybrid'],
    default: 'sequential'
  },
  approvalSettings: {
    percentageRequired: {
      type: Number,
      min: 0,
      max: 100,
      default: 100
    },
    specificApproverCanApprove: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    allowManagerOverride: {
      type: Boolean,
      default: false
    },
    autoApproveAfterDays: {
      type: Number,
      default: null
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  priority: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Index for better query performance
approvalRuleSchema.index({ company: 1, isActive: 1 });
approvalRuleSchema.index({ 'conditions.amountThreshold': 1 });
approvalRuleSchema.index({ priority: -1 });

module.exports = mongoose.model('ApprovalRule', approvalRuleSchema);
