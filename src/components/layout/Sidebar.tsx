// ==========================================
// BasketBuddy - Sidebar Navigation (Dark Glassmorphism)
// ==========================================

import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, ShoppingCart, Package, Store,
  Wallet, PiggyBank, BarChart3, Fuel, HeartPulse,
  ChevronLeft, ChevronRight, LogOut, ShoppingBag, ClipboardList,
} from 'lucide-react';
import { NAV_ITEMS, APP_NAME } from '../../config/constants';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../utils/helpers';

const iconMap: Record<string, React.ElementType> = {
  LayoutDashboard, ShoppingCart, Package, Store,
  Wallet, PiggyBank, BarChart3, Fuel, HeartPulse, ClipboardList,
};

const GROUPS = [
  { label: 'Main', group: 'main' },
  { label: 'More', group: 'more' },
];

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
        'fixed left-0 top-0 bottom-0 z-40 flex flex-col overflow-hidden',
        'bg-gray-950/95 backdrop-blur-xl border-r border-violet-500/20'
      )}
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-violet-500/20 flex-shrink-0">
        <div className="flex items-center gap-3 overflow-hidden min-w-0">
          <div className="flex-shrink-0 w-9 h-9 bg-gradient-to-br from-violet-600 to-violet-800 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/30">
            <ShoppingBag size={17} className="text-white" />
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden whitespace-nowrap min-w-0"
              >
                <h1 className="text-base font-bold bg-gradient-to-r from-violet-400 to-violet-200 bg-clip-text text-transparent leading-tight">
                  {APP_NAME}
                </h1>
                <p className="text-[10px] text-gray-500 leading-none mt-0.5">Smart Grocery Tracker</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-2 px-2 overflow-y-auto overflow-x-hidden">
        {GROUPS.map(({ label, group }) => {
          const items = NAV_ITEMS.filter((i) => i.group === group);
          return (
            <div key={group} className="mb-1">
              <AnimatePresence>
                {!collapsed && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.12 }}
                    className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-600"
                  >
                    {label}
                  </motion.p>
                )}
              </AnimatePresence>
              {items.map((item) => {
                const Icon = iconMap[item.icon] || LayoutDashboard;
                const isActive = item.path === '/'
                  ? location.pathname === '/'
                  : location.pathname.startsWith(item.path);
                return (
                  <NavLink
                    key={item.id}
                    to={item.path}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      'relative flex items-center gap-3 px-2 py-2.5 rounded-xl transition-all duration-150 group mb-0.5',
                      isActive
                        ? 'bg-violet-600/15 text-violet-300'
                        : 'text-gray-500 hover:bg-white/5 hover:text-gray-300'
                    )}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="sidebar-active-bar"
                        className="absolute left-0 top-2 bottom-2 w-0.5 bg-violet-500 rounded-r-full"
                        transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                      />
                    )}
                    <div className={cn(
                      'flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-150',
                      isActive
                        ? 'bg-violet-500/20 text-violet-400'
                        : 'text-gray-600 group-hover:text-gray-400'
                    )}>
                      <Icon size={17} strokeWidth={isActive ? 2.5 : 1.8} />
                    </div>
                    <AnimatePresence>
                      {!collapsed && (
                        <motion.span
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.12 }}
                          className="text-sm whitespace-nowrap overflow-hidden font-medium"
                        >
                          {item.label}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </NavLink>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* User Section */}
      <div className="border-t border-violet-500/20 p-2 flex-shrink-0">
        <AnimatePresence>
          {!collapsed && user && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.15 }}
              className="flex items-center gap-3 px-2 py-2 mb-1 overflow-hidden"
            >
              <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center text-white text-[11px] font-bold">
                {user.displayName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-300 truncate leading-tight">
                  {user.displayName || 'User'}
                </p>
                <p className="text-[10px] text-gray-600 truncate">{user.email}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <button
          onClick={logout}
          title="Sign out"
          className={cn(
            'flex items-center gap-3 px-2 py-2.5 rounded-xl w-full transition-all duration-150',
            'text-gray-600 hover:text-rose-400 hover:bg-rose-500/10 text-sm'
          )}
        >
          <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg">
            <LogOut size={17} strokeWidth={1.8} />
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12 }}
                className="text-sm font-medium whitespace-nowrap"
              >
                Sign Out
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>

      {/* Collapse Toggle */}
      <button
        onClick={onToggle}
        className={cn(
          'absolute -right-3 top-[72px] w-6 h-6 rounded-full z-50',
          'bg-gray-800 border border-violet-500/25',
          'flex items-center justify-center shadow-lg',
          'hover:bg-gray-700 transition-colors text-gray-400'
        )}
      >
        {collapsed ? <ChevronRight size={11} /> : <ChevronLeft size={11} />}
      </button>
    </motion.aside>
  );
};

export default Sidebar;
