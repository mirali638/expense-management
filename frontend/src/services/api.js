import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance
export const authAPI = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API calls
export const authService = {
  login: (email, password) => authAPI.post('/auth/login', { email, password }),
  register: (userData) => authAPI.post('/auth/register', userData),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  updateProfile: (profileData) => api.put('/auth/profile', profileData),
  changePassword: (currentPassword, newPassword) => 
    api.put('/auth/change-password', { currentPassword, newPassword }),
};

// User API calls
export const userService = {
  getUsers: (params) => api.get('/users', { params }),
  getUser: (id) => api.get(`/users/${id}`),
  createUser: (userData) => api.post('/users', userData),
  updateUser: (id, userData) => api.put(`/users/${id}`, userData),
  deleteUser: (id) => api.delete(`/users/${id}`),
  getTeam: () => api.get('/users/team'),
  getManagers: () => api.get('/users/managers'),
};

// Company API calls
export const companyService = {
  getCompany: () => api.get('/companies'),
  updateCompany: (companyData) => api.put('/companies', companyData),
  getStats: () => api.get('/companies/stats'),
  updateSettings: (settings) => api.put('/companies/settings', settings),
};

// Expense API calls
export const expenseService = {
  getExpenses: (params) => api.get('/expenses', { params }),
  getExpense: (id) => api.get(`/expenses/${id}`),
  createExpense: (expenseData) => {
    const formData = new FormData();
    
    // Add all expense fields
    Object.keys(expenseData).forEach(key => {
      if (key === 'receipt' && expenseData[key]) {
        formData.append('receipt', expenseData[key]);
      } else if (expenseData[key] !== null && expenseData[key] !== undefined) {
        formData.append(key, expenseData[key]);
      }
    });
    
    return api.post('/expenses', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  updateExpense: (id, expenseData) => {
    const formData = new FormData();
    
    Object.keys(expenseData).forEach(key => {
      if (key === 'receipt' && expenseData[key]) {
        formData.append('receipt', expenseData[key]);
      } else if (expenseData[key] !== null && expenseData[key] !== undefined) {
        formData.append(key, expenseData[key]);
      }
    });
    
    return api.put(`/expenses/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  deleteExpense: (id) => api.delete(`/expenses/${id}`),
  getStats: () => api.get('/expenses/stats'),
};

// Approval API calls
export const approvalService = {
  getPendingApprovals: (params) => api.get('/approvals/pending', { params }),
  processApproval: (id, action, comment) => 
    api.put(`/approvals/${id}`, { action, comment }),
  getApprovalHistory: (id) => api.get(`/approvals/${id}/history`),
  getStats: () => api.get('/approvals/stats'),
  overrideApproval: (id, action, comment) => 
    api.put(`/approvals/${id}/override`, { action, comment }),
};

// Currency API calls
export const currencyService = {
  getCountries: () => api.get('/currencies/countries'),
  getPopularCurrencies: () => api.get('/currencies/popular'),
  convertCurrency: (amount, fromCurrency, toCurrency) => 
    api.post('/currencies/convert', { amount, fromCurrency, toCurrency }),
  getExchangeRate: (from, to) => api.get(`/currencies/rate/${from}/${to}`),
  getExchangeRates: (baseCurrency, targetCurrencies) => 
    api.post('/currencies/rates', { baseCurrency, targetCurrencies }),
};

// OCR API calls
export const ocrService = {
  extractText: (imageFile) => {
    const formData = new FormData();
    formData.append('image', imageFile);
    return api.post('/ocr/extract', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  extractExpenseData: (receiptFile) => {
    const formData = new FormData();
    formData.append('receipt', receiptFile);
    return api.post('/ocr/expense', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};

export default api;
