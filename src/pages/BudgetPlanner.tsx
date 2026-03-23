// ==========================================
// BasketBuddy — Budget Planner v2
// Smart Budget Command Center
// Dark-only | Insights | Scenarios | Interactive
// ==========================================

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wallet, Plus, Edit3, TrendingUp, TrendingDown, ChevronLeft, ChevronRight,
  LayoutGrid, Tags, Brain, Target, Zap, AlertTriangle, CheckCircle2,
  Sparkles, BarChart3, RefreshCw, Sliders, ShoppingCart, Flame,
  Calendar, Info,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie,
} from 'recharts';
import { useApp } from '../contexts/AppContext';
import { cn, formatPrice, calcPercentage, getEffectiveUnitPrice } from '../utils/helpers';
import { CURRENCY } from '../config/constants';

// ── Constants ─────────────────────────────────────────────────
const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const TABS = [
  { id: 'overview',  label: 'Overview',  icon: LayoutGrid },
  { id: 'budget',    label: 'Budget',    icon: Tags },
  { id: 'insights',  label: 'Insights',  icon: Brain },
] as const;
type TabId = (typeof TABS)[number]['id'];

// ── Gauge helpers ──────────────────────────────────────────────
const ARC_PATH = 'M 20,100 A 80,80 0 0 1 180,100';
const ARC_LEN  = Math.PI * 80; // ≈ 251.33

function gaugeColor(pct: number): string {
  if (pct >= 100) return '#f43f5e';
  if (pct >= 85)  return '#f97316';
  if (pct >= 65)  return '#f59e0b';
  return '#10b981';
}
function gaugeStatus(pct: number): { text: string; cls: string } {
  if (pct >= 100) return { text: 'Over Budget',  cls: 'text-rose-400' };
  if (pct >= 85)  return { text: 'Critical',      cls: 'text-orange-400' };
  if (pct >= 65)  return { text: 'Watch Out',     cls: 'text-amber-400' };
  if (pct >  0)   return { text: 'On Track',      cls: 'text-emerald-400' };
  return                  { text: 'No Spending',   cls: 'text-gray-500' };
}

// ── SVG Budget Gauge ──────────────────────────────────────────
const BudgetGauge: React.FC<{
  pct: number; spent: number; budget: number; remaining: number;
}> = ({ pct, spent, budget, remaining }) => {
  const color  = gaugeColor(pct);
  const status = gaugeStatus(pct);
  const offset = ARC_LEN * (1 - Math.min(pct / 100, 1));

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-[200px]">
        <svg viewBox="0 0 200 115" className="w-full overflow-visible">
          <defs>
            <filter id="glow"><feGaussianBlur stdDeviation="3" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          </defs>
          {/* Track */}
          <path d={ARC_PATH} fill="none" stroke="#1f2937" strokeWidth="14" strokeLinecap="round" />
          {/* Tick marks */}
          {[0, 25, 50, 75, 100].map((v) => {
            const a = -Math.PI + (Math.PI * v / 100);
            const r = 80; const cx = 100; const cy = 100;
            return <line key={v} x1={cx + r * Math.cos(a)} y1={cy + r * Math.sin(a)} x2={cx + (r + 9) * Math.cos(a)} y2={cy + (r + 9) * Math.sin(a)} stroke="#374151" strokeWidth="1.5" />;
          })}
          {/* Fill arc */}
          <motion.path
            key={pct}
            d={ARC_PATH} fill="none" stroke={color}
            strokeWidth="14" strokeLinecap="round"
            strokeDasharray={ARC_LEN}
            initial={{ strokeDashoffset: ARC_LEN }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            filter="url(#glow)"
          />
          {/* Pct text */}
          <text x="100" y="93" textAnchor="middle" fill="white" style={{ fontSize: '22px', fontFamily: 'ui-monospace, monospace', fontWeight: 700 }}>
            {Math.min(pct, 999)}%
          </text>
        </svg>
        <p className={cn('text-center text-xs font-bold uppercase tracking-widest -mt-1', status.cls)}>{status.text}</p>
      </div>

      {/* Stat row */}
      <div className="flex items-center gap-6 mt-4 text-center">
        {[
          { label: 'Spent',  value: formatPrice(spent),            cls: 'text-gray-100' },
          { label: 'Budget', value: formatPrice(budget),           cls: 'text-gray-100' },
          { label: remaining >= 0 ? 'Remaining' : 'Over', value: formatPrice(Math.abs(remaining)), cls: remaining >= 0 ? 'text-emerald-400' : 'text-rose-400' },
        ].map(({ label, value, cls }, i, arr) => (
          <React.Fragment key={label}>
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">{label}</p>
              <p className={cn('text-sm font-bold font-mono tabular-nums', cls)}>{value}</p>
            </div>
            {i < arr.length - 1 && <div className="w-px h-8 bg-green-500/20" />}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

// ── Dark tooltip ───────────────────────────────────────────────
const DarkTip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 border border-white/10 rounded-xl px-3 py-2.5 shadow-2xl text-xs">
      {label && <p className="text-gray-400 mb-1.5 border-b border-white/5 pb-1">{label}</p>}
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2 py-0.5">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.fill ?? p.color }} />
          <span className="text-gray-400">{p.name}</span>
          <span className="text-white font-bold ml-auto pl-3 font-mono tabular-nums">{formatPrice(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════
const BudgetPlanner: React.FC = () => {
  const { budgets, trips, categories, items, prices, setBudget } = useApp();

  const now = new Date();

  // Billing period: 25th of M → 24th of M+1, named after start month M
  const _current = (() => {
    const d = now.getDate(); const m = now.getMonth() + 1; const y = now.getFullYear();
    if (d <= 24) return m === 1 ? { month: 12, year: y - 1 } : { month: m - 1, year: y };
    return { month: m, year: y };
  })();

  const [viewMonth, setViewMonth] = useState(_current.month);
  const [viewYear,  setViewYear]  = useState(_current.year);
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  // Edit state
  const [catBudgets,  setCatBudgets]  = useState<Record<string, string>>({});
  const [totalInput,  setTotalInput]  = useState('');
  const [editDirty,   setEditDirty]   = useState(false);
  const [selectedCat, setSelectedCat] = useState<string | null>(null);

  // Scenario state
  const [scenarioPct, setScenarioPct] = useState(0);

  const isCurrentPeriod = viewMonth === _current.month && viewYear === _current.year;

  // Billing period date range (25th → 24th)
  const periodStart = new Date(viewYear, viewMonth - 1, 25, 0, 0, 0, 0).getTime();
  const periodEnd   = new Date(viewYear, viewMonth, 24, 23, 59, 59, 999).getTime();

  const billingLabel = (() => {
    const s = new Date(viewYear, viewMonth - 1, 25);
    const e = new Date(viewYear, viewMonth, 24);
    const fmt = (d: Date) => d.toLocaleDateString('en-NA', { day: 'numeric', month: 'short' });
    const ey = e.getFullYear();
    return `${fmt(s)} – ${fmt(e)}${ey !== viewYear ? ` ${ey}` : `, ${viewYear}`}`;
  })();

  const prevMonth = () => { if (viewMonth === 1) { setViewMonth(12); setViewYear(y => y - 1); } else setViewMonth(m => m - 1); };
  const nextMonth = () => { if (isCurrentPeriod) return; if (viewMonth === 12) { setViewMonth(1); setViewYear(y => y + 1); } else setViewMonth(m => m + 1); };

  // ── Current budget ─────────────────────────────────────────
  const currentBudget = useMemo(
    () => budgets.find(b => b.month === viewMonth && b.year === viewYear),
    [budgets, viewMonth, viewYear],
  );

  // ── Period trips (billing period: 25th → 24th) ──────────
  const monthTrips = useMemo(() =>
    trips.filter(t => t.date >= periodStart && t.date <= periodEnd && t.status === 'completed'),
    [trips, periodStart, periodEnd],
  );

  const totalSpent  = useMemo(() => monthTrips.reduce((s, t) => s + t.totalSpent, 0), [monthTrips]);
  const budgetTotal = currentBudget?.totalBudget ?? 0;
  const budgetPct   = budgetTotal > 0 ? Math.round((totalSpent / budgetTotal) * 100) : 0;
  const remaining   = budgetTotal - totalSpent;

  // ── Category spending ──────────────────────────────────────
  const categorySpending = useMemo(() => {
    const map = new Map<string, number>();
    monthTrips.forEach(trip =>
      trip.items.forEach(item => {
        const prev = map.get(item.categoryId) ?? 0;
        map.set(item.categoryId, prev + (item.actualPrice ?? item.estimatedPrice) * item.quantity);
      }),
    );
    return map;
  }, [monthTrips]);

  // ── 6-period history (billing periods 25th→24th) ──────────
  const monthHistory = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      let m = _current.month - (5 - i);
      let y = _current.year;
      while (m <= 0) { m += 12; y--; }
      const pStart = new Date(y, m - 1, 25, 0, 0, 0, 0).getTime();
      const pEnd   = new Date(y, m, 24, 23, 59, 59, 999).getTime();
      const mTrips = trips.filter(t => t.date >= pStart && t.date <= pEnd && t.status === 'completed');
      const spent  = mTrips.reduce((s, t) => s + t.totalSpent, 0);
      const budget = budgets.find(b => b.month === m && b.year === y)?.totalBudget ?? 0;
      return { label: MONTHS_SHORT[m - 1], month: m, year: y, spent, budget };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trips, budgets]);

  // ── Last period data (previous billing period) ────────────
  const lastMonthData = useMemo(() => {
    const lm = viewMonth === 1 ? 12 : viewMonth - 1;
    const ly = viewMonth === 1 ? viewYear - 1 : viewYear;
    const lStart = new Date(ly, lm - 1, 25, 0, 0, 0, 0).getTime();
    const lEnd   = new Date(ly, lm, 24, 23, 59, 59, 999).getTime();
    const lTrips = trips.filter(t => t.date >= lStart && t.date <= lEnd && t.status === 'completed');
    const spent = lTrips.reduce((s, t) => s + t.totalSpent, 0);
    const catSpend = new Map<string, number>();
    lTrips.forEach(t => t.items.forEach(item => {
      const prev = catSpend.get(item.categoryId) ?? 0;
      catSpend.set(item.categoryId, prev + (item.actualPrice ?? item.estimatedPrice) * item.quantity);
    }));
    return { spent, catSpend };
  }, [trips, viewMonth, viewYear]);

  // ── Smart fill (3-period avg per category + 10%) ──────────
  const smartFillAvg = useMemo(() => {
    const catMonthTotals = new Map<string, number[]>();
    for (let i = 1; i <= 3; i++) {
      let m = _current.month - i;
      let y = _current.year;
      while (m <= 0) { m += 12; y--; }
      const pStart = new Date(y, m - 1, 25, 0, 0, 0, 0).getTime();
      const pEnd   = new Date(y, m, 24, 23, 59, 59, 999).getTime();
      const mTrips = trips.filter(t => t.date >= pStart && t.date <= pEnd && t.status === 'completed');
      const monthCatSpend = new Map<string, number>();
      mTrips.forEach(t => t.items.forEach(item => {
        const v = (item.actualPrice ?? item.estimatedPrice) * item.quantity;
        monthCatSpend.set(item.categoryId, (monthCatSpend.get(item.categoryId) ?? 0) + v);
      }));
      monthCatSpend.forEach((v, catId) => {
        const arr = catMonthTotals.get(catId) ?? [];
        arr.push(v);
        catMonthTotals.set(catId, arr);
      });
    }
    const result: Record<string, number> = {};
    catMonthTotals.forEach((vals, catId) => {
      result[catId] = Math.ceil((vals.reduce((s, v) => s + v, 0) / 3) * 1.1);
    });
    return result;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trips]);

  // ── Catalogue totals ───────────────────────────────────────
  const catalogueTotals = useMemo(() => {
    const map = new Map<string, number>();
    items.forEach(item => {
      const itemPrices = prices.filter(p => p.itemId === item.id);
      if (!itemPrices.length) return;
      const best = Math.min(...itemPrices.map(p => getEffectiveUnitPrice(p)));
      map.set(item.categoryId, (map.get(item.categoryId) ?? 0) + best);
    });
    return map;
  }, [items, prices]);

  // ── Items per category (count) ─────────────────────────────
  const itemsPerCategory = useMemo(() => {
    const map = new Map<string, number>();
    items.forEach(item => map.set(item.categoryId, (map.get(item.categoryId) ?? 0) + 1));
    return map;
  }, [items]);

  // ── Categories sorted by item count (Items-library-first) ──
  const orderedCategories = useMemo(() => {
    return [...categories].sort((a, b) => {
      const ac = itemsPerCategory.get(a.id) ?? 0;
      const bc = itemsPerCategory.get(b.id) ?? 0;
      if (bc !== ac) return bc - ac; // more items first
      return a.name.localeCompare(b.name);
    });
  }, [categories, itemsPerCategory]);

  // ── All categories that have items (for Overview completeness)
  const categoriesWithItems = useMemo(
    () => categories.filter(c => (itemsPerCategory.get(c.id) ?? 0) > 0),
    [categories, itemsPerCategory],
  );

  // ── Spending velocity ──────────────────────────────────────
  const velocity = useMemo(() => {
    const periodLength = 30; // billing period is always ~30 days (25th → 24th)
    const periodStartDate = new Date(viewYear, viewMonth - 1, 25);
    const daysPassed = isCurrentPeriod
      ? Math.max(1, Math.round((now.getTime() - periodStartDate.getTime()) / (1000 * 60 * 60 * 24)))
      : periodLength;
    const dailyRate = daysPassed > 0 ? totalSpent / daysPassed : 0;
    const projected = dailyRate * periodLength;
    return { dailyRate, projected, daysInMonth: periodLength, daysPassed };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalSpent, viewMonth, viewYear, isCurrentPeriod]);

  // ── Insights engine ────────────────────────────────────────
  const insights = useMemo(() => {
    type InsightType = 'info' | 'warning' | 'success' | 'tip';
    const list: { type: InsightType; icon: string; title: string; body: string }[] = [];
    const periodEndDate = new Date(viewYear, viewMonth, 24);
    const daysLeft = isCurrentPeriod ? Math.max(0, Math.round((periodEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : 0;

    if (!currentBudget) {
      if (lastMonthData.spent > 0) {
        list.push({ type: 'tip', icon: 'sparkles', title: 'Base it on last month', body: `You spent ${formatPrice(lastMonthData.spent)} last month. A ${formatPrice(Math.ceil(lastMonthData.spent * 1.05))} budget gives you a 5% buffer.` });
      }
      if (totalSpent > 0) {
        list.push({ type: 'info', icon: 'info', title: `Already spent without a budget`, body: `You've spent ${formatPrice(totalSpent)} this month with no budget set. Set one to track against a goal.` });
      }
      return list;
    }

    // Velocity
    if (isCurrentPeriod && velocity.projected > budgetTotal && budgetTotal > 0) {
      list.push({ type: 'warning', icon: 'flame', title: 'Spending velocity too high', body: `At ${formatPrice(velocity.dailyRate)}/day you'll reach ${formatPrice(velocity.projected)} — ${formatPrice(velocity.projected - budgetTotal)} over budget by period end.` });
    } else if (isCurrentPeriod && velocity.projected < budgetTotal * 0.75 && budgetTotal > 0 && totalSpent > 0) {
      list.push({ type: 'success', icon: 'check', title: 'Great pace this period', body: `On track to spend ${formatPrice(velocity.projected)} — well within your ${formatPrice(budgetTotal)} budget. ${formatPrice(budgetTotal - velocity.projected)} projected to save.` });
    }

    // Over-budget categories
    currentBudget.categoryBudgets.forEach(cb => {
      const spent = categorySpending.get(cb.categoryId) ?? 0;
      if (spent > cb.amount && cb.amount > 0) {
        const cat = categories.find(c => c.id === cb.categoryId);
        list.push({ type: 'warning', icon: 'alert', title: `${cat?.name ?? cb.categoryId} exceeded`, body: `${formatPrice(spent)} spent vs ${formatPrice(cb.amount)} budgeted (${Math.round((spent / cb.amount) * 100)}% used). Consider adjusting next month's target.` });
      }
    });

    // Near-limit with days left
    if (isCurrentPeriod && daysLeft > 5) {
      currentBudget.categoryBudgets.forEach(cb => {
        const spent = categorySpending.get(cb.categoryId) ?? 0;
        const p = cb.amount > 0 ? (spent / cb.amount) * 100 : 0;
        if (p >= 80 && p < 100) {
          const cat = categories.find(c => c.id === cb.categoryId);
          list.push({ type: 'warning', icon: 'zap', title: `${cat?.name ?? 'Category'} nearly exhausted`, body: `${Math.round(p)}% used with ${daysLeft} days left. Only ${formatPrice(cb.amount - spent)} remaining — slow down spending here.` });
        }
      });
    }

    // Month comparison
    if (lastMonthData.spent > 0) {
      const diff    = totalSpent - lastMonthData.spent;
      const pctDiff = Math.abs(Math.round((diff / lastMonthData.spent) * 100));
      if (diff < 0 && pctDiff > 5) {
        list.push({ type: 'success', icon: 'trend-down', title: `${pctDiff}% less than last month`, body: `You saved ${formatPrice(Math.abs(diff))} compared to last month's ${formatPrice(lastMonthData.spent)}.` });
      } else if (diff > 0 && pctDiff > 10) {
        list.push({ type: 'info', icon: 'trend-up', title: `${pctDiff}% more than last month`, body: `Spending ${formatPrice(diff)} more than last month. Check which categories increased.` });
      }
    }

    // Untracked categories with spend
    const budgetedIds = new Set(currentBudget.categoryBudgets.map(c => c.categoryId));
    categories.forEach(cat => {
      const spent = categorySpending.get(cat.id) ?? 0;
      if (spent > 0 && !budgetedIds.has(cat.id)) {
        list.push({ type: 'info', icon: 'info', title: `${cat.name} is unbudgeted`, body: `You've spent ${formatPrice(spent)} on ${cat.name} with no budget limit. Add it to your plan for better control.` });
      }
    });

    // Unused categories with high budget
    currentBudget.categoryBudgets.forEach(cb => {
      const spent = categorySpending.get(cb.categoryId) ?? 0;
      if (spent === 0 && cb.amount > 100) {
        const cat = categories.find(c => c.id === cb.categoryId);
        list.push({ type: 'tip', icon: 'info', title: `${cat?.name ?? cb.categoryId} budget unused`, body: `No spending here yet but ${formatPrice(cb.amount)} is reserved. Consider redistributing if not needed.` });
      }
    });

    return list.slice(0, 5);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBudget, budgetTotal, totalSpent, categorySpending, velocity, isCurrentPeriod, lastMonthData, categories, viewMonth, viewYear]);

  // ── Edit state helpers ─────────────────────────────────────
  const initEditState = useCallback(() => {
    const ex: Record<string, string> = {};
    currentBudget?.categoryBudgets.forEach(cb => { ex[cb.categoryId] = cb.amount.toString(); });
    setCatBudgets(ex);
    setTotalInput(currentBudget?.totalBudget?.toString() || '');
    setEditDirty(false);
  }, [currentBudget]);

  const openBudgetTab = useCallback(() => {
    initEditState();
    setActiveTab('budget');
  }, [initEditState]);

  const applySmartFill = (mode: 'avg3' | 'lastMonth' | 'catalogue') => {
    const next: Record<string, string> = {};
    orderedCategories.forEach(cat => {
      let v = 0;
      if (mode === 'avg3')      v = smartFillAvg[cat.id] ?? 0;
      if (mode === 'lastMonth') v = Math.ceil((lastMonthData.catSpend.get(cat.id) ?? 0) * 1.05);
      if (mode === 'catalogue') v = Math.ceil(catalogueTotals.get(cat.id) ?? 0);
      if (v > 0) next[cat.id] = Math.ceil(v).toString();
    });
    setCatBudgets(next);
    setTotalInput('');
    setEditDirty(true);
  };

  const catTotal = useMemo(
    () => Object.values(catBudgets).reduce((s, v) => s + (parseFloat(v) || 0), 0),
    [catBudgets],
  );

  const effectiveBudget = useMemo(() => {
    const proposed = parseFloat(totalInput) || 0;
    return proposed > 0 ? proposed : catTotal;
  }, [totalInput, catTotal]);

  const saveBudget = (e: React.FormEvent) => {
    e.preventDefault();
    if (effectiveBudget <= 0) return;
    const catEntries = Object.entries(catBudgets)
      .filter(([_, v]) => parseFloat(v) > 0)
      .map(([catId, amount]) => ({
        categoryId: catId,
        amount: parseFloat(amount),
        spent: categorySpending.get(catId) ?? 0,
      }));
    setBudget({ month: viewMonth, year: viewYear, totalBudget: effectiveBudget, categoryBudgets: catEntries });
    setEditDirty(false);
    setActiveTab('overview');
  };

  // ── Donut chart data ───────────────────────────────────────
  const donutData = useMemo(() => {
    const entries = Object.entries(catBudgets).filter(([_, v]) => parseFloat(v) > 0);
    if (!entries.length) return [{ name: 'No allocation', value: 1, color: '#374151' }];
    return entries.map(([catId, v]) => {
      const cat = orderedCategories.find(c => c.id === catId);
      return { name: cat?.name ?? catId, value: parseFloat(v), color: cat?.color ?? '#4ade80' };
    });
  }, [catBudgets, orderedCategories]);

  // ── Days left in billing period ───────────────────────────
  const daysLeftInMonth = isCurrentPeriod
    ? Math.max(0, Math.round((new Date(viewYear, viewMonth, 24).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  // ──────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 max-w-4xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Wallet size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Budget Planner</h1>
            <p className="text-xs text-gray-500 mt-0.5">Grocery spending goals &amp; insights</p>
          </div>
        </div>
        <button
          onClick={openBudgetTab}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-lg shadow-emerald-500/20 cursor-pointer"
        >
          {currentBudget ? <><Edit3 size={12} />Edit Budget</> : <><Plus size={12} />Set Budget</>}
        </button>
      </div>

      {/* Month navigator */}
      <div className="flex items-center justify-center gap-3">
        <button onClick={prevMonth} className="p-2 rounded-xl hover:bg-gray-800/60 text-gray-400 hover:text-gray-200 transition-colors cursor-pointer" aria-label="Previous month">
          <ChevronLeft size={18} />
        </button>
        <div className="bg-gray-900/70 backdrop-blur-xl border border-green-500/20 rounded-2xl px-6 py-3 text-center min-w-[230px]">
          <p className="text-base font-bold text-gray-100">{MONTHS[viewMonth - 1]} {viewYear}</p>
          <p className="text-[11px] text-gray-500 mt-0.5">{billingLabel}</p>
          {isCurrentPeriod && <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-green-400 mt-1"><span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />Current Period</span>}
        </div>
        <button onClick={nextMonth} disabled={isCurrentPeriod} className="p-2 rounded-xl hover:bg-gray-800/60 text-gray-400 hover:text-gray-200 transition-colors disabled:opacity-25 disabled:cursor-not-allowed cursor-pointer" aria-label="Next period">
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-gray-900/40 backdrop-blur-xl rounded-2xl border border-green-500/20 p-1.5">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => { if (id === 'budget') initEditState(); setActiveTab(id); }}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer',
              activeTab === id ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/40',
            )}
          >
            <Icon size={12} />{label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }}>

          {/* ════ OVERVIEW ════════════════════════════════════ */}
          {activeTab === 'overview' && (
            <div className="space-y-5">
              {!currentBudget ? (
                /* No budget state */
                <div className="bg-gray-900/70 backdrop-blur-xl rounded-2xl border border-green-500/20 p-14 text-center">
                  <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                    <Wallet size={26} className="text-emerald-400" />
                  </div>
                  <p className="text-base font-semibold text-gray-300">No budget set for {MONTHS[viewMonth - 1]}</p>
                  <p className="text-sm text-gray-500 mt-1 mb-5">
                    {lastMonthData.spent > 0
                      ? `You spent ${formatPrice(lastMonthData.spent)} last month — use that as a starting point.`
                      : 'Set a grocery budget to start tracking your spending goals.'}
                  </p>
                  <button onClick={openBudgetTab} className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer">
                    Create Budget Plan
                  </button>
                  {totalSpent > 0 && (
                    <p className="text-xs text-gray-500 mt-4">Already spent {formatPrice(totalSpent)} this month with no budget set.</p>
                  )}
                </div>
              ) : (
                <>
                  {/* Gauge card */}
                  <div className="bg-gray-900/70 backdrop-blur-xl rounded-2xl border border-green-500/20 p-6 relative overflow-hidden">
                    <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />
                    <BudgetGauge pct={budgetPct} spent={totalSpent} budget={budgetTotal} remaining={remaining} />

                    {/* Quick stat chips */}
                    <div className="grid grid-cols-3 gap-3 mt-6 pt-5 border-t border-white/[0.04]">
                      <div className="bg-gray-800/40 rounded-xl p-3 text-center">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <ShoppingCart size={11} className="text-green-400" />
                          <span className="text-[10px] text-gray-500 uppercase tracking-wider">Trips</span>
                        </div>
                        <p className="text-sm font-bold font-mono text-gray-100">{monthTrips.length}</p>
                      </div>
                      <div className="bg-gray-800/40 rounded-xl p-3 text-center">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <Calendar size={11} className="text-green-400" />
                          <span className="text-[10px] text-gray-500 uppercase tracking-wider">{daysLeftInMonth > 0 ? 'Daily Rate' : 'Avg/day'}</span>
                        </div>
                        <p className="text-sm font-bold font-mono text-gray-100">
                          {velocity.dailyRate > 0 ? formatPrice(velocity.dailyRate) : '—'}
                        </p>
                      </div>
                      <div className="bg-gray-800/40 rounded-xl p-3 text-center">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <Target size={11} className={velocity.projected > budgetTotal && budgetTotal > 0 ? 'text-rose-400' : 'text-emerald-400'} />
                          <span className="text-[10px] text-gray-500 uppercase tracking-wider">Projected</span>
                        </div>
                        <p className={cn('text-sm font-bold font-mono', isCurrentPeriod && velocity.dailyRate > 0 ? (velocity.projected > budgetTotal ? 'text-rose-400' : 'text-emerald-400') : 'text-gray-100')}>
                          {isCurrentPeriod && velocity.dailyRate > 0 ? formatPrice(velocity.projected) : '—'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Category breakdown */}
                  {(() => {
                    // All categories that have a budget, PLUS all categories with items (for full visibility)
                    const budgetedIds = new Set((currentBudget?.categoryBudgets ?? []).map(cb => cb.categoryId));
                    const unbudgetedWithItems = categoriesWithItems.filter(c => !budgetedIds.has(c.id));
                    const hasAnyCategories = (currentBudget?.categoryBudgets.length ?? 0) > 0 || unbudgetedWithItems.length > 0;
                    if (!hasAnyCategories) return null;
                    return (
                  <div className="bg-gray-900/70 backdrop-blur-xl rounded-2xl border border-green-500/20 overflow-hidden">
                    <div className="px-5 py-4 border-b border-white/[0.04] flex items-center justify-between">
                      <h2 className="text-sm font-semibold text-gray-200">Category Breakdown</h2>
                      <span className="text-xs text-gray-500">
                        {(currentBudget?.categoryBudgets.length ?? 0)} budgeted · {categoriesWithItems.length} in library
                      </span>
                    </div>
                    <div className="p-5 space-y-3.5">
                      {/* Budgeted categories */}
                      {[...(currentBudget?.categoryBudgets ?? [])]
                          .sort((a, b) => {
                            const pA = a.amount > 0 ? (categorySpending.get(a.categoryId) ?? 0) / a.amount : 0;
                            const pB = b.amount > 0 ? (categorySpending.get(b.categoryId) ?? 0) / b.amount : 0;
                            return pB - pA;
                          })
                          .map(cb => {
                            const cat    = categories.find(c => c.id === cb.categoryId);
                            const spent  = categorySpending.get(cb.categoryId) ?? 0;
                            const pct    = cb.amount > 0 ? Math.round((spent / cb.amount) * 100) : 0;
                            const color  = pct >= 100 ? '#f43f5e' : pct >= 85 ? '#f97316' : pct >= 65 ? '#f59e0b' : '#10b981';
                            const itemCount = itemsPerCategory.get(cb.categoryId) ?? 0;
                            return (
                              <div key={cb.categoryId} className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="text-base">{cat?.icon}</span>
                                    <span className="text-sm font-medium text-gray-300">{cat?.name ?? cb.categoryId}</span>
                                    {itemCount > 0 && (
                                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-gray-800 text-gray-500 border border-gray-700">
                                        {itemCount} items
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-mono tabular-nums text-gray-200">{formatPrice(spent)}</span>
                                    <span className="text-gray-600">/</span>
                                    <span className="text-xs font-mono tabular-nums text-gray-500">{formatPrice(cb.amount)}</span>
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ color, backgroundColor: `${color}20` }}>{pct}%</span>
                                  </div>
                                </div>
                                <div className="h-2 bg-gray-800/60 rounded-full overflow-hidden">
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.min(pct, 100)}%` }}
                                    transition={{ duration: 0.7, ease: 'easeOut' }}
                                    className="h-full rounded-full"
                                    style={{ backgroundColor: color }}
                                  />
                                </div>
                              </div>
                            );
                          })}

                      {/* Unbudgeted categories from Items library */}
                      {unbudgetedWithItems.length > 0 && (
                        <>
                          <div className="pt-1 pb-0.5 border-t border-white/[0.04]">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600">In library · no budget set</p>
                          </div>
                          {unbudgetedWithItems.map(cat => {
                            const spent = categorySpending.get(cat.id) ?? 0;
                            const itemCount = itemsPerCategory.get(cat.id) ?? 0;
                            const catalogueEst = catalogueTotals.get(cat.id) ?? 0;
                            return (
                              <div key={cat.id} className="flex items-center justify-between py-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-base">{cat.icon}</span>
                                  <span className="text-sm text-gray-400">{cat.name}</span>
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-gray-800 text-gray-500 border border-gray-700">
                                    {itemCount} items
                                  </span>
                                  {spent > 0 && (
                                    <span className="text-[10px] text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded-full border border-amber-500/20">untracked</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  {spent > 0 && <span className="text-sm font-mono font-bold text-amber-400">{formatPrice(spent)}</span>}
                                  {catalogueEst > 0 && !spent && <span className="text-xs font-mono text-gray-600">{formatPrice(catalogueEst)} est.</span>}
                                  <button
                                    onClick={openBudgetTab}
                                    className="text-[10px] px-2 py-0.5 rounded-lg bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 transition-colors cursor-pointer"
                                  >Set budget</button>
                                </div>
                              </div>
                            );
                          })}
                        </>
                      )}

                        {/* Legacy: categories with trip-spending but not in items library */}
                        {categories
                          .filter(c => {
                            const hasBudget = currentBudget?.categoryBudgets.find(cb => cb.categoryId === c.id);
                            const hasLibraryItems = (itemsPerCategory.get(c.id) ?? 0) > 0;
                            return !hasBudget && !hasLibraryItems && (categorySpending.get(c.id) ?? 0) > 0;
                          })
                          .map(cat => (
                            <div key={cat.id} className="flex items-center justify-between py-1.5 border-t border-dashed border-white/[0.05]">
                              <div className="flex items-center gap-2">
                                <span className="text-base">{cat.icon}</span>
                                <span className="text-sm text-gray-400">{cat.name}</span>
                                <span className="text-[10px] text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded-full border border-amber-500/20">untracked spend</span>
                              </div>
                              <span className="text-sm font-mono font-bold text-amber-400">{formatPrice(categorySpending.get(cat.id) ?? 0)}</span>
                            </div>
                          ))}
                    </div>
                  </div>
                    );
                  })()}

                  {/* 6-month trend chart */}
                  <div className="bg-gray-900/70 backdrop-blur-xl rounded-2xl border border-green-500/20 p-5">
                    <h2 className="text-sm font-semibold text-gray-200 mb-4 flex items-center gap-2">
                      <BarChart3 size={14} className="text-emerald-400" />6-Month Trend
                    </h2>
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={monthHistory} barGap={4} barCategoryGap="30%">
                        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                        <XAxis dataKey="label" stroke="#4b5563" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis stroke="#4b5563" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false}
                          tickFormatter={v => `${CURRENCY}${v >= 1000 ? `${Math.round(v / 1000)}k` : v}`} width={42} />
                        <Tooltip content={<DarkTip />} />
                        <Bar dataKey="budget" name="Budget" fill="#374151" radius={[3, 3, 0, 0]} />
                        <Bar dataKey="spent"  name="Spent"  radius={[3, 3, 0, 0]}>
                          {monthHistory.map((entry, i) => (
                            <Cell key={i} fill={
                              entry.month === viewMonth && entry.year === viewYear ? '#4ade80' :
                              entry.budget > 0 && entry.spent > entry.budget ? '#f43f5e' : '#10b981'
                            } />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="flex items-center gap-5 mt-3 justify-center">
                      {[['#374151', 'Budget'], ['#10b981', 'Under budget'], ['#f43f5e', 'Over budget'], ['#4ade80', 'Current']].map(([color, label]) => (
                        <div key={label} className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: color }} />
                          <span className="text-[10px] text-gray-500">{label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ════ BUDGET SETUP ════════════════════════════════ */}
          {activeTab === 'budget' && (
            <form onSubmit={saveBudget} className="space-y-4">

              {/* Smart fill strip */}
              <div className="bg-gray-900/70 backdrop-blur-xl rounded-2xl border border-green-500/20 p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-3 flex items-center gap-1.5">
                  <Sparkles size={10} className="text-green-400" />Smart Fill
                </p>
                <div className="flex flex-wrap gap-2">
                  <button type="button" disabled={Object.keys(smartFillAvg).length === 0}
                    onClick={() => applySmartFill('avg3')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/15 hover:bg-green-500/25 border border-green-500/25 text-green-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer disabled:opacity-30">
                    <BarChart3 size={11} />3-Month Avg + 10%
                  </button>
                  <button type="button" disabled={lastMonthData.spent === 0}
                    onClick={() => applySmartFill('lastMonth')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/25 text-blue-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer disabled:opacity-30">
                    <RefreshCw size={11} />Last Month + 5%
                  </button>
                  <button type="button" disabled={catalogueTotals.size === 0}
                    onClick={() => applySmartFill('catalogue')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/25 text-amber-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer disabled:opacity-30">
                    <Tags size={11} />Catalogue Prices
                  </button>
                  <button type="button"
                    onClick={() => { setCatBudgets({}); setTotalInput(''); setEditDirty(false); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800/60 hover:bg-gray-700/60 border border-green-500/15 text-gray-400 rounded-xl text-xs font-semibold transition-colors cursor-pointer">
                    Clear All
                  </button>
                </div>
              </div>

              {/* 2-column: donut + inputs */}
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

                {/* Live donut chart */}
                <div className="lg:col-span-2 bg-gray-900/70 backdrop-blur-xl rounded-2xl border border-green-500/20 p-5 flex flex-col items-center justify-center min-h-[280px]">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-3">Allocation Preview</p>
                  {catTotal > 0 ? (
                    <>
                      <div className="relative">
                        <PieChart width={170} height={170}>
                          <Pie dataKey="value" data={donutData} cx="50%" cy="50%" innerRadius={52} outerRadius={78} paddingAngle={2} startAngle={90} endAngle={-270}>
                            {donutData.map((d, i) => (
                              <Cell key={i} fill={d.color} opacity={selectedCat ? d.name === selectedCat ? 1 : 0.3 : 1} />
                            ))}
                          </Pie>
                          <Tooltip content={<DarkTip />} />
                        </PieChart>
                        <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                          <p className="text-lg font-bold font-mono text-white tabular-nums">{formatPrice(catTotal)}</p>
                          <p className="text-[10px] text-gray-500">allocated</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-3 justify-center max-w-[190px]">
                        {donutData.map(d => (
                          <button key={d.name} type="button"
                            onClick={() => setSelectedCat(prev => prev === d.name ? null : d.name)}
                            className="flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity">
                            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                            <span className={cn('text-[10px] font-medium', selectedCat === d.name ? 'text-gray-200' : 'text-gray-500')}>{d.name}</span>
                          </button>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center py-8 text-center">
                      <div className="w-16 h-16 rounded-full border-4 border-dashed border-gray-700/60 mb-3 flex items-center justify-center">
                        <Wallet size={20} className="text-gray-700" />
                      </div>
                      <p className="text-xs text-gray-600">Fill in amounts to preview allocation</p>
                    </div>
                  )}
                </div>

                {/* Category inputs */}
                <div className="lg:col-span-3 bg-gray-900/70 backdrop-blur-xl rounded-2xl border border-green-500/20 overflow-hidden">
                  <div className="px-4 py-3 border-b border-white/[0.04] flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Category Budgets</p>
                      <p className="text-[9px] text-gray-700 mt-0.5">Sorted by Items library · {orderedCategories.filter(c => (itemsPerCategory.get(c.id) ?? 0) > 0).length} categories have items</p>
                    </div>
                    <span className="text-[10px] text-gray-600">{CURRENCY} amount / category</span>
                  </div>
                  <div className="divide-y divide-white/[0.04]">
                    {/* Categories that have items in the library — shown first */}
                    {orderedCategories.filter(c => (itemsPerCategory.get(c.id) ?? 0) > 0).map(cat => {
                      const catalogueHint = catalogueTotals.get(cat.id) ?? 0;
                      const spent         = categorySpending.get(cat.id) ?? 0;
                      const budgetVal     = parseFloat(catBudgets[cat.id] || '0') || 0;
                      const itemCount     = itemsPerCategory.get(cat.id) ?? 0;
                      const isHighlighted = selectedCat === cat.name;
                      return (
                        <div key={cat.id} className={cn('flex items-center gap-2.5 px-4 py-2.5 transition-colors', isHighlighted ? 'bg-gray-800/50' : 'hover:bg-gray-800/20')}>
                          <span className="text-base shrink-0" style={{ opacity: selectedCat && !isHighlighted ? 0.4 : 1 }}>
                            {cat.icon}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-300 truncate">{cat.name}</p>
                            <p className="text-[10px] text-gray-600">{itemCount} item{itemCount !== 1 ? 's' : ''} in library</p>
                          </div>
                          {spent > 0 && (
                            <span className="text-[10px] text-gray-500 font-mono tabular-nums shrink-0">{formatPrice(spent)} spent</span>
                          )}
                          <div className="relative w-28 shrink-0">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-gray-500">{CURRENCY}</span>
                            <input
                              type="number" step="0.01" min="0"
                              value={catBudgets[cat.id] || ''}
                              onChange={e => { setCatBudgets({ ...catBudgets, [cat.id]: e.target.value }); setEditDirty(true); }}
                              placeholder={catalogueHint > 0 ? Math.ceil(catalogueHint).toString() : '0'}
                              onFocus={() => setSelectedCat(cat.name)}
                              onBlur={() => setSelectedCat(null)}
                              className={cn(
                                'w-full pl-7 pr-2 py-1.5 bg-gray-800/60 border rounded-lg text-xs text-right text-gray-200 outline-none focus:ring-1 focus:ring-emerald-500 transition-all',
                                budgetVal > 0 && spent > budgetVal ? 'border-rose-500/40' : 'border-green-500/20',
                              )}
                            />
                          </div>
                        </div>
                      );
                    })}

                    {/* Empty categories (no items) — collapsible secondary section */}
                    {orderedCategories.filter(c => (itemsPerCategory.get(c.id) ?? 0) === 0).length > 0 && (
                      <>
                        <div className="px-4 py-2 bg-gray-800/20">
                          <p className="text-[9px] font-bold uppercase tracking-widest text-gray-700">Other categories (no items in library)</p>
                        </div>
                        {orderedCategories.filter(c => (itemsPerCategory.get(c.id) ?? 0) === 0).map(cat => {
                          const catalogueHint = catalogueTotals.get(cat.id) ?? 0;
                          const spent         = categorySpending.get(cat.id) ?? 0;
                          const budgetVal     = parseFloat(catBudgets[cat.id] || '0') || 0;
                          const isHighlighted = selectedCat === cat.name;
                          return (
                            <div key={cat.id} className={cn('flex items-center gap-2.5 px-4 py-2 transition-colors opacity-50 hover:opacity-100', isHighlighted ? 'bg-gray-800/50 opacity-100' : 'hover:bg-gray-800/20')}>
                              <span className="text-base shrink-0">{cat.icon}</span>
                              <span className="flex-1 text-sm text-gray-400 truncate">{cat.name}</span>
                              {spent > 0 && (
                                <span className="text-[10px] text-gray-500 font-mono tabular-nums shrink-0">{formatPrice(spent)} spent</span>
                              )}
                              <div className="relative w-28 shrink-0">
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-gray-500">{CURRENCY}</span>
                                <input
                                  type="number" step="0.01" min="0"
                                  value={catBudgets[cat.id] || ''}
                                  onChange={e => { setCatBudgets({ ...catBudgets, [cat.id]: e.target.value }); setEditDirty(true); }}
                                  placeholder={catalogueHint > 0 ? Math.ceil(catalogueHint).toString() : '0'}
                                  onFocus={() => setSelectedCat(cat.name)}
                                  onBlur={() => setSelectedCat(null)}
                                  className={cn(
                                    'w-full pl-7 pr-2 py-1.5 bg-gray-800/60 border rounded-lg text-xs text-right text-gray-200 outline-none focus:ring-1 focus:ring-emerald-500 transition-all',
                                    budgetVal > 0 && spent > budgetVal ? 'border-rose-500/40' : 'border-green-500/20',
                                  )}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Total + status */}
              <div className="bg-gray-900/70 backdrop-blur-xl rounded-2xl border border-green-500/20 overflow-hidden">
                <div className="flex items-center gap-3 px-5 py-3.5 border-b border-white/[0.04]">
                  <span className="text-sm text-gray-400 flex-1">Category Total <span className="text-xs text-gray-600">(auto)</span></span>
                  <span className="text-base font-bold font-mono text-gray-100 tabular-nums">{formatPrice(catTotal)}</span>
                </div>
                <div className="flex items-center gap-3 px-5 py-3.5">
                  <span className="text-sm text-gray-300 shrink-0">Override Total</span>
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">{CURRENCY}</span>
                    <input
                      type="number" step="0.01" min="0"
                      value={totalInput}
                      onChange={e => { setTotalInput(e.target.value); setEditDirty(true); }}
                      placeholder={catTotal > 0 ? catTotal.toFixed(2) : 'e.g. 5000.00'}
                      className="w-full pl-9 pr-3 py-2 bg-gray-800/60 border border-green-500/20 rounded-xl text-sm text-right font-semibold text-gray-200 outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                    />
                  </div>
                </div>
                {/* Live allocation callout */}
                {(() => {
                  const proposed = parseFloat(totalInput) || 0;
                  if (!catTotal && !proposed) return null;
                  const effective = proposed > 0 ? proposed : catTotal;
                  const diff      = proposed > 0 ? proposed - catTotal : 0;
                  const over      = proposed > 0 && diff < 0;
                  const perfect   = proposed > 0 && Math.abs(diff) < 0.01;
                  const unalloc   = proposed > 0 && diff > 0.01;
                  return (
                    <div className={cn(
                      'px-5 py-2.5 text-xs font-medium border-t flex items-center justify-between',
                      over    ? 'bg-rose-500/8 border-rose-500/20 text-rose-400' :
                      perfect ? 'bg-emerald-500/8 border-emerald-500/20 text-emerald-400' :
                                'bg-amber-500/8 border-amber-500/20 text-amber-400',
                    )}>
                      <span>
                        {!catTotal && proposed > 0 && 'No categories — total budget will be unallocated'}
                        {catTotal > 0 && !proposed && `Using category total as budget: ${formatPrice(catTotal)}`}
                        {perfect && '✓ Categories perfectly match your budget total'}
                        {over && `Categories exceed total by ${formatPrice(Math.abs(diff))}`}
                        {unalloc && `${formatPrice(diff)} unallocated — categories cover ${Math.round((catTotal / effective) * 100)}%`}
                      </span>
                      {unalloc && (
                        <button
                          type="button"
                          onClick={() => {
                            if (categories.length === 0) return;
                            const perCat = diff / categories.length;
                            const updated = { ...catBudgets };
                            categories.forEach(c => {
                              updated[c.id] = ((parseFloat(updated[c.id] || '0') || 0) + perCat).toFixed(2);
                            });
                            setCatBudgets(updated);
                            setEditDirty(true);
                          }}
                          className="ml-2 underline cursor-pointer shrink-0 hover:opacity-80"
                        >
                          Distribute evenly
                        </button>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button type="button"
                  onClick={() => { initEditState(); setActiveTab('overview'); }}
                  className="flex-1 py-2.5 border border-green-500/20 rounded-xl text-sm text-gray-400 hover:bg-gray-800/40 transition-colors cursor-pointer">
                  Cancel
                </button>
                <button type="submit" disabled={effectiveBudget <= 0}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer">
                  Save Budget Plan
                </button>
              </div>
            </form>
          )}

          {/* ════ INSIGHTS ════════════════════════════════════ */}
          {activeTab === 'insights' && (
            <div className="space-y-4">

              {/* Budget health score */}
              {currentBudget && (
                <div className="bg-gray-900/70 backdrop-blur-xl rounded-2xl border border-green-500/20 p-5 relative overflow-hidden">
                  <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1.5">Budget Health Score</p>
                      <p className={cn('text-4xl font-black font-mono tabular-nums',
                        budgetPct < 65 ? 'text-emerald-400' : budgetPct < 85 ? 'text-amber-400' : budgetPct < 100 ? 'text-orange-400' : 'text-rose-400'
                      )}>
                        {Math.max(0, Math.round(100 - budgetPct))}
                        <span className="text-lg text-gray-600 ml-1">/ 100</span>
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {budgetPct < 65  ? 'Excellent — well within your grocery budget' :
                         budgetPct < 85  ? 'Good — keep an eye on spending pace' :
                         budgetPct < 100 ? 'Critical — significantly over pace' :
                                           'Over budget — review your categories'}
                      </p>
                    </div>
                    <div className={cn('w-14 h-14 rounded-2xl flex items-center justify-center shrink-0',
                      budgetPct < 65 ? 'bg-emerald-500/15' : budgetPct < 100 ? 'bg-amber-500/15' : 'bg-rose-500/15'
                    )}>
                      {budgetPct < 65  ? <CheckCircle2 size={24} className="text-emerald-400" /> :
                       budgetPct < 85  ? <Zap size={24} className="text-amber-400" /> :
                       budgetPct < 100 ? <Flame size={24} className="text-orange-400" /> :
                                         <AlertTriangle size={24} className="text-rose-400" />}
                    </div>
                  </div>
                  <div className="mt-3 h-2 bg-gray-800/60 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max(0, Math.min(100 - budgetPct, 100))}%` }}
                      transition={{ duration: 1 }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: budgetPct < 65 ? '#10b981' : budgetPct < 85 ? '#f59e0b' : '#f43f5e' }}
                    />
                  </div>
                </div>
              )}

              {/* Velocity card */}
              {isCurrentPeriod && totalSpent > 0 && currentBudget && (
                <div className={cn('rounded-2xl border p-5', velocity.projected > budgetTotal ? 'bg-rose-500/8 border-rose-500/20' : 'bg-emerald-500/8 border-emerald-500/20')}>
                  <div className="flex items-center gap-2 mb-3">
                    <Zap size={14} className={velocity.projected > budgetTotal ? 'text-rose-400' : 'text-emerald-400'} />
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Spending Velocity</p>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    {[
                      { label: 'Daily Rate',       value: formatPrice(velocity.dailyRate),   cls: 'text-gray-100' },
                      { label: 'Projected Total',  value: formatPrice(velocity.projected),   cls: velocity.projected > budgetTotal ? 'text-rose-400' : 'text-emerald-400' },
                      { label: velocity.projected > budgetTotal ? 'Overrun Est.' : 'Under Est.', value: formatPrice(Math.abs(velocity.projected - budgetTotal)), cls: velocity.projected > budgetTotal ? 'text-rose-400' : 'text-emerald-400' },
                    ].map(({ label, value, cls }) => (
                      <div key={label}>
                        <p className="text-[10px] text-gray-500 mb-1">{label}</p>
                        <p className={cn('text-sm font-bold font-mono tabular-nums', cls)}>{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Personalized insight cards */}
              {insights.length === 0 ? (
                <div className="bg-gray-900/70 backdrop-blur-xl rounded-2xl border border-green-500/20 p-12 text-center">
                  <Sparkles size={24} className="mx-auto text-gray-700 mb-2" />
                  <p className="text-sm text-gray-500">No insights yet — spend more this month or set a budget to see personalised recommendations.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {insights.map((insight, i) => {
                    const colorMap = {
                      info:    'bg-blue-500/8 border-blue-500/20',
                      warning: 'bg-amber-500/8 border-amber-500/20',
                      success: 'bg-emerald-500/8 border-emerald-500/20',
                      tip:     'bg-green-500/8 border-green-500/20',
                    };
                    const IconNode = () => {
                      switch (insight.icon) {
                        case 'sparkles':   return <Sparkles    size={14} className="text-green-400" />;
                        case 'flame':      return <Flame       size={14} className="text-orange-400" />;
                        case 'check':      return <CheckCircle2 size={14} className="text-emerald-400" />;
                        case 'alert':      return <AlertTriangle size={14} className="text-amber-400" />;
                        case 'zap':        return <Zap         size={14} className="text-amber-400" />;
                        case 'trend-up':   return <TrendingUp  size={14} className="text-rose-400" />;
                        case 'trend-down': return <TrendingDown size={14} className="text-emerald-400" />;
                        default:           return <Info        size={14} className="text-blue-400" />;
                      }
                    };
                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.07 }}
                        className={cn('rounded-2xl border p-4', colorMap[insight.type])}
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 shrink-0"><IconNode /></div>
                          <div>
                            <p className="text-sm font-semibold text-gray-200 mb-0.5">{insight.title}</p>
                            <p className="text-xs text-gray-400 leading-relaxed">{insight.body}</p>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {/* ── Scenario Simulator ──────────────────────── */}
              <div className="bg-gray-900/70 backdrop-blur-xl rounded-2xl border border-green-500/20 overflow-hidden">
                <div className="px-5 py-4 border-b border-white/[0.04]">
                  <div className="flex items-center gap-2 mb-0.5">
                    <Sliders size={14} className="text-green-400" />
                    <h2 className="text-sm font-semibold text-gray-200">What-If Scenario</h2>
                  </div>
                  <p className="text-xs text-gray-500">Slide to explore how a different budget would change your position.</p>
                </div>
                <div className="p-5 space-y-4">

                  {/* Presets */}
                  <div className="flex gap-2 flex-wrap">
                    {[{ label: 'Tight (−15%)', val: -15 }, { label: 'Normal (0%)', val: 0 }, { label: 'Generous (+20%)', val: 20 }].map(p => (
                      <button key={p.val} type="button"
                        onClick={() => setScenarioPct(p.val)}
                        className={cn('px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer',
                          scenarioPct === p.val ? 'bg-green-600 text-white' : 'bg-gray-800/60 text-gray-400 hover:text-gray-200 border border-green-500/15'
                        )}>
                        {p.label}
                      </button>
                    ))}
                  </div>

                  {/* Slider */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Budget adjustment</span>
                      <span className={cn('font-bold font-mono', scenarioPct === 0 ? 'text-gray-400' : scenarioPct > 0 ? 'text-emerald-400' : 'text-rose-400')}>
                        {scenarioPct > 0 ? '+' : ''}{scenarioPct}%
                      </span>
                    </div>
                    <input
                      type="range" min={-30} max={30} step={5} value={scenarioPct}
                      onChange={e => setScenarioPct(parseInt(e.target.value))}
                      className="w-full accent-green-600 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-gray-600">
                      <span>−30% (tight)</span><span>0%</span><span>+30% (generous)</span>
                    </div>
                  </div>

                  {/* Result */}
                  {(() => {
                    const base     = budgetTotal || lastMonthData.spent || 0;
                    const adjusted = base * (1 + scenarioPct / 100);
                    const leftover = adjusted - totalSpent;
                    const adjPct   = adjusted > 0 ? Math.round((totalSpent / adjusted) * 100) : 0;
                    const color    = adjPct >= 100 ? '#f43f5e' : adjPct >= 85 ? '#f97316' : '#10b981';
                    if (base === 0) {
                      return (
                        <div className="bg-gray-800/30 rounded-xl p-4 text-center">
                          <p className="text-xs text-gray-500">Set a budget or generate spending history to use the scenario simulator.</p>
                        </div>
                      );
                    }
                    return (
                      <div className="bg-gray-800/40 rounded-xl p-4 space-y-3">
                        <div className="grid grid-cols-3 gap-3 text-center">
                          {[
                            { label: 'Adjusted Budget', value: formatPrice(adjusted), cls: 'text-gray-100' },
                            { label: 'Current Spent',   value: formatPrice(totalSpent), cls: 'text-gray-100' },
                            { label: leftover >= 0 ? 'Remaining' : 'Over by', value: formatPrice(Math.abs(leftover)), cls: leftover >= 0 ? 'text-emerald-400' : 'text-rose-400' },
                          ].map(({ label, value, cls }) => (
                            <div key={label}>
                              <p className="text-[10px] text-gray-500 mb-0.5">{label}</p>
                              <p className={cn('text-sm font-bold font-mono tabular-nums', cls)}>{value}</p>
                            </div>
                          ))}
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs"><span className="text-gray-500">Budget usage</span><span className="font-semibold font-mono" style={{ color }}>{adjPct}%</span></div>
                          <div className="h-2 bg-gray-700/60 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-300" style={{ width: `${Math.min(adjPct, 100)}%`, backgroundColor: color }} />
                          </div>
                        </div>
                        {scenarioPct !== 0 && budgetTotal > 0 && (
                          <p className="text-xs text-gray-500 text-center border-t border-white/[0.05] pt-2">
                            {scenarioPct > 0
                              ? `A ${formatPrice(adjusted - base)} increase gives you ${formatPrice(Math.abs(leftover))} more room`
                              : `Cutting ${formatPrice(base - adjusted)} means you ${leftover < 0 ? `overspend by ${formatPrice(Math.abs(leftover))}` : `still have ${formatPrice(leftover)} left`}`}
                          </p>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Monthly history table */}
              {monthHistory.some(h => h.spent > 0 || h.budget > 0) && (
                <div className="bg-gray-900/70 backdrop-blur-xl rounded-2xl border border-green-500/20 overflow-hidden">
                  <div className="px-5 py-4 border-b border-white/[0.04]">
                    <h2 className="text-sm font-semibold text-gray-200">Monthly History</h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs min-w-[320px]">
                      <thead>
                        <tr className="border-b border-white/[0.04]">
                          <th className="text-left px-5 py-2.5 text-gray-500 font-semibold uppercase tracking-wider">Month</th>
                          <th className="text-right px-4 py-2.5 text-gray-500 font-semibold uppercase tracking-wider">Budget</th>
                          <th className="text-right px-4 py-2.5 text-gray-500 font-semibold uppercase tracking-wider">Spent</th>
                          <th className="text-right px-5 py-2.5 text-gray-500 font-semibold uppercase tracking-wider">Usage</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.04]">
                        {[...monthHistory].reverse().filter(h => h.spent > 0 || h.budget > 0).map((h, idx) => {
                          const pct = h.budget > 0 ? Math.round((h.spent / h.budget) * 100) : null;
                          const c   = pct === null ? '#9ca3af' : pct >= 100 ? '#f43f5e' : pct >= 85 ? '#f97316' : '#10b981';
                          const isView = h.month === viewMonth && h.year === viewYear;
                          return (
                            <tr key={idx} className={cn('transition-colors', isView ? 'bg-green-500/8' : 'hover:bg-gray-800/20')}>
                              <td className="px-5 py-2.5 font-medium text-gray-300">
                                {h.label}{h.year !== now.getFullYear() ? ` ${h.year}` : ''}{isView ? ' ← now' : ''}
                              </td>
                              <td className="px-4 py-2.5 text-right font-mono tabular-nums text-gray-400">{h.budget > 0 ? formatPrice(h.budget) : '—'}</td>
                              <td className="px-4 py-2.5 text-right font-mono tabular-nums text-gray-200">{h.spent > 0 ? formatPrice(h.spent) : '—'}</td>
                              <td className="px-5 py-2.5 text-right">
                                {pct !== null
                                  ? <span className="font-bold px-2 py-0.5 rounded-full text-[10px]" style={{ color: c, backgroundColor: `${c}20` }}>{pct}%</span>
                                  : h.spent > 0 ? <span className="text-gray-500 text-[10px]">No budget</span>
                                  : <span className="text-gray-700">—</span>}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default BudgetPlanner;
