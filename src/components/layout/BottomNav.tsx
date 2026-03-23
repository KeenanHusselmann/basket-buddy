// ==========================================
// BasketBuddy - Mobile Bottom Navigation
// ==========================================

import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, ShoppingCart, PiggyBank, BarChart3,
  MoreHorizontal, Wallet, Fuel, HeartPulse, Package, Store, X,
} from 'lucide-react';
import { BOTTOM_NAV_ITEMS, MORE_NAV_ITEMS } from '../../config/constants';
import { cn } from '../../utils/helpers';

const iconMap: Record<string, React.ElementType> = {
  LayoutDashboard, ShoppingCart, PiggyBank, BarChart3,
  Wallet, Fuel, HeartPulse, Package, Store,
};

const BottomNav: React.FC = () => {
  const [moreOpen, setMoreOpen] = useState(false);
  const location = useLocation();

  const isMoreActive = MORE_NAV_ITEMS.some((item) =>
    item.path === '/'
      ? location.pathname === '/'
      : location.pathname.startsWith(item.path)
  );

  return (
    <>
      {/* More Drawer Backdrop */}
      <AnimatePresence>
        {moreOpen && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 z-40 lg:hidden"
            onClick={() => setMoreOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* More Drawer */}
      <AnimatePresence>
        {moreOpen && (
          <motion.div
            key="drawer"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 400, damping: 40 }}
            className={cn(
              'fixed bottom-0 left-0 right-0 z-50 lg:hidden',
              'bg-gray-900/95 backdrop-blur-2xl border-t border-green-500/25',
              'rounded-t-2xl pb-safe'
            )}
            style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))' }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>

            {/* Close button */}
            <div className="flex items-center justify-between px-5 py-3">
              <span className="text-sm font-semibold text-gray-300 uppercase tracking-wider">More</span>
              <button
                onClick={() => setMoreOpen(false)}
                className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-white/8 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* More items grid */}
            <div className="grid grid-cols-3 gap-3 px-5 pb-4">
              {MORE_NAV_ITEMS.map((item) => {
                const Icon = iconMap[item.icon] || MoreHorizontal;
                const isActive = item.path === '/'
                  ? location.pathname === '/'
                  : location.pathname.startsWith(item.path);
                return (
                  <NavLink
                    key={item.id}
                    to={item.path}
                    onClick={() => setMoreOpen(false)}
                    className={cn(
                      'flex flex-col items-center gap-2 p-4 rounded-2xl transition-all duration-200',
                      isActive
                        ? 'bg-green-600/20 border border-green-500/30 text-green-300'
                        : 'bg-white/5 border border-green-500/20 text-gray-400 hover:bg-white/10 hover:text-gray-200'
                    )}
                  >
                    <Icon size={22} />
                    <span className="text-[11px] font-medium text-center leading-tight">{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Nav Bar */}
      <nav className={cn(
        'fixed bottom-0 left-0 right-0 z-40 lg:hidden',
        'bg-gray-950/90 backdrop-blur-2xl border-t border-green-500/20',
        'flex items-stretch'
      )}
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {BOTTOM_NAV_ITEMS.map((item) => {
          const Icon = iconMap[item.icon] || LayoutDashboard;
          const isActive = item.path === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(item.path);

          return (
            <NavLink
              key={item.id}
              to={item.path}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 relative transition-colors duration-150"
            >
              <div className={cn(
                'flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all duration-200',
                isActive ? 'text-green-400' : 'text-gray-500 hover:text-gray-300'
              )}>
                <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
                <span className={cn(
                  'text-[10px] font-medium leading-none',
                  isActive ? 'text-green-400' : 'text-gray-500'
                )}>
                  {item.label}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="bottom-nav-dot"
                    className="absolute -bottom-px left-0 right-0 h-0.5 bg-green-500 rounded-t-full"
                    transition={{ type: 'spring', stiffness: 600, damping: 40 }}
                  />
                )}
              </div>
            </NavLink>
          );
        })}

        {/* More button */}
        <button
          onClick={() => setMoreOpen(true)}
          className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 relative transition-colors duration-150"
        >
          <div className={cn(
            'flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all duration-200',
            isMoreActive ? 'text-green-400' : 'text-gray-500 hover:text-gray-300'
          )}>
            <MoreHorizontal size={20} strokeWidth={isMoreActive ? 2.5 : 1.8} />
            <span className={cn(
              'text-[10px] font-medium leading-none',
              isMoreActive ? 'text-green-400' : 'text-gray-500'
            )}>
              More
            </span>
          </div>
        </button>
      </nav>
    </>
  );
};

export default BottomNav;
