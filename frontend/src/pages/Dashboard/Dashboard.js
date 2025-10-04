import React from 'react';
import { useQuery } from 'react-query';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { expenseService, approvalService } from '../../services/api';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import StatusBadge from '../../components/UI/StatusBadge';
import {
  DocumentTextIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  CurrencyDollarIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';

const Dashboard = () => {
  const { user, isAdmin, isManager } = useAuth();

  // Fetch expense statistics
  const { data: expenseStats, isLoading: expenseStatsLoading } = useQuery(
    'expenseStats',
    () => expenseService.getStats().then(res => res.data.data.stats),
    {
      refetchInterval: 30000, // Refetch every 30 seconds
    }
  );

  // Fetch approval statistics (for managers and admins)
  const { data: approvalStats, isLoading: approvalStatsLoading } = useQuery(
    'approvalStats',
    () => approvalService.getStats().then(res => res.data.data.stats),
    {
      enabled: isManager || isAdmin,
      refetchInterval: 30000,
    }
  );

  // Fetch recent expenses
  const { data: recentExpenses, isLoading: recentExpensesLoading } = useQuery(
    'recentExpenses',
    () => expenseService.getExpenses({ limit: 5 }).then(res => res.data.data.expenses),
    {
      refetchInterval: 30000,
    }
  );

  // Fetch pending approvals (for managers and admins)
  const { data: pendingApprovals, isLoading: pendingApprovalsLoading } = useQuery(
    'pendingApprovals',
    () => approvalService.getPendingApprovals({ limit: 5 }).then(res => res.data.data.expenses),
    {
      enabled: isManager || isAdmin,
      refetchInterval: 30000,
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
      month: 'short',
      day: 'numeric',
    });
  };

  if (expenseStatsLoading || recentExpensesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user?.firstName}!
        </h1>
        <p className="text-gray-600 mt-1">
          Here's what's happening with your expenses today.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/expenses/submit"
            className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Submit New Expense
          </Link>
          <Link
            to="/expenses"
            className="inline-flex items-center px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition-colors"
          >
            <DocumentTextIcon className="h-5 w-5 mr-2" />
            View All Expenses
          </Link>
          {(isManager || isAdmin) && (
            <Link
              to="/approvals"
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <CheckCircleIcon className="h-5 w-5 mr-2" />
              Pending Approvals
            </Link>
          )}
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Expenses */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <DocumentTextIcon className="h-8 w-8 text-primary-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Expenses</p>
              <p className="text-2xl font-semibold text-gray-900">
                {expenseStats?.totalExpenses || 0}
              </p>
            </div>
          </div>
        </div>

        {/* Total Amount */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CurrencyDollarIcon className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Amount</p>
              <p className="text-2xl font-semibold text-gray-900">
                {formatCurrency(expenseStats?.totalAmount || 0)}
              </p>
            </div>
          </div>
        </div>

        {/* Pending Expenses */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ClockIcon className="h-8 w-8 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Pending</p>
              <p className="text-2xl font-semibold text-gray-900">
                {expenseStats?.pendingCount || 0}
              </p>
            </div>
          </div>
        </div>

        {/* Approved Expenses */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CheckCircleIcon className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Approved</p>
              <p className="text-2xl font-semibold text-gray-900">
                {expenseStats?.approvedCount || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Manager/Admin Statistics */}
      {(isManager || isAdmin) && !approvalStatsLoading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ClockIcon className="h-8 w-8 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Pending Approvals</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {approvalStats?.pendingCount || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircleIcon className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Approved Today</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {approvalStats?.approvedCount || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <XCircleIcon className="h-8 w-8 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Rejected Today</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {approvalStats?.rejectedCount || 0}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Expenses */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Expenses</h2>
            <Link
              to="/expenses"
              className="text-sm text-primary-600 hover:text-primary-500"
            >
              View all
            </Link>
          </div>
          
          {recentExpensesLoading ? (
            <div className="flex items-center justify-center h-32">
              <LoadingSpinner />
            </div>
          ) : recentExpenses?.length > 0 ? (
            <div className="space-y-3">
              {recentExpenses.map((expense) => (
                <div key={expense._id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{expense.description}</p>
                    <p className="text-xs text-gray-500">{formatDate(expense.expenseDate)}</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-medium text-gray-900">
                      {formatCurrency(expense.amountInCompanyCurrency)}
                    </span>
                    <StatusBadge status={expense.status} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No expenses found</p>
          )}
        </div>

        {/* Pending Approvals (for managers and admins) */}
        {(isManager || isAdmin) && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Pending Approvals</h2>
              <Link
                to="/approvals"
                className="text-sm text-primary-600 hover:text-primary-500"
              >
                View all
              </Link>
            </div>
            
            {pendingApprovalsLoading ? (
              <div className="flex items-center justify-center h-32">
                <LoadingSpinner />
              </div>
            ) : pendingApprovals?.length > 0 ? (
              <div className="space-y-3">
                {pendingApprovals.map((expense) => (
                  <div key={expense._id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{expense.description}</p>
                      <p className="text-xs text-gray-500">
                        by {expense.employee?.firstName} {expense.employee?.lastName}
                      </p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="text-sm font-medium text-gray-900">
                        {formatCurrency(expense.amountInCompanyCurrency)}
                      </span>
                      <StatusBadge status={expense.status} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No pending approvals</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
