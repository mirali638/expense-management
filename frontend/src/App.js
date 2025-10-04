import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Layout from './components/Layout/Layout';
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import Dashboard from './pages/Dashboard/Dashboard';
import Expenses from './pages/Expenses/Expenses';
import SubmitExpense from './pages/Expenses/SubmitExpense';
import ExpenseDetail from './pages/Expenses/ExpenseDetail';
import Approvals from './pages/Approvals/Approvals';
import Users from './pages/Users/Users';
import Profile from './pages/Profile/Profile';
import Company from './pages/Company/Company';
import LoadingSpinner from './components/UI/LoadingSpinner';

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route 
        path="/login" 
        element={user ? <Navigate to="/dashboard" replace /> : <Login />} 
      />
      <Route 
        path="/register" 
        element={user ? <Navigate to="/dashboard" replace /> : <Register />} 
      />
      
      {/* Protected routes */}
      <Route 
        path="/*" 
        element={
          user ? (
            <Layout>
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/expenses" element={<Expenses />} />
                <Route path="/expenses/submit" element={<SubmitExpense />} />
                <Route path="/expenses/:id" element={<ExpenseDetail />} />
                <Route path="/approvals" element={<Approvals />} />
                <Route path="/users" element={<Users />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/company" element={<Company />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </Layout>
          ) : (
            <Navigate to="/login" replace />
          )
        } 
      />
    </Routes>
  );
}

export default App;
