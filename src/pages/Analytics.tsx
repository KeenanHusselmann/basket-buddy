// ==========================================
// BasketBuddy - Analytics Dashboard
// Overview | Finance | Grocery | Fuel tabs
// ==========================================

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3, TrendingUp, TrendingDown, Wallet, Fuel,
  ShoppingCart, PiggyBank, Target, Calendar, ChevronLeft, ChevronRight,
  DollarSign, Package, ArrowUpCircle, ArrowDownCircle, Droplets, Zap,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Area, AreaChart, Legend,
} from 'recharts';
import { useApp } from '../contexts/AppContext';
import { useTheme } from '../contexts/ThemeContext';
import { formatPrice, cn } from '../utils/helpers';
import {
  FINANCE_INCOME_CATEGORIES,
  FINANCE_FIXED_CATEGORIES,
  FINANCE_VARIABLE_CATEGORIES,
} from '../config/constants';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const ALL_FINANCE_CATS = [...FINANCE_INCOME_CATEGORIES, ...FINANCE_FIXED_CATEGORIES, ...FINANCE_VARIABLE_CATEGORIES];

// ── Stat Card ─────────────────────────────────────────────────
const StatCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  bg: string;
  delay?: number;
}> = ({ icon, label, value, sub, bg, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5"
  >
    <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center mb-3', bg)}>
      {icon}
    </div>
    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</p>
    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5 truncate">{value}</p>
    {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
  </motion.div>
);

const Analytics: React.FC = () => {
  const {
    trips, categories, stores, items,
    transactions, financePlans, savingsGoals, fuelFillups,
  } = useApp();
  const { isDark } = useTheme();
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [activeTab, setActiveTab] = useState<'overview' | 'finance' | 'grocery' | 'fuel'>('overview');

  // ── Shared helpers ─────────────────────────────────────────
  const tooltipStyle = {
    contentStyle: {
      backgroundColor: isDark ? '#1f2937' : '#ffffff',
      border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
      borderRadius: '12px',
      fontSize: '12px',
    },
    labelStyle: { color: isDark ? '#9ca3af' : '#6b7280' },
  };
  const gridColor = isDark ? '#374151' : '#f3f4f6';
  const textColor = isDark ? '#9ca3af' : '#6b7280';

  const getCatLabel = (id: string, customCats?: { id: string; label: string }[]) =>
    customCats?.find((c) => c.id === id)?.label ||
    ALL_FINANCE_CATS.find((c) => c.id === id)?.label ||
    id;

  const getCatIcon = (id: string, customCats?: { id: string; icon: string }[]) =>
    customCats?.find((c) => c.id === id)?.icon ||
    ALL_FINANCE_CATS.find((c) => c.id === id)?.icon ||
    '💰';

  // ── Grocery ────────────────────────────────────────────────
  const completedTrips = useMemo(() => trips.filter((t) => t.status === 'completed'), [trips]);
  const yearTrips = useMemo(
    () => completedTrips.filter((t) => new Date(t.date).getFullYear() === viewYear),
    [completedTrips, viewYear],
  );
  const totalGroceryYTD = yearTrips.reduce((s, t) => s + t.totalSpent, 0);
  const totalTripsYTD = yearTrips.length;

  const monthlyGrocery = useMemo(() => {
    const months = MONTH_NAMES.map((month) => ({ month, spent: 0, trips: 0 }));
    yearTrips.forEach((t) => {
      const i = new Date(t.date).getMonth();
      months[i].spent += t.totalSpent;
      months[i].trips += 1;
    });
    return months;
  }, [yearTrips]);

  const groceryCategoryBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    yearTrips.forEach((t) =>
      t.items.forEach((item) => {
        const val = (item.actualPrice || item.estimatedPrice) * item.quantity;
        map.set(item.categoryId, (map.get(item.categoryId) || 0) + val);
      }),
    );
    return Array.from(map.entries())
      .map(([catId, amount]) => {
        const cat = categories.find((c) => c.id === catId);
        return { name: cat?.name || catId, value: amount, color: cat?.color || '#999', icon: cat?.icon || '📦' };
      })
      .sort((a, b) => b.value - a.value);
  }, [yearTrips, categories]);

  const storeBreakdown = useMemo(() => {
    const map = new Map<string, { spent: number; trips: number }>();
    yearTrips.forEach((t) => {
      const prev = map.get(t.storeId) || { spent: 0, trips: 0 };
      map.set(t.storeId, { spent: prev.spent + t.totalSpent, trips: prev.trips + 1 });
    });
    return Array.from(map.entries())
      .map(([storeId, data]) => {
        const store = stores.find((s) => s.id === storeId);
        return { name: store?.name || storeId, color: store?.color || '#999', ...data };
      })
      .sort((a, b) => b.spent - a.spent);
  }, [yearTrips, stores]);

  const groceryTrend6 = useMemo(() =>
    Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const mTrips = completedTrips.filter((t) => {
        const td = new Date(t.date);
        return td.getMonth() === d.getMonth() && td.getFullYear() === d.getFullYear();
      });
      return {
        month: d.toLocaleDateString('en-NA', { month: 'short' }),
        amount: mTrips.reduce((s, t) => s + t.totalSpent, 0),
      };
    }),
    [completedTrips],
  );

  // ── Finance ────────────────────────────────────────────────
  const yearTx = useMemo(() => transactions.filter((t) => t.year === viewYear), [transactions, viewYear]);

  const monthlyFinance = useMemo(() =>
    MONTH_NAMES.map((month, i) => {
      const mTx = yearTx.filter((t) => t.month === i + 1);
      const income   = mTx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const fixed    = mTx.filter((t) => t.type === 'fixed').reduce((s, t) => s + t.amount, 0);
      const variable = mTx.filter((t) => t.type === 'variable').reduce((s, t) => s + t.amount, 0);
      return { month, income, fixed, variable, expenses: fixed + variable, net: income - fixed - variable };
    }),
    [yearTx],
  );

  const totalIncome   = monthlyFinance.reduce((s, m) => s + m.income, 0);
  const totalExpenses = monthlyFinance.reduce((s, m) => s + m.expenses, 0);
  const netSavings    = totalIncome - totalExpenses;
  const savingsRate   = totalIncome > 0 ? Math.round((netSavings / totalIncome) * 100) : 0;

  const yearCustomCats = useMemo(
    () => financePlans.filter((p) => p.year === viewYear).flatMap((p) => p.customCategories || []),
    [financePlans, viewYear],
  );

  const categoryExpenses = useMemo(() => {
    const map = new Map<string, number>();
    yearTx.filter((t) => t.type !== 'income').forEach((t) =>
      map.set(t.category, (map.get(t.category) || 0) + t.amount),
    );
    return Array.from(map.entries())
      .map(([id, amount]) => ({ id, name: getCatLabel(id, yearCustomCats), icon: getCatIcon(id, yearCustomCats), amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [yearTx, yearCustomCats]);

  const budgetVsActual = useMemo(() => {
    const targets = new Map<string, number>();
    financePlans
      .filter((p) => p.year === viewYear)
      .forEach((p) =>
        p.categoryTargets.forEach((ct) =>
          targets.set(ct.category, (targets.get(ct.category) || 0) + ct.targetAmount),
        ),
      );
    return Array.from(targets.entries())
      .map(([id, target]) => ({
        id,
        name: getCatLabel(id, yearCustomCats),
        icon: getCatIcon(id, yearCustomCats),
        target,
        actual: categoryExpenses.find((c) => c.id === id)?.amount || 0,
      }))
      .sort((a, b) => b.target - a.target)
      .slice(0, 12);
  }, [financePlans, viewYear, categoryExpenses, yearCustomCats]);

  // ── Fuel ───────────────────────────────────────────────────
  const yearFuel = useMemo(
    () => fuelFillups.filter((f) => new Date(f.date).getFullYear() === viewYear),
    [fuelFillups, viewYear],
  );
  const totalFuelCost    = yearFuel.reduce((s, f) => s + f.totalCost, 0);
  const totalFuelLitres  = yearFuel.reduce((s, f) => s + f.litres, 0);
  const avgPricePerLitre = totalFuelLitres > 0 ? totalFuelCost / totalFuelLitres : 0;

  const monthlyFuel = useMemo(() => {
    const months = MONTH_NAMES.map((month) => ({ month, cost: 0, litres: 0 }));
    yearFuel.forEach((f) => {
      const i = new Date(f.date).getMonth();
      months[i].cost   += f.totalCost;
      months[i].litres += f.litres;
    });
    return months;
  }, [yearFuel]);

  const fuelPriceTrend = useMemo(() =>
    yearFuel
      .slice()
      .sort((a, b) => a.date - b.date)
      .map((f) => ({
        date: new Date(f.date).toLocaleDateString('en-NA', { month: 'short', day: 'numeric' }),
        price: parseFloat(f.pricePerLitre.toFixed(2)),
        cost: f.totalCost,
      })),
    [yearFuel],
  );

  // ── Savings Goals ──────────────────────────────────────────
  const savingsProgress = useMemo(() =>
    savingsGoals.map((g) => ({
      ...g,
      saved: g.contributions.reduce((s, c) => s + c.amount, 0),
    })),
    [savingsGoals],
  );
  const savingsComplete = savingsProgress.filter((g) => g.saved >= g.targetAmount).length;

  // ── Tabs ───────────────────────────────────────────────────
  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: <BarChart3 size={14} /> },
    { id: 'finance'  as const, label: 'Finance',  icon: <Wallet size={14} /> },
    { id: 'grocery'  as const, label: 'Grocery',  icon: <ShoppingCart size={14} /> },
    { id: 'fuel'     as const, label: 'Fuel',     icon: <Fuel size={14} /> },
  ];

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="text-brand-500" size={24} /> Analytics
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Your complete financial picture</p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setViewYear((y) => y - 1)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <ChevronLeft size={18} className="text-gray-600 dark:text-gray-400" />
          </button>
          <span className="text-lg font-bold text-gray-800 dark:text-gray-200 min-w-[60px] text-center">{viewYear}</span>
          <button onClick={() => setViewYear((y) => y + 1)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <ChevronRight size={18} className="text-gray-600 dark:text-gray-400" />
          </button>
        </div>
      </div>

      {/* Tab nav */}
      <div className="flex gap-2 flex-wrap">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors',
              activeTab === tab.id
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800',
            )}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ══ OVERVIEW ══════════════════════════════════════════ */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard icon={<ArrowUpCircle size={17} className="text-green-600" />}  label="Total Income"    value={formatPrice(totalIncome)}    sub={`${viewYear} YTD`}              bg="bg-green-50 dark:bg-green-900/20"   delay={0}    />
            <StatCard icon={<ArrowDownCircle size={17} className="text-red-500" />}  label="Total Expenses"  value={formatPrice(totalExpenses)}  sub="Fixed + Variable"               bg="bg-red-50 dark:bg-red-900/20"       delay={0.05} />
            <StatCard icon={<PiggyBank size={17} className="text-blue-600" />}       label="Net Savings"     value={formatPrice(netSavings)}     sub={`${savingsRate}% savings rate`} bg="bg-blue-50 dark:bg-blue-900/20"     delay={0.1}  />
            <StatCard icon={<ShoppingCart size={17} className="text-orange-500" />}  label="Grocery Spend"   value={formatPrice(totalGroceryYTD)} sub={`${totalTripsYTD} trips`}      bg="bg-orange-50 dark:bg-orange-900/20" delay={0.15} />
            <StatCard icon={<Fuel size={17} className="text-purple-500" />}          label="Fuel Cost"       value={formatPrice(totalFuelCost)}  sub={`${totalFuelLitres.toFixed(1)} L total`} bg="bg-purple-50 dark:bg-purple-900/20" delay={0.2} />
            <StatCard icon={<Target size={17} className="text-amber-500" />}         label="Savings Goals"   value={`${savingsComplete} / ${savingsProgress.length}`} sub="completed" bg="bg-amber-50 dark:bg-amber-900/20"   delay={0.25} />
          </div>

          {(totalIncome > 0 || totalExpenses > 0) && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
              <h2 className="font-semibold text-gray-800 dark:text-gray-200">Income vs Expenses</h2>
              <p className="text-xs text-gray-400 mb-4">Monthly comparison — {viewYear}</p>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyFinance} barGap={3} barCategoryGap="22%">
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis dataKey="month" tick={{ fill: textColor, fontSize: 11 }} />
                  <YAxis tick={{ fill: textColor, fontSize: 11 }} tickFormatter={(v) => `N$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip {...tooltipStyle} formatter={(v: number, name: string) => [formatPrice(v), name === 'income' ? 'Income' : 'Expenses']} />
                  <Legend formatter={(v) => <span style={{ color: textColor, fontSize: 12 }}>{v === 'income' ? 'Income' : 'Expenses'}</span>} />
                  <Bar dataKey="income"   name="income"   fill="#22c55e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" name="expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {monthlyFinance.some((m) => m.income > 0) && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
              <h2 className="font-semibold text-gray-800 dark:text-gray-200">Monthly Net Position</h2>
              <p className="text-xs text-gray-400 mb-4">Income minus expenses per month</p>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={monthlyFinance}>
                  <defs>
                    <linearGradient id="netGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis dataKey="month" tick={{ fill: textColor, fontSize: 11 }} />
                  <YAxis tick={{ fill: textColor, fontSize: 11 }} tickFormatter={(v) => `N$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip {...tooltipStyle} formatter={(v: number) => [formatPrice(v), 'Net']} />
                  <Area type="monotone" dataKey="net" stroke="#22c55e" strokeWidth={2} fill="url(#netGrad)" dot={{ r: 3, fill: '#22c55e' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {savingsProgress.length > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
              <h2 className="font-semibold text-gray-800 dark:text-gray-200 mb-5">Savings Goals</h2>
              <div className="space-y-5">
                {savingsProgress.map((g, idx) => {
                  const pct  = g.targetAmount > 0 ? Math.min(Math.round((g.saved / g.targetAmount) * 100), 100) : 0;
                  const done = g.saved >= g.targetAmount;
                  return (
                    <div key={g.id}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{g.emoji}</span>
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{g.name}</span>
                          {done && <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-1.5 py-0.5 rounded-full font-medium">Complete!</span>}
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-bold text-gray-800 dark:text-gray-200">{formatPrice(g.saved)}</span>
                          <span className="text-xs text-gray-400"> / {formatPrice(g.targetAmount)}</span>
                        </div>
                      </div>
                      <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.7, delay: idx * 0.05 }}
                          className="h-full rounded-full"
                          style={{ backgroundColor: done ? '#22c55e' : '#6366f1' }}
                        />
                      </div>
                      <div className="flex items-center justify-between mt-1 text-xs text-gray-400">
                        <span>{pct}% saved</span>
                        {g.deadline && <span>Due {new Date(g.deadline).toLocaleDateString('en-NA', { month: 'short', year: 'numeric' })}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══ FINANCE ═══════════════════════════════════════════ */}
      {activeTab === 'finance' && (
        <div className="space-y-6">
          {transactions.length === 0 ? (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-12 text-center">
              <Wallet className="mx-auto text-gray-300 dark:text-gray-700 mb-3" size={48} />
              <p className="text-gray-500 font-medium mb-1">No finance data for {viewYear}</p>
              <p className="text-gray-400 text-sm">Add transactions on the Finance page to see insights</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={<ArrowUpCircle size={17} className="text-green-600" />}  label="Income"       value={formatPrice(totalIncome)}   bg="bg-green-50 dark:bg-green-900/20"   />
                <StatCard icon={<ArrowDownCircle size={17} className="text-red-500" />}  label="Expenses"     value={formatPrice(totalExpenses)} bg="bg-red-50 dark:bg-red-900/20"       delay={0.05} />
                <StatCard icon={<PiggyBank size={17} className="text-blue-600" />}       label="Saved"        value={formatPrice(netSavings)}    bg="bg-blue-50 dark:bg-blue-900/20"     delay={0.1}  />
                <StatCard
                  icon={savingsRate >= 0 ? <TrendingUp size={17} className="text-indigo-600" /> : <TrendingDown size={17} className="text-red-500" />}
                  label="Savings Rate" value={`${savingsRate}%`} sub="of income saved"
                  bg="bg-indigo-50 dark:bg-indigo-900/20" delay={0.15}
                />
              </div>

              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
                <h2 className="font-semibold text-gray-800 dark:text-gray-200">Monthly Breakdown</h2>
                <p className="text-xs text-gray-400 mb-4">Income, fixed and variable costs per month</p>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={monthlyFinance} barGap={2} barCategoryGap="20%">
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                    <XAxis dataKey="month" tick={{ fill: textColor, fontSize: 11 }} />
                    <YAxis tick={{ fill: textColor, fontSize: 11 }} tickFormatter={(v) => `N$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip {...tooltipStyle} formatter={(v: number, name: string) => [formatPrice(v), name === 'income' ? 'Income' : name === 'fixed' ? 'Fixed' : 'Variable']} />
                    <Legend formatter={(v) => <span style={{ color: textColor, fontSize: 12 }}>{v === 'income' ? 'Income' : v === 'fixed' ? 'Fixed' : 'Variable'}</span>} />
                    <Bar dataKey="income"   fill="#22c55e" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="fixed"    fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="variable" fill="#f97316" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {budgetVsActual.length > 0 && (
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
                  <h2 className="font-semibold text-gray-800 dark:text-gray-200">Budget vs Actual</h2>
                  <p className="text-xs text-gray-400 mb-5">Year-to-date planned targets vs actual spend</p>
                  <div className="space-y-5">
                    {budgetVsActual.map((cat, idx) => {
                      const pct  = cat.target > 0 ? Math.min(Math.round((cat.actual / cat.target) * 100), 100) : 0;
                      const over = cat.actual > cat.target;
                      return (
                        <div key={cat.id}>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                              <span>{cat.icon}</span> {cat.name}
                            </span>
                            <div className="flex items-center gap-3 shrink-0">
                              <span className="text-xs text-gray-400">Budget {formatPrice(cat.target)}</span>
                              <span className={cn('text-sm font-bold', over ? 'text-red-500' : 'text-gray-800 dark:text-gray-200')}>
                                {formatPrice(cat.actual)}
                              </span>
                            </div>
                          </div>
                          <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.5, delay: idx * 0.04 }}
                              className="h-full rounded-full"
                              style={{ backgroundColor: over ? '#ef4444' : '#3b82f6' }}
                            />
                          </div>
                          <p className="text-xs text-gray-400 mt-1">
                            {over
                              ? `⚠️ Over budget by ${formatPrice(cat.actual - cat.target)}`
                              : `${formatPrice(cat.target - cat.actual)} remaining · ${pct}% used`}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {categoryExpenses.length > 0 && (
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
                  <h2 className="font-semibold text-gray-800 dark:text-gray-200 mb-5">Expense Breakdown</h2>
                  <div className="space-y-3">
                    {categoryExpenses.map((cat, idx) => {
                      const pct = totalExpenses > 0 ? Math.round((cat.amount / totalExpenses) * 100) : 0;
                      return (
                        <div key={cat.id} className="flex items-center gap-3">
                          <span className="text-lg w-7 shrink-0 text-center">{cat.icon}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{cat.name}</span>
                              <div className="flex items-center gap-2 shrink-0 ml-2">
                                <span className="text-xs text-gray-400">{pct}%</span>
                                <span className="text-sm font-bold text-gray-800 dark:text-gray-200">{formatPrice(cat.amount)}</span>
                              </div>
                            </div>
                            <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{ duration: 0.5, delay: idx * 0.03 }}
                                className="h-full bg-blue-500 rounded-full"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ══ GROCERY ═══════════════════════════════════════════ */}
      {activeTab === 'grocery' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={<DollarSign size={17} className="text-green-600" />}  label="Total Spent"    value={formatPrice(totalGroceryYTD)} sub={`${viewYear} YTD`} bg="bg-green-50 dark:bg-green-900/20" />
            <StatCard icon={<Calendar size={17} className="text-blue-600" />}     label="Avg Monthly"    value={formatPrice(totalGroceryYTD / Math.max(1, monthlyGrocery.filter((m) => m.spent > 0).length))} bg="bg-blue-50 dark:bg-blue-900/20" delay={0.05} />
            <StatCard icon={<ShoppingCart size={17} className="text-purple-500" />} label="Total Trips"  value={String(totalTripsYTD)} bg="bg-purple-50 dark:bg-purple-900/20" delay={0.1} />
            <StatCard icon={<Package size={17} className="text-amber-500" />}     label="Items Tracked"  value={String(items.length)} bg="bg-amber-50 dark:bg-amber-900/20" delay={0.15} />
          </div>

          {completedTrips.length === 0 ? (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-12 text-center">
              <ShoppingCart className="mx-auto text-gray-300 dark:text-gray-700 mb-3" size={48} />
              <p className="text-gray-500 font-medium mb-1">No grocery data yet</p>
              <p className="text-gray-400 text-sm">Complete shopping trips to see grocery analytics</p>
            </div>
          ) : (
            <>
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
                <h2 className="font-semibold text-gray-800 dark:text-gray-200">Monthly Grocery Spending</h2>
                <p className="text-xs text-gray-400 mb-4">{viewYear}</p>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={monthlyGrocery}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                    <XAxis dataKey="month" tick={{ fill: textColor, fontSize: 11 }} />
                    <YAxis tick={{ fill: textColor, fontSize: 11 }} tickFormatter={(v) => `N$${v}`} />
                    <Tooltip {...tooltipStyle} formatter={(v: number) => [formatPrice(v), 'Spent']} />
                    <Bar dataKey="spent" fill="#f97316" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {groceryCategoryBreakdown.length > 0 && (
                  <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
                    <h2 className="font-semibold text-gray-800 dark:text-gray-200 mb-4">By Category</h2>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie data={groceryCategoryBreakdown} cx="50%" cy="50%" innerRadius={50} outerRadius={88} paddingAngle={3} dataKey="value">
                          {groceryCategoryBreakdown.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Pie>
                        <Tooltip {...tooltipStyle} formatter={(v: number) => [formatPrice(v), 'Spent']} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-3">
                      {groceryCategoryBreakdown.slice(0, 8).map((cat) => (
                        <div key={cat.name} className="flex items-center gap-1.5 text-xs min-w-0">
                          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                          <span className="text-gray-500 dark:text-gray-400 truncate">{cat.icon} {cat.name}</span>
                          <span className="ml-auto font-semibold text-gray-700 dark:text-gray-300 shrink-0">{formatPrice(cat.value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {storeBreakdown.length > 0 && (
                  <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
                    <h2 className="font-semibold text-gray-800 dark:text-gray-200 mb-5">By Store</h2>
                    <div className="space-y-4">
                      {storeBreakdown.map((store, idx) => {
                        const pct = totalGroceryYTD > 0 ? Math.round((store.spent / totalGroceryYTD) * 100) : 0;
                        return (
                          <div key={store.name} className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: store.color }} />
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{store.name}</span>
                                <span className="text-xs text-gray-400">{store.trips} trips</span>
                              </div>
                              <div className="text-right">
                                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{formatPrice(store.spent)}</span>
                                <span className="text-xs text-gray-400 ml-1.5">{pct}%</span>
                              </div>
                            </div>
                            <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{ duration: 0.6, delay: idx * 0.05 }}
                                className="h-full rounded-full"
                                style={{ backgroundColor: store.color }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
                <h2 className="font-semibold text-gray-800 dark:text-gray-200">6-Month Trend</h2>
                <p className="text-xs text-gray-400 mb-4">Rolling grocery spend</p>
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={groceryTrend6}>
                    <defs>
                      <linearGradient id="groceryGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#f97316" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                    <XAxis dataKey="month" tick={{ fill: textColor, fontSize: 11 }} />
                    <YAxis tick={{ fill: textColor, fontSize: 11 }} tickFormatter={(v) => `N$${v}`} />
                    <Tooltip {...tooltipStyle} formatter={(v: number) => [formatPrice(v), 'Spent']} />
                    <Area type="monotone" dataKey="amount" stroke="#f97316" strokeWidth={2} fill="url(#groceryGrad)" dot={{ r: 3, fill: '#f97316' }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </div>
      )}

      {/* ══ FUEL ══════════════════════════════════════════════ */}
      {activeTab === 'fuel' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={<DollarSign size={17} className="text-purple-600" />} label="Total Cost"    value={formatPrice(totalFuelCost)}          sub={`${viewYear} YTD`}             bg="bg-purple-50 dark:bg-purple-900/20" />
            <StatCard icon={<Droplets size={17} className="text-blue-500" />}    label="Total Litres"  value={`${totalFuelLitres.toFixed(1)} L`}    bg="bg-blue-50 dark:bg-blue-900/20"   delay={0.05} />
            <StatCard icon={<Zap size={17} className="text-amber-500" />}        label="Avg Price / L" value={formatPrice(avgPricePerLitre)}        bg="bg-amber-50 dark:bg-amber-900/20" delay={0.1}  />
            <StatCard icon={<Fuel size={17} className="text-green-600" />}       label="Fill-ups"      value={String(yearFuel.length)}              bg="bg-green-50 dark:bg-green-900/20" delay={0.15} />
          </div>

          {yearFuel.length === 0 ? (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-12 text-center">
              <Fuel className="mx-auto text-gray-300 dark:text-gray-700 mb-3" size={48} />
              <p className="text-gray-500 font-medium mb-1">No fuel data for {viewYear}</p>
              <p className="text-gray-400 text-sm">Log fill-ups on the Fuel page to see insights here</p>
            </div>
          ) : (
            <>
              {fuelPriceTrend.length > 1 && (
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
                  <h2 className="font-semibold text-gray-800 dark:text-gray-200">Price per Litre Trend</h2>
                  <p className="text-xs text-gray-400 mb-4">How fuel prices have changed across fill-ups</p>
                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={fuelPriceTrend}>
                      <defs>
                        <linearGradient id="fuelGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#a855f7" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                      <XAxis dataKey="date" tick={{ fill: textColor, fontSize: 10 }} interval="preserveStartEnd" />
                      <YAxis tick={{ fill: textColor, fontSize: 11 }} tickFormatter={(v) => `N$${v.toFixed(2)}`} domain={['auto', 'auto']} />
                      <Tooltip
                        {...tooltipStyle}
                        formatter={(v: number, name: string) => [
                          name === 'price' ? `N$${v.toFixed(2)}/L` : formatPrice(v),
                          name === 'price' ? 'Price / Litre' : 'Total Cost',
                        ]}
                      />
                      <Area type="monotone" dataKey="price" stroke="#a855f7" strokeWidth={2} fill="url(#fuelGrad)" dot={{ r: 3, fill: '#a855f7' }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}

              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
                <h2 className="font-semibold text-gray-800 dark:text-gray-200">Monthly Fuel Cost</h2>
                <p className="text-xs text-gray-400 mb-4">{viewYear}</p>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={monthlyFuel} barGap={3} barCategoryGap="25%">
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                    <XAxis dataKey="month" tick={{ fill: textColor, fontSize: 11 }} />
                    <YAxis yAxisId="cost"   tick={{ fill: textColor, fontSize: 11 }} tickFormatter={(v) => `N$${v}`} />
                    <YAxis yAxisId="litres" orientation="right" tick={{ fill: textColor, fontSize: 11 }} tickFormatter={(v) => `${v}L`} />
                    <Tooltip
                      {...tooltipStyle}
                      formatter={(v: number, name: string) => [
                        name === 'cost' ? formatPrice(v) : `${v.toFixed(1)} L`,
                        name === 'cost' ? 'Cost' : 'Litres',
                      ]}
                    />
                    <Legend formatter={(v) => <span style={{ color: textColor, fontSize: 12 }}>{v === 'cost' ? 'Cost' : 'Litres'}</span>} />
                    <Bar yAxisId="cost"   dataKey="cost"   fill="#a855f7" radius={[4, 4, 0, 0]} name="cost" />
                    <Bar yAxisId="litres" dataKey="litres" fill="#06b6d4" radius={[4, 4, 0, 0]} name="litres" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
                <h2 className="font-semibold text-gray-800 dark:text-gray-200 mb-4">Fill-up Log</h2>
                <div className="space-y-1">
                  {yearFuel
                    .slice()
                    .sort((a, b) => b.date - a.date)
                    .map((f) => (
                      <div key={f.id} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-800 last:border-0 text-sm">
                        <div className="flex items-center gap-3">
                          <span className="text-gray-400 text-xs w-16 shrink-0">
                            {new Date(f.date).toLocaleDateString('en-NA', { day: 'numeric', month: 'short' })}
                          </span>
                          <span className="text-gray-700 dark:text-gray-300 font-medium">{f.stationName || 'Unknown station'}</span>
                          {f.odometer && <span className="text-xs text-gray-400">{f.odometer.toLocaleString()} km</span>}
                        </div>
                        <div className="flex items-center gap-4 text-right">
                          <span className="text-gray-400 text-xs hidden sm:block">{f.litres.toFixed(1)} L @ N${f.pricePerLitre.toFixed(2)}/L</span>
                          <span className="font-bold text-gray-800 dark:text-gray-200">{formatPrice(f.totalCost)}</span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

    </div>
  );
};

export default Analytics;
