import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useAuth } from '../../contexts/AuthContext';
import { approvalService } from '../../services/api';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import StatusBadge from '../../components/UI/StatusBadge';
import Button from '../../components/UI/Button';
import toast from 'react-hot-toast';
import {
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  ClockIcon,
  UserIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline';

const Approvals = () => {
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [action, setAction] = useState('');
  const [comment, setComment] = useState('');

  // Fetch pending approvals
  const { data: approvalsData, isLoading, refetch } = useQuery(
    'pendingApprovals',
    () => approvalService.getPendingApprovals({ limit: 20 }).then(res => res.data.data),
    {
      refetchInterval: 30000, // Refetch every 30 seconds
    }
  );

  const expenses = approvalsData?.expenses || [];

  // Process approval mutation
  const processApprovalMutation = useMutation(
    ({ id, action, comment }) => approvalService.processApproval(id, action, comment),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('pendingApprovals');
        queryClient.invalidateQueries('approvalStats');
        queryClient.invalidateQueries('expenseStats');
        toast.success('Approval processed successfully!');
        setShowModal(false);
        setSelectedExpense(null);
        setAction('');
        setComment('');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to process approval');
      }
    }
  );

  // Override approval mutation (Admin only)
  const overrideApprovalMutation = useMutation(
    ({ id, action, comment }) => approvalService.overrideApproval(id, action, comment),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('pendingApprovals');
        queryClient.invalidateQueries('approvalStats');
        queryClient.invalidateQueries('expenseStats');
        toast.success('Approval overridden successfully!');
        setShowModal(false);
        setSelectedExpense(null);
        setAction('');
        setComment('');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to override approval');
      }
    }
  );

  const handleApproval = (expense, approvalAction) => {
    setSelectedExpense(expense);
    setAction(approvalAction);
    setShowModal(true);
  };

  const handleSubmitApproval = () => {
    if (!selectedExpense || !action) return;

    const mutation = isAdmin ? overrideApprovalMutation : processApprovalMutation;
    mutation.mutate({
      id: selectedExpense._id,
      action,
      comment: comment.trim() || undefined
    });
  };

  const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pending Approvals</h1>
        <p className="text-gray-600 mt-1">
          Review and approve expense submissions
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ClockIcon className="h-8 w-8 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Pending</p>
              <p className="text-2xl font-semibold text-gray-900">
                {expenses.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CurrencyDollarIcon className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Amount</p>
              <p className="text-2xl font-semibold text-gray-900">
                {formatCurrency(
                  expenses.reduce((sum, expense) => sum + expense.amountInCompanyCurrency, 0)
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <UserIcon className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Unique Employees</p>
              <p className="text-2xl font-semibold text-gray-900">
                {new Set(expenses.map(expense => expense.employee._id)).size}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Approvals List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {expenses.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {expenses.map((expense) => (
                  <tr key={expense._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8">
                          <div className="h-8 w-8 rounded-full bg-primary-500 flex items-center justify-center">
                            <span className="text-sm font-medium text-white">
                              {expense.employee?.firstName?.charAt(0)}{expense.employee?.lastName?.charAt(0)}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {expense.employee?.firstName} {expense.employee?.lastName}
                          </div>
                          <div className="text-sm text-gray-500">
                            {expense.employee?.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs truncate">
                        {expense.description}
                      </div>
                      {expense.receipt && (
                        <div className="text-xs text-gray-500">
                          Receipt attached
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {expense.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatCurrency(expense.amountInCompanyCurrency)}
                      </div>
                      {expense.currency !== 'USD' && (
                        <div className="text-xs text-gray-500">
                          {formatCurrency(expense.amount, expense.currency)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(expense.expenseDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={expense.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleApproval(expense, 'approved')}
                          className="text-green-600 hover:text-green-900"
                          title="Approve"
                        >
                          <CheckCircleIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleApproval(expense, 'rejected')}
                          className="text-red-600 hover:text-red-900"
                          title="Reject"
                        >
                          <XCircleIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedExpense(expense);
                            setShowModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-900"
                          title="View Details"
                        >
                          <EyeIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <CheckCircleIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No pending approvals</h3>
            <p className="mt-1 text-sm text-gray-500">
              All expenses have been processed.
            </p>
          </div>
        )}
      </div>

      {/* Approval Modal */}
      {showModal && selectedExpense && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
            
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-primary-100 sm:mx-0 sm:h-10 sm:w-10">
                    {action === 'approved' ? (
                      <CheckCircleIcon className="h-6 w-6 text-green-600" />
                    ) : action === 'rejected' ? (
                      <XCircleIcon className="h-6 w-6 text-red-600" />
                    ) : (
                      <EyeIcon className="h-6 w-6 text-blue-600" />
                    )}
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      {action === 'approved' ? 'Approve Expense' : 
                       action === 'rejected' ? 'Reject Expense' : 
                       'Expense Details'}
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        {action === 'approved' ? 'Are you sure you want to approve this expense?' :
                         action === 'rejected' ? 'Are you sure you want to reject this expense?' :
                         'Review the expense details below.'}
                      </p>
                    </div>
                    
                    {/* Expense Details */}
                    <div className="mt-4 bg-gray-50 rounded-lg p-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium text-gray-700">Employee:</span>
                          <p className="text-gray-900">
                            {selectedExpense.employee?.firstName} {selectedExpense.employee?.lastName}
                          </p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Amount:</span>
                          <p className="text-gray-900">
                            {formatCurrency(selectedExpense.amountInCompanyCurrency)}
                          </p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Category:</span>
                          <p className="text-gray-900">{selectedExpense.category}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Date:</span>
                          <p className="text-gray-900">{formatDate(selectedExpense.expenseDate)}</p>
                        </div>
                        <div className="col-span-2">
                          <span className="font-medium text-gray-700">Description:</span>
                          <p className="text-gray-900">{selectedExpense.description}</p>
                        </div>
                      </div>
                    </div>

                    {/* Comment Input */}
                    {(action === 'approved' || action === 'rejected') && (
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700">
                          Comment (Optional)
                        </label>
                        <textarea
                          value={comment}
                          onChange={(e) => setComment(e.target.value)}
                          rows={3}
                          className="mt-1 input-field"
                          placeholder="Add a comment..."
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                {(action === 'approved' || action === 'rejected') && (
                  <Button
                    onClick={handleSubmitApproval}
                    loading={processApprovalMutation.isLoading || overrideApprovalMutation.isLoading}
                    variant={action === 'approved' ? 'primary' : 'danger'}
                    className="w-full sm:w-auto sm:ml-3"
                  >
                    {action === 'approved' ? 'Approve' : 'Reject'}
                  </Button>
                )}
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowModal(false);
                    setSelectedExpense(null);
                    setAction('');
                    setComment('');
                  }}
                  className="mt-3 w-full sm:mt-0 sm:w-auto"
                >
                  {action ? 'Cancel' : 'Close'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Approvals;
