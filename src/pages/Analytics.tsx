// ==========================================
// BasketBuddy â€” Analytics v2
// Premium financial intelligence dashboard
// ==========================================

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3, Wallet, ShoppingCart, Fuel, Search,
  TrendingUp, TrendingDown, PiggyBank, Target,
  ChevronLeft, ChevronRight, ArrowUpRight, ArrowDownRight,
  Droplets, Zap, Calendar, Package, Minus, AlertTriangle,
  CheckCircle, Activity, DollarSign,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, ComposedChart,
} from 'recharts';
import { useApp } from '../contexts/AppContext';
import { useTheme } from '../contexts/ThemeContext';
import { formatPrice, cn } from '../utils/helpers';
import DataExplorer from '../components/analytics/DataExplorer';
import {
  FINANCE_INCOME_CATEGORIES,
  FINANCE_FIXED_CATEGORIES,
  FINANCE_VARIABLE_CATEGORIES,
} from '../config/constants';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const ALL_FIN_CATS = [...FINANCE_INCOME_CATEGORIES, ...FINANCE_FIXED_CATEGORIES, ...FINANCE_VARIABLE_CATEGORIES];

type TabId = 'overview' | 'finance' | 'grocery' | 'fuel' | 'explore';

const TAB_CFG: Record<TabId, { label: string; Icon: React.FC<any>; active: string }> = {
  overview: { label: 'Overview',  Icon: BarChart3,    active: 'bg-violet-600 shadow-lg shadow-violet-500/25 text-white' },
  finance:  { label: 'Finance',   Icon: Wallet,       active: 'bg-emerald-600 shadow-lg shadow-emerald-500/25 text-white' },
  grocery:  { label: 'Grocery',   Icon: ShoppingCart, active: 'bg-amber-500 shadow-lg shadow-amber-500/25 text-white' },
  fuel:     { label: 'Fuel',      Icon: Fuel,         active: 'bg-purple-600 shadow-lg shadow-purple-500/25 text-white' },
  explore:  { label: 'Data',      Icon: Search,       active: 'bg-blue-600 shadow-lg shadow-blue-500/25 text-white' },
};

// â”€â”€ Shared chart tooltip â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const ChartTip = ({ active, payload, label, fmtValue }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 border border-white/10 rounded-xl px-3.5 py-2.5 shadow-2xl text-xs min-w-[130px]">
      {label && <p className="text-gray-400 mb-1.5 font-medium border-b border-white/5 pb-1.5">{label}</p>}
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center justify-between gap-3 py-0.5">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
            <span className="text-gray-400">{p.name}</span>
          </div>
          <span className="text-white font-bold font-mono tabular-nums">
            {fmtValue ? fmtValue(p.value, p.name) : formatPrice(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
};

// â”€â”€ KPI metric card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const KpiCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  trend?: 'up' | 'down' | 'flat';
  trendVal?: string;
  accent?: string;
  delay?: number;
}> = ({ icon, label, value, sub, trend, trendVal, accent = 'violet', delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 14 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.3 }}
    className="bg-gray-900/70 backdrop-blur-xl rounded-2xl border border-violet-500/20 p-4 relative overflow-hidden"
  >
    <div className={`absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-${accent}-500/50 to-transparent`} />
    <div className="flex items-start justify-between gap-2 mb-3">
      <div className={`p-2 rounded-xl bg-${accent}-500/10`}>{icon}</div>
      {trend && trendVal && (
        <div className={cn(
          'flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full',
          trend === 'up'   ? 'text-emerald-400 bg-emerald-500/10' :
          trend === 'down' ? 'text-rose-400 bg-rose-500/10'       : 'text-gray-500 bg-gray-800',
        )}>
          {trend === 'up' ? <ArrowUpRight size={10} /> : trend === 'down' ? <ArrowDownRight size={10} /> : <Minus size={10} />}
          {trendVal}
        </div>
      )}
    </div>
    <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">{label}</p>
    <p className="text-xl font-bold text-white font-mono tabular-nums mt-0.5 truncate">{value}</p>
    {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
  </motion.div>
);

// â”€â”€ Smart insight pill â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const Insight: React.FC<{ type: 'good' | 'warn' | 'info'; text: string }> = ({ type, text }) => (
  <div className={cn(
    'flex items-start gap-2.5 px-3.5 py-2.5 rounded-xl border text-xs leading-relaxed',
    type === 'good' ? 'bg-emerald-500/8 border-emerald-500/20 text-emerald-300' :
    type === 'warn' ? 'bg-amber-500/8 border-amber-500/20 text-amber-300' :
                     'bg-violet-500/8 border-violet-500/20 text-violet-300',
  )}>
    {type === 'good' ? <CheckCircle size={12} className="mt-px flex-shrink-0" /> :
     type === 'warn' ? <AlertTriangle size={12} className="mt-px flex-shrink-0" /> :
                       <Activity size={12} className="mt-px flex-shrink-0" />}
    <span>{text}</span>
  </div>
);

// â”€â”€ Chart wrapper card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const ChartCard: React.FC<{ title: string; sub?: string; children: React.ReactNode; className?: string }> = ({ title, sub, children, className }) => (
  <div className={cn('bg-gray-900/70 backdrop-blur-xl rounded-2xl border border-violet-500/20 p-5', className)}>
    <h3 className="text-sm font-semibold text-gray-200">{title}</h3>
    {sub && <p className="text-xs text-gray-500 mt-0.5 mb-4">{sub}</p>}
    {!sub && <div className="mb-4" />}
    {children}
  </div>
);

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const Analytics: React.FC = () => {
  const {
    trips, categories, stores, items,
    transactions, financePlans, savingsGoals, fuelFillups,
    medicalAidPlans, medicalAppointments, budgets,
  } = useApp();
  const { isDark } = useTheme();
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  const G  = '#1f2937'; // grid color
  const AX = '#4b5563'; // axis tick color

  const getCatLabel = (id: string, custom?: { id: string; label: string }[]) =>
    custom?.find((c) => c.id === id)?.label || ALL_FIN_CATS.find((c) => c.id === id)?.label || id;
  const getCatIcon  = (id: string, custom?: { id: string; icon: string }[]) =>
    custom?.find((c) => c.id === id)?.icon || ALL_FIN_CATS.find((c) => c.id === id)?.icon || 'ðŸ’°';

  // â”€â”€ Grocery â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const completedTrips   = useMemo(() => trips.filter((t) => t.status === 'completed'), [trips]);
  const yearTrips        = useMemo(() => completedTrips.filter((t) => new Date(t.date).getFullYear() === viewYear), [completedTrips, viewYear]);
  const prevYearTrips    = useMemo(() => completedTrips.filter((t) => new Date(t.date).getFullYear() === viewYear - 1), [completedTrips, viewYear]);
  const totalGroceryYTD  = yearTrips.reduce((s, t) => s + t.totalSpent, 0);
  const prevGroceryTotal = prevYearTrips.reduce((s, t) => s + t.totalSpent, 0);
  const totalTripsYTD    = yearTrips.length;
  const avgTripSpend     = totalTripsYTD > 0 ? totalGroceryYTD / totalTripsYTD : 0;
  const activeMths       = useMemo(() => Math.max(1, new Set(yearTrips.map((t) => new Date(t.date).getMonth())).size), [yearTrips]);

  const monthlyGrocery = useMemo(() => {
    const months = MONTHS.map((month) => ({ month, spent: 0, trips: 0 }));
    yearTrips.forEach((t) => { const i = new Date(t.date).getMonth(); months[i].spent += t.totalSpent; months[i].trips += 1; });
    return months;
  }, [yearTrips]);
  const maxMonthlyGrocery = Math.max(...monthlyGrocery.map((m) => m.spent), 1);

  const groceryCategoryBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    yearTrips.forEach((t) => t.items.forEach((item) => {
      const val = (item.actualPrice || item.estimatedPrice) * item.quantity;
      map.set(item.categoryId, (map.get(item.categoryId) || 0) + val);
    }));
    return Array.from(map.entries())
      .map(([catId, amount]) => { const cat = categories.find((c) => c.id === catId); return { name: cat?.name || catId, value: amount, color: cat?.color || '#999', icon: cat?.icon || 'ðŸ“¦' }; })
      .sort((a, b) => b.value - a.value);
  }, [yearTrips, categories]);

  const storeBreakdown = useMemo(() => {
    const map = new Map<string, { spent: number; trips: number }>();
    yearTrips.forEach((t) => { const prev = map.get(t.storeId) || { spent: 0, trips: 0 }; map.set(t.storeId, { spent: prev.spent + t.totalSpent, trips: prev.trips + 1 }); });
    return Array.from(map.entries())
      .map(([storeId, data]) => { const store = stores.find((s) => s.id === storeId); return { name: store?.name || storeId, color: store?.color || '#999', ...data }; })
      .sort((a, b) => b.spent - a.spent);
  }, [yearTrips, stores]);

  const groceryTrend6 = useMemo(() =>
    Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const mTrips = completedTrips.filter((t) => { const td = new Date(t.date); return td.getMonth() === d.getMonth() && td.getFullYear() === d.getFullYear(); });
      return { month: MONTHS[d.getMonth()], amount: mTrips.reduce((s, t) => s + t.totalSpent, 0) };
    }),
    [completedTrips],
  );

  // â”€â”€ Finance â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const yearTx     = useMemo(() => transactions.filter((t) => t.year === viewYear), [transactions, viewYear]);
  const prevYearTx = useMemo(() => transactions.filter((t) => t.year === viewYear - 1), [transactions, viewYear]);

  const monthlyFinance = useMemo(() =>
    MONTHS.map((month, i) => {
      const mTx = yearTx.filter((t) => t.month === i + 1);
      const income   = mTx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const fixed    = mTx.filter((t) => t.type === 'fixed').reduce((s, t) => s + t.amount, 0);
      const variable = mTx.filter((t) => t.type === 'variable').reduce((s, t) => s + t.amount, 0);
      const grocery  = yearTrips.filter((t) => new Date(t.date).getMonth() === i).reduce((s, t) => s + t.totalSpent, 0);
      const fuel     = fuelFillups.filter((f) => new Date(f.date).getFullYear() === viewYear && new Date(f.date).getMonth() === i).reduce((s, f) => s + f.totalCost, 0);
      return { month, income, fixed, variable, grocery, fuel, expenses: fixed + variable + grocery + fuel, net: income - fixed - variable - grocery - fuel };
    }),
    [yearTx, yearTrips, fuelFillups, viewYear],
  );

  const totalIncome   = monthlyFinance.reduce((s, m) => s + m.income, 0);
  const totalExpenses = monthlyFinance.reduce((s, m) => s + m.expenses, 0);
  const netSavings    = totalIncome - totalExpenses;
  const savingsRate   = totalIncome > 0 ? Math.round((netSavings / totalIncome) * 100) : 0;
  const prevIncome    = prevYearTx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const prevFuelCost  = fuelFillups.filter((f) => new Date(f.date).getFullYear() === viewYear - 1).reduce((s, f) => s + f.totalCost, 0);
  const prevExpenses  = prevYearTx.filter((t) => t.type !== 'income').reduce((s, t) => s + t.amount, 0) + prevGroceryTotal + prevFuelCost;

  const yearCustomCats = useMemo(() => financePlans.filter((p) => p.year === viewYear).flatMap((p) => p.customCategories || []), [financePlans, viewYear]);

  const categoryExpenses = useMemo(() => {
    const map = new Map<string, number>();
    yearTx.filter((t) => t.type !== 'income').forEach((t) => map.set(t.category, (map.get(t.category) || 0) + t.amount));
    return Array.from(map.entries())
      .map(([id, amount]) => ({ id, name: getCatLabel(id, yearCustomCats), icon: getCatIcon(id, yearCustomCats), amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [yearTx, yearCustomCats]);

  const budgetVsActual = useMemo(() => {
    const targets = new Map<string, number>();
    financePlans.filter((p) => p.year === viewYear).forEach((p) =>
      p.categoryTargets.forEach((ct) => targets.set(ct.category, (targets.get(ct.category) || 0) + ct.targetAmount)),
    );
    return Array.from(targets.entries())
      .map(([id, target]) => ({
        id, name: getCatLabel(id, yearCustomCats), icon: getCatIcon(id, yearCustomCats), target,
        actual: id === 'fuel' ? totalFuelCost : (categoryExpenses.find((c) => c.id === id)?.amount || 0),
      }))
      .sort((a, b) => b.target - a.target).slice(0, 12);
  }, [financePlans, viewYear, categoryExpenses, yearCustomCats]);

  // â”€â”€ Fuel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const yearFuel         = useMemo(() => fuelFillups.filter((f) => new Date(f.date).getFullYear() === viewYear), [fuelFillups, viewYear]);
  const totalFuelCost    = yearFuel.reduce((s, f) => s + f.totalCost, 0);
  const totalFuelLitres  = yearFuel.reduce((s, f) => s + f.litres, 0);
  const avgPricePerLitre = totalFuelLitres > 0 ? totalFuelCost / totalFuelLitres : 0;
  const sortedFuel       = useMemo(() => [...yearFuel].sort((a, b) => a.date - b.date), [yearFuel]);
  const daysSinceFillup  = sortedFuel.length > 0 ? Math.floor((Date.now() - sortedFuel[sortedFuel.length - 1].date) / 86400000) : null;
  const fuelWithOdo      = sortedFuel.filter((f) => f.odometer && f.odometer > 0);
  const costPerKm        = fuelWithOdo.length >= 2
    ? totalFuelCost / (fuelWithOdo[fuelWithOdo.length - 1].odometer! - fuelWithOdo[0].odometer!)
    : null;

  const monthlyFuel = useMemo(() => {
    const months = MONTHS.map((month) => ({ month, cost: 0, litres: 0 }));
    yearFuel.forEach((f) => { const i = new Date(f.date).getMonth(); months[i].cost += f.totalCost; months[i].litres += f.litres; });
    return months;
  }, [yearFuel]);

  const fuelPriceTrend = useMemo(() =>
    sortedFuel.map((f) => ({
      date: new Date(f.date).toLocaleDateString('en-NA', { month: 'short', day: 'numeric' }),
      price: parseFloat(f.pricePerLitre.toFixed(3)),
      cost: f.totalCost,
      litres: f.litres,
    })),
    [sortedFuel],
  );

  // â”€â”€ Savings goals â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const savingsProgress = useMemo(() =>
    savingsGoals.map((g) => ({ ...g, saved: g.contributions.reduce((s, c) => s + c.amount, 0) })),
    [savingsGoals],
  );
  const savingsComplete = savingsProgress.filter((g) => g.saved >= g.targetAmount).length;

  // â”€â”€ Financial health score (0â€“100) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const healthScore = useMemo(() => {
    const sScore = Math.min(100, Math.max(0, (savingsRate / 20) * 100));
    const bScore = budgetVsActual.length > 0
      ? Math.round(budgetVsActual.filter((b) => b.actual <= b.target).length / budgetVsActual.length * 100)
      : 50;
    const gScore = savingsProgress.length > 0 ? Math.round((savingsComplete / savingsProgress.length) * 100) : 50;
    return Math.round((sScore + bScore + gScore) / 3);
  }, [savingsRate, budgetVsActual, savingsProgress, savingsComplete]);

  // â”€â”€ Auto insights â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const overviewInsights = useMemo(() => {
    const ins: { type: 'good' | 'warn' | 'info'; text: string }[] = [];
    if (savingsRate >= 20) ins.push({ type: 'good', text: `Excellent savings rate of ${savingsRate}% â€” well above the recommended 20%.` });
    else if (savingsRate > 0 && savingsRate < 10) ins.push({ type: 'warn', text: `Savings rate is ${savingsRate}%. Aim for 15â€“20% to build financial resilience.` });
    if (totalExpenses > totalIncome && totalIncome > 0) ins.push({ type: 'warn', text: 'Expenses exceeded income this year. Review your variable spending.' });
    if (savingsComplete > 0) ins.push({ type: 'good', text: `${savingsComplete} savings goal${savingsComplete > 1 ? 's' : ''} fully completed â€” great discipline!` });
    if (prevGroceryTotal > 0 && totalGroceryYTD > prevGroceryTotal * 1.1)
      ins.push({ type: 'warn', text: `Grocery spend is up ${Math.round(((totalGroceryYTD - prevGroceryTotal) / prevGroceryTotal) * 100)}% vs ${viewYear - 1}.` });
    if (ins.length === 0) ins.push({ type: 'info', text: `${viewYear} data loaded. Add transactions and complete trips to see personalised insights.` });
    return ins;
  }, [savingsRate, totalExpenses, totalIncome, savingsComplete, totalGroceryYTD, prevGroceryTotal, viewYear]);

  // â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5 max-w-6xl mx-auto">

      {/* â”€â”€ Page header â”€â”€ */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <div className="p-2 bg-violet-500/10 rounded-xl"><BarChart3 size={20} className="text-violet-400" /></div>
            Analytics
          </h1>
          <p className="text-gray-500 text-sm mt-1 ml-12">Your complete financial intelligence</p>
        </div>

        {/* Year navigator */}
        <div className="flex items-center gap-1 bg-gray-900/70 backdrop-blur-xl border border-violet-500/20 rounded-xl px-1 py-1">
          <button onClick={() => setViewYear((y) => y - 1)} aria-label="Previous year" className="p-2 rounded-lg hover:bg-white/8 text-gray-400 hover:text-gray-200 transition-colors cursor-pointer"><ChevronLeft size={15} /></button>
          <span className="text-sm font-bold text-gray-200 min-w-[52px] text-center tabular-nums">{viewYear}</span>
          <button onClick={() => setViewYear((y) => y + 1)} aria-label="Next year" className="p-2 rounded-lg hover:bg-white/8 text-gray-400 hover:text-gray-200 transition-colors cursor-pointer"><ChevronRight size={15} /></button>
        </div>
      </div>

      {/* â”€â”€ Tab bar â”€â”€ */}
      <div className="flex items-center gap-2 flex-wrap">
        {(Object.keys(TAB_CFG) as TabId[]).map((id) => {
          const { label, Icon, active } = TAB_CFG[id];
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer',
                activeTab === id ? active : 'bg-gray-900/70 text-gray-400 border border-violet-500/20 hover:text-gray-200 hover:border-violet-500/40',
              )}
            >
              <Icon size={14} />{label}
            </button>
          );
        })}
      </div>

      {/* â•â• OVERVIEW â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {activeTab === 'overview' && (
        <div className="space-y-5">

          {/* 6-stat KPI strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <KpiCard icon={<TrendingUp size={15} className="text-emerald-400" />}  label="Income"    value={formatPrice(totalIncome)}   accent="emerald"
              trend={prevIncome > 0 ? (totalIncome >= prevIncome ? 'up' : 'down') : undefined}
              trendVal={prevIncome > 0 ? `${Math.abs(Math.round(((totalIncome-prevIncome)/prevIncome)*100))}%` : undefined}
              sub={`${viewYear} YTD`} delay={0} />
            <KpiCard icon={<TrendingDown size={15} className="text-rose-400" />}   label="Expenses"  value={formatPrice(totalExpenses)} accent="rose"
              trend={prevExpenses > 0 ? (totalExpenses <= prevExpenses ? 'up' : 'down') : undefined}
              trendVal={prevExpenses > 0 ? `${Math.abs(Math.round(((totalExpenses-prevExpenses)/prevExpenses)*100))}%` : undefined}
              sub="Fixed + Variable + Groceries + Fuel" delay={0.05} />
            <KpiCard icon={<PiggyBank size={15} className="text-violet-400" />}    label="Net Saved" value={formatPrice(netSavings)}    accent="violet"  sub={`${savingsRate}% savings rate`} delay={0.1} />
            <KpiCard icon={<ShoppingCart size={15} className="text-amber-400" />}  label="Groceries" value={formatPrice(totalGroceryYTD)} accent="amber" sub={`${totalTripsYTD} trips`} delay={0.15} />
            <KpiCard icon={<Fuel size={15} className="text-purple-400" />}         label="Fuel"      value={formatPrice(totalFuelCost)} accent="purple"  sub={`${totalFuelLitres.toFixed(0)} L`} delay={0.2} />
            <KpiCard icon={<Target size={15} className="text-blue-400" />}         label="Goals"     value={`${savingsComplete}/${savingsProgress.length}`} accent="blue" sub="completed" delay={0.25} />
          </div>

          {/* Health ring + income/expense chart */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

            {/* Financial health gauge */}
            <div className="bg-gray-900/70 backdrop-blur-xl rounded-2xl border border-violet-500/20 p-5 flex flex-col items-center justify-center">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 mb-4">Financial Health</p>
              <div className="relative w-28 h-28">
                <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                  <circle cx="60" cy="60" r="48" fill="none" stroke="#1f2937" strokeWidth="11" />
                  <circle cx="60" cy="60" r="48" fill="none"
                    stroke={healthScore >= 70 ? '#10b981' : healthScore >= 40 ? '#f59e0b' : '#f43f5e'}
                    strokeWidth="11" strokeLinecap="round"
                    strokeDasharray={`${(healthScore / 100) * 301.6} 301.6`}
                    style={{ transition: 'stroke-dasharray 1s ease' }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold font-mono text-white">{healthScore}</span>
                  <span className="text-[10px] text-gray-500">/ 100</span>
                </div>
              </div>
              <p className={cn('text-sm font-semibold mt-3',
                healthScore >= 70 ? 'text-emerald-400' : healthScore >= 40 ? 'text-amber-400' : 'text-rose-400',
              )}>
                {healthScore >= 70 ? 'Excellent' : healthScore >= 40 ? 'Good' : 'Needs Work'}
              </p>
              <div className="mt-5 w-full space-y-2 text-xs">
                {[
                  { label: 'Savings Rate',     pct: Math.min(100, Math.max(0, (savingsRate / 20) * 100)) },
                  { label: 'Budget Adherence', pct: budgetVsActual.length > 0 ? Math.round(budgetVsActual.filter((b) => b.actual <= b.target).length / budgetVsActual.length * 100) : 50 },
                  { label: 'Goal Completion',  pct: savingsProgress.length > 0 ? Math.round((savingsComplete / savingsProgress.length) * 100) : 50 },
                ].map((m) => (
                  <div key={m.label}>
                    <div className="flex justify-between text-gray-500 mb-0.5"><span>{m.label}</span><span className="font-mono">{Math.round(m.pct)}%</span></div>
                    <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }} animate={{ width: `${m.pct}%` }}
                        transition={{ duration: 0.8 }}
                        className={cn('h-full rounded-full', m.pct >= 70 ? 'bg-emerald-500' : m.pct >= 40 ? 'bg-amber-500' : 'bg-rose-500')}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Income vs Expenses bar */}
            <div className="lg:col-span-2 bg-gray-900/70 backdrop-blur-xl rounded-2xl border border-violet-500/20 p-5">
              <h3 className="text-sm font-semibold text-gray-200">Income vs Expenses</h3>
              <p className="text-xs text-gray-500 mt-0.5 mb-4">Monthly comparison â€” {viewYear}</p>
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={monthlyFinance} barGap={3} barCategoryGap="25%">
                  <defs>
                    <linearGradient id="ovIncG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.95} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0.6} />
                    </linearGradient>
                    <linearGradient id="ovExpG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.95} />
                      <stop offset="100%" stopColor="#f43f5e" stopOpacity={0.6} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={G} vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: AX, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: AX, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `N$${(v/1000).toFixed(0)}k`} />
                  <Tooltip content={(props) => <ChartTip {...props} fmtValue={(v: number) => formatPrice(v)} />} />
                  <Bar dataKey="income"   name="Income"   fill="url(#ovIncG)" radius={[4,4,0,0]} />
                  <Bar dataKey="expenses" name="Expenses" fill="url(#ovExpG)" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Net monthly + savings goals */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <ChartCard title="Monthly Net Position" sub="Income minus total expenses each month">
              <ResponsiveContainer width="100%" height={175}>
                <AreaChart data={monthlyFinance}>
                  <defs>
                    <linearGradient id="ovNetG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={G} vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: AX, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: AX, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `N$${(v/1000).toFixed(0)}k`} />
                  <Tooltip content={(props) => <ChartTip {...props} fmtValue={(v: number) => formatPrice(v)} />} />
                  <Area type="monotone" dataKey="net" name="Net" stroke="#8b5cf6" strokeWidth={2} fill="url(#ovNetG)" dot={{ r: 3, fill: '#8b5cf6', strokeWidth: 0 }} />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            {savingsProgress.length > 0 ? (
              <div className="bg-gray-900/70 backdrop-blur-xl rounded-2xl border border-violet-500/20 p-5">
                <h3 className="text-sm font-semibold text-gray-200 mb-4">Savings Goals</h3>
                <div className="space-y-4 max-h-[200px] overflow-y-auto pr-1">
                  {savingsProgress.map((g, i) => {
                    const pct  = g.targetAmount > 0 ? Math.min(Math.round((g.saved / g.targetAmount) * 100), 100) : 0;
                    const done = g.saved >= g.targetAmount;
                    return (
                      <div key={g.id}>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-base">{g.emoji}</span>
                            <span className="text-sm font-medium text-gray-300 truncate max-w-[120px]">{g.name}</span>
                            {done && <span className="text-[10px] bg-emerald-500/15 text-emerald-400 px-1.5 py-0.5 rounded-full font-semibold border border-emerald-500/20">Done</span>}
                          </div>
                          <span className="text-xs font-mono text-gray-400 shrink-0">{formatPrice(g.saved)} <span className="text-gray-600">/ {formatPrice(g.targetAmount)}</span></span>
                        </div>
                        <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.7, delay: i * 0.05 }}
                            className={cn('h-full rounded-full', done ? 'bg-emerald-500' : 'bg-violet-500')}
                          />
                        </div>
                        <p className="text-[10px] text-gray-600 mt-0.5 flex items-center justify-between">
                          <span>{pct}% complete</span>
                          {g.deadline && <span>Due {new Date(g.deadline).toLocaleDateString('en-NA', { month: 'short', year: 'numeric' })}</span>}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="bg-gray-900/70 backdrop-blur-xl rounded-2xl border border-violet-500/20 p-5 flex items-center justify-center">
                <div className="text-center">
                  <Target size={32} className="text-gray-700 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">No savings goals set</p>
                </div>
              </div>
            )}
          </div>

          {/* Smart insights */}
          <div className="space-y-2">
            {overviewInsights.map((ins, i) => <Insight key={i} {...ins} />)}
          </div>
        </div>
      )}

      {/* â•â• FINANCE â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {activeTab === 'finance' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KpiCard icon={<TrendingUp size={15} className="text-emerald-400" />}  label="Income"       value={formatPrice(totalIncome)}
              accent="emerald"
              trend={prevIncome > 0 ? (totalIncome >= prevIncome ? 'up' : 'down') : undefined}
              trendVal={prevIncome > 0 ? `${Math.abs(Math.round(((totalIncome-prevIncome)/prevIncome)*100))}%` : undefined}
              sub={`${viewYear} YTD`} />
            <KpiCard icon={<TrendingDown size={15} className="text-rose-400" />}   label="Expenses"     value={formatPrice(totalExpenses)}
              accent="rose"
              trend={prevExpenses > 0 ? (totalExpenses <= prevExpenses ? 'up' : 'down') : undefined}
              trendVal={prevExpenses > 0 ? `${Math.abs(Math.round(((totalExpenses-prevExpenses)/prevExpenses)*100))}%` : undefined}
              sub="Fixed + Variable + Groceries + Fuel" delay={0.04} />
            <KpiCard icon={<PiggyBank size={15} className="text-violet-400" />}    label="Net Saved"    value={formatPrice(netSavings)}
              accent="violet" sub={netSavings >= 0 ? 'positive cashflow' : 'negative cashflow'} delay={0.08} />
            <KpiCard
              icon={savingsRate >= 15 ? <TrendingUp size={15} className="text-emerald-400" /> : <TrendingDown size={15} className="text-amber-400" />}
              label="Savings Rate" value={`${savingsRate}%`} accent={savingsRate >= 15 ? 'emerald' : 'amber'}
              sub="of income saved" delay={0.12} />
          </div>

          {/* Monthly breakdown */}
          <ChartCard title="Monthly Breakdown" sub={`Income, fixed costs & variable spend â€” ${viewYear}`}>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthlyFinance} barGap={2} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke={G} vertical={false} />
                <XAxis dataKey="month" tick={{ fill: AX, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: AX, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `N$${(v/1000).toFixed(0)}k`} />
                <Tooltip content={(props) => <ChartTip {...props} fmtValue={(v: number) => formatPrice(v)} />} />
                <Legend formatter={(v) => <span className="text-xs text-gray-400">{v}</span>} />
                <Bar dataKey="income"   name="Income"   fill="#10b981" radius={[3,3,0,0]} />
                <Bar dataKey="fixed"    name="Fixed"    fill="#3b82f6" radius={[3,3,0,0]} />
                <Bar dataKey="variable" name="Variable" fill="#f97316" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Budget vs Actual + Expense ranking */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {budgetVsActual.length > 0 && (
              <div className="bg-gray-900/70 backdrop-blur-xl rounded-2xl border border-violet-500/20 p-5">
                <h3 className="text-sm font-semibold text-gray-200">Budget vs Actual</h3>
                <p className="text-xs text-gray-500 mt-0.5 mb-4">Year-to-date planned targets vs real spend</p>
                <div className="space-y-4 max-h-[340px] overflow-y-auto pr-1">
                  {budgetVsActual.map((cat, i) => {
                    const pct  = cat.target > 0 ? Math.min(Math.round((cat.actual / cat.target) * 100), 100) : 0;
                    const over = cat.actual > cat.target;
                    const warn = !over && pct > 80;
                    return (
                      <div key={cat.id}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="flex items-center gap-1.5 text-xs font-medium text-gray-300">
                            <span>{cat.icon}</span>{cat.name}
                          </span>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[10px] text-gray-500 font-mono">/ {formatPrice(cat.target)}</span>
                            <span className={cn('text-xs font-bold font-mono tabular-nums', over ? 'text-rose-400' : 'text-gray-200')}>{formatPrice(cat.actual)}</span>
                          </div>
                        </div>
                        <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.5, delay: i * 0.04 }}
                            className={cn('h-full rounded-full', over ? 'bg-rose-500' : warn ? 'bg-amber-500' : 'bg-emerald-500')}
                          />
                        </div>
                        <p className="text-[10px] text-gray-600 mt-0.5">
                          {over ? `â–² Over by ${formatPrice(cat.actual - cat.target)}` : `${100 - pct}% remaining`}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {categoryExpenses.length > 0 && (
              <div className="bg-gray-900/70 backdrop-blur-xl rounded-2xl border border-violet-500/20 p-5">
                <h3 className="text-sm font-semibold text-gray-200">Expense Ranking</h3>
                <p className="text-xs text-gray-500 mt-0.5 mb-4">Where your money goes this year</p>
                <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
                  {categoryExpenses.map((cat, i) => {
                    const pct = totalExpenses > 0 ? Math.round((cat.amount / totalExpenses) * 100) : 0;
                    const hue = `hsl(${260 - i * 20}, 68%, 58%)`;
                    return (
                      <div key={cat.id} className="flex items-center gap-3">
                        <span className="text-xs text-gray-600 font-mono w-4 shrink-0">{i + 1}</span>
                        <span className="text-base w-6 text-center shrink-0">{cat.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-xs font-medium text-gray-300 truncate">{cat.name}</span>
                            <div className="flex items-center gap-1.5 shrink-0 ml-2">
                              <span className="text-[10px] text-gray-500">{pct}%</span>
                              <span className="text-xs font-bold text-gray-200 font-mono tabular-nums">{formatPrice(cat.amount)}</span>
                            </div>
                          </div>
                          <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.5, delay: i * 0.03 }}
                              className="h-full rounded-full" style={{ backgroundColor: hue }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* â•â• GROCERY â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {activeTab === 'grocery' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KpiCard icon={<ShoppingCart size={15} className="text-amber-400" />} label="Total Spent" value={formatPrice(totalGroceryYTD)}
              accent="amber"
              trend={prevGroceryTotal > 0 ? (totalGroceryYTD <= prevGroceryTotal ? 'up' : 'down') : undefined}
              trendVal={prevGroceryTotal > 0 ? `${Math.abs(Math.round(((totalGroceryYTD-prevGroceryTotal)/prevGroceryTotal)*100))}%` : undefined}
              sub={`${viewYear} YTD`} />
            <KpiCard icon={<DollarSign size={15} className="text-amber-400" />}   label="Avg / Month"  value={formatPrice(totalGroceryYTD / activeMths)}
              accent="amber" sub={`${activeMths} active months`} delay={0.04} />
            <KpiCard icon={<Calendar size={15} className="text-blue-400" />}      label="Trips"        value={String(totalTripsYTD)}
              accent="blue"  sub={totalTripsYTD > 0 ? `Avg ${formatPrice(avgTripSpend)}` : 'this year'} delay={0.08} />
            <KpiCard icon={<Package size={15} className="text-violet-400" />}     label="Items"        value={String(items.length)}
              accent="violet" sub="in item library" delay={0.12} />
          </div>

          {completedTrips.length === 0 ? (
            <div className="bg-gray-900/70 backdrop-blur-xl rounded-2xl border border-violet-500/20 p-14 text-center">
              <ShoppingCart size={32} className="text-gray-700 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">Complete shopping trips to see grocery analytics</p>
            </div>
          ) : (
            <>
              {/* Heatmap + 6-month trend */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                {/* Monthly spend heatmap */}
                <div className="bg-gray-900/70 backdrop-blur-xl rounded-2xl border border-violet-500/20 p-5">
                  <h3 className="text-sm font-semibold text-gray-200">Monthly Heatmap</h3>
                  <p className="text-xs text-gray-500 mt-0.5 mb-4">Spend intensity â€” {viewYear}</p>
                  <div className="grid grid-cols-4 gap-2">
                    {monthlyGrocery.map((m) => {
                      const intensity = m.spent > 0 ? Math.max(0.12, m.spent / maxMonthlyGrocery) : 0;
                      return (
                        <div
                          key={m.month}
                          className="aspect-square rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all"
                          style={{ backgroundColor: m.spent > 0 ? `rgba(251,146,60,${intensity})` : 'rgba(31,41,55,0.6)' }}
                          title={`${m.month}: ${formatPrice(m.spent)}`}
                        >
                          <span className="text-[10px] font-semibold text-gray-400">{m.month}</span>
                          {m.spent > 0 ? (
                            <span className="text-[10px] font-bold font-mono text-white leading-none">
                              {m.spent >= 1000 ? `N$${(m.spent/1000).toFixed(1)}k` : `N$${m.spent.toFixed(0)}`}
                            </span>
                          ) : (
                            <span className="text-[10px] text-gray-700">â€”</span>
                          )}
                          {m.trips > 0 && <span className="text-[9px] text-gray-500">{m.trips}Ã—</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 6-month rolling area */}
                <ChartCard title="6-Month Rolling Trend" sub="Grocery spend over the past 6 months">
                  <ResponsiveContainer width="100%" height={192}>
                    <AreaChart data={groceryTrend6}>
                      <defs>
                        <linearGradient id="grocG" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#f97316" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="#f97316" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={G} vertical={false} />
                      <XAxis dataKey="month" tick={{ fill: AX, fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: AX, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `N$${v}`} />
                      <Tooltip content={(props) => <ChartTip {...props} fmtValue={(v: number) => formatPrice(v)} />} />
                      <Area type="monotone" dataKey="amount" name="Spent" stroke="#f97316" strokeWidth={2} fill="url(#grocG)" dot={{ r: 3, fill: '#f97316', strokeWidth: 0 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartCard>
              </div>

              {/* Category donut + Store breakdown */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {groceryCategoryBreakdown.length > 0 && (
                  <div className="bg-gray-900/70 backdrop-blur-xl rounded-2xl border border-violet-500/20 p-5">
                    <h3 className="text-sm font-semibold text-gray-200 mb-4">By Category</h3>
                    <div className="flex items-center gap-4">
                      <div className="flex-shrink-0">
                        <ResponsiveContainer width={140} height={140}>
                          <PieChart>
                            <Pie data={groceryCategoryBreakdown} cx="50%" cy="50%" innerRadius={38} outerRadius={64} paddingAngle={3} dataKey="value">
                              {groceryCategoryBreakdown.map((e, i) => <Cell key={i} fill={e.color} />)}
                            </Pie>
                            <Tooltip content={(props) => <ChartTip {...props} fmtValue={(v: number) => formatPrice(v)} />} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex-1 min-w-0 space-y-2">
                        {groceryCategoryBreakdown.slice(0, 6).map((cat) => {
                          const pct = totalGroceryYTD > 0 ? Math.round((cat.value / totalGroceryYTD) * 100) : 0;
                          return (
                            <div key={cat.name} className="flex items-center gap-2 text-xs">
                              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                              <span className="text-gray-400 truncate flex-1">{cat.icon} {cat.name}</span>
                              <span className="text-gray-500 font-mono shrink-0">{pct}%</span>
                              <span className="font-semibold text-gray-200 font-mono tabular-nums shrink-0">{formatPrice(cat.value)}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {storeBreakdown.length > 0 && (
                  <div className="bg-gray-900/70 backdrop-blur-xl rounded-2xl border border-violet-500/20 p-5">
                    <h3 className="text-sm font-semibold text-gray-200 mb-4">By Store</h3>
                    <div className="space-y-3.5">
                      {storeBreakdown.map((store, i) => {
                        const pct = totalGroceryYTD > 0 ? Math.round((store.spent / totalGroceryYTD) * 100) : 0;
                        return (
                          <div key={store.name}>
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: store.color }} />
                                <span className="text-sm font-medium text-gray-300">{store.name}</span>
                                <span className="text-[10px] text-gray-600 font-mono">{store.trips} trip{store.trips > 1 ? 's' : ''}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500 font-mono">{pct}%</span>
                                <span className="text-sm font-bold text-gray-200 font-mono tabular-nums">{formatPrice(store.spent)}</span>
                              </div>
                            </div>
                            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                                transition={{ duration: 0.6, delay: i * 0.05 }}
                                className="h-full rounded-full" style={{ backgroundColor: store.color }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* â•â• FUEL â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {activeTab === 'fuel' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KpiCard icon={<Fuel size={15} className="text-purple-400" />}     label="Total Cost"    value={formatPrice(totalFuelCost)}                          accent="purple" sub={`${viewYear} YTD`} />
            <KpiCard icon={<Droplets size={15} className="text-blue-400" />}   label="Total Litres"  value={`${totalFuelLitres.toFixed(1)} L`}                   accent="blue"   sub={`${yearFuel.length} fill-ups`} delay={0.04} />
            <KpiCard icon={<Zap size={15} className="text-amber-400" />}       label="Avg Price / L" value={avgPricePerLitre > 0 ? `N$${avgPricePerLitre.toFixed(2)}` : 'â€”'} accent="amber" delay={0.08} />
            <KpiCard icon={<Calendar size={15} className="text-violet-400" />} label="Days Since"    value={daysSinceFillup !== null ? `${daysSinceFillup}d` : 'â€”'} accent="violet" sub="last fill-up" delay={0.12} />
          </div>

          {costPerKm !== null && (
            <div className="bg-gray-900/70 backdrop-blur-xl rounded-2xl border border-purple-500/20 p-4 flex items-center gap-4">
              <div className="p-3 bg-purple-500/10 rounded-xl flex-shrink-0">
                <Zap size={18} className="text-purple-400" />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">Estimated Cost Per KM</p>
                <p className="text-xl font-bold font-mono text-white tabular-nums">N${costPerKm.toFixed(2)} / km</p>
              </div>
              <div className="ml-auto text-right text-xs text-gray-500">
                <p>Based on odometer</p>
                <p className="font-mono">{fuelWithOdo.length} readings</p>
              </div>
            </div>
          )}

          {yearFuel.length === 0 ? (
            <div className="bg-gray-900/70 backdrop-blur-xl rounded-2xl border border-violet-500/20 p-14 text-center">
              <Fuel size={32} className="text-gray-700 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No fuel data for {viewYear}. Log fill-ups on the Fuel page.</p>
            </div>
          ) : (
            <>
              {/* Price trend + Monthly cost/litres */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {fuelPriceTrend.length > 1 && (
                  <ChartCard title="Price per Litre Trend" sub="How pump prices changed across fill-ups">
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={fuelPriceTrend}>
                        <CartesianGrid strokeDasharray="3 3" stroke={G} vertical={false} />
                        <XAxis dataKey="date" tick={{ fill: AX, fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                        <YAxis tick={{ fill: AX, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `N$${v.toFixed(2)}`} domain={['auto', 'auto']} />
                        <Tooltip content={(props) => <ChartTip {...props} fmtValue={(v: number, n: string) => n === 'price' ? `N$${v.toFixed(2)}/L` : formatPrice(v)} />} />
                        <Line type="monotone" dataKey="price" name="price" stroke="#a855f7" strokeWidth={2.5} dot={{ r: 3, fill: '#a855f7', strokeWidth: 0 }} activeDot={{ r: 5 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartCard>
                )}

                <ChartCard title="Monthly Cost & Volume" sub={`Cost (bars) and litres (line) â€” ${viewYear}`}>
                  <ResponsiveContainer width="100%" height={200}>
                    <ComposedChart data={monthlyFuel}>
                      <CartesianGrid strokeDasharray="3 3" stroke={G} vertical={false} />
                      <XAxis dataKey="month" tick={{ fill: AX, fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis yAxisId="cost"   tick={{ fill: AX, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `N$${v}`} />
                      <YAxis yAxisId="litres" orientation="right" tick={{ fill: AX, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}L`} />
                      <Tooltip content={(props) => <ChartTip {...props} fmtValue={(v: number, n: string) => n === 'cost' ? formatPrice(v) : `${(v as number).toFixed(1)} L`} />} />
                      <Bar  yAxisId="cost"   dataKey="cost"   name="cost"   fill="#a855f7" radius={[4,4,0,0]} fillOpacity={0.85} />
                      <Line yAxisId="litres" dataKey="litres" name="litres" stroke="#06b6d4" strokeWidth={2} dot={{ r: 2, fill: '#06b6d4', strokeWidth: 0 }} type="monotone" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </ChartCard>
              </div>

              {/* Fill-up log */}
              <div className="bg-gray-900/70 backdrop-blur-xl rounded-2xl border border-violet-500/20 overflow-hidden">
                <div className="px-5 py-4 border-b border-violet-500/15">
                  <h3 className="text-sm font-semibold text-gray-200">Fill-up Log</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{viewYear} â€” {yearFuel.length} fill-up{yearFuel.length !== 1 ? 's' : ''}</p>
                </div>
                <div className="divide-y divide-white/[0.04] max-h-[320px] overflow-y-auto">
                  {[...yearFuel].sort((a, b) => b.date - a.date).map((f) => (
                    <div key={f.id} className="px-5 py-3 flex items-center gap-4 hover:bg-gray-800/20 transition-colors">
                      <div className="w-14 shrink-0">
                        <p className="text-[10px] text-gray-500">{new Date(f.date).toLocaleDateString('en-NA', { month: 'short', day: 'numeric' })}</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-300 truncate">{f.stationName || 'Unknown station'}</p>
                        {f.odometer && <p className="text-[10px] text-gray-600 font-mono">{f.odometer.toLocaleString()} km</p>}
                      </div>
                      <div className="text-right shrink-0 hidden sm:block">
                        <p className="text-xs text-gray-500 font-mono">{f.litres.toFixed(1)} L</p>
                        <p className="text-[10px] text-gray-600 font-mono">@ N${f.pricePerLitre.toFixed(2)}/L</p>
                      </div>
                      <p className="text-sm font-bold text-white font-mono tabular-nums shrink-0">{formatPrice(f.totalCost)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* â•â• DATA EXPLORER â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {activeTab === 'explore' && (
        <DataExplorer
          trips={trips} items={items} categories={categories} stores={stores}
          transactions={transactions} financePlans={financePlans} savingsGoals={savingsGoals}
          fuelFillups={fuelFillups} medicalAidPlans={medicalAidPlans}
          medicalAppointments={medicalAppointments} budgets={budgets}
          isDark={isDark} formatPrice={formatPrice}
        />
      )}

    </motion.div>
  );
};

export default Analytics;
