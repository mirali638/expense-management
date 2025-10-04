const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Company name is required'],
    trim: true,
    maxlength: [100, 'Company name cannot exceed 100 characters']
  },
  country: {
    type: String,
    required: [true, 'Country is required'],
    trim: true
  },
  currency: {
    type: String,
    required: [true, 'Currency is required'],
    uppercase: true,
    length: [3, 'Currency must be 3 characters (ISO code)']
  },
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  settings: {
    approvalRules: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    expenseCategories: {
      type: [String],
      default: ['Travel', 'Meals', 'Accommodation', 'Transportation', 'Office Supplies', 'Other']
    },
    maxExpenseAmount: {
      type: Number,
      default: 10000
    }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for better query performance
companySchema.index({ name: 1 });
companySchema.index({ country: 1 });

module.exports = mongoose.model('Company', companySchema);
