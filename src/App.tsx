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
import Fuel from './pages/Fuel';
import Medical from './pages/Medical';
import BudgetPlanner from './pages/BudgetPlanner';
import Finance from './pages/Finance';
import Analytics from './pages/Analytics';
import ShoppingLists from './pages/ShoppingList';

const LoadingScreen: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-950">
    <div className="text-center">
      <div className="relative w-16 h-16 mx-auto mb-4">
        <div className="absolute inset-0 rounded-full border-4 border-green-900" />
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-green-500 animate-spin" />
      </div>
      <p className="text-gray-400 font-medium">Loading BasketBuddy...</p>
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
          <Route path="fuel" element={<Fuel />} />
          <Route path="medical" element={<Medical />} />
          <Route path="appointments" element={<Navigate to="/medical" replace />} />
          <Route path="items" element={<Items />} />
          <Route path="stores" element={<Stores />} />
          <Route path="compare" element={<Navigate to="/" replace />} />
          <Route path="optimizer" element={<Navigate to="/" replace />} />
          <Route path="budget" element={<BudgetPlanner />} />
          <Route path="finance" element={<Finance />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="shopping-list" element={<ShoppingLists />} />
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
                background: '#1f2937',
                color: '#f3f4f6',
                fontSize: '14px',
                padding: '12px 16px',
                border: '1px solid rgba(255,255,255,0.08)',
              },
            }}
          />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
};

export default App;
