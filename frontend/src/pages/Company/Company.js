import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useAuth } from '../../contexts/AuthContext';
import { companyService } from '../../services/api';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import Button from '../../components/UI/Button';
import Input from '../../components/UI/Input';
import toast from 'react-hot-toast';
import {
  BuildingOfficeIcon,
  GlobeAltIcon,
  CurrencyDollarIcon,
  UserIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

const Company = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Company form data
  const [companyData, setCompanyData] = useState({
    name: '',
    country: '',
    currency: 'USD'
  });

  // Settings form data
  const [settingsData, setSettingsData] = useState({
    maxExpenseAmount: 10000,
    expenseCategories: ['Travel', 'Meals', 'Accommodation', 'Transportation', 'Office Supplies', 'Other']
  });

  // Fetch company details
  const { data: company, isLoading } = useQuery(
    'company',
    () => companyService.getCompany().then(res => res.data.data.company),
    {
      enabled: user?.role === 'admin',
      onSuccess: (data) => {
        setCompanyData({
          name: data.name || '',
          country: data.country || '',
          currency: data.currency || 'USD'
        });
        if (data.settings) {
          setSettingsData({
            maxExpenseAmount: data.settings.maxExpenseAmount || 10000,
            expenseCategories: data.settings.expenseCategories || ['Travel', 'Meals', 'Accommodation', 'Transportation', 'Office Supplies', 'Other']
          });
        }
      }
    }
  );

  // Fetch company statistics
  const { data: stats } = useQuery(
    'companyStats',
    () => companyService.getStats().then(res => res.data.data.stats),
    {
      enabled: user?.role === 'admin',
    }
  );

  // Update company mutation
  const updateCompanyMutation = useMutation(
    (data) => companyService.updateCompany(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('company');
        toast.success('Company information updated successfully!');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to update company information');
      }
    }
  );

  // Update settings mutation
  const updateSettingsMutation = useMutation(
    (data) => companyService.updateSettings(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('company');
        toast.success('Company settings updated successfully!');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to update company settings');
      }
    }
  );

  const handleCompanyChange = (e) => {
    const { name, value } = e.target;
    setCompanyData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSettingsChange = (e) => {
    const { name, value } = e.target;
    setSettingsData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateCompanyForm = () => {
    const newErrors = {};

    if (!companyData.name.trim()) {
      newErrors.name = 'Company name is required';
    }

    if (!companyData.country.trim()) {
      newErrors.country = 'Country is required';
    }

    if (!companyData.currency) {
      newErrors.currency = 'Currency is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCompanySubmit = async (e) => {
    e.preventDefault();
    
    if (!validateCompanyForm()) return;

    setLoading(true);
    try {
      await updateCompanyMutation.mutateAsync(companyData);
    } finally {
      setLoading(false);
    }
  };

  const handleSettingsSubmit = async (e) => {
    e.preventDefault();
    
    setLoading(true);
    try {
      await updateSettingsMutation.mutateAsync(settingsData);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  if (user?.role !== 'admin') {
    return (
      <div className="text-center py-12">
        <BuildingOfficeIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Access Denied</h3>
        <p className="mt-1 text-sm text-gray-500">
          You need admin privileges to access this page.
        </p>
      </div>
    );
  }

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
        <h1 className="text-2xl font-bold text-gray-900">Company Settings</h1>
        <p className="text-gray-600 mt-1">
          Manage your company information and settings
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'overview'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('information')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'information'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Company Information
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'settings'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Settings
          </button>
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Company Info Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <div className="h-12 w-12 rounded-full bg-primary-500 flex items-center justify-center">
                  <BuildingOfficeIcon className="h-6 w-6 text-white" />
                </div>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{company?.name}</h2>
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <div className="flex items-center">
                    <GlobeAltIcon className="h-4 w-4 mr-1" />
                    {company?.country}
                  </div>
                  <div className="flex items-center">
                    <CurrencyDollarIcon className="h-4 w-4 mr-1" />
                    {company?.currency}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Statistics */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <UserIcon className="h-8 w-8 text-primary-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Total Users</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {stats.users?.total || 0}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <ChartBarIcon className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Total Expenses</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {stats.expenses?.total || 0}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <CurrencyDollarIcon className="h-8 w-8 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Total Amount</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {formatCurrency(stats.expenses?.amounts?.totalAmount || 0)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <UserIcon className="h-8 w-8 text-yellow-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Active Users</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {stats.users?.active || 0}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Company Information Tab */}
      {activeTab === 'information' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Company Information
          </h3>
          
          <form onSubmit={handleCompanySubmit} className="space-y-4">
            <Input
              label="Company Name"
              name="name"
              value={companyData.name}
              onChange={handleCompanyChange}
              error={errors.name}
              required
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Country"
                name="country"
                value={companyData.country}
                onChange={handleCompanyChange}
                error={errors.country}
                required
              />
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Currency
                </label>
                <select
                  name="currency"
                  value={companyData.currency}
                  onChange={handleCompanyChange}
                  className="input-field"
                  required
                >
                  <option value="USD">USD - US Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - British Pound</option>
                  <option value="JPY">JPY - Japanese Yen</option>
                  <option value="CAD">CAD - Canadian Dollar</option>
                  <option value="AUD">AUD - Australian Dollar</option>
                  <option value="INR">INR - Indian Rupee</option>
                </select>
                {errors.currency && (
                  <p className="mt-1 text-sm text-red-600">{errors.currency}</p>
                )}
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                loading={loading}
                disabled={loading}
              >
                Update Information
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Company Settings
          </h3>
          
          <form onSubmit={handleSettingsSubmit} className="space-y-4">
            <Input
              label="Maximum Expense Amount"
              name="maxExpenseAmount"
              type="number"
              min="0"
              step="0.01"
              value={settingsData.maxExpenseAmount}
              onChange={handleSettingsChange}
              helperText="Maximum amount allowed for a single expense"
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Expense Categories
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {settingsData.expenseCategories.map((category, index) => (
                  <div key={index} className="flex items-center">
                    <input
                      type="text"
                      value={category}
                      onChange={(e) => {
                        const newCategories = [...settingsData.expenseCategories];
                        newCategories[index] = e.target.value;
                        setSettingsData(prev => ({
                          ...prev,
                          expenseCategories: newCategories
                        }));
                      }}
                      className="input-field text-sm"
                    />
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Edit expense categories available for users
              </p>
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                loading={loading}
                disabled={loading}
              >
                Update Settings
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Company;
