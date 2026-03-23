// ==========================================
// BasketBuddy — Data Explorer v2
// Command-centre layout: live stats + smart search + AI assistant
// ==========================================

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Bot, Send, TrendingUp, Package, ShoppingCart,
  Tag, X, Sparkles, Hash, DollarSign, BarChart2,
  Clock, AlertCircle, CheckCircle2, RefreshCw,
  Wallet, PiggyBank, Target, Fuel as FuelIcon, Calendar, Activity,
  Heart, TrendingDown, ArrowUpCircle, ArrowDownCircle, Droplet,
  Database, MapPin, ShoppingBag, Layers,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie,
} from 'recharts';

import {
  ShoppingTrip, GroceryItem, Category, Store, FinanceTransaction,
  FinancePlan, SavingsGoal, FuelFillup, MedicalAidPlan, MedicalAppointment, MonthlyBudget,
} from '../../types';
import { formatPrice, cn } from '../../utils/helpers';

// ── Types ──────────────────────────────────────────────────────────
interface ItemStat {
  itemId: string;
  itemName: string;
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  categoryIcon: string;
  purchaseCount: number;
  totalSpent: number;
  avgPerPurchase: number;
  lastBought: number;
  priceHistory: { date: number; price: number }[];
}

interface CategoryStat {
  categoryId: string;
  name: string;
  icon: string;
  color: string;
  totalSpent: number;
  itemCount: number;
  tripCount: number;
}

interface StoreStat {
  storeId: string;
  name: string;
  color: string;
  totalSpent: number;
  tripCount: number;
  avgTrip: number;
}

type InsightType =
  | 'item-detail'
  | 'top-items'
  | 'top-categories'
  | 'top-stores'
  | 'trip-summary'
  | 'finance-summary'
  | 'fuel-summary'
  | 'savings-goals'
  | 'medical-appointments'
  | 'budget-status'
  | 'financial-health'
  | 'general'
  | 'not-found'
  | 'welcome';

interface FinanceSummaryData {
  totalIncome: number;
  totalExpenses: number;
  netSavings: number;
  savingsRate: number;
}
interface FuelSummaryData {
  totalCost: number;
  totalLitres: number;
  avgPricePerLitre: number;
  fillupCount: number;
}
interface SavingsGoalData extends SavingsGoal {
  saved: number;
  percentComplete: number;
}
interface BudgetStatusData {
  status: 'on-track' | 'over-budget' | 'under-budget';
  categories: { name: string; budgeted: number; actual: number; status: 'good' | 'warning' | 'over' }[];
}

type AssistantData =
  | ItemStat[]
  | CategoryStat[]
  | StoreStat[]
  | { items: ItemStat[]; metric: 'count' | 'spend' }
  | { avgTrip: number; totalTrips: number; totalGrocery: number }
  | { topItem?: ItemStat; topCategory?: CategoryStat; topStore?: StoreStat }
  | FinanceSummaryData
  | FuelSummaryData
  | SavingsGoalData[]
  | MedicalAppointment[]
  | BudgetStatusData;

interface AssistantMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  insightType?: InsightType;
  data?: AssistantData;
  timestamp: number;
}

interface DataExplorerProps {
  trips: ShoppingTrip[];
  items: GroceryItem[];
  categories: Category[];
  stores: Store[];
  transactions: FinanceTransaction[];
  financePlans: FinancePlan[];
  savingsGoals: SavingsGoal[];
  fuelFillups: FuelFillup[];
  medicalAidPlans: MedicalAidPlan[];
  medicalAppointments: MedicalAppointment[];
  budgets: MonthlyBudget[];
  isDark: boolean;
  formatPrice: (n: number) => string;
}

// ── Quick-action chips ─────────────────────────────────────────────
const CHIPS = [
  { icon: <Wallet size={11} />,       label: 'Financial health', query: 'Give me a complete financial summary' },
  { icon: <Target size={11} />,       label: 'Savings goals',    query: 'Show my savings goals progress' },
  { icon: <FuelIcon size={11} />,     label: 'Fuel this year',   query: 'How much did I spend on fuel this year?' },
  { icon: <ShoppingCart size={11} />, label: 'Most bought',      query: 'What did I buy the most?' },
  { icon: <Tag size={11} />,          label: 'Top category',     query: 'Which category did I spend most on?' },
  { icon: <Calendar size={11} />,     label: 'Appointments',     query: 'Do I have upcoming medical appointments?' },
  { icon: <Activity size={11} />,     label: 'Budget status',    query: 'Am I within my budget?' },
  { icon: <BarChart2 size={11} />,    label: 'Avg trip cost',    query: "What's my average shopping trip cost?" },
];

// ── Stats builders ─────────────────────────────────────────────────
function buildItemStats(trips: ShoppingTrip[], items: GroceryItem[], cats: Category[]): ItemStat[] {
  const map = new Map<string, {
    itemId: string; totalSpent: number; purchaseCount: number; lastBought: number;
    priceHistory: { date: number; price: number }[]; itemName: string; categoryId: string;
  }>();
  trips.forEach((trip) => {
    trip.items.forEach((ti) => {
      const unitPrice = ti.actualPrice ?? ti.estimatedPrice;
      const key = (ti.itemName || ti.itemId).toLowerCase().trim();
      const ex = map.get(key);
      if (ex) {
        ex.totalSpent += unitPrice * ti.quantity;
        ex.purchaseCount += 1;
        ex.lastBought = Math.max(ex.lastBought, trip.date);
        ex.priceHistory.push({ date: trip.date, price: unitPrice });
      } else {
        const gi = items.find((i) => i.id === ti.itemId);
        map.set(key, {
          itemId: ti.itemId || key, totalSpent: unitPrice * ti.quantity, purchaseCount: 1,
          lastBought: trip.date, priceHistory: [{ date: trip.date, price: unitPrice }],
          itemName: ti.itemName || gi?.name || 'Unknown', categoryId: ti.categoryId || gi?.categoryId || '',
        });
      }
    });
  });
  return Array.from(map.values()).map((s) => {
    const cat = cats.find((c) => c.id === s.categoryId);
    return {
      itemId: s.itemId, itemName: s.itemName, categoryId: s.categoryId,
      categoryName: cat?.name ?? 'Other', categoryColor: cat?.color ?? '#94a3b8', categoryIcon: cat?.icon ?? '📦',
      purchaseCount: s.purchaseCount, totalSpent: s.totalSpent, avgPerPurchase: s.totalSpent / s.purchaseCount,
      lastBought: s.lastBought, priceHistory: s.priceHistory.sort((a, b) => a.date - b.date),
    };
  }).sort((a, b) => b.totalSpent - a.totalSpent);
}

function buildCategoryStats(trips: ShoppingTrip[], cats: Category[]): CategoryStat[] {
  const map = new Map<string, { totalSpent: number; itemCount: number; tripIds: Set<string> }>();
  trips.forEach((trip) => trip.items.forEach((ti) => {
    const price = (ti.actualPrice ?? ti.estimatedPrice) * ti.quantity;
    const ex = map.get(ti.categoryId);
    if (ex) { ex.totalSpent += price; ex.itemCount += 1; ex.tripIds.add(trip.id); }
    else map.set(ti.categoryId, { totalSpent: price, itemCount: 1, tripIds: new Set([trip.id]) });
  }));
  return Array.from(map.entries()).map(([catId, s]) => {
    const cat = cats.find((c) => c.id === catId);
    return {
      categoryId: catId, name: cat?.name ?? 'Other', icon: cat?.icon ?? '📦',
      color: cat?.color ?? '#94a3b8', totalSpent: s.totalSpent, itemCount: s.itemCount, tripCount: s.tripIds.size,
    };
  }).sort((a, b) => b.totalSpent - a.totalSpent);
}

function buildStoreStats(trips: ShoppingTrip[], stores: Store[]): StoreStat[] {
  const map = new Map<string, { totalSpent: number; tripCount: number }>();
  trips.forEach((t) => {
    const ex = map.get(t.storeId);
    if (ex) { ex.totalSpent += t.totalSpent; ex.tripCount += 1; }
    else map.set(t.storeId, { totalSpent: t.totalSpent, tripCount: 1 });
  });
  return Array.from(map.entries()).map(([sid, s]) => {
    const store = stores.find((st) => st.id === sid);
    return { storeId: sid, name: store?.name ?? 'Unknown', color: store?.color ?? '#94a3b8', totalSpent: s.totalSpent, tripCount: s.tripCount, avgTrip: s.totalSpent / s.tripCount };
  }).sort((a, b) => b.totalSpent - a.totalSpent);
}

// ── Query processor ────────────────────────────────────────────────
function processQuery(
  raw: string,
  itemStats: ItemStat[], categoryStats: CategoryStat[], storeStats: StoreStat[],
  completedTrips: ShoppingTrip[], transactions: FinanceTransaction[],
  fuelFillups: FuelFillup[], savingsGoals: SavingsGoal[],
  medicalAppointments: MedicalAppointment[], budgets: MonthlyBudget[],
): AssistantMessage {
  const q = raw.toLowerCase().trim();
  const id = Math.random().toString(36).slice(2);
  const base = { id, role: 'assistant' as const, timestamp: Date.now() };
  const totalGrocery = completedTrips.reduce((s, t) => s + t.totalSpent, 0);
  const avgTrip = completedTrips.length > 0 ? totalGrocery / completedTrips.length : 0;

  // Finance
  if (q.match(/financial\s+(health|summary|overview)/i) || q.match(/complete\s+financial/i) || q.match(/overall\s+(financial|money|finance)/i)) {
    const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const totalExpenses = transactions.filter(t => t.type !== 'income').reduce((s, t) => s + t.amount, 0);
    const netSavings = totalIncome - totalExpenses;
    const savingsRate = totalIncome > 0 ? Math.round((netSavings / totalIncome) * 100) : 0;
    return { ...base, insightType: 'financial-health', text: `Here's your complete financial overview: You've earned **${formatPrice(totalIncome)}** and spent **${formatPrice(totalExpenses)}**, saving **${savingsRate}%** of your income.`, data: { totalIncome, totalExpenses, netSavings, savingsRate } as FinanceSummaryData };
  }
  if (q.match(/(?:how much|what's my|total)\s+income/i) || q.match(/income\s+(?:this month|this year)/i) || q.match(/biggest\s+expenses?/i) || q.match(/what.*spending.*most/i) || q.match(/top\s+expenses?/i) || q.match(/savings?\s+rate/i) || q.match(/how much.*saving/i)) {
    const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const totalExpenses = transactions.filter(t => t.type !== 'income').reduce((s, t) => s + t.amount, 0);
    const netSavings = totalIncome - totalExpenses;
    const savingsRate = totalIncome > 0 ? Math.round((netSavings / totalIncome) * 100) : 0;
    return { ...base, insightType: 'finance-summary', text: `Your total income is **${formatPrice(totalIncome)}**, expenses **${formatPrice(totalExpenses)}**. Savings rate: **${savingsRate}%**.`, data: { totalIncome, totalExpenses, netSavings, savingsRate } as FinanceSummaryData };
  }

  // Fuel
  if (q.match(/fuel/i) || q.match(/petrol|diesel|gas/i)) {
    const totalCost = fuelFillups.reduce((s, f) => s + f.totalCost, 0);
    const totalLitres = fuelFillups.reduce((s, f) => s + f.litres, 0);
    const avgPricePerLitre = totalLitres > 0 ? totalCost / totalLitres : 0;
    const fillupCount = fuelFillups.length;
    if (fillupCount === 0) return { ...base, insightType: 'not-found', text: 'No fuel fill-up records yet. Start tracking on the Fuel page.' };
    return { ...base, insightType: 'fuel-summary', text: `You've spent **${formatPrice(totalCost)}** on fuel across **${fillupCount}** fill-ups. Avg price: **${formatPrice(avgPricePerLitre)}/L**.`, data: { totalCost, totalLitres, avgPricePerLitre, fillupCount } as FuelSummaryData };
  }

  // Savings goals
  if (q.match(/savings?\s+goals?/i) || q.match(/goals?\s+progress/i) || q.match(/how.*goals?/i) || q.match(/closest.*completing/i) || q.match(/almost.*done/i)) {
    if (savingsGoals.length === 0) return { ...base, insightType: 'not-found', text: 'No savings goals set yet. Create one to start tracking!' };
    const withProgress = savingsGoals.map(g => { const saved = g.contributions.reduce((s, c) => s + c.amount, 0); return { ...g, saved, percentComplete: Math.min(100, Math.round((saved / g.targetAmount) * 100)) }; });
    const completed = withProgress.filter(g => g.saved >= g.targetAmount).length;
    return { ...base, insightType: 'savings-goals', text: `You have **${savingsGoals.length}** savings goal${savingsGoals.length !== 1 ? 's' : ''}${completed > 0 ? `, **${completed}** completed 🎉` : '.'}`, data: withProgress as SavingsGoalData[] };
  }

  // Medical
  if (q.match(/(?:upcoming|next|future)\s+appointments?/i) || q.match(/appointments?.*(?:upcoming|next|this\s+(?:week|month))/i) || q.match(/(?:do i have|any)\s+appointments?/i)) {
    const now = Date.now();
    const upcoming = medicalAppointments.filter(a => a.status === 'upcoming' && a.date >= now).sort((a, b) => a.date - b.date).slice(0, 5);
    if (upcoming.length === 0) return { ...base, insightType: 'not-found', text: 'No upcoming medical appointments scheduled.' };
    return { ...base, insightType: 'medical-appointments', text: `You have **${upcoming.length}** upcoming appointment${upcoming.length !== 1 ? 's' : ''}. Next: **${upcoming[0].practitioner}** on ${new Date(upcoming[0].date).toLocaleDateString('en-NA', { month: 'long', day: 'numeric' })}.`, data: upcoming };
  }

  // Budget
  if (q.match(/budget/i) && (q.match(/status|health|how.*doing/i) || q.match(/within|over|under/i) || q.match(/am i/i))) {
    const now2 = new Date(); const m = now2.getMonth() + 1; const y = now2.getFullYear();
    const mTx = transactions.filter(t => t.month === m && t.year === y && t.type !== 'income');
    const totalExp = mTx.reduce((s, t) => s + t.amount, 0);
    const cb = budgets.find(b => b.month === m && b.year === y);
    const bLimit = cb?.totalBudget || 0;
    const status = bLimit === 0 ? 'under-budget' : totalExp > bLimit * 1.05 ? 'over-budget' : totalExp > bLimit * 0.9 ? 'on-track' : 'under-budget';
    const cats2 = cb?.categoryBudgets.map(c2 => { const cExp = mTx.filter(t => t.category === c2.categoryId).reduce((s, t) => s + t.amount, 0); return { name: c2.categoryId, budgeted: c2.amount, actual: cExp, status: (cExp > c2.amount * 1.1 ? 'over' : cExp > c2.amount * 0.85 ? 'warning' : 'good') as 'good' | 'warning' | 'over' }; }) || [];
    const sm = status === 'over-budget' ? `You're **over budget** — ${formatPrice(totalExp)} spent vs ${formatPrice(bLimit)} budgeted.` : status === 'on-track' ? `You're **on track** — ${formatPrice(totalExp)} of ${formatPrice(bLimit)} budget.` : `**Under budget** — ${formatPrice(bLimit - totalExp)} remaining.`;
    return { ...base, insightType: 'budget-status', text: sm, data: { status, categories: cats2 } as BudgetStatusData };
  }

  // Item search
  const boughtPatterns = [
    /(?:how many times|how often)(?:\s+did\s+i|\s+have\s+i)?\s+(?:buy|bought|purchase|get)\s+(.+)/i,
    /(?:times|count|frequency|often)\s+(?:i bought|bought|purchased|i purchased)\s+(.+)/i,
    /(.+?)\s+(?:purchase count|times bought|how many times|frequency)/i,
    /(?:search|find|look up|lookup)\s+(.+)/i,
    /how much (?:did i spend|have i spent|do i spend) on (.+)/i,
  ];
  for (const p of boughtPatterns) {
    const match = q.match(p);
    if (match) {
      const term = match[1].replace(/[?!]/g, '').trim();
      const found = itemStats.filter(i => i.itemName.toLowerCase().includes(term));
      if (found.length > 0) return { ...base, insightType: 'item-detail', text: `Found "${found[0].itemName}" — ${found[0].purchaseCount} purchase${found[0].purchaseCount !== 1 ? 's' : ''}, total ${formatPrice(found[0].totalSpent)}.`, data: found.slice(0, 5) as ItemStat[] };
      return { ...base, insightType: 'not-found', text: `I couldn't find "${term}" in your purchase history.` };
    }
  }

  // Top items
  if (q.match(/most(?:\s+(?:bought|purchased|frequent))|what.*(?:bought the most|buy the most)/i)) {
    const top = itemStats.slice(0, 5);
    if (top.length === 0) return { ...base, insightType: 'not-found', text: 'No purchase history yet.' };
    return { ...base, insightType: 'top-items', text: `Most frequently bought: **${top[0].itemName}** — ${top[0].purchaseCount} times.`, data: { items: top, metric: 'count' } };
  }
  if (q.match(/top\s*(\d+)?\s*(?:most expensive|expensive|cost|costly|pricey|spend)\s*items?/i) || q.match(/(?:most expensive|highest cost|highest spend)\s*(?:items?|products?)/i)) {
    const n = parseInt(q.match(/top\s*(\d+)/i)?.[1] ?? '5', 10);
    const top = itemStats.slice(0, Math.min(n, 10));
    if (top.length === 0) return { ...base, insightType: 'not-found', text: 'No data yet.' };
    return { ...base, insightType: 'top-items', text: `Your top ${top.length} highest-spend items, all-time.`, data: { items: top, metric: 'spend' } };
  }

  // Categories / stores / trips
  if (q.match(/(?:which|what|biggest|most|highest|top)\s+categor/i) || q.match(/categor.*(?:most|spend|spent|highest|biggest|top)/i)) {
    if (categoryStats.length === 0) return { ...base, insightType: 'not-found', text: 'No category data yet.' };
    return { ...base, insightType: 'top-categories', text: `Biggest grocery category: **${categoryStats[0].name}** — ${formatPrice(categoryStats[0].totalSpent)}.`, data: categoryStats.slice(0, 8) as CategoryStat[] };
  }
  if (q.match(/(?:which|what|most|top|best|biggest)\s+store/i) || q.match(/store.*(?:spend|spent|most)/i)) {
    if (storeStats.length === 0) return { ...base, insightType: 'not-found', text: 'No store data yet.' };
    return { ...base, insightType: 'top-stores', text: `You spend most at **${storeStats[0].name}** — ${formatPrice(storeStats[0].totalSpent)} across ${storeStats[0].tripCount} trips.`, data: storeStats.slice(0, 6) as StoreStat[] };
  }
  if (q.match(/average.*trip|trip.*average|avg.*trip/i) || q.match(/total.*(?:grocery|groceries|shopping|spend|spent)/i) || q.match(/how many (?:trips|shopping trips)/i)) {
    return { ...base, insightType: 'trip-summary', text: `You've completed **${completedTrips.length}** trips, averaging ${formatPrice(avgTrip)} each. Total grocery spend: **${formatPrice(totalGrocery)}**.`, data: { avgTrip, totalTrips: completedTrips.length, totalGrocery } };
  }
  if (q.match(/insight|tip|advice|suggest|recommend/i)) {
    const top = itemStats[0]; const topCat = categoryStats[0]; const topStore = storeStats[0];
    return { ...base, insightType: 'general', text: `Snapshot: ${top ? `You buy **${top.itemName}** most often (${top.purchaseCount}×). ` : ''}${topCat ? `**${topCat.name}** is your biggest grocery category (${formatPrice(topCat.totalSpent)}). ` : ''}${topStore ? `You visit **${topStore.name}** most (${topStore.tripCount} trips).` : ''}`, data: { topItem: top, topCategory: topCat, topStore } };
  }

  return { ...base, insightType: 'general', text: `I can help with: item searches, top spends, category or store analysis, finance summaries, fuel costs, savings goals, budgets, and medical appointments.\n\nTry: "How many times did I buy milk?" or "Show my savings goals".` };
}

// ── Formatted text ────────────────────────────────────────────────
const FormattedText: React.FC<{ text: string }> = ({ text }) => {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">
      {parts.map((p, i) => p.startsWith('**') && p.endsWith('**')
        ? <strong key={i} className="font-semibold text-white">{p.slice(2, -2)}</strong>
        : p
      )}
    </p>
  );
};

// ── Dark chart tooltip ────────────────────────────────────────────
const DarkTip = ({ active, payload, label, fmt: fmtFn }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 border border-white/10 rounded-xl px-3 py-2.5 shadow-2xl text-xs">
      {label && <p className="text-gray-400 mb-1.5 border-b border-white/5 pb-1">{label}</p>}
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2 py-0.5">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-gray-400">{p.name}</span>
          <span className="text-white font-bold ml-auto pl-3 font-mono tabular-nums">
            {fmtFn ? fmtFn(p.value, p.name, p) : formatPrice(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
};

// ── Response cards ────────────────────────────────────────────────
const RC: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={cn('mt-2 bg-gray-800/50 rounded-xl border border-white/8 overflow-hidden', className)}>{children}</div>
);

const ItemDetailCards: React.FC<{ items: ItemStat[]; fmt: (n: number) => string }> = ({ items, fmt }) => (
  <div className="mt-2 space-y-2">
    {items.map((item) => (
      <RC key={item.itemId}>
        <div className="p-3.5">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0" style={{ backgroundColor: item.categoryColor + '22' }}>
              {item.categoryIcon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-100 truncate text-sm">{item.itemName}</p>
              <p className="text-xs text-gray-500">{item.categoryName}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-base font-bold font-mono tabular-nums text-green-400">{fmt(item.totalSpent)}</p>
              <p className="text-[10px] text-gray-600">total</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 pt-2.5 border-t border-white/5">
            {([['Purchases', `${item.purchaseCount}×`], ['Avg each', fmt(item.avgPerPurchase)], ['Last bought', item.lastBought > 0 ? new Date(item.lastBought).toLocaleDateString('en-NA', { month: 'short', day: 'numeric' }) : '—']] as [string, string][]).map(([lab, val]) => (
              <div key={lab} className="text-center">
                <p className="text-sm font-bold font-mono text-white">{val}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">{lab}</p>
              </div>
            ))}
          </div>
          {item.priceHistory.length > 1 && (
            <div className="mt-2.5 pt-2.5 border-t border-white/5">
              <p className="text-[10px] text-gray-600 mb-1">Price history</p>
              <div className="flex items-end gap-0.5 h-5">
                {item.priceHistory.slice(-16).map((ph, i, arr) => {
                  const prices = arr.map(p => p.price); const min = Math.min(...prices); const max = Math.max(...prices); const range = max - min || 1;
                  return <div key={i} title={fmt(ph.price)} style={{ height: `${Math.max(20, ((ph.price - min) / range) * 80 + 20)}%`, backgroundColor: item.categoryColor }} className="flex-1 rounded-sm opacity-60 min-w-[3px] hover:opacity-100 transition-opacity" />;
                })}
              </div>
            </div>
          )}
        </div>
      </RC>
    ))}
  </div>
);

const TopItemsCard: React.FC<{ items: ItemStat[]; metric: 'count' | 'spend'; fmt: (n: number) => string }> = ({ items, metric, fmt }) => {
  const data = items.map(i => ({ name: i.itemName.length > 16 ? i.itemName.slice(0, 14) + '…' : i.itemName, value: metric === 'spend' ? i.totalSpent : i.purchaseCount, color: i.categoryColor }));
  return (
    <RC>
      <div className="p-3.5">
        <ResponsiveContainer width="100%" height={Math.min(items.length * 32 + 20, 190)}>
          <BarChart data={data} layout="vertical" barCategoryGap="18%">
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" horizontal={false} />
            <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 10 }} tickFormatter={v => metric === 'spend' ? fmt(v) : String(v)} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="name" tick={{ fill: '#d1d5db', fontSize: 10 }} width={95} axisLine={false} tickLine={false} />
            <Tooltip content={(p) => <DarkTip {...p} fmt={metric === 'spend' ? fmt : (v: number) => `${v}×`} />} />
            <Bar dataKey="value" radius={[0, 5, 5, 0]}>{data.map((e, i) => <Cell key={i} fill={e.color} />)}</Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </RC>
  );
};

const TopCategoriesCard: React.FC<{ cats: CategoryStat[]; fmt: (n: number) => string }> = ({ cats, fmt }) => {
  const total = cats.reduce((s, c) => s + c.totalSpent, 0);
  return (
    <RC>
      <div className="p-3.5 space-y-2.5">
        {cats.map((cat, idx) => {
          const pct = total > 0 ? Math.round((cat.totalSpent / total) * 100) : 0;
          return (
            <div key={cat.categoryId}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-400 flex items-center gap-1"><span>{cat.icon}</span>{cat.name}</span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[10px] text-gray-500">{pct}%</span>
                  <span className="text-xs font-bold font-mono tabular-nums text-gray-100">{fmt(cat.totalSpent)}</span>
                </div>
              </div>
              <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.5, delay: idx * 0.04 }} className="h-full rounded-full" style={{ backgroundColor: cat.color }} />
              </div>
            </div>
          );
        })}
      </div>
    </RC>
  );
};

const TopStoresCard: React.FC<{ stores: StoreStat[]; fmt: (n: number) => string }> = ({ stores, fmt }) => {
  const total = stores.reduce((s, st) => s + st.totalSpent, 0);
  return (
    <RC>
      <div className="divide-y divide-white/5">
        {stores.map((store, idx) => {
          const pct = total > 0 ? Math.round((store.totalSpent / total) * 100) : 0;
          return (
            <div key={store.storeId} className="flex items-center gap-2.5 px-3.5 py-2.5">
              <span className="text-[10px] font-bold text-gray-600 w-3 shrink-0">{idx + 1}</span>
              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: store.color }} />
              <p className="text-xs text-gray-300 flex-1 truncate">{store.name}</p>
              <span className="text-[10px] text-gray-500 shrink-0">{store.tripCount} trips</span>
              <span className="text-xs font-bold font-mono tabular-nums text-gray-100 shrink-0">{fmt(store.totalSpent)}</span>
              <span className="text-[10px] text-gray-500 w-7 text-right shrink-0">{pct}%</span>
            </div>
          );
        })}
      </div>
    </RC>
  );
};

const TripSummaryCard: React.FC<{ data: { avgTrip: number; totalTrips: number; totalGrocery: number }; fmt: (n: number) => string }> = ({ data, fmt }) => (
  <div className="mt-2 grid grid-cols-3 gap-2">
    {([
      { label: 'Total Trips', value: String(data.totalTrips), icon: <ShoppingCart size={13} className="text-green-400" /> },
      { label: 'Total Spent', value: fmt(data.totalGrocery), icon: <DollarSign size={13} className="text-emerald-400" /> },
      { label: 'Avg per Trip', value: fmt(data.avgTrip), icon: <BarChart2 size={13} className="text-amber-400" /> },
    ] as { label: string; value: string; icon: React.ReactNode }[]).map(c => (
      <div key={c.label} className="bg-gray-800/50 rounded-xl border border-white/8 p-3 text-center">
        <div className="flex justify-center mb-1">{c.icon}</div>
        <p className="text-sm font-bold font-mono tabular-nums text-white">{c.value}</p>
        <p className="text-[10px] text-gray-500 mt-0.5">{c.label}</p>
      </div>
    ))}
  </div>
);

const FinanceSummaryCard: React.FC<{ data: FinanceSummaryData; fmt: (n: number) => string }> = ({ data, fmt }) => (
  <div className="mt-2 grid grid-cols-2 gap-2">
    {([
      { label: 'Income',      value: fmt(data.totalIncome),   grad: 'from-emerald-600/80 to-emerald-700/80', icon: <ArrowUpCircle size={12} className="text-emerald-200" /> },
      { label: 'Expenses',    value: fmt(data.totalExpenses), grad: 'from-rose-600/80 to-rose-700/80',       icon: <ArrowDownCircle size={12} className="text-rose-200" /> },
      { label: 'Net Savings', value: fmt(data.netSavings),    grad: 'from-green-600/80 to-green-700/80',   icon: <PiggyBank size={12} className="text-green-200" /> },
      { label: 'Savings Rate',value: `${data.savingsRate}%`,  grad: 'from-blue-600/80 to-blue-700/80',       icon: <Target size={12} className="text-blue-200" /> },
    ] as { label: string; value: string; grad: string; icon: React.ReactNode }[]).map(c => (
      <div key={c.label} className={cn('rounded-xl p-3 bg-gradient-to-br', c.grad)}>
        <div className="flex items-center gap-1.5 mb-0.5">{c.icon}<p className="text-[9px] font-semibold uppercase tracking-wide text-white/60">{c.label}</p></div>
        <p className="text-lg font-bold font-mono tabular-nums text-white">{c.value}</p>
      </div>
    ))}
  </div>
);

const FuelSummaryCard: React.FC<{ data: FuelSummaryData; fmt: (n: number) => string }> = ({ data, fmt }) => (
  <div className="mt-2 grid grid-cols-2 gap-2">
    {([
      { label: 'Total Cost',  value: fmt(data.totalCost),                    icon: <FuelIcon size={12} className="text-amber-400" /> },
      { label: 'Litres',      value: `${data.totalLitres.toFixed(1)} L`,     icon: <Droplet size={12} className="text-blue-400" /> },
      { label: 'Avg Price/L', value: fmt(data.avgPricePerLitre),             icon: <TrendingUp size={12} className="text-amber-400" /> },
      { label: 'Fill-ups',    value: String(data.fillupCount),               icon: <Hash size={12} className="text-amber-400" /> },
    ] as { label: string; value: string; icon: React.ReactNode }[]).map(c => (
      <div key={c.label} className="bg-gray-800/50 rounded-xl border border-amber-500/20 p-3">
        <div className="flex items-center gap-1.5 mb-0.5">{c.icon}<p className="text-[9px] font-semibold uppercase tracking-wide text-gray-500">{c.label}</p></div>
        <p className="text-base font-bold font-mono tabular-nums text-white">{c.value}</p>
      </div>
    ))}
  </div>
);

const SavingsGoalsCard: React.FC<{ goals: SavingsGoalData[]; fmt: (n: number) => string }> = ({ goals, fmt }) => (
  <div className="mt-2 space-y-2">
    {goals.map((g) => (
      <RC key={g.id}>
        <div className="p-3">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5"><span className="text-base">{g.emoji}</span><p className="font-medium text-gray-200 text-xs">{g.name}</p></div>
            <span className={cn('text-xs font-bold', g.percentComplete >= 100 ? 'text-emerald-400' : g.percentComplete >= 75 ? 'text-green-400' : 'text-gray-400')}>{g.percentComplete}%</span>
          </div>
          <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden mb-1.5">
            <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(g.percentComplete, 100)}%` }} transition={{ duration: 0.6 }} className={cn('h-full rounded-full', g.percentComplete >= 100 ? 'bg-emerald-500' : 'bg-green-500')} />
          </div>
          <div className="flex items-center justify-between text-[10px] text-gray-600">
            <span>{fmt(g.saved)} saved</span><span>{fmt(g.targetAmount)} target</span>
          </div>
        </div>
      </RC>
    ))}
  </div>
);

const MedicalApptsCard: React.FC<{ appointments: MedicalAppointment[] }> = ({ appointments }) => (
  <div className="mt-2 space-y-1.5">
    {appointments.map((apt) => (
      <RC key={apt.id}>
        <div className="flex items-start gap-3 p-3 border-l-2 border-cyan-500">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-200 text-xs">{apt.practitioner}</p>
            <p className="text-[10px] text-gray-500">{apt.type.replace(/_/g, ' ')}</p>
            {apt.practice && <p className="text-[10px] text-gray-600 flex items-center gap-1 mt-0.5"><Heart size={9} />{apt.practice}</p>}
          </div>
          <div className="text-right shrink-0">
            <p className="text-[11px] font-medium text-gray-300">{new Date(apt.date).toLocaleDateString('en-NA', { month: 'short', day: 'numeric' })}</p>
            <p className="text-[10px] text-cyan-400 font-mono">{apt.time}</p>
          </div>
        </div>
      </RC>
    ))}
  </div>
);

const BudgetStatusCard: React.FC<{ data: BudgetStatusData; fmt: (n: number) => string }> = ({ data, fmt }) => (
  <div className="mt-2">
    <div className={cn('rounded-xl p-2.5 mb-2 flex items-center gap-2', data.status === 'over-budget' ? 'bg-rose-500/10 border border-rose-500/20' : data.status === 'on-track' ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-blue-500/10 border border-blue-500/20')}>
      {data.status === 'over-budget' ? <AlertCircle size={12} className="text-rose-400" /> : data.status === 'on-track' ? <CheckCircle2 size={12} className="text-emerald-400" /> : <Sparkles size={12} className="text-blue-400" />}
      <p className="text-xs font-semibold text-gray-200">{data.status === 'over-budget' ? 'Over Budget' : data.status === 'on-track' ? 'On Track' : 'Under Budget'}</p>
    </div>
    {data.categories.length > 0 && (
      <div className="space-y-1.5">
        {data.categories.slice(0, 5).map((cat) => (
          <div key={cat.name} className="bg-gray-800/50 rounded-lg p-2.5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-gray-400">{cat.name}</span>
              <span className={cn('text-[11px] font-bold font-mono', cat.status === 'good' ? 'text-emerald-400' : cat.status === 'warning' ? 'text-amber-400' : 'text-rose-400')}>{fmt(cat.actual)} / {fmt(cat.budgeted)}</span>
            </div>
            <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
              <div className={cn('h-full rounded-full', cat.status === 'good' ? 'bg-emerald-500' : cat.status === 'warning' ? 'bg-amber-500' : 'bg-rose-500')} style={{ width: `${Math.min((cat.actual / cat.budgeted) * 100, 100)}%` }} />
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);

const TypingDots = () => (
  <div className="flex gap-1 items-center h-5 px-1">
    {[0, 0.15, 0.3].map((delay, i) => (
      <motion.div key={i} animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.65, delay }} className="w-1.5 h-1.5 bg-green-400 rounded-full" />
    ))}
  </div>
);

type PanelTab = 'items' | 'categories' | 'stores';

// ══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════
const DataExplorer: React.FC<DataExplorerProps> = ({
  trips, items, categories, stores, transactions, financePlans,
  savingsGoals, fuelFillups, medicalAidPlans, medicalAppointments, budgets,
  isDark, formatPrice: fmt,
}) => {
  const completedTrips = useMemo(() => trips.filter(t => t.status === 'completed' || t.completedAt != null), [trips]);
  const itemStats      = useMemo(() => buildItemStats(completedTrips, items, categories), [completedTrips, items, categories]);
  const categoryStats  = useMemo(() => buildCategoryStats(completedTrips, categories), [completedTrips, categories]);
  const storeStats     = useMemo(() => buildStoreStats(completedTrips, stores), [completedTrips, stores]);

  const [searchQ, setSearchQ]   = useState('');
  const [panelTab, setPanelTab] = useState<PanelTab>('items');
  const searchRef               = useRef<HTMLInputElement>(null);

  const searchResults = useMemo(() => {
    if (!searchQ.trim()) return [];
    return itemStats.filter(i => i.itemName.toLowerCase().includes(searchQ.toLowerCase().trim()));
  }, [searchQ, itemStats]);

  const [messages, setMessages] = useState<AssistantMessage[]>([{
    id: 'welcome', role: 'assistant',
    text: "Hi! I'm your Budget Assistant. Ask me about your groceries, finances, fuel, savings goals, appointments, or budget.",
    insightType: 'welcome', timestamp: Date.now(),
  }]);
  const [chatInput, setChatInput] = useState('');
  const [thinking, setThinking]   = useState(false);
  const chatEndRef                = useRef<HTMLDivElement>(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = useCallback((text?: string) => {
    const query = (text ?? chatInput).trim();
    if (!query) return;
    setMessages(prev => [...prev, { id: Math.random().toString(36).slice(2), role: 'user', text: query, timestamp: Date.now() }]);
    setChatInput('');
    setThinking(true);
    setTimeout(() => {
      const res = processQuery(query, itemStats, categoryStats, storeStats, completedTrips, transactions, fuelFillups, savingsGoals, medicalAppointments, budgets);
      setMessages(prev => [...prev, res]);
      setThinking(false);
    }, 380);
  }, [chatInput, itemStats, categoryStats, storeStats, completedTrips, transactions, fuelFillups, savingsGoals, medicalAppointments, budgets]);

  const clearChat = () => setMessages([{ id: 'w-' + Date.now(), role: 'assistant', text: "Chat cleared! What would you like to know?", insightType: 'welcome', timestamp: Date.now() }]);

  const totalDataPoints = completedTrips.length + items.length + transactions.length + fuelFillups.length;
  const totalGrocery    = completedTrips.reduce((s, t) => s + t.totalSpent, 0);

  if (completedTrips.length === 0 && transactions.length === 0) {
    return (
      <div className="bg-gray-900/70 backdrop-blur-xl rounded-2xl border border-green-500/20 p-16 text-center">
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-green-500/10 flex items-center justify-center">
          <Database size={24} className="text-green-400" />
        </div>
        <h3 className="text-base font-bold text-white mb-1.5">No Data to Explore Yet</h3>
        <p className="text-gray-500 text-sm max-w-xs mx-auto">Complete shopping trips and log transactions to unlock the Data Explorer.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* COMMAND BANNER */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {([
          { label: 'Data Points',  value: totalDataPoints.toLocaleString(), icon: <Database size={13} className="text-green-400" />,     accent: 'violet' },
          { label: 'Trips',        value: String(completedTrips.length),    icon: <ShoppingCart size={13} className="text-emerald-400" />, accent: 'emerald' },
          { label: 'Unique Items', value: String(itemStats.length),         icon: <Package size={13} className="text-blue-400" />,         accent: 'blue' },
          { label: 'Transactions', value: String(transactions.length),      icon: <Wallet size={13} className="text-amber-400" />,         accent: 'amber' },
        ] as { label: string; value: string; icon: React.ReactNode; accent: string }[]).map(({ label, value, icon, accent }) => (
          <div key={label} className="bg-gray-900/70 backdrop-blur-xl rounded-xl border border-green-500/20 p-3 relative overflow-hidden">
            <div className={`absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-${accent}-500/40 to-transparent`} />
            <div className="flex items-center gap-1.5 mb-1.5">{icon}<p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">{label}</p></div>
            <p className="text-xl font-bold font-mono tabular-nums text-white">{value}</p>
          </div>
        ))}
      </div>

      {/* MAIN GRID */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-4">

        {/* LEFT: search + panels */}
        <div className="space-y-4">

          {/* SEARCH */}
          <div className="bg-gray-900/70 backdrop-blur-xl rounded-2xl border border-green-500/20 overflow-hidden">
            <div className="p-4 border-b border-white/[0.04]">
              <div className="relative">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                <input
                  ref={searchRef}
                  type="text"
                  value={searchQ}
                  onChange={e => setSearchQ(e.target.value)}
                  placeholder="Search your purchase history — milk, bread, chicken…"
                  className="w-full pl-10 pr-10 py-2.5 bg-gray-800/60 rounded-xl text-sm text-gray-100 placeholder-gray-500 border border-green-500/20 focus:outline-none focus:ring-2 focus:ring-green-500 transition-all"
                  aria-label="Search grocery items"
                />
                {searchQ && (
                  <button onClick={() => setSearchQ('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors cursor-pointer" aria-label="Clear search">
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            <AnimatePresence mode="popLayout">
              {searchQ && searchResults.length === 0 && (
                <motion.div key="no-res" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-4 flex items-center gap-2 text-sm text-gray-500">
                  <AlertCircle size={13} /><span>No items matching "<span className="text-gray-300">{searchQ}</span>"</span>
                </motion.div>
              )}
              {searchResults.length > 0 && (
                <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="divide-y divide-white/[0.04] max-h-[440px] overflow-y-auto">
                  {searchResults.map((item) => (
                    <motion.div key={item.itemId} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="px-4 py-3 hover:bg-gray-800/25 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0" style={{ backgroundColor: item.categoryColor + '22' }}>
                          {item.categoryIcon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-200 truncate">{item.itemName}</p>
                          <p className="text-xs text-gray-500">{item.categoryName} · {item.purchaseCount}× bought</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold font-mono tabular-nums text-gray-100">{fmt(item.totalSpent)}</p>
                          <p className="text-[10px] text-gray-500">{fmt(item.avgPerPurchase)} avg</p>
                        </div>
                      </div>
                      {item.priceHistory.length > 1 && (
                        <div className="mt-2 flex items-end gap-0.5 h-4 ml-12">
                          {item.priceHistory.slice(-12).map((ph, i, arr) => {
                            const prices = arr.map(p => p.price); const min = Math.min(...prices); const max = Math.max(...prices); const range = max - min || 1;
                            return <div key={i} style={{ height: `${Math.max(20, ((ph.price - min) / range) * 80 + 20)}%`, backgroundColor: item.categoryColor }} className="flex-1 rounded-sm opacity-55 min-w-[3px] hover:opacity-100 transition-opacity" title={fmt(ph.price)} />;
                          })}
                        </div>
                      )}
                    </motion.div>
                  ))}
                </motion.div>
              )}
              {!searchQ && (
                <motion.p key="hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-4 py-3 text-xs text-gray-600">
                  {itemStats.length} unique items across {completedTrips.length} trips · {fmt(totalGrocery)} total grocery spend
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* DATA PANELS */}
          <div className="bg-gray-900/70 backdrop-blur-xl rounded-2xl border border-green-500/20 overflow-hidden">
            <div className="flex items-center gap-1 p-3 border-b border-white/[0.04]">
              {([
                { id: 'items' as PanelTab,      label: 'Top Items',  icon: <TrendingUp size={11} /> },
                { id: 'categories' as PanelTab, label: 'Categories', icon: <Layers size={11} /> },
                { id: 'stores' as PanelTab,     label: 'Stores',     icon: <MapPin size={11} /> },
              ]).map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setPanelTab(tab.id)}
                  className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer', panelTab === tab.id ? 'bg-green-600 text-white shadow-md shadow-green-500/20' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/40')}
                >
                  {tab.icon}{tab.label}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              {panelTab === 'items' && (
                <motion.div key="items-p" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.14 }}>
                  {itemStats.length === 0 ? (
                    <div className="p-10 text-center"><ShoppingBag size={22} className="text-gray-700 mx-auto mb-2" /><p className="text-gray-500 text-sm">No items yet</p></div>
                  ) : (
                    <>
                      <div className="p-4 pb-0">
                        <ResponsiveContainer width="100%" height={Math.min(itemStats.length, 10) * 32 + 24}>
                          <BarChart
                            data={itemStats.slice(0, 10).map(i => ({ name: i.itemName.length > 18 ? i.itemName.slice(0, 16) + '…' : i.itemName, value: i.totalSpent, count: i.purchaseCount, color: i.categoryColor }))}
                            layout="vertical" barCategoryGap="16%"
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" horizontal={false} />
                            <XAxis type="number" tick={{ fill: '#4b5563', fontSize: 10 }} tickFormatter={fmt} axisLine={false} tickLine={false} />
                            <YAxis type="category" dataKey="name" tick={{ fill: '#d1d5db', fontSize: 10 }} width={112} axisLine={false} tickLine={false} />
                            <Tooltip content={(p) => <DarkTip {...p} fmt={(v: number, _: string, props: any) => `${fmt(v)} (${props?.payload?.count ?? 0}× bought)`} />} />
                            <Bar dataKey="value" radius={[0, 5, 5, 0]}>
                              {itemStats.slice(0, 10).map((e, i) => <Cell key={i} fill={e.categoryColor} />)}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="px-4 pb-4 mt-3 space-y-1">
                        {itemStats.slice(0, 10).map((item, idx) => (
                          <div key={item.itemId} className="flex items-center gap-2 text-sm py-0.5">
                            <span className="text-[10px] text-gray-600 font-mono w-4 text-right shrink-0">{idx + 1}</span>
                            <span className="shrink-0 text-base">{item.categoryIcon}</span>
                            <p className="text-gray-400 truncate flex-1 min-w-0 text-xs">{item.itemName}</p>
                            <span className="text-[10px] text-gray-500 shrink-0">{item.purchaseCount}×</span>
                            <span className="text-xs font-bold font-mono tabular-nums text-gray-100 shrink-0">{fmt(item.totalSpent)}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </motion.div>
              )}

              {panelTab === 'categories' && (
                <motion.div key="cats-p" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.14 }}>
                  {categoryStats.length === 0 ? (
                    <div className="p-10 text-center"><Tag size={22} className="text-gray-700 mx-auto mb-2" /><p className="text-gray-500 text-sm">No category data yet</p></div>
                  ) : (
                    <div className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <ResponsiveContainer width="100%" height={175}>
                          <PieChart>
                            <Pie data={categoryStats.slice(0, 8)} dataKey="totalSpent" nameKey="name" cx="50%" cy="50%" innerRadius={42} outerRadius={74} paddingAngle={3}>
                              {categoryStats.slice(0, 8).map((cat, i) => <Cell key={i} fill={cat.color} />)}
                            </Pie>
                            <Tooltip content={(p) => <DarkTip {...p} fmt={fmt} />} />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="space-y-2.5">
                          {categoryStats.slice(0, 8).map((cat, idx) => {
                            const total = categoryStats.reduce((s, c) => s + c.totalSpent, 0);
                            const pct = total > 0 ? Math.round((cat.totalSpent / total) * 100) : 0;
                            return (
                              <div key={cat.categoryId}>
                                <div className="flex items-center justify-between mb-0.5">
                                  <span className="text-xs text-gray-400 flex items-center gap-1"><span>{cat.icon}</span>{cat.name}</span>
                                  <div className="flex items-center gap-1.5 shrink-0"><span className="text-[10px] text-gray-500">{pct}%</span><span className="text-xs font-bold font-mono tabular-nums text-gray-200">{fmt(cat.totalSpent)}</span></div>
                                </div>
                                <div className="h-1.5 bg-gray-800/70 rounded-full overflow-hidden">
                                  <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.5, delay: idx * 0.04 }} className="h-full rounded-full" style={{ backgroundColor: cat.color }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {panelTab === 'stores' && (
                <motion.div key="stores-p" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.14 }}>
                  {storeStats.length === 0 ? (
                    <div className="p-10 text-center"><MapPin size={22} className="text-gray-700 mx-auto mb-2" /><p className="text-gray-500 text-sm">No store data yet</p></div>
                  ) : (
                    <div className="divide-y divide-white/[0.04]">
                      {storeStats.map((store, idx) => {
                        const maxSpend = storeStats[0].totalSpent;
                        const pct = maxSpend > 0 ? Math.round((store.totalSpent / maxSpend) * 100) : 0;
                        return (
                          <div key={store.storeId} className="px-4 py-3.5">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-[10px] font-bold text-gray-600 w-4 text-right shrink-0">{idx + 1}</span>
                              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: store.color }} />
                              <p className="text-sm font-medium text-gray-200 flex-1 truncate">{store.name}</p>
                              <span className="text-xs text-gray-500 shrink-0">{store.tripCount} trips · {fmt(store.avgTrip)} avg</span>
                              <span className="text-sm font-bold font-mono tabular-nums text-gray-100 shrink-0">{fmt(store.totalSpent)}</span>
                            </div>
                            <div className="h-1 bg-gray-800/70 rounded-full overflow-hidden ml-7">
                              <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.5, delay: idx * 0.05 }} className="h-full rounded-full" style={{ backgroundColor: store.color }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* RIGHT: chat assistant */}
        <div className="bg-gray-900/70 backdrop-blur-xl rounded-2xl border border-green-500/20 overflow-hidden flex flex-col" style={{ height: 'min(700px, 90vh)' }}>

          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.04] bg-gradient-to-r from-green-900/25 to-transparent shrink-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-green-600 to-green-700 flex items-center justify-center shadow-lg shadow-green-500/25 shrink-0">
              <Sparkles size={13} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-white text-sm">Budget Assistant</h2>
                <span className="px-1.5 py-0.5 bg-green-500/20 text-green-300 text-[9px] font-bold uppercase tracking-wider rounded-full border border-green-500/30">AI</span>
              </div>
              <p className="text-[10px] text-gray-500">All your data in one conversation</p>
            </div>
            <button onClick={clearChat} className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-gray-800/50 transition-colors cursor-pointer" aria-label="Clear chat">
              <RefreshCw size={12} />
            </button>
          </div>

          {/* Chips */}
          <div className="px-3 pt-2.5 pb-2 flex gap-1.5 flex-wrap shrink-0">
            {CHIPS.map(chip => (
              <button key={chip.label} onClick={() => send(chip.query)} className="inline-flex items-center gap-1 px-2 py-1 bg-gray-800/60 hover:bg-green-900/30 border border-green-500/15 hover:border-green-500/30 text-green-300 text-[10px] font-medium rounded-full transition-all cursor-pointer shrink-0">
                {chip.icon}{chip.label}
              </button>
            ))}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 pb-2 space-y-3 min-h-0">
            <AnimatePresence initial={false}>
              {messages.map(msg => (
                <motion.div key={msg.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.17 }} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                  {msg.role === 'assistant' && (
                    <div className="flex items-start gap-2 max-w-full">
                      <div className="w-6 h-6 rounded-lg bg-green-900/50 flex items-center justify-center shrink-0 mt-0.5">
                        <Bot size={11} className="text-green-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="bg-gray-800/40 rounded-xl rounded-tl-sm p-3 border-l-2 border-green-500/60">
                          <FormattedText text={msg.text} />
                          {msg.insightType === 'item-detail'    && Array.isArray(msg.data)  && <ItemDetailCards items={msg.data as ItemStat[]} fmt={fmt} />}
                          {msg.insightType === 'top-items'      && msg.data                 && <TopItemsCard items={(msg.data as { items: ItemStat[]; metric: 'count' | 'spend' }).items} metric={(msg.data as any).metric} fmt={fmt} />}
                          {msg.insightType === 'top-categories' && Array.isArray(msg.data)  && <TopCategoriesCard cats={msg.data as CategoryStat[]} fmt={fmt} />}
                          {msg.insightType === 'top-stores'     && Array.isArray(msg.data)  && <TopStoresCard stores={msg.data as StoreStat[]} fmt={fmt} />}
                          {msg.insightType === 'trip-summary'   && msg.data                 && <TripSummaryCard data={msg.data as any} fmt={fmt} />}
                          {(msg.insightType === 'finance-summary' || msg.insightType === 'financial-health') && msg.data && <FinanceSummaryCard data={msg.data as FinanceSummaryData} fmt={fmt} />}
                          {msg.insightType === 'fuel-summary'   && msg.data                 && <FuelSummaryCard data={msg.data as FuelSummaryData} fmt={fmt} />}
                          {msg.insightType === 'savings-goals'  && Array.isArray(msg.data)  && <SavingsGoalsCard goals={msg.data as SavingsGoalData[]} fmt={fmt} />}
                          {msg.insightType === 'medical-appointments' && Array.isArray(msg.data) && <MedicalApptsCard appointments={msg.data as MedicalAppointment[]} />}
                          {msg.insightType === 'budget-status'  && msg.data                 && <BudgetStatusCard data={msg.data as BudgetStatusData} fmt={fmt} />}
                        </div>
                        <p className="text-[9px] text-gray-700 mt-0.5 ml-1">{new Date(msg.timestamp).toLocaleTimeString('en-NA', { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>
                  )}
                  {msg.role === 'user' && (
                    <div className="max-w-[80%]">
                      <div className="bg-green-600 text-white rounded-2xl rounded-tr-sm px-3.5 py-2.5">
                        <p className="text-sm leading-snug">{msg.text}</p>
                      </div>
                      <p className="text-[9px] text-gray-700 mt-0.5 text-right mr-1">{new Date(msg.timestamp).toLocaleTimeString('en-NA', { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  )}
                </motion.div>
              ))}
              {thinking && (
                <motion.div key="thinking" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-green-900/50 flex items-center justify-center shrink-0">
                    <Bot size={11} className="text-green-400" />
                  </div>
                  <div className="bg-gray-800/40 rounded-xl rounded-tl-sm px-3 py-2.5"><TypingDots /></div>
                </motion.div>
              )}
            </AnimatePresence>
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="px-3 pb-3 pt-2 border-t border-white/[0.04] shrink-0">
            <div className="flex gap-2 items-center">
              <input
                type="text"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder="Ask anything about your data…"
                className="flex-1 px-3.5 py-2.5 bg-gray-800/60 border border-green-500/20 rounded-xl text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 transition-all"
                aria-label="Ask the data assistant"
              />
              <button
                onClick={() => send()}
                disabled={!chatInput.trim() || thinking}
                className="p-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-35 disabled:cursor-not-allowed text-white rounded-xl transition-colors shrink-0 cursor-pointer"
                aria-label="Send message"
              >
                <Send size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataExplorer;
