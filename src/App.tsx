// ==========================================
// BasketBuddy - App Entry & Routing
// ==========================================

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AppProvider } from './contexts/AppContext';

import Layout from './components/layout/Layout';
import Login from './components/auth/Login';
import Dashboard from './pages/Dashboard';
import Stores from './pages/Stores';
import Items from './pages/Items';
import Trips from './pages/Trips';
import BudgetPlanner from './pages/BudgetPlanner';
import Finance from './pages/Finance';
import PriceComparison from './pages/PriceComparison';
import StoreOptimizer from './pages/StoreOptimizer';
import Analytics from './pages/Analytics';

const LoadingScreen: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
    <div className="text-center">
      <div className="relative w-16 h-16 mx-auto mb-4">
        <div className="absolute inset-0 rounded-full border-4 border-brand-200 dark:border-brand-900" />
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-brand-500 animate-spin" />
      </div>
      <p className="text-gray-500 dark:text-gray-400 font-medium">Loading BasketBuddy...</p>
    </div>
  </div>
);

const ProtectedRoutes: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <Login />;

  return (
    <AppProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="trips" element={<Trips />} />
          <Route path="items" element={<Items />} />
          <Route path="stores" element={<Stores />} />
          <Route path="compare" element={<PriceComparison />} />
          <Route path="optimizer" element={<StoreOptimizer />} />
          <Route path="budget" element={<BudgetPlanner />} />
          <Route path="finance" element={<Finance />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </AppProvider>
  );
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <ProtectedRoutes />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: {
                borderRadius: '12px',
                background: 'var(--toast-bg, #fff)',
                color: 'var(--toast-color, #333)',
                fontSize: '14px',
                padding: '12px 16px',
              },
            }}
          />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
};

export default App;
