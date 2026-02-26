// ==========================================
// BasketBuddy - Top Header Bar
// ==========================================

import React, { useState } from 'react';
import { Search, Bell, Moon, Sun, Menu, CloudUpload, Loader, CheckCircle, XCircle } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useApp } from '../../contexts/AppContext';
import { cn, daysUntilRestock, formatPrice } from '../../utils/helpers';
import { CURRENCY } from '../../config/constants';
import { isFirebaseConfigured } from '../../config/firebase';

interface HeaderProps {
  onMenuClick?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { theme, toggleTheme, isDark } = useTheme();
  const { reminders, trips, items, syncNow, syncStatus } = useApp();
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  // Calculate notifications
  const activeReminders = reminders.filter(
    (r) => r.enabled && daysUntilRestock(r.lastPurchased, r.frequency) <= 2
  );
  const plannedTrips = trips.filter((t) => t.status === 'planned');
  const totalNotifs = activeReminders.length + plannedTrips.length;

  // Quick stats
  const thisMonthTrips = trips.filter((t) => {
    const d = new Date(t.date);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const monthlySpent = thisMonthTrips
    .filter((t) => t.status === 'completed')
    .reduce((sum, t) => sum + t.totalSpent, 0);

  return (
    <header className="h-16 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 flex items-center px-6 gap-4 sticky top-0 z-30">
      {/* Mobile menu button */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg"
      >
        <Menu size={20} />
      </button>

      {/* Search */}
      <div className="relative flex-1 max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search items, stores, trips..."
          className={cn(
            'w-full pl-10 pr-4 py-2 rounded-xl text-sm',
            'bg-gray-100 dark:bg-gray-800 border border-transparent',
            'focus:border-brand-500 focus:bg-white dark:focus:bg-gray-900',
            'text-gray-800 dark:text-gray-200 placeholder-gray-400',
            'outline-none transition-all duration-200'
          )}
        />
        <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-gray-400 bg-gray-200 dark:bg-gray-700 rounded">
          ⌘K
        </kbd>
      </div>

      {/* Quick Stat */}
      <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-xl">
        <span className="text-xs text-gray-500">This Month</span>
        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
          {formatPrice(monthlySpent)}
        </span>
      </div>

      {/* Notifications */}
      <div className="relative">
        <button
          onClick={() => setNotifOpen(!notifOpen)}
          className="relative p-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-brand-500 transition-colors"
        >
          <Bell size={18} />
          {totalNotifs > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-bounce-subtle">
              {totalNotifs}
            </span>
          )}
        </button>

        {/* Notification Dropdown */}
        {notifOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
            <div className="fixed top-[4.5rem] left-2 right-2 sm:left-auto sm:right-4 sm:w-80 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl z-50 overflow-hidden">
              <div className="p-4 border-b border-gray-200 dark:border-gray-800">
                <h3 className="font-semibold text-gray-800 dark:text-gray-200">Notifications</h3>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {activeReminders.map((r) => (
                  <div key={r.id} className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <p className="text-sm text-gray-800 dark:text-gray-200">
                      🔔 Time to restock <strong>{r.itemName}</strong>
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {daysUntilRestock(r.lastPurchased, r.frequency) <= 0
                        ? 'Overdue!'
                        : `Due in ${daysUntilRestock(r.lastPurchased, r.frequency)} days`}
                    </p>
                  </div>
                ))}
                {plannedTrips.map((t) => (
                  <div key={t.id} className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <p className="text-sm text-gray-800 dark:text-gray-200">
                      🛒 Planned trip: <strong>{t.name}</strong>
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Budget: {formatPrice(t.budget)} · {t.items.length} items
                    </p>
                  </div>
                ))}
                {totalNotifs === 0 && (
                  <div className="p-8 text-center text-gray-400">
                    <p className="text-2xl mb-2">🎉</p>
                    <p className="text-sm">All caught up!</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Cloud Sync Button */}
      {isFirebaseConfigured && (
        <button
          onClick={syncNow}
          disabled={syncStatus === 'saving'}
          title="Sync all data to cloud now"
          className={cn(
            'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200',
            syncStatus === 'saving' && 'bg-blue-50 dark:bg-blue-900/20 text-blue-500 cursor-wait',
            syncStatus === 'saved' && 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
            syncStatus === 'error' && 'bg-red-50 dark:bg-red-900/20 text-red-500',
            syncStatus === 'idle' && 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/20',
          )}
        >
          {syncStatus === 'saving' && <Loader size={14} className="animate-spin" />}
          {syncStatus === 'saved' && <CheckCircle size={14} />}
          {syncStatus === 'error' && <XCircle size={14} />}
          {syncStatus === 'idle' && <CloudUpload size={14} />}
          <span className="hidden sm:inline">
            {syncStatus === 'saving' ? 'Saving…' : syncStatus === 'saved' ? 'Saved' : syncStatus === 'error' ? 'Failed' : 'Sync'}
          </span>
        </button>
      )}

      {/* Theme Toggle */}
      <button
        onClick={toggleTheme}
        className="p-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-brand-500 transition-all duration-300"
        title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {isDark ? <Sun size={18} /> : <Moon size={18} />}
      </button>
    </header>
  );
};

export default Header;
