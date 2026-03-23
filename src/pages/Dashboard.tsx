// ==========================================
// BasketBuddy - Dashboard v4
// Clean, real-time, chart-forward redesign
// ==========================================

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  ShoppingCart, Wallet, Receipt, Fuel, TrendingUp, TrendingDown,
  ChevronLeft, ChevronRight, Sparkles, HeartPulse, Activity,
  Package, ArrowUpCircle, DollarSign, AlertCircle, CheckCircle,
  BarChart3, ListChecks,
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { formatPrice, formatRelativeDate, calcPercentage, cn } from '../utils/helpers';

// ── Variants ────────────────────────────────────────────────
const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.055 } } };
const card      = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } } };
const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

type ActivityItem = {
  id: string;
  type: 'trip' | 'transaction' | 'fuel';
  icon: React.ReactNode;
  bg: string;
  color: string;
  title: string;
  sub: string;
  amount: number;
  amountCls: string;
  date: number;
};

// Custom Recharts tooltip
const ChartTip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900/95 border border-green-500/30 rounded-xl px-3 py-2.5 shadow-2xl text-[11px]">
      <p className="text-gray-500 mb-1.5 font-medium">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="font-mono tabular-nums font-semibold" style={{ color: p.color }}>
          {p.name}: {formatPrice(p.value)}
        </p>
      ))}
    </div>
  );
};

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const {
    trips, stores, categories, budgets,
    transactions, fuelFillups, reminders,
    medicalAidPlans, medicalAppointments,
  } = useApp();

  // ── Live clock ────────────────────────────────────────────
  const [tick, setTick] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTick(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const now = useMemo(() => new Date(), []);

  // ── Billing period ────────────────────────────────────────
  const _current = useMemo(() => {
    const d = now.getDate(), m = now.getMonth() + 1, y = now.getFullYear();
    if (d <= 24) return m === 1 ? { month: 12, year: y - 1 } : { month: m - 1, year: y };
    return { month: m, year: y };
  }, [now]);

  const [viewMonth, setViewMonth] = useState(_current.month);
  const [viewYear,  setViewYear]  = useState(_current.year);
  const isCurrentPeriod = viewMonth === _current.month && viewYear === _current.year;

  const prevMonth = useCallback(() => {
    if (viewMonth === 1) { setViewMonth(12); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  }, [viewMonth]);

  const nextMonth = useCallback(() => {
    if (isCurrentPeriod) return;
    if (viewMonth === 12) { setViewMonth(1); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  }, [viewMonth, isCurrentPeriod]);

  const periodStart = useMemo(() => new Date(viewYear, viewMonth - 1, 25, 0, 0, 0, 0).getTime(), [viewMonth, viewYear]);
  const periodEnd   = useMemo(() => new Date(viewYear, viewMonth, 24, 23, 59, 59, 999).getTime(), [viewMonth, viewYear]);

  const periodLabel = useMemo(() => {
    const s = new Date(viewYear, viewMonth - 1, 25);
    const e = new Date(viewYear, viewMonth, 24);
    const fmt = (d: Date) => d.toLocaleDateString('en-NA', { day: 'numeric', month: 'short' });
    return `${fmt(s)} – ${fmt(e)}${e.getFullYear() !== viewYear ? ` ${e.getFullYear()}` : `, ${viewYear}`}`;
  }, [viewMonth, viewYear]);

  // ── Period data ───────────────────────────────────────────
  const monthTrips = useMemo(() => trips.filter((t) => t.date >= periodStart && t.date <= periodEnd), [trips, periodStart, periodEnd]);
  const completedTrips = useMemo(() => monthTrips.filter((t) => t.status === 'completed'), [monthTrips]);
  const monthlySpent   = useMemo(() => completedTrips.reduce((s, t) => s + t.totalSpent, 0), [completedTrips]);

  const currentBudget = budgets.find((b) => b.month === viewMonth && b.year === viewYear);
  const budgetTotal   = currentBudget?.totalBudget ?? 0;
  const budgetPct     = budgetTotal > 0 ? calcPercentage(monthlySpent, budgetTotal) : 0;

  const monthTx = useMemo(() => transactions.filter((t) => t.date >= periodStart && t.date <= periodEnd), [transactions, periodStart, periodEnd]);
  const totalIncome   = useMemo(() => monthTx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0), [monthTx]);
  const totalFixed    = useMemo(() => monthTx.filter((t) => t.type === 'fixed').reduce((s, t) => s + t.amount, 0), [monthTx]);
  const totalVariable = useMemo(() => monthTx.filter((t) => t.type === 'variable').reduce((s, t) => s + t.amount, 0), [monthTx]);

  const monthFuel   = useMemo(() => fuelFillups.filter((f) => f.date >= periodStart && f.date <= periodEnd), [fuelFillups, periodStart, periodEnd]);
  const totalFuel   = useMemo(() => monthFuel.reduce((s, f) => s + f.totalCost, 0), [monthFuel]);
  const avgPerLitre = monthFuel.length > 0 ? monthFuel.reduce((s, f) => s + f.pricePerLitre, 0) / monthFuel.length : 0;

  const activePlan          = medicalAidPlans?.find((p) => p.active) ?? null;
  const monthlyContribution = activePlan?.monthlyContribution ?? 0;
  const totalExpenses       = totalFixed + totalVariable + monthlySpent + totalFuel;
  const netSavings          = totalIncome - totalExpenses;
  // Only flag "Over budget" when a shopping budget is explicitly set and exceeded.
  // Finance health (income vs expenses) is tracked on the Finance page — don't conflate them here.
  const isOnTrack           = budgetTotal > 0 ? budgetPct < 100 : true;

  // ── Expense segments (donut) ──────────────────────────────
  const segments = useMemo(() => {
    const raw = [
      { label: 'Fixed',       val: totalFixed,          color: '#3b82f6' },
      { label: 'Variable',    val: totalVariable,       color: '#f97316' },
      { label: 'Groceries',   val: monthlySpent,        color: '#10b981' },
      { label: 'Fuel',        val: totalFuel,           color: '#f59e0b' },
      { label: 'Medical Aid', val: monthlyContribution, color: '#f43f5e' },
    ].filter((s) => s.val > 0);
    const total = raw.reduce((s, r) => s + r.val, 0);
    return raw.map((r) => ({ ...r, pct: total > 0 ? (r.val / total) * 100 : 0 }));
  }, [totalFixed, totalVariable, monthlySpent, totalFuel, monthlyContribution]);

  // ── 6-month trend chart ───────────────────────────────────
  const trendData = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const d     = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const m     = d.getMonth() + 1;
      const y     = d.getFullYear();
      const start = new Date(y, m - 1, 1).getTime();
      const end   = new Date(y, m, 0, 23, 59, 59, 999).getTime();
      const income = transactions.filter((t) => t.type === 'income' && t.date >= start && t.date <= end).reduce((s, t) => s + t.amount, 0);
      const expenses =
        transactions.filter((t) => (t.type === 'fixed' || t.type === 'variable') && t.date >= start && t.date <= end).reduce((s, t) => s + t.amount, 0) +
        trips.filter((t) => t.status === 'completed' && t.date >= start && t.date <= end).reduce((s, t) => s + t.totalSpent, 0) +
        fuelFillups.filter((f) => f.date >= start && f.date <= end).reduce((s, f) => s + f.totalCost, 0);
      return { month: MONTH_NAMES[m - 1].slice(0, 3), income, expenses };
    });
  }, [transactions, trips, fuelFillups, now]);

  const chartHasData = trendData.some((d) => d.income > 0 || d.expenses > 0);

  // ── Activity feed ─────────────────────────────────────────
  const [feedFilter, setFeedFilter] = useState<'all' | 'trips' | 'transactions' | 'fuel'>('all');

  const activityFeed = useMemo(() => {
    const items: ActivityItem[] = [];
    monthTrips.forEach((trip) => {
      const store = stores.find((s) => s.id === trip.storeId);
      items.push({
        id: `trip-${trip.id}`, type: 'trip',
        icon: <ShoppingCart size={14} />,
        bg: store?.color ? `${store.color}20` : 'rgb(74 222 128 / 0.15)',
        color: store?.color ?? '#4ade80',
        title: trip.name,
        sub: `${store?.name ?? 'Unknown'} · ${trip.items.length} items`,
        amount: trip.status === 'completed' ? trip.totalSpent : trip.items.reduce((s, i) => s + i.estimatedPrice * i.quantity, 0),
        amountCls: 'text-rose-400', date: trip.date,
      });
    });
    monthTx.forEach((tx) => {
      items.push({
        id: `tx-${tx.id}`, type: 'transaction',
        icon: tx.type === 'income' ? <ArrowUpCircle size={14} /> : <Receipt size={14} />,
        bg: tx.type === 'income' ? 'rgb(16 185 129 / 0.15)' : 'rgb(244 63 94 / 0.15)',
        color: tx.type === 'income' ? '#10b981' : '#f43f5e',
        title: tx.description, sub: tx.category,
        amount: tx.amount,
        amountCls: tx.type === 'income' ? 'text-emerald-400' : 'text-rose-400', date: tx.date,
      });
    });
    monthFuel.forEach((f) => {
      items.push({
        id: `fuel-${f.id}`, type: 'fuel',
        icon: <Fuel size={14} />,
        bg: 'rgb(245 158 11 / 0.15)', color: '#f59e0b',
        title: `${f.litres}L @ ${formatPrice(f.pricePerLitre)}`,
        sub: f.stationName,
        amount: f.totalCost, amountCls: 'text-amber-400', date: f.date,
      });
    });
    items.sort((a, b) => b.date - a.date);
    const filtered =
      feedFilter === 'trips'        ? items.filter((i) => i.type === 'trip') :
      feedFilter === 'transactions' ? items.filter((i) => i.type === 'transaction') :
      feedFilter === 'fuel'         ? items.filter((i) => i.type === 'fuel') : items;
    return filtered.slice(0, 10);
  }, [monthTrips, monthTx, monthFuel, stores, feedFilter]);

  // ── Top grocery categories ────────────────────────────────
  const topCategories = useMemo(() => {
    const map = new Map<string, number>();
    completedTrips.forEach((t) =>
      t.items.forEach((i) => map.set(i.categoryId, (map.get(i.categoryId) ?? 0) + (i.actualPrice ?? i.estimatedPrice) * i.quantity)),
    );
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1]).slice(0, 5)
      .map(([id, amount]) => {
        const cat = categories.find((c) => c.id === id);
        return { id, amount, name: cat?.name ?? id, icon: cat?.icon ?? '📦', color: cat?.color ?? '#6b7280' };
      });
  }, [completedTrips, categories]);

  // ── Restock alerts ────────────────────────────────────────
  const restockAlerts = useMemo(() =>
    reminders
      .filter((r) => r.enabled)
      .map((r) => ({ ...r, daysUntil: r.frequency - Math.floor((Date.now() - r.lastPurchased) / 86400000) }))
      .filter((r) => r.daysUntil <= 3)
      .slice(0, 4),
  [reminders]);

  // ── Next appointment ──────────────────────────────────────
  const nextAppt = useMemo(() =>
    (medicalAppointments ?? [])
      .filter((a) => a.status === 'upcoming' && a.date >= Date.now())
      .sort((a, b) => a.date - b.date)[0] ?? null,
  [medicalAppointments]);

  // ── Time / greeting ──────────────────────────────────────
  const h = tick.getHours();
  const greeting  = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = user?.displayName?.split(' ')[0] ?? 'there';
  const timeStr   = tick.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  const dateStr   = tick.toLocaleDateString('en-NA', { weekday: 'long', day: 'numeric', month: 'long' });

  // ─────────────────────────────────────────────────────────
  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-5 max-w-7xl mx-auto">

      {/* ══ HERO ════════════════════════════════════════════ */}
      <motion.div variants={card} className="relative overflow-hidden rounded-2xl">
        <div className="absolute -left-20 -top-12 w-72 h-40 bg-green-600/10 blur-[60px] rounded-full pointer-events-none" />
        <div className="absolute right-0 -bottom-8 w-56 h-32 bg-fuchsia-500/8 blur-[60px] rounded-full pointer-events-none" />

        <div className="relative bg-gray-900/80 backdrop-blur-xl border border-green-500/20 rounded-2xl px-6 py-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
            {/* Avatar + greeting */}
            <div className="flex items-center gap-4">
              <div className="relative flex-shrink-0">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-800 rounded-2xl flex items-center justify-center shadow-lg shadow-green-500/30">
                  <Sparkles size={20} className="text-white" />
                </div>
                <div className={cn(
                  'absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-gray-900',
                  isOnTrack ? 'bg-emerald-500' : 'bg-rose-500',
                )} />
              </div>
              <div>
                <p className="text-[11px] font-medium text-gray-500 uppercase tracking-widest">{greeting}</p>
                <h1 className="text-2xl font-bold text-white tracking-tight leading-tight">{firstName}</h1>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <ShoppingCart size={10} className={isOnTrack ? 'text-emerald-500' : 'text-rose-500'} />
                  {isOnTrack
                    ? <><CheckCircle size={11} className="text-emerald-500" /><span className="text-[11px] text-emerald-400 font-medium">Grocery: on track</span></>
                    : <><AlertCircle size={11} className="text-rose-500" /><span className="text-[11px] text-rose-400 font-medium">Grocery: over budget</span></>}
                </div>
              </div>
            </div>

            {/* Right: live clock + period nav */}
            <div className="flex items-center gap-4 sm:flex-shrink-0">
              <div className="hidden md:block text-right">
                <p className="text-2xl font-bold text-white font-mono tabular-nums tracking-tight leading-none">{timeStr}</p>
                <p className="text-[11px] text-gray-500 mt-0.5">{dateStr}</p>
              </div>
              <div className="hidden md:block w-px h-10 bg-green-500/20" />
              <div className="flex flex-col items-end gap-1">
              <p className="text-[10px] text-gray-600 font-medium uppercase tracking-widest flex items-center gap-1"><ShoppingCart size={9} />Grocery period</p>
              <div className="flex items-center gap-0.5 bg-gray-800/70 border border-green-500/20 rounded-xl p-1">
                <button onClick={prevMonth} aria-label="Previous month" className="p-2 rounded-lg hover:bg-white/8 text-gray-500 hover:text-gray-200 transition-colors cursor-pointer">
                  <ChevronLeft size={14} />
                </button>
                <span className="text-sm font-semibold text-gray-200 px-2 min-w-[110px] text-center">
                  {MONTH_NAMES[viewMonth - 1].slice(0, 3)} {viewYear}
                </span>
                <button onClick={nextMonth} disabled={isCurrentPeriod} aria-label="Next month" className="p-2 rounded-lg hover:bg-white/8 text-gray-500 hover:text-gray-200 transition-colors disabled:opacity-25 disabled:cursor-not-allowed cursor-pointer">
                  <ChevronRight size={14} />
                </button>
              </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-4 pl-16 sm:pl-0">
            <ShoppingCart size={10} className="text-gray-600" />
            <p className="text-[11px] text-gray-600">Grocery period: {periodLabel}</p>
          </div>
        </div>
      </motion.div>

      {/* ══ KPI CARDS ════════════════════════════════════════ */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {/* Groceries */}
        <motion.div variants={card} className="bg-gray-900/70 backdrop-blur-xl rounded-2xl p-4 border border-green-500/20 hover:border-emerald-500/30 transition-all duration-300 relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />
          <div className="flex items-start justify-between mb-3">
            <div className="p-2 bg-emerald-500/10 rounded-xl"><Wallet size={16} className="text-emerald-400" /></div>
            {budgetTotal > 0 && (
              <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full',
                budgetPct >= 100 ? 'bg-rose-500/15 text-rose-400' : budgetPct >= 80 ? 'bg-amber-500/15 text-amber-400' : 'bg-emerald-500/15 text-emerald-400',
              )}>{budgetPct}%</span>
            )}
          </div>
          <p className="text-[11px] text-gray-500 uppercase tracking-wider font-medium mb-1">Groceries</p>
          <p className="text-2xl font-bold text-white font-mono tabular-nums">{formatPrice(monthlySpent)}</p>
          <p className="text-[11px] text-gray-600 mt-0.5">{budgetTotal > 0 ? `of ${formatPrice(budgetTotal)}` : `${completedTrips.length} trips`}</p>
          {budgetTotal > 0 && (
            <div className="mt-3 h-1 bg-gray-800 rounded-full overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(budgetPct, 100)}%` }} transition={{ duration: 0.9, ease: 'easeOut' }}
                className={cn('h-full rounded-full', budgetPct >= 100 ? 'bg-rose-500' : budgetPct >= 80 ? 'bg-amber-400' : 'bg-emerald-500')} />
            </div>
          )}
        </motion.div>

        {/* Total Expenses */}
        <motion.div variants={card} className="bg-gray-900/70 backdrop-blur-xl rounded-2xl p-4 border border-green-500/20 hover:border-rose-500/30 transition-all duration-300 relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-rose-500/50 to-transparent" />
          <div className="mb-3"><div className="p-2 bg-rose-500/10 rounded-xl w-fit"><Receipt size={16} className="text-rose-400" /></div></div>
          <p className="text-[11px] text-gray-500 uppercase tracking-wider font-medium mb-1">Expenses</p>
          <p className="text-2xl font-bold text-white font-mono tabular-nums">{formatPrice(totalExpenses)}</p>
          <p className="text-[11px] text-gray-600 mt-0.5">total this period</p>
        </motion.div>

        {/* Net */}
        <motion.div variants={card} className="bg-gray-900/70 backdrop-blur-xl rounded-2xl p-4 border border-green-500/20 hover:border-green-500/40 transition-all duration-300 relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-green-500/50 to-transparent" />
          <div className="mb-3">
            <div className={cn('p-2 rounded-xl w-fit', totalIncome === 0 ? 'bg-gray-700/30' : netSavings >= 0 ? 'bg-green-500/10' : 'bg-rose-500/10')}>
              {netSavings >= 0 ? <TrendingUp size={16} className={totalIncome === 0 ? 'text-gray-600' : 'text-green-400'} /> : <TrendingDown size={16} className="text-rose-400" />}
            </div>
          </div>
          <p className="text-[11px] text-gray-500 uppercase tracking-wider font-medium mb-1">
            {totalIncome === 0 ? 'Net' : netSavings >= 0 ? 'Surplus' : 'Deficit'}
          </p>
          <p className={cn('text-2xl font-bold font-mono tabular-nums', totalIncome === 0 ? 'text-gray-600' : netSavings >= 0 ? 'text-emerald-400' : 'text-rose-400')}>
            {totalIncome === 0 ? '—' : formatPrice(Math.abs(netSavings))}
          </p>
          <p className="text-[11px] text-gray-600 mt-0.5">
            {totalIncome === 0 ? 'no income data' : netSavings >= 0 ? `left after expenses` : `over budget`}
          </p>
        </motion.div>

        {/* Fuel */}
        <motion.div variants={card} className="bg-gray-900/70 backdrop-blur-xl rounded-2xl p-4 border border-green-500/20 hover:border-amber-500/30 transition-all duration-300 relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />
          <div className="flex items-start justify-between mb-3">
            <div className="p-2 bg-amber-500/10 rounded-xl"><Fuel size={16} className="text-amber-400" /></div>
            {monthFuel.length > 0 && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400">{monthFuel.length}×</span>}
          </div>
          <p className="text-[11px] text-gray-500 uppercase tracking-wider font-medium mb-1">Fuel</p>
          <p className="text-2xl font-bold text-white font-mono tabular-nums">{formatPrice(totalFuel)}</p>
          <p className="text-[11px] text-gray-600 mt-0.5">{avgPerLitre > 0 ? `avg ${formatPrice(avgPerLitre)}/L` : 'no fillups'}</p>
        </motion.div>
      </div>

      {/* ══ CHARTS ROW ═══════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 6-month Area Chart */}
        <motion.div variants={card} className="lg:col-span-2 bg-gray-900/70 backdrop-blur-xl rounded-2xl border border-green-500/20 p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-bold text-white">Income vs Expenses</h2>
              <p className="text-[11px] text-gray-600 mt-0.5">6-month trend</p>
            </div>
            <div className="flex items-center gap-4 text-[11px] text-gray-500">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />Income</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />Expenses</span>
            </div>
          </div>
          {!chartHasData ? (
            <div className="h-48 flex flex-col items-center justify-center text-gray-700">
              <BarChart3 size={28} className="mb-2" />
              <p className="text-xs">Add transactions to see the trend</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={trendData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id="gIncome"  x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#10b981" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#f43f5e" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff06" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#4b5563' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: '#4b5563' }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`} />
                <Tooltip content={<ChartTip />} />
                <Area type="monotone" dataKey="income"   name="Income"   stroke="#10b981" strokeWidth={2} fill="url(#gIncome)"  dot={false} activeDot={{ r: 4, fill: '#10b981' }} />
                <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#f43f5e" strokeWidth={2} fill="url(#gExpense)" dot={false} activeDot={{ r: 4, fill: '#f43f5e' }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </motion.div>

        {/* Donut — expense breakdown */}
        <motion.div variants={card} className="bg-gray-900/70 backdrop-blur-xl rounded-2xl border border-green-500/20 p-5">
          <h2 className="text-sm font-bold text-white">Breakdown</h2>
          <p className="text-[11px] text-gray-600 mt-0.5 mb-4">{periodLabel}</p>
          {segments.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-gray-700">
              <DollarSign size={28} className="mb-2" />
              <p className="text-xs text-center">No expenses yet</p>
            </div>
          ) : (
            <>
              <div className="relative">
                <ResponsiveContainer width="100%" height={156}>
                  <PieChart>
                    <Pie data={segments} cx="50%" cy="50%" innerRadius={46} outerRadius={70}
                      paddingAngle={3} dataKey="val" startAngle={90} endAngle={-270} strokeWidth={0}>
                      {segments.map((seg, i) => <Cell key={i} fill={seg.color} />)}
                    </Pie>
                    <Tooltip content={<ChartTip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <p className="text-[10px] text-gray-500">Total</p>
                  <p className="text-sm font-bold text-white font-mono tabular-nums">
                    {formatPrice(segments.reduce((s, r) => s + r.val, 0))}
                  </p>
                </div>
              </div>
              <div className="mt-3 space-y-1.5">
                {segments.map((seg, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-[11px] text-gray-400">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: seg.color }} />
                      {seg.label}
                    </span>
                    <span className="text-[11px] font-mono text-gray-300 tabular-nums">{formatPrice(seg.val)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </motion.div>
      </div>

      {/* ══ ACTIVITY + SIDEBAR ═══════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Activity feed */}
        <motion.div variants={card} className="lg:col-span-3 bg-gray-900/70 backdrop-blur-xl rounded-2xl border border-green-500/20 overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.05]">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-white">Recent Activity</h2>
              <span className="text-[10px] text-gray-600">{periodLabel}</span>
            </div>
            <div className="flex items-center gap-1.5">
              {(['all', 'trips', 'transactions', 'fuel'] as const).map((f) => (
                <button key={f} onClick={() => setFeedFilter(f)}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer capitalize',
                    feedFilter === f ? 'bg-green-600 text-white' : 'text-gray-600 hover:text-gray-300 hover:bg-white/5',
                  )}>
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div className="divide-y divide-white/[0.04] max-h-[420px] overflow-y-auto">
            <AnimatePresence mode="popLayout">
              {activityFeed.length === 0 ? (
                <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-14 text-center">
                  <Activity className="mx-auto text-gray-700 mb-3" size={26} />
                  <p className="text-xs text-gray-600 mb-4">No activity in this period</p>
                  <Link to="/trips" className="inline-flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-medium transition-colors">
                    <ShoppingCart size={13} /> Start Shopping
                  </Link>
                </motion.div>
              ) : (
                activityFeed.map((a) => (
                  <motion.div key={a.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="px-5 py-3.5 flex items-center gap-3 hover:bg-white/[0.025] transition-colors">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: a.bg, color: a.color }}>
                      {a.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-200 truncate">{a.title}</p>
                      <p className="text-[11px] text-gray-600 truncate">{a.sub}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={cn('text-sm font-bold font-mono tabular-nums', a.amountCls)}>{formatPrice(a.amount)}</p>
                      <p className="text-[10px] text-gray-600">{formatRelativeDate(a.date)}</p>
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Right widgets */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* Top categories */}
          <motion.div variants={card} className="bg-gray-900/70 backdrop-blur-xl rounded-2xl border border-green-500/20 p-5">
            <h2 className="text-sm font-bold text-white mb-4">Top Grocery Categories</h2>
            {topCategories.length === 0 ? (
              <p className="text-[11px] text-gray-600 text-center py-3">Complete a trip to see breakdown</p>
            ) : (
              <div className="space-y-3">
                {topCategories.map((cat) => {
                  const pct = monthlySpent > 0 ? calcPercentage(cat.amount, monthlySpent) : 0;
                  return (
                    <div key={cat.id}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] text-gray-400 flex items-center gap-1.5">
                          <span>{cat.icon}</span>{cat.name}
                        </span>
                        <span className="text-[11px] font-mono text-gray-300 tabular-nums">{formatPrice(cat.amount)}</span>
                      </div>
                      <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.7, delay: 0.1, ease: 'easeOut' }}
                          className="h-full rounded-full" style={{ backgroundColor: cat.color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>

          {/* Quick actions */}
          <motion.div variants={card} className="bg-gray-900/70 backdrop-blur-xl rounded-2xl border border-green-500/20 p-5">
            <h2 className="text-sm font-bold text-white mb-4">Quick Actions</h2>
            <div className="grid grid-cols-3 gap-2">
              {[
                { to: '/trips',         icon: ShoppingCart, label: 'New Trip',   cls: 'text-green-400' },
                { to: '/finance',       icon: DollarSign,   label: 'Add Tx',     cls: 'text-emerald-400' },
                { to: '/fuel',          icon: Fuel,         label: 'Log Fuel',   cls: 'text-amber-400' },
                { to: '/budget',        icon: Wallet,       label: 'Budget',     cls: 'text-blue-400' },
                { to: '/shopping-list', icon: ListChecks,   label: 'Lists',      cls: 'text-green-400' },
                { to: '/analytics',     icon: BarChart3,    label: 'Analytics',  cls: 'text-fuchsia-400' },
              ].map(({ to, icon: Icon, label, cls }) => (
                <Link key={to} to={to}
                  className="flex flex-col items-center justify-center gap-1.5 h-16 bg-gray-800/40 hover:bg-gray-700/60 border border-white/[0.05] hover:border-green-500/30 rounded-xl transition-all">
                  <Icon size={15} className={cls} />
                  <span className="text-[10px] font-medium text-gray-600 text-center leading-tight">{label}</span>
                </Link>
              ))}
            </div>
          </motion.div>

          {/* Restock alerts */}
          {restockAlerts.length > 0 && (
            <motion.div variants={card} className="bg-gray-900/70 backdrop-blur-xl rounded-2xl border border-green-500/20 p-5">
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-sm font-bold text-white">Restock Alerts</h2>
                <span className="w-4 h-4 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">{restockAlerts.length}</span>
              </div>
              <div className="space-y-1.5">
                {restockAlerts.map((a) => (
                  <div key={a.id} className="flex items-center gap-2.5 bg-gray-800/40 rounded-xl px-3 py-2">
                    <Package size={12} className="text-amber-400 flex-shrink-0" />
                    <p className="text-[11px] text-gray-300 flex-1 truncate">{a.itemName}</p>
                    <span className={cn('text-[10px] font-semibold', a.daysUntil <= 0 ? 'text-rose-400' : 'text-amber-400')}>
                      {a.daysUntil <= 0 ? 'Overdue' : `${a.daysUntil}d`}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Next appointment */}
          {nextAppt && (
            <motion.div variants={card} className="bg-gray-900/70 backdrop-blur-xl rounded-2xl border border-green-500/20 p-5">
              <h2 className="text-sm font-bold text-white mb-3">Next Appointment</h2>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-green-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <HeartPulse size={15} className="text-green-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-200 truncate">{nextAppt.type}</p>
                  <p className="text-[11px] text-gray-500">
                    {new Date(nextAppt.date).toLocaleDateString('en-NA', { weekday: 'short', day: 'numeric', month: 'short' })}
                  </p>
                </div>
                <Link to="/medical" className="text-[11px] text-green-400 hover:text-green-300 transition-colors flex-shrink-0">View</Link>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* ══ MEDICAL AID STRIP ════════════════════════════════ */}
      {activePlan && (
        <motion.div variants={card} className="bg-gray-900/70 backdrop-blur-xl rounded-2xl border border-green-500/20 px-5 py-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-rose-500/10 rounded-xl flex items-center justify-center">
                <HeartPulse size={15} className="text-rose-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{activePlan.planName}</p>
                <p className="text-[11px] text-gray-600">{activePlan.members.length} {activePlan.members.length === 1 ? 'member' : 'members'}</p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div>
                <p className="text-[10px] text-gray-600 uppercase tracking-wider">Monthly</p>
                <p className="text-base font-bold text-white font-mono tabular-nums">{formatPrice(activePlan.monthlyContribution)}</p>
              </div>
              <Link to="/medical" className="text-[11px] text-green-400 hover:text-green-300 transition-colors">Details →</Link>
            </div>
          </div>
        </motion.div>
      )}

    </motion.div>
  );
};

export default Dashboard;
