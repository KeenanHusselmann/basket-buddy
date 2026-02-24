// ==========================================
// BasketBuddy - Sidebar Navigation
// ==========================================

import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, ShoppingCart, Package, Store,
  ArrowLeftRight, Sparkles, Wallet, BarChart3,
  ChevronLeft, ChevronRight, LogOut, Settings,
} from 'lucide-react';
import { NAV_ITEMS, APP_NAME } from '../../config/constants';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../utils/helpers';

const iconMap: Record<string, React.ElementType> = {
  LayoutDashboard, ShoppingCart, Package, Store,
  ArrowLeftRight, Sparkles, Wallet, BarChart3,
};

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle }) => {
  const { user, logout } = useAuth();
  const location = useLocation();

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 72 : 260 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className={cn(
        'fixed left-0 top-0 bottom-0 z-40 flex flex-col',
        'bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800',
        'shadow-lg'
      )}
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-brand-500 to-brand-700 rounded-xl flex items-center justify-center text-xl shadow-md">
            🛒
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="overflow-hidden whitespace-nowrap"
              >
                <h1 className="text-lg font-bold bg-gradient-to-r from-brand-600 to-brand-400 bg-clip-text text-transparent">
                  {APP_NAME}
                </h1>
                <p className="text-[10px] text-gray-400 -mt-0.5">Smart Grocery Tracker</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = iconMap[item.icon] || LayoutDashboard;
          const isActive = item.path === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(item.path);

          return (
            <NavLink
              key={item.id}
              to={item.path}
              className={cn(
                'group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200',
                'hover:bg-brand-50 dark:hover:bg-brand-950/50',
                isActive
                  ? 'bg-brand-50 dark:bg-brand-950/50 text-brand-600 dark:text-brand-400 font-semibold shadow-sm'
                  : 'text-gray-600 dark:text-gray-400'
              )}
              title={collapsed ? item.label : undefined}
            >
              <div
                className={cn(
                  'flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg transition-all',
                  isActive
                    ? 'bg-brand-100 dark:bg-brand-900/50 text-brand-600 dark:text-brand-400'
                    : 'text-gray-500 dark:text-gray-500 group-hover:text-brand-500'
                )}
              >
                <Icon size={18} />
              </div>
              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-sm whitespace-nowrap overflow-hidden"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
              {isActive && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute left-0 w-1 h-8 bg-brand-500 rounded-r-full"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* User Section */}
      <div className="border-t border-gray-200 dark:border-gray-800 p-3">
        {!collapsed && user && (
          <div className="flex items-center gap-3 px-2 py-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-namibia-blue to-namibia-green flex items-center justify-center text-white text-xs font-bold">
              {user.displayName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || '?'}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                {user.displayName || 'User'}
              </p>
              <p className="text-[10px] text-gray-400 truncate">{user.email}</p>
            </div>
          </div>
        )}
        <button
          onClick={logout}
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-xl w-full',
            'text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30',
            'transition-all duration-200 text-sm'
          )}
          title="Sign out"
        >
          <LogOut size={18} />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>

      {/* Collapse Toggle */}
      <button
        onClick={onToggle}
        className={cn(
          'absolute -right-3 top-20 w-6 h-6 rounded-full',
          'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
          'flex items-center justify-center shadow-md',
          'hover:bg-brand-50 dark:hover:bg-brand-950 transition-colors'
        )}
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>
    </motion.aside>
  );
};

export default Sidebar;
