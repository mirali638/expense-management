import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import { useAuth } from '../../contexts/AuthContext';
import { expenseService } from '../../services/api';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import StatusBadge from '../../components/UI/StatusBadge';
import Button from '../../components/UI/Button';
import {
  ArrowLeftIcon,
  DocumentTextIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  UserIcon,
  TagIcon,
} from '@heroicons/react/24/outline';

const ExpenseDetail = () => {
  const { id } = useParams();
  const { user, isAdmin, isManager } = useAuth();

  const { data: expense, isLoading, error } = useQuery(
    ['expense', id],
    () => expenseService.getExpense(id).then(res => res.data.data.expense),
    {
      enabled: !!id,
    }
  );

  const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !expense) {
    return (
      <div className="text-center py-12">
        <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Expense not found</h3>
        <p className="mt-1 text-sm text-gray-500">
          The expense you're looking for doesn't exist or you don't have permission to view it.
        </p>
        <div className="mt-6">
          <Link to="/expenses">
            <Button>
              <ArrowLeftIcon className="h-5 w-5 mr-2" />
              Back to Expenses
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link to="/expenses">
            <Button variant="outline" size="sm">
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Expense Details</h1>
            <p className="text-gray-600 mt-1">View expense information and approval history</p>
          </div>
        </div>
        <StatusBadge status={expense.status} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Expense Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center space-x-3">
                <CurrencyDollarIcon className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Amount</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatCurrency(expense.amountInCompanyCurrency)}
                  </p>
                  {expense.currency !== 'USD' && (
                    <p className="text-sm text-gray-500">
                      Original: {formatCurrency(expense.amount, expense.currency)}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <TagIcon className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Category</p>
                  <p className="text-lg font-semibold text-gray-900">{expense.category}</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <CalendarIcon className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Expense Date</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatDate(expense.expenseDate)}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <UserIcon className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Submitted By</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {expense.employee?.firstName} {expense.employee?.lastName}
                  </p>
                  <p className="text-sm text-gray-500">{expense.employee?.email}</p>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <p className="text-sm font-medium text-gray-500 mb-2">Description</p>
              <p className="text-gray-900 bg-gray-50 rounded-lg p-3">
                {expense.description}
              </p>
            </div>

            {expense.receipt && (
              <div className="mt-6">
                <p className="text-sm font-medium text-gray-500 mb-2">Receipt</p>
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <DocumentTextIcon className="h-8 w-8 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {expense.receipt.originalName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {(expense.receipt.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Approval History */}
          {expense.approvalHistory && expense.approvalHistory.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Approval History</h2>
              
              <div className="space-y-4">
                {expense.approvalHistory.map((approval, index) => (
                  <div key={index} className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg">
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      approval.action === 'approved' 
                        ? 'bg-green-100 text-green-600' 
                        : 'bg-red-100 text-red-600'
                    }`}>
                      {approval.action === 'approved' ? '✓' : '✗'}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900">
                          {approval.approver?.firstName} {approval.approver?.lastName}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDateTime(approval.timestamp)}
                        </p>
                      </div>
                      <p className="text-sm text-gray-600 capitalize">
                        {approval.action} at step {approval.step}
                      </p>
                      {approval.comment && (
                        <p className="text-sm text-gray-700 mt-2 italic">
                          "{approval.comment}"
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Information */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Status Information</h3>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Current Status</p>
                <div className="mt-1">
                  <StatusBadge status={expense.status} />
                </div>
              </div>

              {expense.currentApprover && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Current Approver</p>
                  <p className="text-sm text-gray-900 mt-1">
                    {expense.currentApprover?.firstName} {expense.currentApprover?.lastName}
                  </p>
                </div>
              )}

              <div>
                <p className="text-sm font-medium text-gray-500">Approval Progress</p>
                <p className="text-sm text-gray-900 mt-1">
                  {expense.approvedBy?.length || 0} of {expense.totalApprovers} approvers
                </p>
                {expense.totalApprovers > 0 && (
                  <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-primary-600 h-2 rounded-full" 
                      style={{ 
                        width: `${((expense.approvedBy?.length || 0) / expense.totalApprovers) * 100}%` 
                      }}
                    />
                  </div>
                )}
              </div>

              {expense.finalApprovalDate && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Final Decision Date</p>
                  <p className="text-sm text-gray-900 mt-1">
                    {formatDateTime(expense.finalApprovalDate)}
                  </p>
                </div>
              )}

              {expense.rejectionReason && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Rejection Reason</p>
                  <p className="text-sm text-gray-900 mt-1">
                    {expense.rejectionReason}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Exchange Rate Information */}
          {expense.exchangeRate && expense.exchangeRate !== 1 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Currency Conversion</h3>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Original Amount:</span>
                  <span className="text-sm font-medium text-gray-900">
                    {formatCurrency(expense.amount, expense.currency)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Exchange Rate:</span>
                  <span className="text-sm font-medium text-gray-900">
                    1 {expense.currency} = {expense.exchangeRate.toFixed(4)} USD
                  </span>
                </div>
                <div className="flex justify-between border-t pt-3">
                  <span className="text-sm font-medium text-gray-700">Converted Amount:</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {formatCurrency(expense.amountInCompanyCurrency)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExpenseDetail;
