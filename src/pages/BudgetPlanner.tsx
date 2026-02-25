// ==========================================
// BasketBuddy - Budget Planner Page
// ==========================================

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Wallet, Plus, Edit3, TrendingUp, TrendingDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import Modal from '../components/common/Modal';
import { cn, formatPrice, calcPercentage, getBudgetColor, getBudgetStatus } from '../utils/helpers';
import { CURRENCY } from '../config/constants';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const BudgetPlanner: React.FC = () => {
  const { budgets, trips, categories, setBudget } = useApp();
  const now = new Date();
  const [viewMonth, setViewMonth] = useState(now.getMonth() + 1);
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [modalOpen, setModalOpen] = useState(false);
  const [totalBudgetInput, setTotalBudgetInput] = useState('');
  const [catBudgets, setCatBudgets] = useState<Record<string, string>>({});

  const currentBudget = budgets.find((b) => b.month === viewMonth && b.year === viewYear);

  // Get spending for this month
  const monthTrips = useMemo(() => {
    return trips.filter((t) => {
      const d = new Date(t.date);
      return d.getMonth() + 1 === viewMonth && d.getFullYear() === viewYear && t.status === 'completed';
    });
  }, [trips, viewMonth, viewYear]);

  const totalSpent = monthTrips.reduce((s, t) => s + t.totalSpent, 0);

  // Category spending
  const categorySpending = useMemo(() => {
    const map = new Map<string, number>();
    monthTrips.forEach((trip) => {
      trip.items.forEach((item) => {
        const prev = map.get(item.categoryId) || 0;
        map.set(item.categoryId, prev + (item.actualPrice || item.estimatedPrice) * item.quantity);
      });
    });
    return map;
  }, [monthTrips]);

  const prevMonth = () => {
    if (viewMonth === 1) { setViewMonth(12); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 12) { setViewMonth(1); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  };

  const openBudgetModal = () => {
    setTotalBudgetInput(currentBudget?.totalBudget?.toString() || '');
    const existing: Record<string, string> = {};
    currentBudget?.categoryBudgets.forEach((cb) => {
      existing[cb.categoryId] = cb.amount.toString();
    });
    setCatBudgets(existing);
    setModalOpen(true);
  };

  const saveBudget = (e: React.FormEvent) => {
    e.preventDefault();
    const catTotal = Object.values(catBudgets).reduce((s, v) => s + (parseFloat(v) || 0), 0);
    const proposed = parseFloat(totalBudgetInput) || 0;
    const total = proposed > 0 ? proposed : catTotal;
    if (total <= 0) return;
    const catEntries = Object.entries(catBudgets)
      .filter(([_, v]) => parseFloat(v) > 0)
      .map(([catId, amount]) => ({
        categoryId: catId,
        amount: parseFloat(amount),
        spent: categorySpending.get(catId) || 0,
      }));

    setBudget({
      month: viewMonth,
      year: viewYear,
      totalBudget: total,
      categoryBudgets: catEntries,
    });
    setModalOpen(false);
  };

  const budgetColor = currentBudget ? getBudgetColor(totalSpent, currentBudget.totalBudget) : '#3B82F6';
  const budgetPct = currentBudget ? calcPercentage(totalSpent, currentBudget.totalBudget) : 0;
  const remaining = currentBudget ? currentBudget.totalBudget - totalSpent : 0;

  // Last month comparison
  const lastMonthTrips = trips.filter((t) => {
    const d = new Date(t.date);
    const lm = viewMonth === 1 ? 12 : viewMonth - 1;
    const ly = viewMonth === 1 ? viewYear - 1 : viewYear;
    return d.getMonth() + 1 === lm && d.getFullYear() === ly && t.status === 'completed';
  });
  const lastMonthSpent = lastMonthTrips.reduce((s, t) => s + t.totalSpent, 0);
  const spendingDiff = lastMonthSpent > 0 ? totalSpent - lastMonthSpent : 0;
  const spendingDiffPct = lastMonthSpent > 0 ? Math.round((spendingDiff / lastMonthSpent) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Budget Planner</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">
            Set and track your monthly grocery budget
          </p>
        </div>
        <button
          onClick={openBudgetModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-500 text-white rounded-xl text-sm font-medium hover:bg-brand-600 transition-colors shadow-lg shadow-brand-500/20"
        >
          {currentBudget ? <Edit3 size={16} /> : <Plus size={16} />}
          {currentBudget ? 'Edit Budget' : 'Set Budget'}
        </button>
      </div>

      {/* Month Selector */}
      <div className="flex items-center justify-center gap-4">
        <button onClick={prevMonth} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <ChevronLeft size={20} className="text-gray-600 dark:text-gray-400" />
        </button>
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 min-w-[200px] text-center">
          {MONTHS[viewMonth - 1]} {viewYear}
        </h2>
        <button onClick={nextMonth} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <ChevronRight size={20} className="text-gray-600 dark:text-gray-400" />
        </button>
      </div>

      {!currentBudget ? (
        /* No Budget Set */
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-12 text-center">
          <Wallet className="mx-auto text-gray-300 dark:text-gray-700 mb-3" size={48} />
          <p className="text-gray-500 font-medium mb-1">No budget set for {MONTHS[viewMonth - 1]}</p>
          <p className="text-gray-400 text-sm mb-4">Set a budget to track your spending goals</p>
          <button
            onClick={openBudgetModal}
            className="px-6 py-2.5 bg-brand-500 text-white rounded-xl text-sm font-medium hover:bg-brand-600 transition-colors"
          >
            Set Budget
          </button>
          {totalSpent > 0 && (
            <p className="text-gray-400 text-sm mt-4">
              You've already spent <strong className="text-gray-600 dark:text-gray-300">{formatPrice(totalSpent)}</strong> this month
            </p>
          )}
        </div>
      ) : (
        <>
          {/* Budget Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Total Budget */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6"
            >
              <p className="text-sm text-gray-500 mb-1">Total Budget</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{formatPrice(currentBudget.totalBudget)}</p>
              <div className="flex items-center gap-2 mt-3">
                <div className="flex-1 h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(budgetPct, 100)}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className="h-full rounded-full transition-colors"
                    style={{ backgroundColor: budgetColor }}
                  />
                </div>
                <span className="text-sm font-bold" style={{ color: budgetColor }}>{budgetPct}%</span>
              </div>
              <p className="text-sm mt-2" style={{ color: budgetColor }}>
                {getBudgetStatus(totalSpent, currentBudget.totalBudget)}
              </p>
            </motion.div>

            {/* Spent */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6"
            >
              <p className="text-sm text-gray-500 mb-1">Spent</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{formatPrice(totalSpent)}</p>
              {lastMonthSpent > 0 && (
                <div className={cn('flex items-center gap-1 mt-3 text-sm font-medium',
                  spendingDiff > 0 ? 'text-red-500' : 'text-green-500'
                )}>
                  {spendingDiff > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  {Math.abs(spendingDiffPct)}% vs last month
                </div>
              )}
              <p className="text-xs text-gray-400 mt-1">{completedTrips()} trips completed</p>
            </motion.div>

            {/* Remaining */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className={cn(
                'rounded-2xl border p-6',
                remaining >= 0
                  ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800/30'
                  : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800/30'
              )}
            >
              <p className="text-sm text-gray-500 mb-1">{remaining >= 0 ? 'Remaining' : 'Over Budget'}</p>
              <p className={cn('text-3xl font-bold', remaining >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>
                {formatPrice(Math.abs(remaining))}
              </p>
              <p className="text-xs text-gray-400 mt-3">
                {remaining >= 0
                  ? `≈ ${formatPrice(remaining / Math.max(1, daysLeft()))} per day remaining`
                  : `${formatPrice(Math.abs(remaining))} over your limit`}
              </p>
            </motion.div>
          </div>

          {/* Category Breakdown */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
              <h2 className="font-semibold text-gray-800 dark:text-gray-200">Category Breakdown</h2>
            </div>
            <div className="p-6 space-y-4">
              {currentBudget.categoryBudgets.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No category budgets set. Edit your budget to add category limits.</p>
              ) : (
                currentBudget.categoryBudgets.map((cb) => {
                  const cat = categories.find((c) => c.id === cb.categoryId);
                  const spent = categorySpending.get(cb.categoryId) || 0;
                  const pct = calcPercentage(spent, cb.amount);
                  const catColor = getBudgetColor(spent, cb.amount);
                  return (
                    <div key={cb.categoryId} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span>{cat?.icon}</span>
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{cat?.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-gray-500">{formatPrice(spent)}</span>
                          <span className="text-xs text-gray-400">of {formatPrice(cb.amount)}</span>
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ color: catColor, backgroundColor: `${catColor}15` }}>
                            {pct}%
                          </span>
                        </div>
                      </div>
                      <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(pct, 100)}%` }}
                          transition={{ duration: 0.6, delay: 0.1 }}
                          className="h-full rounded-full"
                          style={{ backgroundColor: catColor }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}

      {/* Budget Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={`Budget for ${MONTHS[viewMonth - 1]} ${viewYear}`} size="lg">
        <form onSubmit={saveBudget} className="space-y-5">

          {/* Category Budgets — filled first, drives auto-total */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Category Budgets
              <span className="ml-1 text-xs font-normal text-gray-400">(fill in amounts per category)</span>
            </label>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {categories.map((cat) => (
                <div key={cat.id} className="flex items-center gap-3">
                  <span className="w-8 text-center">{cat.icon}</span>
                  <span className="flex-1 text-sm text-gray-700 dark:text-gray-300">{cat.name}</span>
                  <div className="relative w-32">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">{CURRENCY}</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={catBudgets[cat.id] || ''}
                      onChange={(e) => setCatBudgets({ ...catBudgets, [cat.id]: e.target.value })}
                      placeholder="0.00"
                      className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-right text-gray-800 dark:text-gray-200 outline-none focus:border-brand-500"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Divider + totals */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Auto-calculated row */}
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800">
              <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                Category total <span className="text-xs font-normal">(auto-calculated)</span>
              </span>
              <span className="text-base font-bold text-gray-800 dark:text-gray-100">
                {CURRENCY} {Object.values(catBudgets).reduce((s, v) => s + (parseFloat(v) || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            {/* Proposed budget row */}
            <div className="flex items-center gap-3 px-4 py-3 border-t border-gray-200 dark:border-gray-700">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 shrink-0">
                Proposed budget
              </span>
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">{CURRENCY}</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={totalBudgetInput}
                  onChange={(e) => setTotalBudgetInput(e.target.value)}
                  placeholder={Object.values(catBudgets).reduce((s, v) => s + (parseFloat(v) || 0), 0).toFixed(2)}
                  className="w-full pl-9 pr-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-right font-semibold text-gray-800 dark:text-gray-200 outline-none focus:border-brand-500 transition-colors"
                />
              </div>
            </div>

            {/* Live comparison callout */}
            {(() => {
              const catTotal = Object.values(catBudgets).reduce((s, v) => s + (parseFloat(v) || 0), 0);
              const proposed = parseFloat(totalBudgetInput) || 0;
              if (catTotal === 0 && proposed === 0) return null;
              const effectiveBudget = proposed > 0 ? proposed : catTotal;
              const diff = proposed > 0 ? proposed - catTotal : 0;
              const fullyAllocated = proposed > 0 && Math.abs(diff) < 0.01;
              const over = proposed > 0 && diff < 0;
              const unallocated = proposed > 0 && diff > 0.01;
              const noCatYet = catTotal === 0 && proposed > 0;

              return (
                <div className={cn(
                  'px-4 py-2.5 text-xs font-medium flex items-center justify-between border-t',
                  over
                    ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400'
                    : fullyAllocated
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-600 dark:text-green-400'
                    : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400'
                )}>
                  <span>
                    {noCatYet && 'No categories filled — proposed budget will be used as total'}
                    {!noCatYet && fullyAllocated && '✓ Categories perfectly match your proposed budget'}
                    {!noCatYet && over && `Categories exceed proposed budget by ${CURRENCY}${Math.abs(diff).toFixed(2)}`}
                    {!noCatYet && unallocated && `${CURRENCY}${diff.toFixed(2)} unallocated (categories cover ${Math.round((catTotal / effectiveBudget) * 100)}%)`}
                    {proposed === 0 && catTotal > 0 && `Using category total as budget: ${CURRENCY}${catTotal.toFixed(2)}`}
                  </span>
                </div>
              );
            })()}
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Cancel</button>
            <button type="submit" className="flex-1 py-2.5 bg-brand-500 text-white rounded-xl text-sm font-medium hover:bg-brand-600 transition-colors">Save Budget</button>
          </div>
        </form>
      </Modal>
    </div>
  );

  function completedTrips() {
    return monthTrips.length;
  }

  function daysLeft() {
    const end = new Date(viewYear, viewMonth, 0);
    const today = new Date();
    if (today.getMonth() + 1 !== viewMonth || today.getFullYear() !== viewYear) return end.getDate();
    return Math.max(1, end.getDate() - today.getDate());
  }
};

export default BudgetPlanner;
