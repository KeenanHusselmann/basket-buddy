// ==========================================
// BasketBuddy - Dashboard Page
// ==========================================

import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  ShoppingCart, TrendingDown, TrendingUp, Wallet, Tag,
  AlertTriangle, ArrowRight, Clock, CheckCircle2, Sparkles, Package,
  Receipt, ArrowDownCircle,
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { formatPrice, formatRelativeDate, calcPercentage, getBudgetColor, daysUntilRestock, cn } from '../utils/helpers';
import { CURRENCY } from '../config/constants';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { trips, items, prices, stores, budgets, reminders, categories, transactions } = useApp();

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // Stats
  const monthTrips = trips.filter((t) => {
    const d = new Date(t.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });
  const completedTrips = monthTrips.filter((t) => t.status === 'completed');
  const plannedTrips = trips.filter((t) => t.status === 'planned');
  const monthlySpent = completedTrips.reduce((s, t) => s + t.totalSpent, 0);

  const currentBudget = budgets.find((b) => b.month === currentMonth + 1 && b.year === currentYear);
  const budgetTotal = currentBudget?.totalBudget || 0;
  const budgetPct = budgetTotal > 0 ? calcPercentage(monthlySpent, budgetTotal) : 0;

  // Personal finance: fixed + variable expenses this month (from Home Budget)
  const monthTransactions = transactions.filter(
    (t) => t.month === currentMonth + 1 && t.year === currentYear
  );
  const totalFixed    = monthTransactions.filter((t) => t.type === 'fixed').reduce((s, t) => s + t.amount, 0);
  const totalVariable = monthTransactions.filter((t) => t.type === 'variable').reduce((s, t) => s + t.amount, 0);
  const totalExpenses = totalFixed + totalVariable + monthlySpent; // incl. grocery trips

  // Specials count
  const activeSpecials = prices.filter(
    (p) => p.isOnSpecial && p.specialPrice && (!p.specialEndDate || p.specialEndDate > Date.now())
  );

  // Restock alerts
  const restockAlerts = reminders.filter(
    (r) => r.enabled && daysUntilRestock(r.lastPurchased, r.frequency) <= 3
  );

  // Recent trips
  const recentTrips = [...trips]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 5);

  // Top spending categories this month
  const catSpending = new Map<string, number>();
  completedTrips.forEach((trip) => {
    trip.items.forEach((ti) => {
      const prev = catSpending.get(ti.categoryId) || 0;
      catSpending.set(ti.categoryId, prev + (ti.actualPrice || ti.estimatedPrice) * ti.quantity);
    });
  });
  const topCategories = Array.from(catSpending.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([catId, amount]) => {
      const cat = categories.find((c) => c.id === catId);
      return { id: catId, name: cat?.name || catId, icon: cat?.icon || '📦', color: cat?.color || '#666', amount };
    });

  const greeting = () => {
    const hour = now.getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Welcome */}
      <motion.div variants={item}>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {greeting()}, {user?.displayName?.split(' ')[0] || 'there'} 👋
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-0.5">
          Here's your grocery overview for {now.toLocaleDateString('en-NA', { month: 'long', year: 'numeric' })}
        </p>
      </motion.div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Monthly Spent */}
        <motion.div variants={item} className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-xl">
              <Wallet size={20} className="text-green-600 dark:text-green-400" />
            </div>
            {budgetTotal > 0 && (
              <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full',
                budgetPct >= 100 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                budgetPct >= 80 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              )}>
                {budgetPct}% of budget
              </span>
            )}
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatPrice(monthlySpent)}</p>
          <p className="text-xs text-gray-500 mt-1">
            {budgetTotal > 0
              ? `of ${formatPrice(budgetTotal)} budget`
              : `${completedTrips.length} trips this month`}
          </p>
          {budgetTotal > 0 && (
            <div className="mt-3 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(budgetPct, 100)}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="h-full rounded-full"
                style={{ backgroundColor: getBudgetColor(monthlySpent, budgetTotal) }}
              />
            </div>
          )}
        </motion.div>

        {/* Planned Trips */}
        <motion.div variants={item} className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
              <ShoppingCart size={20} className="text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{plannedTrips.length}</p>
          <p className="text-xs text-gray-500 mt-1">Planned trips</p>
          <Link to="/trips" className="inline-flex items-center gap-1 text-xs text-brand-500 font-medium mt-3 hover:text-brand-600">
            View all <ArrowRight size={12} />
          </Link>
        </motion.div>

        {/* Active Specials */}
        <motion.div variants={item} className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
              <Tag size={20} className="text-amber-600 dark:text-amber-400" />
            </div>
            {activeSpecials.length > 0 && (
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500" />
              </span>
            )}
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{activeSpecials.length}</p>
          <p className="text-xs text-gray-500 mt-1">Active specials tracked</p>
          <Link to="/items" className="inline-flex items-center gap-1 text-xs text-brand-500 font-medium mt-3 hover:text-brand-600">
            Manage prices <ArrowRight size={12} />
          </Link>
        </motion.div>

        {/* Items Tracked */}
        <motion.div variants={item} className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
              <Package size={20} className="text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{items.length}</p>
          <p className="text-xs text-gray-500 mt-1">Items in {stores.length} stores</p>
          <Link to="/compare" className="inline-flex items-center gap-1 text-xs text-brand-500 font-medium mt-3 hover:text-brand-600">
            Compare prices <ArrowRight size={12} />
          </Link>
        </motion.div>
      </div>

      {/* Total Expenses Card */}
      <motion.div variants={item} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
            <Receipt size={16} className="text-rose-500" />
            Total Monthly Expenses
          </h2>
          <Link to="/finance" className="text-xs text-brand-500 font-medium hover:text-brand-600 flex items-center gap-1">
            Home Budget <ArrowRight size={12} />
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-gray-100 dark:divide-gray-800">
          {/* Fixed */}
          <div className="p-5">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-xs text-gray-500 font-medium">Fixed</span>
            </div>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{formatPrice(totalFixed)}</p>
            <p className="text-xs text-gray-400 mt-0.5">Rent, insurance…</p>
          </div>
          {/* Variable */}
          <div className="p-5">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-2 h-2 rounded-full bg-orange-500" />
              <span className="text-xs text-gray-500 font-medium">Variable</span>
            </div>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{formatPrice(totalVariable)}</p>
            <p className="text-xs text-gray-400 mt-0.5">Fuel, utilities…</p>
          </div>
          {/* Groceries */}
          <div className="p-5">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-xs text-gray-500 font-medium">Groceries</span>
            </div>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{formatPrice(monthlySpent)}</p>
            <p className="text-xs text-gray-400 mt-0.5">From shopping trips</p>
          </div>
          {/* Total */}
          <div className="p-5 bg-rose-50 dark:bg-rose-900/10">
            <div className="flex items-center gap-1.5 mb-1">
              <ArrowDownCircle size={12} className="text-rose-500" />
              <span className="text-xs text-rose-600 dark:text-rose-400 font-medium">Total Out</span>
            </div>
            <p className="text-xl font-bold text-rose-600 dark:text-rose-400">{formatPrice(totalExpenses)}</p>
            <p className="text-xs text-gray-400 mt-0.5">All categories combined</p>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Trips */}
        <motion.div variants={item} className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800 dark:text-gray-200">Recent Shopping Trips</h2>
            <Link to="/trips" className="text-xs text-brand-500 font-medium hover:text-brand-600">View All</Link>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {recentTrips.length === 0 ? (
              <div className="p-8 text-center">
                <ShoppingCart className="mx-auto text-gray-300 dark:text-gray-700 mb-3" size={40} />
                <p className="text-gray-500 text-sm">No trips yet. Plan your first shopping trip!</p>
                <Link to="/trips" className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-brand-500 text-white rounded-xl text-sm font-medium hover:bg-brand-600 transition-colors">
                  <ShoppingCart size={14} /> New Trip
                </Link>
              </div>
            ) : (
              recentTrips.map((trip) => {
                const store = stores.find((s) => s.id === trip.storeId);
                return (
                  <div key={trip.id} className="px-5 py-3 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                      style={{ backgroundColor: `${store?.color}20`, color: store?.color }}
                    >
                      {store?.icon || '🛒'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{trip.name}</p>
                      <p className="text-xs text-gray-400">
                        {store?.name} · {trip.items.length} items · {formatRelativeDate(trip.createdAt)}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                        {formatPrice(trip.status === 'completed' ? trip.totalSpent : trip.items.reduce((s, i) => s + i.estimatedPrice * i.quantity, 0))}
                      </p>
                      <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full',
                        trip.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                        trip.status === 'in-progress' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                        'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                      )}>
                        {trip.status === 'completed' ? '✓ Done' : trip.status === 'in-progress' ? '🛒 Shopping' : '📋 Planned'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </motion.div>

        {/* Side Panel */}
        <div className="space-y-6">
          {/* Top Categories */}
          <motion.div variants={item} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800">
              <h2 className="font-semibold text-gray-800 dark:text-gray-200">Top Spending</h2>
            </div>
            <div className="p-4 space-y-3">
              {topCategories.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">Complete a trip to see spending</p>
              ) : (
                topCategories.map((cat) => {
                  const pct = monthlySpent > 0 ? calcPercentage(cat.amount, monthlySpent) : 0;
                  return (
                    <div key={cat.id} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {cat.icon} {cat.name}
                        </span>
                        <span className="text-xs font-medium text-gray-500">{formatPrice(cat.amount)}</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.6, delay: 0.2 }}
                          className="h-full rounded-full"
                          style={{ backgroundColor: cat.color }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>

          {/* Restock Alerts */}
          <motion.div variants={item} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center gap-2">
              <h2 className="font-semibold text-gray-800 dark:text-gray-200">Restock Alerts</h2>
              {restockAlerts.length > 0 && (
                <span className="w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {restockAlerts.length}
                </span>
              )}
            </div>
            <div className="p-4">
              {restockAlerts.length === 0 ? (
                <div className="text-center py-4">
                  <CheckCircle2 className="mx-auto text-green-400 mb-2" size={28} />
                  <p className="text-sm text-gray-400">All stocked up!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {restockAlerts.map((r) => (
                    <div key={r.id} className="flex items-center gap-3 p-2 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-xl">
                      <AlertTriangle size={14} className="text-amber-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">{r.itemName}</p>
                        <p className="text-[10px] text-gray-400">
                          {daysUntilRestock(r.lastPurchased, r.frequency) <= 0
                            ? 'Overdue!'
                            : `In ${daysUntilRestock(r.lastPurchased, r.frequency)} days`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>

          {/* Quick Actions */}
          <motion.div variants={item} className="bg-gradient-to-br from-brand-600 to-brand-800 rounded-2xl p-5 text-white shadow-lg">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={18} />
              <h3 className="font-semibold">Quick Actions</h3>
            </div>
            <div className="space-y-2">
              <Link
                to="/trips"
                className="flex items-center gap-2 px-3 py-2 bg-white/10 rounded-xl hover:bg-white/20 transition-colors text-sm"
              >
                <ShoppingCart size={14} /> New Shopping Trip
              </Link>
              <Link
                to="/optimizer"
                className="flex items-center gap-2 px-3 py-2 bg-white/10 rounded-xl hover:bg-white/20 transition-colors text-sm"
              >
                <Sparkles size={14} /> Optimize My Cart
              </Link>
              <Link
                to="/compare"
                className="flex items-center gap-2 px-3 py-2 bg-white/10 rounded-xl hover:bg-white/20 transition-colors text-sm"
              >
                <TrendingDown size={14} /> Compare Prices
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

export default Dashboard;
