import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useAuth } from '../../contexts/AuthContext';
import { expenseService, currencyService, ocrService } from '../../services/api';
import Button from '../../components/UI/Button';
import Input from '../../components/UI/Input';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import toast from 'react-hot-toast';
import { useDropzone } from 'react-dropzone';
import {
  CloudArrowUpIcon,
  DocumentTextIcon,
  XMarkIcon,
  CameraIcon,
} from '@heroicons/react/24/outline';

const SubmitExpense = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    amount: '',
    currency: 'USD',
    category: '',
    description: '',
    expenseDate: new Date().toISOString().split('T')[0],
    receipt: null
  });
  const [errors, setErrors] = useState({});
  const [ocrLoading, setOcrLoading] = useState(false);

  // Fetch company details for currency
  const { data: company } = useQuery(
    'company',
    () => currencyService.getPopularCurrencies().then(res => res.data.data.currencies),
    { enabled: false }
  );

  // Fetch popular currencies
  const { data: currencies } = useQuery(
    'currencies',
    () => currencyService.getPopularCurrencies().then(res => res.data.data.currencies)
  );

  const expenseCategories = [
    'Travel',
    'Meals',
    'Accommodation',
    'Transportation',
    'Office Supplies',
    'Other'
  ];

  // Submit expense mutation
  const submitExpenseMutation = useMutation(
    (expenseData) => expenseService.createExpense(expenseData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('expenses');
        queryClient.invalidateQueries('expenseStats');
        toast.success('Expense submitted successfully!');
        navigate('/expenses');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to submit expense');
      }
    }
  );

  // OCR processing mutation
  const processOcrMutation = useMutation(
    (file) => ocrService.extractExpenseData(file),
    {
      onSuccess: (response) => {
        const { expenseData } = response.data.data;
        setFormData(prev => ({
          ...prev,
          amount: expenseData.amount || '',
          currency: expenseData.currency || 'USD',
          category: expenseData.category || '',
          description: expenseData.description || '',
          expenseDate: expenseData.date ? new Date(expenseData.date).toISOString().split('T')[0] : prev.expenseDate
        }));
        toast.success('Receipt data extracted successfully!');
      },
      onError: (error) => {
        toast.error('Failed to extract data from receipt');
      },
      onSettled: () => {
        setOcrLoading(false);
      }
    }
  );

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    }

    if (!formData.category) {
      newErrors.category = 'Category is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (!formData.expenseDate) {
      newErrors.expenseDate = 'Expense date is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    const submitData = {
      ...formData,
      amount: parseFloat(formData.amount)
    };

    submitExpenseMutation.mutate(submitData);
  };

  // File dropzone for receipt upload
  const onDrop = (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (file) {
      setFormData(prev => ({ ...prev, receipt: file }));
      
      // Automatically process OCR
      setOcrLoading(true);
      processOcrMutation.mutate(file);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.bmp', '.webp']
    },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024 // 5MB
  });

  const removeReceipt = () => {
    setFormData(prev => ({ ...prev, receipt: null }));
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Submit New Expense</h1>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Receipt Upload Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Receipt (Optional)
            </label>
            
            {!formData.receipt ? (
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                  isDragActive
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <input {...getInputProps()} />
                <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-600">
                  {isDragActive
                    ? 'Drop the receipt here...'
                    : 'Drag & drop a receipt image, or click to select'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  PNG, JPG, GIF up to 5MB
                </p>
              </div>
            ) : (
              <div className="border border-gray-300 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <DocumentTextIcon className="h-8 w-8 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {formData.receipt.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {(formData.receipt.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={removeReceipt}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
                {ocrLoading && (
                  <div className="mt-3 flex items-center text-sm text-blue-600">
                    <LoadingSpinner size="sm" className="mr-2" />
                    Extracting data from receipt...
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Amount and Currency */}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Amount"
              name="amount"
              type="number"
              step="0.01"
              min="0"
              required
              value={formData.amount}
              onChange={handleChange}
              error={errors.amount}
              placeholder="0.00"
            />
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Currency
              </label>
              <select
                name="currency"
                value={formData.currency}
                onChange={handleChange}
                className="input-field"
              >
                {currencies?.map((currency) => (
                  <option key={currency.code} value={currency.code}>
                    {currency.code} - {currency.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="input-field"
              required
            >
              <option value="">Select a category</option>
              {expenseCategories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            {errors.category && (
              <p className="mt-1 text-sm text-red-600">{errors.category}</p>
            )}
          </div>

          {/* Description */}
          <Input
            label="Description"
            name="description"
            type="text"
            required
            value={formData.description}
            onChange={handleChange}
            error={errors.description}
            placeholder="Brief description of the expense"
          />

          {/* Expense Date */}
          <Input
            label="Expense Date"
            name="expenseDate"
            type="date"
            required
            value={formData.expenseDate}
            onChange={handleChange}
            error={errors.expenseDate}
          />

          {/* Submit Button */}
          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate('/expenses')}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={submitExpenseMutation.isLoading}
              disabled={submitExpenseMutation.isLoading}
            >
              Submit Expense
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SubmitExpense;
