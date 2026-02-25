// ==========================================
// BasketBuddy - Home Budget / Personal Finance
// Income, Fixed Costs, Variable Costs, Budget Planning
// ==========================================

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PiggyBank, ChevronLeft, ChevronRight, Plus, Edit3, Trash2,
  TrendingUp, TrendingDown, ArrowUpCircle, ArrowDownCircle,
  Target, Receipt, ShoppingCart, Repeat, StickyNote,
  LayoutGrid, BarChart2, ClipboardList,
} from 'lucide-react';

import { useApp } from '../contexts/AppContext';
import { formatPrice } from '../utils/helpers';
import { cn } from '../utils/helpers';
import {
  CURRENCY,
  FINANCE_INCOME_CATEGORIES,
  FINANCE_FIXED_CATEGORIES,
  FINANCE_VARIABLE_CATEGORIES,
} from '../config/constants';
import Modal from '../components/common/Modal';
import type {
  FinanceTransaction,
  FinanceTransactionType,
  FinanceCategoryTarget,
} from '../types';

// ── Local Constants ──────────────────────────────────────────
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const TABS = [
  { id: 'overview',  label: 'Overview',       icon: LayoutGrid },
  { id: 'income',    label: 'Income',         icon: ArrowUpCircle },
  { id: 'fixed',     label: 'Fixed Costs',    icon: Receipt },
  { id: 'variable',  label: 'Variable Costs', icon: ArrowDownCircle },
  { id: 'plan',      label: 'Budget Plan',    icon: Target },
] as const;
type TabId = (typeof TABS)[number]['id'];

// ── Helpers ──────────────────────────────────────────────────
function pct(value: number, total: number) {
  if (!total) return 0;
  return Math.min(100, Math.round((value / total) * 100));
}

function barColor(spent: number, budget: number) {
  if (!budget) return '#6366f1';
  const p = spent / budget;
  if (p >= 1) return '#ef4444';
  if (p >= 0.85) return '#f97316';
  return '#22c55e';
}

function getCategoryLabel(
  type: FinanceTransactionType,
  categoryId: string
): string {
  const all = [
    ...FINANCE_INCOME_CATEGORIES,
    ...FINANCE_FIXED_CATEGORIES,
    ...FINANCE_VARIABLE_CATEGORIES,
  ];
  return all.find((c) => c.id === categoryId)?.label || categoryId;
}

function getCategoryIcon(
  type: FinanceTransactionType,
  categoryId: string
): string {
  const all = [
    ...FINANCE_INCOME_CATEGORIES,
    ...FINANCE_FIXED_CATEGORIES,
    ...FINANCE_VARIABLE_CATEGORIES,
  ];
  return all.find((c) => c.id === categoryId)?.icon || '💰';
}

function today() {
  return new Date().toISOString().split('T')[0];
}

// ── Blank Transaction ────────────────────────────────────────
function blankTx(
  type: FinanceTransactionType,
  month: number,
  year: number
): Omit<FinanceTransaction, 'id' | 'createdAt'> {
  const cats = type === 'income'
    ? FINANCE_INCOME_CATEGORIES
    : type === 'fixed'
    ? FINANCE_FIXED_CATEGORIES
    : FINANCE_VARIABLE_CATEGORIES;

  return {
    type,
    month,
    year,
    category: cats[0]?.id || '',
    description: '',
    amount: 0,
    date: Date.now(),
    recurring: false,
    notes: '',
  };
}

// ── Component ────────────────────────────────────────────────
const Finance: React.FC = () => {
  const {
    transactions, financePlans, trips,
    addTransaction, updateTransaction, deleteTransaction,
    setFinancePlan,
  } = useApp();

  // Month navigation
  const now = new Date();
  const [viewMonth, setViewMonth] = useState(now.getMonth() + 1);
  const [viewYear, setViewYear] = useState(now.getFullYear());

  const prevMonth = () => {
    if (viewMonth === 1) { setViewMonth(12); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 12) { setViewMonth(1); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  };

  // Active tab
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  // Transaction modal state
  const [txModal, setTxModal] = useState<{
    open: boolean;
    mode: 'add' | 'edit';
    data: Omit<FinanceTransaction, 'id' | 'createdAt'> & { id?: string };
  }>({
    open: false,
    mode: 'add',
    data: blankTx('income', viewMonth, viewYear),
  });

  // Plan modal state
  const [planModal, setPlanModal] = useState(false);
  const [planIncomeGoal, setPlanIncomeGoal] = useState('');
  const [planSavingsGoal, setPlanSavingsGoal] = useState('');
  const [planTargets, setPlanTargets] = useState<Record<string, string>>({});

  // ── Computed values ──────────────────────────────────────────
  const monthTx = useMemo(
    () => transactions.filter((t) => t.month === viewMonth && t.year === viewYear),
    [transactions, viewMonth, viewYear]
  );
  const incomeTx = useMemo(() => monthTx.filter((t) => t.type === 'income'), [monthTx]);
  const fixedTx  = useMemo(() => monthTx.filter((t) => t.type === 'fixed'),  [monthTx]);
  const varTx    = useMemo(() => monthTx.filter((t) => t.type === 'variable'), [monthTx]);

  const totalIncome   = useMemo(() => incomeTx.reduce((s, t) => s + t.amount, 0), [incomeTx]);
  const totalFixed    = useMemo(() => fixedTx.reduce((s, t) => s + t.amount, 0), [fixedTx]);
  const totalVariable = useMemo(() => varTx.reduce((s, t) => s + t.amount, 0), [varTx]);

  // Grocery spending auto-integrated from completed shopping trips
  const grocerySpent = useMemo(() => {
    return trips
      .filter((t) => {
        const d = new Date(t.date);
        return (
          d.getMonth() + 1 === viewMonth &&
          d.getFullYear() === viewYear &&
          t.status === 'completed'
        );
      })
      .reduce((sum, t) => sum + t.totalSpent, 0);
  }, [trips, viewMonth, viewYear]);

  const totalAllVariable = totalVariable + grocerySpent;
  const totalExpenses = totalFixed + totalAllVariable;
  const netSavings = totalIncome - totalExpenses;

  // Current plan
  const currentPlan = useMemo(
    () => financePlans.find((p) => p.month === viewMonth && p.year === viewYear),
    [financePlans, viewMonth, viewYear]
  );

  // ── Open modals ──────────────────────────────────────────────
  const openAdd = (type: FinanceTransactionType) => {
    setTxModal({
      open: true,
      mode: 'add',
      data: blankTx(type, viewMonth, viewYear),
    });
  };

  const openEdit = (tx: FinanceTransaction) => {
    setTxModal({
      open: true,
      mode: 'edit',
      data: { ...tx },
    });
  };

  const openPlan = () => {
    setPlanIncomeGoal(currentPlan?.incomeGoal?.toString() || '');
    setPlanSavingsGoal(currentPlan?.savingsGoal?.toString() || '');
    const existing: Record<string, string> = {};
    currentPlan?.categoryTargets.forEach((ct) => {
      existing[ct.category] = ct.targetAmount.toString();
    });
    setPlanTargets(existing);
    setPlanModal(true);
  };

  // Categories for form select based on type
  const formCategories = useMemo(() => {
    if (txModal.data.type === 'income') return FINANCE_INCOME_CATEGORIES;
    if (txModal.data.type === 'fixed') return FINANCE_FIXED_CATEGORIES;
    return FINANCE_VARIABLE_CATEGORIES;
  }, [txModal.data.type]);

  // ── Handlers ─────────────────────────────────────────────────
  const handleTxSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const { id, ...rest } = txModal.data as FinanceTransaction;
    if (txModal.mode === 'edit' && id) {
      updateTransaction(id, rest);
    } else {
      addTransaction(rest);
    }
    setTxModal((s) => ({ ...s, open: false }));
  };

  const handlePlanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const allCats = [...FINANCE_FIXED_CATEGORIES, ...FINANCE_VARIABLE_CATEGORIES];
    const targets: FinanceCategoryTarget[] = allCats
      .filter((c) => parseFloat(planTargets[c.id] || '0') > 0)
      .map((c) => ({
        category: c.id,
        type: FINANCE_FIXED_CATEGORIES.some((fc) => fc.id === c.id) ? 'fixed' : 'variable',
        targetAmount: parseFloat(planTargets[c.id]),
      }));

    setFinancePlan({
      month: viewMonth,
      year: viewYear,
      incomeGoal: parseFloat(planIncomeGoal) || 0,
      savingsGoal: parseFloat(planSavingsGoal) || 0,
      categoryTargets: targets,
    });
    setPlanModal(false);
  };

  // ── Grouped transactions for category views ──────────────────
  function groupByCategory(txList: FinanceTransaction[]) {
    const map = new Map<string, { total: number; items: FinanceTransaction[] }>();
    txList.forEach((tx) => {
      const entry = map.get(tx.category) || { total: 0, items: [] };
      entry.total += tx.amount;
      entry.items.push(tx);
      map.set(tx.category, entry);
    });
    return Array.from(map.entries()).sort((a, b) => b[1].total - a[1].total);
  }

  // ── Render ───────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
            <PiggyBank size={20} className="text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Home Budget</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">
              Income, expenses & personal finance planning
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={openPlan}
            className="flex items-center gap-2 px-4 py-2 border border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400 rounded-xl text-sm font-medium hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
          >
            <Target size={15} />
            {currentPlan ? 'Edit Plan' : 'Set Budget Plan'}
          </button>
          <button
            onClick={() => openAdd('income')}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/20"
          >
            <Plus size={15} />
            Add Entry
          </button>
        </div>
      </div>

      {/* Month Navigator */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={prevMonth}
          className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <ChevronLeft size={20} className="text-gray-600 dark:text-gray-400" />
        </button>
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 min-w-[200px] text-center">
          {MONTHS[viewMonth - 1]} {viewYear}
        </h2>
        <button
          onClick={nextMonth}
          className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <ChevronRight size={20} className="text-gray-600 dark:text-gray-400" />
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Income */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4"
        >
          <div className="flex items-center gap-2 mb-1">
            <ArrowUpCircle size={16} className="text-green-500" />
            <span className="text-xs text-gray-500 font-medium">Total Income</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatPrice(totalIncome)}</p>
          {currentPlan?.incomeGoal ? (
            <p className="text-xs text-gray-400 mt-1">
              Goal: {formatPrice(currentPlan.incomeGoal)}
            </p>
          ) : null}
        </motion.div>

        {/* Fixed */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4"
        >
          <div className="flex items-center gap-2 mb-1">
            <Receipt size={16} className="text-blue-500" />
            <span className="text-xs text-gray-500 font-medium">Fixed Costs</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatPrice(totalFixed)}</p>
          <p className="text-xs text-gray-400 mt-1">{fixedTx.length} entries</p>
        </motion.div>

        {/* Variable */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4"
        >
          <div className="flex items-center gap-2 mb-1">
            <ArrowDownCircle size={16} className="text-orange-500" />
            <span className="text-xs text-gray-500 font-medium">Variable Costs</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatPrice(totalAllVariable)}</p>
          {grocerySpent > 0 && (
            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
              Incl. {formatPrice(grocerySpent)} groceries
            </p>
          )}
        </motion.div>

        {/* Net */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className={cn(
            'rounded-2xl border p-4',
            netSavings >= 0
              ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800/30'
              : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800/30'
          )}
        >
          <div className="flex items-center gap-2 mb-1">
            <PiggyBank size={16} className={netSavings >= 0 ? 'text-green-500' : 'text-red-500'} />
            <span className="text-xs text-gray-500 font-medium">
              {netSavings >= 0 ? 'Surplus / Savings' : 'Deficit'}
            </span>
          </div>
          <p className={cn(
            'text-2xl font-bold',
            netSavings >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
          )}>
            {formatPrice(Math.abs(netSavings))}
          </p>
          {currentPlan?.savingsGoal ? (
            <p className="text-xs text-gray-400 mt-1">
              Goal: {formatPrice(currentPlan.savingsGoal)}
            </p>
          ) : null}
        </motion.div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl overflow-x-auto">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex-1 justify-center',
              activeTab === id
                ? 'bg-white dark:bg-gray-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            )}
          >
            <Icon size={14} />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.15 }}
        >
          {/* ── OVERVIEW ──────────────────────────────────────── */}
          {activeTab === 'overview' && (
            <OverviewTab
              totalIncome={totalIncome}
              totalFixed={totalFixed}
              totalAllVariable={totalAllVariable}
              totalExpenses={totalExpenses}
              netSavings={netSavings}
              grocerySpent={grocerySpent}
              monthTx={monthTx}
              currentPlan={currentPlan}
              onEdit={openEdit}
              onDelete={deleteTransaction}
            />
          )}

          {/* ── INCOME ────────────────────────────────────────── */}
          {activeTab === 'income' && (
            <TransactionTab
              title="Income"
              color="green"
              txList={incomeTx}
              type="income"
              total={totalIncome}
              onAdd={() => openAdd('income')}
              onEdit={openEdit}
              onDelete={deleteTransaction}
              currentPlan={currentPlan}
            />
          )}

          {/* ── FIXED COSTS ───────────────────────────────────── */}
          {activeTab === 'fixed' && (
            <TransactionTab
              title="Fixed Costs"
              color="blue"
              txList={fixedTx}
              type="fixed"
              total={totalFixed}
              onAdd={() => openAdd('fixed')}
              onEdit={openEdit}
              onDelete={deleteTransaction}
              currentPlan={currentPlan}
            />
          )}

          {/* ── VARIABLE COSTS ────────────────────────────────── */}
          {activeTab === 'variable' && (
            <VariableTab
              txList={varTx}
              totalVariable={totalVariable}
              grocerySpent={grocerySpent}
              onAdd={() => openAdd('variable')}
              onEdit={openEdit}
              onDelete={deleteTransaction}
              currentPlan={currentPlan}
            />
          )}

          {/* ── BUDGET PLAN ───────────────────────────────────── */}
          {activeTab === 'plan' && (
            <PlanTab
              currentPlan={currentPlan}
              totalIncome={totalIncome}
              totalFixed={totalFixed}
              totalAllVariable={totalAllVariable}
              netSavings={netSavings}
              fixedTx={fixedTx}
              varTx={varTx}
              grocerySpent={grocerySpent}
              onOpenPlan={openPlan}
              month={viewMonth}
              year={viewYear}
            />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Transaction Modal */}
      <Modal
        isOpen={txModal.open}
        onClose={() => setTxModal((s) => ({ ...s, open: false }))}
        title={txModal.mode === 'add' ? 'Add Finance Entry' : 'Edit Finance Entry'}
        size="md"
      >
        <form onSubmit={handleTxSubmit} className="space-y-4">
          {/* Type selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Type
            </label>
            <div className="flex gap-2">
              {(['income', 'fixed', 'variable'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    const cats = t === 'income'
                      ? FINANCE_INCOME_CATEGORIES
                      : t === 'fixed'
                      ? FINANCE_FIXED_CATEGORIES
                      : FINANCE_VARIABLE_CATEGORIES;
                    setTxModal((s) => ({
                      ...s,
                      data: {
                        ...s.data,
                        type: t,
                        category: cats[0]?.id || '',
                      },
                    }));
                  }}
                  className={cn(
                    'flex-1 py-2 rounded-xl text-sm font-medium capitalize transition-colors border',
                    txModal.data.type === t
                      ? t === 'income'
                        ? 'bg-green-100 dark:bg-green-900/30 border-green-400 text-green-700 dark:text-green-300'
                        : t === 'fixed'
                        ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-400 text-blue-700 dark:text-blue-300'
                        : 'bg-orange-100 dark:bg-orange-900/30 border-orange-400 text-orange-700 dark:text-orange-300'
                      : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                  )}
                >
                  {t === 'income' ? '↑ Income' : t === 'fixed' ? '📌 Fixed' : '🔄 Variable'}
                </button>
              ))}
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Category
            </label>
            <select
              value={txModal.data.category}
              onChange={(e) =>
                setTxModal((s) => ({ ...s, data: { ...s.data, category: e.target.value } }))
              }
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-800 dark:text-gray-200 outline-none focus:border-indigo-500 transition-colors"
            >
              {formCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Description
            </label>
            <input
              type="text"
              value={txModal.data.description}
              onChange={(e) =>
                setTxModal((s) => ({ ...s, data: { ...s.data, description: e.target.value } }))
              }
              placeholder="e.g. Monthly salary, Water bill..."
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-800 dark:text-gray-200 outline-none focus:border-indigo-500 transition-colors"
              required
            />
          </div>

          {/* Amount + Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Amount ({CURRENCY})
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={txModal.data.amount || ''}
                onChange={(e) =>
                  setTxModal((s) => ({
                    ...s,
                    data: { ...s.data, amount: parseFloat(e.target.value) || 0 },
                  }))
                }
                placeholder="0.00"
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-800 dark:text-gray-200 outline-none focus:border-indigo-500 transition-colors"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Date
              </label>
              <input
                type="date"
                value={new Date(txModal.data.date || Date.now()).toISOString().split('T')[0]}
                onChange={(e) =>
                  setTxModal((s) => ({
                    ...s,
                    data: { ...s.data, date: new Date(e.target.value).getTime() },
                  }))
                }
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-800 dark:text-gray-200 outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          {/* Recurring */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={txModal.data.recurring}
              onChange={(e) =>
                setTxModal((s) => ({ ...s, data: { ...s.data, recurring: e.target.checked } }))
              }
              className="w-4 h-4 accent-indigo-600"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
              <Repeat size={14} className="text-gray-400" />
              Recurring monthly
            </span>
          </label>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Notes <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={txModal.data.notes || ''}
              onChange={(e) =>
                setTxModal((s) => ({ ...s, data: { ...s.data, notes: e.target.value } }))
              }
              rows={2}
              placeholder="Any additional notes..."
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-800 dark:text-gray-200 outline-none focus:border-indigo-500 transition-colors resize-none"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => setTxModal((s) => ({ ...s, open: false }))}
              className="flex-1 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              {txModal.mode === 'add' ? 'Add Entry' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Budget Plan Modal */}
      <Modal
        isOpen={planModal}
        onClose={() => setPlanModal(false)}
        title={`Budget Plan — ${MONTHS[viewMonth - 1]} ${viewYear}`}
        size="lg"
      >
        <form onSubmit={handlePlanSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Income Goal ({CURRENCY})
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={planIncomeGoal}
                onChange={(e) => setPlanIncomeGoal(e.target.value)}
                placeholder="e.g. 25000"
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Savings Goal ({CURRENCY})
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={planSavingsGoal}
                onChange={(e) => setPlanSavingsGoal(e.target.value)}
                placeholder="e.g. 3000"
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          {/* Fixed category targets */}
          <div>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
              <Receipt size={14} className="text-blue-500" />
              Fixed Cost Targets
            </p>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {FINANCE_FIXED_CATEGORIES.map((cat) => (
                <div key={cat.id} className="flex items-center gap-3">
                  <span className="w-6 text-center text-base">{cat.icon}</span>
                  <span className="flex-1 text-sm text-gray-700 dark:text-gray-300">
                    {cat.label.replace(/^.\s/, '')}
                  </span>
                  <div className="relative w-32">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">{CURRENCY}</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={planTargets[cat.id] || ''}
                      onChange={(e) =>
                        setPlanTargets({ ...planTargets, [cat.id]: e.target.value })
                      }
                      placeholder="0.00"
                      className="w-full pl-8 pr-2 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-right outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Variable category targets */}
          <div>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
              <ArrowDownCircle size={14} className="text-orange-500" />
              Variable Cost Targets
            </p>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {FINANCE_VARIABLE_CATEGORIES.map((cat) => (
                <div key={cat.id} className="flex items-center gap-3">
                  <span className="w-6 text-center text-base">{cat.icon}</span>
                  <span className="flex-1 text-sm text-gray-700 dark:text-gray-300">
                    {cat.label.replace(/^.\s/, '')}
                  </span>
                  <div className="relative w-32">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">{CURRENCY}</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={planTargets[cat.id] || ''}
                      onChange={(e) =>
                        setPlanTargets({ ...planTargets, [cat.id]: e.target.value })
                      }
                      placeholder="0.00"
                      className="w-full pl-8 pr-2 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-right outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => setPlanModal(false)}
              className="flex-1 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              Save Budget Plan
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

// ── Overview Tab ─────────────────────────────────────────────
interface OverviewProps {
  totalIncome: number;
  totalFixed: number;
  totalAllVariable: number;
  totalExpenses: number;
  netSavings: number;
  grocerySpent: number;
  monthTx: FinanceTransaction[];
  currentPlan: any;
  onEdit: (tx: FinanceTransaction) => void;
  onDelete: (id: string) => void;
}

const OverviewTab: React.FC<OverviewProps> = ({
  totalIncome, totalFixed, totalAllVariable, totalExpenses,
  netSavings, grocerySpent, monthTx, currentPlan, onEdit, onDelete,
}) => {
  const savingsRate = totalIncome > 0 ? Math.round((Math.max(0, netSavings) / totalIncome) * 100) : 0;
  const recentTx = [...monthTx].sort((a, b) => b.date - a.date).slice(0, 8);

  return (
    <div className="space-y-5">
      {/* ── Total Expenses Card ─────────────────────────────── */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
          <Receipt size={15} className="text-rose-500" />
          <h2 className="font-semibold text-gray-800 dark:text-gray-200 text-sm">Total Monthly Expenses</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-gray-100 dark:divide-gray-800">
          {/* Fixed */}
          <div className="p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-xs text-gray-500 font-medium">Fixed</span>
            </div>
            <p className="text-lg font-bold text-gray-900 dark:text-white">{formatPrice(totalFixed)}</p>
            <p className="text-xs text-gray-400 mt-0.5">Rent, insurance…</p>
          </div>
          {/* Variable */}
          <div className="p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-2 h-2 rounded-full bg-orange-500" />
              <span className="text-xs text-gray-500 font-medium">Variable</span>
            </div>
            <p className="text-lg font-bold text-gray-900 dark:text-white">{formatPrice(totalAllVariable)}</p>
            {grocerySpent > 0 && (
              <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">+{formatPrice(grocerySpent)} groceries</p>
            )}
          </div>
          {/* Net Savings */}
          <div className="p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <span className={cn('w-2 h-2 rounded-full', netSavings >= 0 ? 'bg-green-500' : 'bg-red-500')} />
              <span className="text-xs text-gray-500 font-medium">{netSavings >= 0 ? 'Surplus' : 'Deficit'}</span>
            </div>
            <p className={cn('text-lg font-bold', netSavings >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400')}>
              {formatPrice(Math.abs(netSavings))}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">Income − Expenses</p>
          </div>
          {/* Total Out */}
          <div className="p-4 bg-rose-50 dark:bg-rose-900/10">
            <div className="flex items-center gap-1.5 mb-1">
              <ArrowDownCircle size={12} className="text-rose-500" />
              <span className="text-xs text-rose-600 dark:text-rose-400 font-medium">Total Out</span>
            </div>
            <p className="text-lg font-bold text-rose-600 dark:text-rose-400">{formatPrice(totalExpenses)}</p>
            <p className="text-xs text-gray-400 mt-0.5">All expenses combined</p>
          </div>
        </div>
      </div>

      {/* Cash Flow Progress */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 space-y-4">
        <h2 className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
          <BarChart2 size={16} className="text-indigo-500" /> Monthly Cash Flow
        </h2>

        {totalIncome === 0 && totalExpenses === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">
            No entries for this month yet. Add income or expense entries using the "Add Entry" button.
          </p>
        ) : (
          <>
            {/* Income bar */}
            <CashFlowBar
              label="Income"
              actual={totalIncome}
              goal={currentPlan?.incomeGoal}
              color="#22c55e"
            />
            {/* Fixed costs bar */}
            <CashFlowBar
              label="Fixed Costs"
              actual={totalFixed}
              goal={currentPlan ? (currentPlan.categoryTargets
                .filter((t: FinanceCategoryTarget) => t.type === 'fixed')
                .reduce((s: number, t: FinanceCategoryTarget) => s + t.targetAmount, 0)) : undefined}
              color="#3b82f6"
              isExpense
            />
            {/* Variable costs bar */}
            <CashFlowBar
              label={`Variable Costs${grocerySpent > 0 ? ` (incl. groceries)` : ''}`}
              actual={totalAllVariable}
              goal={currentPlan ? (currentPlan.categoryTargets
                .filter((t: FinanceCategoryTarget) => t.type === 'variable')
                .reduce((s: number, t: FinanceCategoryTarget) => s + t.targetAmount, 0)) : undefined}
              color="#f97316"
              isExpense
            />

            {/* Savings rate */}
            {totalIncome > 0 && (
              <div className="flex items-center justify-between py-2 border-t border-gray-100 dark:border-gray-800 mt-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">Savings Rate</span>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    'text-sm font-bold',
                    savingsRate >= 20 ? 'text-green-600' : savingsRate >= 10 ? 'text-yellow-600' : 'text-red-500'
                  )}>
                    {savingsRate}%
                  </span>
                  {savingsRate >= 20
                    ? <TrendingUp size={14} className="text-green-500" />
                    : <TrendingDown size={14} className="text-red-500" />}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Recent Transactions */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800 dark:text-gray-200">Recent Entries</h2>
          <span className="text-xs text-gray-400">{monthTx.length} this month</span>
        </div>
        {recentTx.length === 0 ? (
          <div className="p-8 text-center">
            <ClipboardList size={32} className="mx-auto text-gray-300 dark:text-gray-700 mb-2" />
            <p className="text-sm text-gray-400">No entries yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {recentTx.map((tx) => (
              <TxRow key={tx.id} tx={tx} onEdit={onEdit} onDelete={onDelete} />
            ))}
          </div>
        )}
      </div>

      {/* Grocery integration notice */}
      {grocerySpent > 0 && (
        <div className="flex items-start gap-3 bg-brand-50 dark:bg-brand-900/10 border border-brand-200 dark:border-brand-800/30 rounded-xl p-4">
          <ShoppingCart size={16} className="text-brand-500 mt-0.5 shrink-0" />
          <p className="text-sm text-brand-700 dark:text-brand-300">
            <strong>{formatPrice(grocerySpent)}</strong> in grocery spending from your shopping trips is automatically included in Variable Costs for this month.
          </p>
        </div>
      )}
    </div>
  );
};

// ── Cash Flow Bar Component ───────────────────────────────────
const CashFlowBar: React.FC<{
  label: string;
  actual: number;
  goal?: number;
  color: string;
  isExpense?: boolean;
}> = ({ label, actual, goal, color, isExpense }) => {
  const p = goal ? pct(actual, goal) : 0;
  const overBudget = isExpense && goal && actual > goal;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600 dark:text-gray-400">{label}</span>
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-800 dark:text-gray-200">{formatPrice(actual)}</span>
          {goal ? (
            <span className={cn(
              'text-xs px-1.5 py-0.5 rounded-full font-bold',
              overBudget
                ? 'bg-red-100 dark:bg-red-900/30 text-red-600'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
            )}>
              {p}%{goal ? ` of ${formatPrice(goal)}` : ''}
            </span>
          ) : null}
        </div>
      </div>
      {goal ? (
        <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(p, 100)}%` }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className="h-full rounded-full"
            style={{ backgroundColor: isExpense ? barColor(actual, goal) : color }}
          />
        </div>
      ) : (
        <div className="h-1 rounded-full" style={{ backgroundColor: `${color}30` }} />
      )}
    </div>
  );
};

// ── Transaction List Tab ──────────────────────────────────────
interface TransactionTabProps {
  title: string;
  color: 'green' | 'blue' | 'orange';
  txList: FinanceTransaction[];
  type: FinanceTransactionType;
  total: number;
  onAdd: () => void;
  onEdit: (tx: FinanceTransaction) => void;
  onDelete: (id: string) => void;
  currentPlan: any;
}

const colorMap = {
  green:  { bg: 'bg-green-50 dark:bg-green-900/10',  border: 'border-green-200 dark:border-green-800/30', text: 'text-green-700 dark:text-green-400' },
  blue:   { bg: 'bg-blue-50 dark:bg-blue-900/10',    border: 'border-blue-200 dark:border-blue-800/30',   text: 'text-blue-700 dark:text-blue-400' },
  orange: { bg: 'bg-orange-50 dark:bg-orange-900/10', border: 'border-orange-200 dark:border-orange-800/30', text: 'text-orange-700 dark:text-orange-400' },
};

const TransactionTab: React.FC<TransactionTabProps> = ({
  title, color, txList, type, total, onAdd, onEdit, onDelete, currentPlan,
}) => {
  const c = colorMap[color];
  const planTarget = currentPlan?.categoryTargets
    ?.filter((t: FinanceCategoryTarget) => t.type === type || type === 'income')
    ?.reduce((s: number, t: FinanceCategoryTarget) => s + t.targetAmount, 0) ?? 0;

  // Group by category
  const groups = useMemo(() => {
    const map = new Map<string, { total: number; items: FinanceTransaction[] }>();
    txList.forEach((tx) => {
      const entry = map.get(tx.category) || { total: 0, items: [] };
      entry.total += tx.amount;
      entry.items.push(tx);
      map.set(tx.category, entry);
    });
    return Array.from(map.entries()).sort((a, b) => b[1].total - a[1].total);
  }, [txList]);

  return (
    <div className="space-y-4">
      {/* Total card */}
      <div className={cn('rounded-2xl border p-5 flex items-center justify-between', c.bg, c.border)}>
        <div>
          <p className="text-sm text-gray-500">{title} This Month</p>
          <p className={cn('text-3xl font-bold mt-0.5', c.text)}>{formatPrice(total)}</p>
          {planTarget > 0 && (
            <p className="text-xs text-gray-400 mt-1">
              Target: {formatPrice(planTarget)} | {pct(total, planTarget)}% used
            </p>
          )}
        </div>
        <button
          onClick={onAdd}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 transition-colors shadow-sm"
        >
          <Plus size={15} /> Add {title === 'Income' ? 'Income' : 'Expense'}
        </button>
      </div>

      {/* Grouped entries */}
      {groups.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-10 text-center">
          <ClipboardList size={32} className="mx-auto text-gray-300 dark:text-gray-700 mb-2" />
          <p className="text-sm text-gray-400 mb-3">No {title.toLowerCase()} entries this month</p>
          <button
            onClick={onAdd}
            className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            <span className="flex items-center gap-1.5"><Plus size={14} /> Add Entry</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map(([catId, { total: catTotal, items }]) => (
            <div
              key={catId}
              className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden"
            >
              <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/40 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base">{getCategoryIcon(type, catId)}</span>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {getCategoryLabel(type, catId)}
                  </span>
                  <span className="text-xs text-gray-400">({items.length})</span>
                </div>
                <span className="text-sm font-bold text-gray-800 dark:text-gray-200">
                  {formatPrice(catTotal)}
                </span>
              </div>
              <div className="divide-y divide-gray-50 dark:divide-gray-800">
                {items.sort((a, b) => b.date - a.date).map((tx) => (
                  <TxRow key={tx.id} tx={tx} onEdit={onEdit} onDelete={onDelete} compact />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Variable Costs Tab ────────────────────────────────────────
interface VariableTabProps {
  txList: FinanceTransaction[];
  totalVariable: number;
  grocerySpent: number;
  onAdd: () => void;
  onEdit: (tx: FinanceTransaction) => void;
  onDelete: (id: string) => void;
  currentPlan: any;
}

const VariableTab: React.FC<VariableTabProps> = ({
  txList, totalVariable, grocerySpent, onAdd, onEdit, onDelete, currentPlan,
}) => {
  const totalAll = totalVariable + grocerySpent;
  const planTarget = currentPlan?.categoryTargets
    ?.filter((t: FinanceCategoryTarget) => t.type === 'variable')
    ?.reduce((s: number, t: FinanceCategoryTarget) => s + t.targetAmount, 0) ?? 0;

  const groups = useMemo(() => {
    const map = new Map<string, { total: number; items: FinanceTransaction[] }>();
    txList.forEach((tx) => {
      const entry = map.get(tx.category) || { total: 0, items: [] };
      entry.total += tx.amount;
      entry.items.push(tx);
      map.set(tx.category, entry);
    });
    return Array.from(map.entries()).sort((a, b) => b[1].total - a[1].total);
  }, [txList]);

  return (
    <div className="space-y-4">
      {/* Total card */}
      <div className="rounded-2xl border bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800/30 p-5 flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">Variable Costs This Month</p>
          <p className="text-3xl font-bold text-orange-600 dark:text-orange-400 mt-0.5">
            {formatPrice(totalAll)}
          </p>
          {planTarget > 0 && (
            <p className="text-xs text-gray-400 mt-1">
              Target: {formatPrice(planTarget)} | {pct(totalAll, planTarget)}% used
            </p>
          )}
        </div>
        <button
          onClick={onAdd}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 transition-colors shadow-sm"
        >
          <Plus size={15} /> Add Expense
        </button>
      </div>

      {/* Grocery auto-row */}
      {grocerySpent > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/40 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base">🛒</span>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Groceries</span>
              <span className="text-xs bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 px-1.5 py-0.5 rounded-full">
                Auto from trips
              </span>
            </div>
            <span className="text-sm font-bold text-gray-800 dark:text-gray-200">
              {formatPrice(grocerySpent)}
            </span>
          </div>
          <div className="px-4 py-3">
            <p className="text-xs text-gray-400">
              Automatically calculated from your completed shopping trips this month. Manage grocery trips on the Shopping Trips page.
            </p>
          </div>
        </div>
      )}

      {/* Grouped manual variable entries */}
      {groups.length === 0 && grocerySpent === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-10 text-center">
          <ClipboardList size={32} className="mx-auto text-gray-300 dark:text-gray-700 mb-2" />
          <p className="text-sm text-gray-400 mb-3">No variable expenses this month</p>
          <button
            onClick={onAdd}
            className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            <span className="flex items-center gap-1.5"><Plus size={14} /> Add Expense</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map(([catId, { total: catTotal, items }]) => (
            <div
              key={catId}
              className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden"
            >
              <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/40 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base">{getCategoryIcon('variable', catId)}</span>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {getCategoryLabel('variable', catId)}
                  </span>
                  <span className="text-xs text-gray-400">({items.length})</span>
                </div>
                <span className="text-sm font-bold text-gray-800 dark:text-gray-200">
                  {formatPrice(catTotal)}
                </span>
              </div>
              <div className="divide-y divide-gray-50 dark:divide-gray-800">
                {items.sort((a, b) => b.date - a.date).map((tx) => (
                  <TxRow key={tx.id} tx={tx} onEdit={onEdit} onDelete={onDelete} compact />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Budget Plan Tab ───────────────────────────────────────────
interface PlanTabProps {
  currentPlan: any;
  totalIncome: number;
  totalFixed: number;
  totalAllVariable: number;
  netSavings: number;
  fixedTx: FinanceTransaction[];
  varTx: FinanceTransaction[];
  grocerySpent: number;
  onOpenPlan: () => void;
  month: number;
  year: number;
}

const PlanTab: React.FC<PlanTabProps> = ({
  currentPlan, totalIncome, totalFixed, totalAllVariable, netSavings,
  fixedTx, varTx, grocerySpent, onOpenPlan, month, year,
}) => {
  if (!currentPlan) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-12 text-center">
        <Target size={44} className="mx-auto text-gray-300 dark:text-gray-700 mb-3" />
        <p className="text-gray-600 dark:text-gray-400 font-medium mb-1">No budget plan set for {MONTHS[month - 1]}</p>
        <p className="text-gray-400 text-sm mb-5">Set income goals, expense targets and savings goals</p>
        <button
          onClick={onOpenPlan}
          className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          Set Budget Plan
        </button>
      </div>
    );
  }

  const allCats = [...FINANCE_FIXED_CATEGORIES, ...FINANCE_VARIABLE_CATEGORIES];

  // Compute actual spending per category
  const actualByCat = new Map<string, number>();
  fixedTx.forEach((tx) => {
    actualByCat.set(tx.category, (actualByCat.get(tx.category) || 0) + tx.amount);
  });
  varTx.forEach((tx) => {
    actualByCat.set(tx.category, (actualByCat.get(tx.category) || 0) + tx.amount);
  });
  // Add groceries to auto category (not in plan categories, but shown separately)
  const autoGroceries = grocerySpent;

  return (
    <div className="space-y-5">
      {/* Plan summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
          <p className="text-xs text-gray-500 mb-1">Income Goal</p>
          <p className="text-xl font-bold text-green-600 dark:text-green-400">{formatPrice(currentPlan.incomeGoal)}</p>
          <p className="text-xs text-gray-400 mt-1">Actual: {formatPrice(totalIncome)}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
          <p className="text-xs text-gray-500 mb-1">Savings Goal</p>
          <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400">{formatPrice(currentPlan.savingsGoal)}</p>
          <p className={cn(
            'text-xs mt-1',
            netSavings >= currentPlan.savingsGoal ? 'text-green-500' : 'text-orange-500'
          )}>
            Actual: {formatPrice(Math.max(0, netSavings))}
            {netSavings >= currentPlan.savingsGoal
              ? ' ✓ On track'
              : ` (${formatPrice(currentPlan.savingsGoal - netSavings)} short)`}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 mb-1">Budget Plan</p>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {MONTHS[month - 1]} {year}
            </p>
          </div>
          <button
            onClick={onOpenPlan}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl text-gray-500 transition-colors"
          >
            <Edit3 size={15} />
          </button>
        </div>
      </div>

      {/* Category targets breakdown */}
      {currentPlan.categoryTargets.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
            <h2 className="font-semibold text-gray-800 dark:text-gray-200">Actual vs Budget</h2>
          </div>
          <div className="p-5 space-y-4">
            {currentPlan.categoryTargets.map((ct: FinanceCategoryTarget) => {
              const cat = allCats.find((c) => c.id === ct.category);
              const actual = actualByCat.get(ct.category) || 0;
              const p = pct(actual, ct.targetAmount);
              const over = actual > ct.targetAmount;
              return (
                <div key={ct.category} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{cat?.icon}</span>
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {cat?.label.replace(/^.\s/, '') || ct.category}
                      </span>
                      <span className={cn(
                        'text-xs px-1.5 py-0.5 rounded-full',
                        ct.type === 'fixed'
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600'
                          : 'bg-orange-100 dark:bg-orange-900/30 text-orange-600'
                      )}>
                        {ct.type}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className={cn('text-sm font-semibold', over ? 'text-red-500' : 'text-gray-800 dark:text-gray-200')}>
                        {formatPrice(actual)}
                      </span>
                      <span className="text-xs text-gray-400 ml-1">/ {formatPrice(ct.targetAmount)}</span>
                    </div>
                  </div>
                  <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(p, 100)}%` }}
                      transition={{ duration: 0.6 }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: barColor(actual, ct.targetAmount) }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// ── Transaction Row ───────────────────────────────────────────
const TxRow: React.FC<{
  tx: FinanceTransaction;
  onEdit: (tx: FinanceTransaction) => void;
  onDelete: (id: string) => void;
  compact?: boolean;
}> = ({ tx, onEdit, onDelete, compact }) => {
  const typeColors = {
    income:   'text-green-600 dark:text-green-400',
    fixed:    'text-blue-600 dark:text-blue-400',
    variable: 'text-orange-600 dark:text-orange-400',
  };
  const dateFmt = new Date(tx.date).toLocaleDateString('en-NA', {
    day: 'numeric', month: 'short',
  });

  return (
    <div className={cn('flex items-center gap-3 group', compact ? 'px-4 py-2.5' : 'px-5 py-3')}>
      <span className="text-lg shrink-0">{getCategoryIcon(tx.type, tx.category)}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
          {tx.description || getCategoryLabel(tx.type, tx.category)}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-xs text-gray-400">{dateFmt}</span>
          {tx.recurring && (
            <span className="text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
              <Repeat size={9} /> recurring
            </span>
          )}
        </div>
      </div>
      <span className={cn('text-sm font-bold shrink-0', typeColors[tx.type])}>
        {tx.type === 'income' ? '+' : '-'}{formatPrice(tx.amount)}
      </span>
      <div className="flex gap-1 shrink-0">
        <button
          onClick={() => onEdit(tx)}
          className="p-1.5 text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
        >
          <Edit3 size={13} />
        </button>
        <button
          onClick={() => {
            if (confirm('Delete this entry?')) onDelete(tx.id);
          }}
          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
};

export default Finance;
