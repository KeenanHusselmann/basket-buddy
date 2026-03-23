// ==========================================
// BasketBuddy — Home Budget v2
// Fully dark, fuel-integrated, command-centre design
// ==========================================

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PiggyBank, ChevronLeft, ChevronRight, Plus, Edit3, Trash2,
  TrendingUp, TrendingDown, ArrowUpCircle, ArrowDownCircle,
  Target, Receipt, ShoppingCart, Repeat,
  LayoutGrid, BarChart2, ClipboardList,
  CheckCircle2, Calendar, ChevronDown, ChevronUp, X, Check,
  Wallet, Fuel, Zap, CreditCard,
} from 'lucide-react';
import { motion as M } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie,
} from 'recharts';
import { useApp } from '../contexts/AppContext';
import { formatPrice, cn } from '../utils/helpers';
import {
  CURRENCY,
  FINANCE_INCOME_CATEGORIES,
  FINANCE_FIXED_CATEGORIES,
  FINANCE_VARIABLE_CATEGORIES,
} from '../config/constants';
import { CustomFinanceCategory } from '../types';
import Modal from '../components/common/Modal';
import type {
  FinanceTransaction,
  FinanceTransactionType,
  FinanceCategoryTarget,
  SavingsGoal,
  SavingsContribution,
} from '../types';

// ── Constants ──────────────────────────────────────────────────
const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const TABS = [
  { id: 'overview',  label: 'Overview',    icon: LayoutGrid },
  { id: 'income',    label: 'Income',      icon: ArrowUpCircle },
  { id: 'fixed',     label: 'Fixed',       icon: Receipt },
  { id: 'variable',  label: 'Variable',    icon: ArrowDownCircle },
  { id: 'plan',      label: 'Plan',        icon: Target },
  { id: 'savings',   label: 'Savings',     icon: PiggyBank },
] as const;
type TabId = (typeof TABS)[number]['id'];

const TAB_ACCENT: Record<TabId, string> = {
  overview:  'bg-violet-600 text-white shadow-lg shadow-violet-500/25',
  income:    'bg-emerald-600 text-white shadow-lg shadow-emerald-500/25',
  fixed:     'bg-blue-600 text-white shadow-lg shadow-blue-500/25',
  variable:  'bg-orange-600 text-white shadow-lg shadow-orange-500/25',
  plan:      'bg-cyan-600 text-white shadow-lg shadow-cyan-500/25',
  savings:   'bg-purple-600 text-white shadow-lg shadow-purple-500/25',
};

// ── Helpers ────────────────────────────────────────────────────
function pct(value: number, total: number) {
  if (!total) return 0;
  return Math.min(100, Math.round((value / total) * 100));
}

function barColor(spent: number, budget: number) {
  if (!budget) return '#8b5cf6';
  const p = spent / budget;
  if (p > 1) return '#f43f5e';
  if (p >= 0.85) return '#f97316';
  return '#10b981';
}

let _planCustomCats: CustomFinanceCategory[] = [];

function getCatLabel(type: FinanceTransactionType, catId: string): string {
  const all = [
    ...FINANCE_INCOME_CATEGORIES,
    ...FINANCE_FIXED_CATEGORIES,
    ...FINANCE_VARIABLE_CATEGORIES,
    ..._planCustomCats,
  ];
  return all.find((c) => c.id === catId)?.label || catId;
}

function getCatIcon(type: FinanceTransactionType, catId: string): string {
  const all = [
    ...FINANCE_INCOME_CATEGORIES,
    ...FINANCE_FIXED_CATEGORIES,
    ...FINANCE_VARIABLE_CATEGORIES,
    ..._planCustomCats,
  ];
  return all.find((c) => c.id === catId)?.icon || '💰';
}

function blankTx(type: FinanceTransactionType, month: number, year: number): Omit<FinanceTransaction, 'id' | 'createdAt'> {
  const cats = type === 'income' ? FINANCE_INCOME_CATEGORIES : type === 'fixed' ? FINANCE_FIXED_CATEGORIES : FINANCE_VARIABLE_CATEGORIES;
  return { type, month, year, category: cats[0]?.id || '', description: '', amount: 0, date: Date.now(), recurring: false, notes: '' };
}

// ── Dark chart tooltip ─────────────────────────────────────────
const DarkTip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 border border-white/10 rounded-xl px-3 py-2.5 shadow-2xl text-xs">
      {label && <p className="text-gray-400 mb-1.5 border-b border-white/5 pb-1">{label}</p>}
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2 py-0.5">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-gray-400">{p.name}</span>
          <span className="text-white font-bold ml-auto pl-3 font-mono tabular-nums">{formatPrice(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

// ── KPI Card ───────────────────────────────────────────────────
interface KpiProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  accent: string;
  delay?: number;
}
const KpiCard: React.FC<KpiProps> = ({ icon, label, value, sub, accent, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="relative bg-gray-900/70 backdrop-blur-xl rounded-2xl border border-violet-500/20 p-4 overflow-hidden"
  >
    <div className={`absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-${accent}-500/50 to-transparent`} />
    <div className="flex items-center gap-2 mb-2">
      {icon}
      <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">{label}</p>
    </div>
    <p className="text-2xl font-bold font-mono tabular-nums text-white truncate">{value}</p>
    {sub && <p className="text-[11px] text-gray-500 mt-1 truncate">{sub}</p>}
  </motion.div>
);

// ══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════
const Finance: React.FC = () => {
  const {
    transactions, financePlans, trips, budgets, fuelFillups,
    addTransaction, updateTransaction, deleteTransaction,
    setFinancePlan,
    savingsGoals, addSavingsGoal, updateSavingsGoal, deleteSavingsGoal,
    addSavingsContribution, deleteSavingsContribution,
  } = useApp();

  // Billing period: 25th of viewMonth to 24th of viewMonth+1
  const now = new Date();
  const _current = (() => {
    const d = now.getDate(); const m = now.getMonth() + 1; const y = now.getFullYear();
    if (d <= 24) return m === 1 ? { month: 12, year: y - 1 } : { month: m - 1, year: y };
    return { month: m, year: y };
  })();
  const [viewMonth, setViewMonth] = useState(_current.month);
  const [viewYear,  setViewYear]  = useState(_current.year);
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  const billingLabel = (() => {
    const s = new Date(viewYear, viewMonth - 1, 25);
    const e = new Date(viewYear, viewMonth, 24);
    const fmt = (d: Date) => d.toLocaleDateString('en-NA', { day: 'numeric', month: 'short' });
    const ey = e.getFullYear();
    return `${fmt(s)} – ${fmt(e)}${ey !== viewYear ? ` ${ey}` : `, ${viewYear}`}`;
  })();

  const isCurrentPeriod = viewMonth === _current.month && viewYear === _current.year;
  const prevMonth = () => { if (viewMonth === 1) { setViewMonth(12); setViewYear(y => y - 1); } else setViewMonth(m => m - 1); };
  const nextMonth = () => { if (isCurrentPeriod) return; if (viewMonth === 12) { setViewMonth(1); setViewYear(y => y + 1); } else setViewMonth(m => m + 1); };

  // Period date range
  const periodStart = useMemo(() => new Date(viewYear, viewMonth - 1, 25, 0, 0, 0, 0).getTime(), [viewMonth, viewYear]);
  const periodEnd   = useMemo(() => new Date(viewYear, viewMonth, 24, 23, 59, 59, 999).getTime(), [viewMonth, viewYear]);

  // Transactions for this period
  const monthTx = useMemo(() => transactions.filter(t => t.date >= periodStart && t.date <= periodEnd), [transactions, periodStart, periodEnd]);
  const incomeTx = useMemo(() => monthTx.filter(t => t.type === 'income'), [monthTx]);
  const fixedTx  = useMemo(() => monthTx.filter(t => t.type === 'fixed'), [monthTx]);
  const varTx    = useMemo(() => monthTx.filter(t => t.type === 'variable'), [monthTx]);

  const totalIncome   = useMemo(() => incomeTx.reduce((s, t) => s + t.amount, 0), [incomeTx]);
  const totalFixed    = useMemo(() => fixedTx.reduce((s, t) => s + t.amount, 0), [fixedTx]);
  const totalVariable = useMemo(() => varTx.reduce((s, t) => s + t.amount, 0), [varTx]);

  // Auto-integrated groceries from completed trips
  const grocerySpent = useMemo(() =>
    trips.filter(t => { const d = t.date; return d >= periodStart && d <= periodEnd && t.status === 'completed'; })
      .reduce((s, t) => s + t.totalSpent, 0),
    [trips, periodStart, periodEnd],
  );

  // Auto-integrated fuel from fillups
  const fuelSpent = useMemo(() =>
    fuelFillups.filter(f => f.date >= periodStart && f.date <= periodEnd)
      .reduce((s, f) => s + f.totalCost, 0),
    [fuelFillups, periodStart, periodEnd],
  );

  // Period grocery budget
  const groceryBudget = useMemo(
    () => budgets.find(b => b.month === viewMonth && b.year === viewYear)?.totalBudget || 0,
    [budgets, viewMonth, viewYear],
  );

  const totalAllVariable = totalVariable + grocerySpent + fuelSpent;
  const totalExpenses    = totalFixed + totalAllVariable;
  const netSavings       = totalIncome - totalExpenses;

  // Current plan
  const currentPlan = useMemo(
    () => financePlans.find(p => p.month === viewMonth && p.year === viewYear),
    [financePlans, viewMonth, viewYear],
  );

  const allCustomCats = useMemo(() => currentPlan?.customCategories || [], [currentPlan]);
  _planCustomCats = allCustomCats;

  // ── Modal state ──────────────────────────────────────────────
  const [txModal, setTxModal] = useState<{
    open: boolean; mode: 'add' | 'edit';
    data: Omit<FinanceTransaction, 'id' | 'createdAt'> & { id?: string };
  }>({ open: false, mode: 'add', data: blankTx('income', _current.month, _current.year) });

  const formCategories = useMemo(() => {
    if (txModal.data.type === 'income') return FINANCE_INCOME_CATEGORIES;
    if (txModal.data.type === 'fixed') return [...FINANCE_FIXED_CATEGORIES, ...allCustomCats.filter(c => c.type === 'fixed')];
    return [...FINANCE_VARIABLE_CATEGORIES, ...allCustomCats.filter(c => c.type === 'variable')];
  }, [txModal.data.type, allCustomCats]);

  const [planModal, setPlanModal]     = useState(false);
  const [planIncome, setPlanIncome]   = useState('');
  const [planSavings, setPlanSavings] = useState('');
  const [planFixed, setPlanFixed]     = useState('');
  const [planVar, setPlanVar]         = useState('');
  const [planTargets, setPlanTargets] = useState<Record<string, string>>({});
  const [planCustomFixed, setPlanCustomFixed]   = useState<{id:string;label:string;icon:string}[]>([]);
  const [planCustomVar,   setPlanCustomVar]     = useState<{id:string;label:string;icon:string}[]>([]);

  // ── Handlers ─────────────────────────────────────────────────
  const openAdd = (type: FinanceTransactionType) =>
    setTxModal({ open: true, mode: 'add', data: blankTx(type, viewMonth, viewYear) });

  const openEdit = (tx: FinanceTransaction) =>
    setTxModal({ open: true, mode: 'edit', data: { ...tx } });

  const openPlan = () => {
    setPlanIncome(currentPlan?.incomeGoal?.toString() || '');
    setPlanSavings(currentPlan?.savingsGoal?.toString() || '');
    setPlanFixed(currentPlan?.fixedBudget?.toString() || '');
    setPlanVar(currentPlan?.variableBudget?.toString() || '');
    const ex: Record<string, string> = {};
    currentPlan?.categoryTargets.forEach(ct => { ex[ct.category] = ct.targetAmount.toString(); });
    setPlanTargets(ex);
    const saved = currentPlan?.customCategories || [];
    setPlanCustomFixed(saved.filter(c => c.type === 'fixed').map(({ id, label, icon }) => ({ id, label, icon })));
    setPlanCustomVar(saved.filter(c => c.type === 'variable').map(({ id, label, icon }) => ({ id, label, icon })));
    setPlanModal(true);
  };

  const updatePlanCustomCats = (type: 'fixed' | 'variable', newCats: CustomFinanceCategory[]) => {
    const others = (currentPlan?.customCategories || []).filter(c => c.type !== type);
    setFinancePlan({ month: viewMonth, year: viewYear, incomeGoal: currentPlan?.incomeGoal || 0, savingsGoal: currentPlan?.savingsGoal || 0, fixedBudget: currentPlan?.fixedBudget || 0, variableBudget: currentPlan?.variableBudget || 0, categoryTargets: currentPlan?.categoryTargets || [], customCategories: [...others, ...newCats] });
  };

  const handleTxSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const { id, ...rest } = txModal.data as FinanceTransaction;
    if (txModal.mode === 'edit' && id) updateTransaction(id, rest);
    else addTransaction(rest);
    setTxModal(s => ({ ...s, open: false }));
  };

  const handlePlanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const customAll: CustomFinanceCategory[] = [
      ...planCustomFixed.map(c => ({ ...c, type: 'fixed' as const })),
      ...planCustomVar.map(c => ({ ...c, type: 'variable' as const })),
    ];
    const allCats = [...FINANCE_FIXED_CATEGORIES, ...FINANCE_VARIABLE_CATEGORIES, ...customAll];
    const targets: FinanceCategoryTarget[] = allCats
      .filter(c => parseFloat(planTargets[c.id] || '0') > 0)
      .map(c => ({
        category: c.id,
        type: (FINANCE_FIXED_CATEGORIES.some(fc => fc.id === c.id) || planCustomFixed.some(cf => cf.id === c.id)) ? 'fixed' : 'variable',
        targetAmount: parseFloat(planTargets[c.id]),
      }));
    setFinancePlan({ month: viewMonth, year: viewYear, incomeGoal: parseFloat(planIncome) || 0, savingsGoal: parseFloat(planSavings) || 0, fixedBudget: parseFloat(planFixed) || 0, variableBudget: parseFloat(planVar) || 0, categoryTargets: targets, customCategories: customAll });
    setPlanModal(false);
  };

  // ── Render ───────────────────────────────────────────────────
  return (
    <div className="space-y-5 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center shadow-lg shadow-violet-500/20">
            <Wallet size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Home Budget</h1>
            <p className="text-xs text-gray-500 mt-0.5">Track income, expenses &amp; savings</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={openPlan} className="flex items-center gap-1.5 px-3 py-2 border border-violet-500/30 text-violet-400 rounded-xl text-xs font-semibold hover:bg-violet-500/10 transition-colors cursor-pointer">
            <Target size={13} />{currentPlan ? 'Edit Plan' : 'Set Plan'}
          </button>
          <button onClick={() => openAdd('income')} className="flex items-center gap-1.5 px-3.5 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-lg shadow-violet-500/20 cursor-pointer">
            <Plus size={13} />Add Entry
          </button>
        </div>
      </div>

      {/* Month navigator */}
      <div className="flex items-center justify-center gap-3">
        <button onClick={prevMonth} className="p-2 rounded-xl hover:bg-gray-800/60 text-gray-400 hover:text-gray-200 transition-colors cursor-pointer" aria-label="Previous period">
          <ChevronLeft size={18} />
        </button>
        <div className="bg-gray-900/70 backdrop-blur-xl border border-violet-500/20 rounded-2xl px-6 py-3 text-center min-w-[220px]">
          <p className="text-base font-bold text-gray-100">{MONTHS[viewMonth - 1]} {viewYear}</p>
          <p className="text-[11px] text-gray-500 mt-0.5">{billingLabel}</p>
          {isCurrentPeriod && <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-violet-400 mt-1"><span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />Current Period</span>}
        </div>
        <button onClick={nextMonth} disabled={isCurrentPeriod} className="p-2 rounded-xl hover:bg-gray-800/60 text-gray-400 hover:text-gray-200 transition-colors disabled:opacity-25 disabled:cursor-not-allowed cursor-pointer" aria-label="Next period">
          <ChevronRight size={18} />
        </button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard icon={<ArrowUpCircle size={14} className="text-emerald-400" />} label="Income" value={formatPrice(totalIncome)} accent="emerald"
          sub={currentPlan?.incomeGoal ? `Goal: ${formatPrice(currentPlan.incomeGoal)}` : 'This period'} delay={0} />
        <KpiCard icon={<Receipt size={14} className="text-blue-400" />} label="Fixed Costs" value={formatPrice(totalFixed)} accent="blue"
          sub={`${fixedTx.length} entries`} delay={0.05} />
        <KpiCard icon={<ArrowDownCircle size={14} className="text-orange-400" />} label="Variable + Auto" value={formatPrice(totalAllVariable)} accent="orange"
          sub={`Incl. ${formatPrice(grocerySpent)} groc. · ${formatPrice(fuelSpent)} fuel`} delay={0.1} />
        <KpiCard
          icon={<PiggyBank size={14} className={netSavings >= 0 ? 'text-emerald-400' : 'text-rose-400'} />}
          label={netSavings >= 0 ? 'Net Savings' : 'Deficit'}
          value={formatPrice(Math.abs(netSavings))} accent={netSavings >= 0 ? 'emerald' : 'rose'}
          sub={totalIncome > 0 ? `${Math.round((Math.max(0, netSavings) / totalIncome) * 100)}% savings rate` : 'No income yet'} delay={0.15} />
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 overflow-x-auto scrollbar-none bg-gray-900/40 backdrop-blur-xl rounded-2xl border border-violet-500/20 p-1.5">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={cn(
              'flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex-shrink-0',
              activeTab === id ? TAB_ACCENT[id] : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/40',
            )}
          >
            <Icon size={12} />{label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }}>

          {activeTab === 'overview' && (
            <OverviewTab
              totalIncome={totalIncome} totalFixed={totalFixed} totalVariable={totalVariable}
              totalAllVariable={totalAllVariable} totalExpenses={totalExpenses} netSavings={netSavings}
              grocerySpent={grocerySpent} groceryBudget={groceryBudget} fuelSpent={fuelSpent}
              monthTx={monthTx} currentPlan={currentPlan} onEdit={openEdit} onDelete={deleteTransaction}
            />
          )}

          {activeTab === 'income' && (
            <TransactionTab
              title="Income" tabColor="emerald" txList={incomeTx} type="income" total={totalIncome}
              onAdd={() => openAdd('income')} onEdit={openEdit} onDelete={deleteTransaction} currentPlan={currentPlan}
            />
          )}

          {activeTab === 'fixed' && (
            <TransactionTab
              title="Fixed Costs" tabColor="blue" txList={fixedTx} type="fixed" total={totalFixed}
              onAdd={() => openAdd('fixed')} onEdit={openEdit} onDelete={deleteTransaction} currentPlan={currentPlan}
              customCats={allCustomCats.filter(c => c.type === 'fixed')}
              onAddCustomCat={cat => { const nc: CustomFinanceCategory = { id: `cf-${Date.now()}`, ...cat, type: 'fixed' }; updatePlanCustomCats('fixed', [...allCustomCats.filter(c => c.type === 'fixed'), nc]); }}
              onDeleteCustomCat={id => updatePlanCustomCats('fixed', allCustomCats.filter(c => c.type === 'fixed' && c.id !== id))}
            />
          )}

          {activeTab === 'variable' && (
            <VariableTab
              txList={varTx} totalVariable={totalVariable} grocerySpent={grocerySpent}
              groceryBudget={groceryBudget} fuelSpent={fuelSpent} onAdd={() => openAdd('variable')}
              onEdit={openEdit} onDelete={deleteTransaction} currentPlan={currentPlan}
              customCats={allCustomCats.filter(c => c.type === 'variable')}
              onAddCustomCat={cat => { const nc: CustomFinanceCategory = { id: `cv-${Date.now()}`, ...cat, type: 'variable' }; updatePlanCustomCats('variable', [...allCustomCats.filter(c => c.type === 'variable'), nc]); }}
              onDeleteCustomCat={id => updatePlanCustomCats('variable', allCustomCats.filter(c => c.type === 'variable' && c.id !== id))}
            />
          )}

          {activeTab === 'plan' && (
            <PlanTab
              currentPlan={currentPlan} totalIncome={totalIncome} totalFixed={totalFixed}
              totalAllVariable={totalAllVariable} netSavings={netSavings}
              fixedTx={fixedTx} varTx={varTx} grocerySpent={grocerySpent} groceryBudget={groceryBudget}
              fuelSpent={fuelSpent} onOpenPlan={openPlan} month={viewMonth} year={viewYear}
            />
          )}

          {activeTab === 'savings' && (
            <SavingsTab
              goals={savingsGoals} onAdd={addSavingsGoal} onUpdate={updateSavingsGoal}
              onDelete={deleteSavingsGoal} onContribute={addSavingsContribution}
              onDeleteContribution={deleteSavingsContribution}
            />
          )}

        </motion.div>
      </AnimatePresence>

      {/* Transaction Modal */}
      <Modal isOpen={txModal.open} onClose={() => setTxModal(s => ({ ...s, open: false }))}
        title={txModal.mode === 'add' ? 'Add Finance Entry' : 'Edit Entry'} size="md">
        <form onSubmit={handleTxSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-2">TYPE</label>
            <div className="grid grid-cols-3 gap-2">
              {(['income', 'fixed', 'variable'] as const).map(t => {
                const colors = { income: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300', fixed: 'bg-blue-500/15 border-blue-500/40 text-blue-300', variable: 'bg-orange-500/15 border-orange-500/40 text-orange-300' };
                return (
                  <button key={t} type="button"
                    onClick={() => { const cats = t === 'income' ? FINANCE_INCOME_CATEGORIES : t === 'fixed' ? FINANCE_FIXED_CATEGORIES : FINANCE_VARIABLE_CATEGORIES; setTxModal(s => ({ ...s, data: { ...s.data, type: t, category: cats[0]?.id || '' } })); }}
                    className={cn('py-2 rounded-xl text-sm font-semibold capitalize transition-all border cursor-pointer', txModal.data.type === t ? colors[t] : 'border-violet-500/20 text-gray-500 hover:text-gray-300 hover:bg-gray-800/40')}
                  >
                    {t === 'income' ? '↑ Income' : t === 'fixed' ? '📌 Fixed' : '🔄 Variable'}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-2">CATEGORY</label>
            <select value={txModal.data.category} onChange={e => setTxModal(s => ({ ...s, data: { ...s.data, category: e.target.value } }))}
              className="w-full px-3 py-2.5 bg-gray-800/60 border border-violet-500/20 rounded-xl text-sm text-gray-200 outline-none focus:ring-2 focus:ring-violet-500 transition-all">
              {formCategories.map(c => <option key={c.id} value={c.id}>{c.icon}  {c.label}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-2">DESCRIPTION</label>
            <input type="text" value={txModal.data.description}
              onChange={e => setTxModal(s => ({ ...s, data: { ...s.data, description: e.target.value } }))}
              placeholder="e.g. Monthly salary, Water bill…"
              className="w-full px-3 py-2.5 bg-gray-800/60 border border-violet-500/20 rounded-xl text-sm text-gray-200 outline-none focus:ring-2 focus:ring-violet-500 transition-all" required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-2">AMOUNT ({CURRENCY})</label>
              <input type="number" step="0.01" min="0.01" value={txModal.data.amount || ''}
                onChange={e => setTxModal(s => ({ ...s, data: { ...s.data, amount: parseFloat(e.target.value) || 0 } }))}
                placeholder="0.00"
                className="w-full px-3 py-2.5 bg-gray-800/60 border border-violet-500/20 rounded-xl text-sm text-gray-200 outline-none focus:ring-2 focus:ring-violet-500 transition-all" required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-2">DATE</label>
              <input type="date" value={new Date(txModal.data.date || Date.now()).toISOString().split('T')[0]}
                onChange={e => setTxModal(s => ({ ...s, data: { ...s.data, date: new Date(e.target.value).getTime() } }))}
                className="w-full px-3 py-2.5 bg-gray-800/60 border border-violet-500/20 rounded-xl text-sm text-gray-200 outline-none focus:ring-2 focus:ring-violet-500 transition-all" />
            </div>
          </div>

          <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl bg-gray-800/30 border border-violet-500/10 hover:border-violet-500/25 transition-colors">
            <input type="checkbox" checked={txModal.data.recurring} onChange={e => setTxModal(s => ({ ...s, data: { ...s.data, recurring: e.target.checked } }))} className="w-4 h-4 accent-violet-600" />
            <span className="text-sm text-gray-300 flex items-center gap-1.5"><Repeat size={13} className="text-gray-500" />Recurring monthly</span>
          </label>

          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-2">NOTES <span className="text-gray-600 font-normal">(optional)</span></label>
            <textarea value={txModal.data.notes || ''} onChange={e => setTxModal(s => ({ ...s, data: { ...s.data, notes: e.target.value } }))} rows={2} placeholder="Any additional context…"
              className="w-full px-3 py-2.5 bg-gray-800/60 border border-violet-500/20 rounded-xl text-sm text-gray-200 outline-none focus:ring-2 focus:ring-violet-500 transition-all resize-none" />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setTxModal(s => ({ ...s, open: false }))} className="flex-1 py-2.5 border border-violet-500/20 rounded-xl text-sm text-gray-400 hover:bg-gray-800/40 transition-colors cursor-pointer">Cancel</button>
            <button type="submit" className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer">{txModal.mode === 'add' ? 'Add Entry' : 'Save Changes'}</button>
          </div>
        </form>
      </Modal>

      {/* Budget Plan Modal */}
      <Modal isOpen={planModal} onClose={() => setPlanModal(false)} title={`Budget Plan — ${MONTHS[viewMonth - 1]} ${viewYear}`} size="lg">
        <form onSubmit={handlePlanSubmit} className="space-y-5">

          {/* Goals */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-3">Goals</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-emerald-500/8 border border-emerald-500/20 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2"><ArrowUpCircle size={13} className="text-emerald-400" /><span className="text-xs font-semibold text-emerald-400">Income Goal</span></div>
                <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-medium">{CURRENCY}</span>
                  <input type="number" step="0.01" min="0" value={planIncome} onChange={e => setPlanIncome(e.target.value)} placeholder="0.00" className="w-full pl-10 pr-3 py-2 bg-gray-900/70 border border-emerald-500/20 rounded-xl text-sm font-medium outline-none focus:border-emerald-500 transition-colors" /></div>
              </div>
              <div className="bg-purple-500/8 border border-purple-500/20 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2"><PiggyBank size={13} className="text-purple-400" /><span className="text-xs font-semibold text-purple-400">Savings Goal</span></div>
                <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-medium">{CURRENCY}</span>
                  <input type="number" step="0.01" min="0" value={planSavings} onChange={e => setPlanSavings(e.target.value)} placeholder="0.00" className="w-full pl-10 pr-3 py-2 bg-gray-900/70 border border-purple-500/20 rounded-xl text-sm font-medium outline-none focus:border-purple-500 transition-colors" /></div>
              </div>
            </div>
            {parseFloat(planIncome) > 0 && (
              <div className="mt-3 flex items-center justify-between bg-gray-800/40 rounded-xl px-4 py-2.5 border border-violet-500/10">
                <span className="text-xs text-gray-500">Spendable Budget</span>
                <span className="text-sm font-bold text-gray-200 font-mono">{formatPrice(Math.max(0, parseFloat(planIncome) - (parseFloat(planSavings) || 0)))}</span>
              </div>
            )}
          </div>

          {/* Fixed Expenses */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-3 flex items-center gap-1.5"><Receipt size={10} className="text-blue-400" />Fixed Expenses</p>
            <div className="bg-gray-800/30 border border-violet-500/20 rounded-2xl overflow-hidden divide-y divide-white/[0.05]">
              {FINANCE_FIXED_CATEGORIES.map(cat => (
                <div key={cat.id} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="text-sm w-6 text-center shrink-0">{cat.icon}</span>
                  <span className="flex-1 text-sm text-gray-300 truncate">{cat.label}</span>
                  <div className="relative w-36 shrink-0"><span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-500">{CURRENCY}</span>
                    <input type="number" step="0.01" min="0" value={planTargets[cat.id] || ''} onChange={e => setPlanTargets({ ...planTargets, [cat.id]: e.target.value })} placeholder="0.00" className="w-full pl-8 pr-2 py-1.5 bg-gray-800/60 border border-violet-500/15 rounded-lg text-sm text-right outline-none focus:border-blue-500 transition-colors" /></div>
                </div>
              ))}
              {planCustomFixed.map(cat => (
                <div key={cat.id} className="flex items-center gap-2 px-4 py-2.5">
                  <input type="text" value={cat.icon} onChange={e => setPlanCustomFixed(p => p.map(c => c.id === cat.id ? { ...c, icon: e.target.value } : c))} maxLength={4} className="w-8 text-center text-sm bg-transparent outline-none shrink-0" />
                  <input type="text" value={cat.label} onChange={e => setPlanCustomFixed(p => p.map(c => c.id === cat.id ? { ...c, label: e.target.value } : c))} className="flex-1 text-sm text-gray-200 bg-transparent border-b border-violet-500/20 outline-none py-0.5" />
                  <div className="relative w-32 shrink-0"><span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-500">{CURRENCY}</span>
                    <input type="number" step="0.01" min="0" value={planTargets[cat.id] || ''} onChange={e => setPlanTargets({ ...planTargets, [cat.id]: e.target.value })} placeholder="0.00" className="w-full pl-8 pr-2 py-1.5 bg-gray-800/60 border border-violet-500/15 rounded-lg text-sm text-right outline-none focus:border-blue-500 transition-colors" /></div>
                  <button type="button" onClick={() => { setPlanCustomFixed(p => p.filter(c => c.id !== cat.id)); const { [cat.id]: _, ...rest } = planTargets; setPlanTargets(rest); }} className="text-gray-600 hover:text-rose-400 shrink-0 cursor-pointer"><X size={13} /></button>
                </div>
              ))}
              <button type="button" onClick={() => setPlanCustomFixed(p => [...p, { id: `cf-${Date.now()}`, label: '', icon: '📌' }])} className="w-full px-4 py-2.5 flex items-center gap-1.5 text-xs text-blue-400 hover:bg-blue-500/5 transition-colors cursor-pointer"><Plus size={11} />Add custom fixed category</button>
            </div>
          </div>

          {/* Variable Expenses */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-3 flex items-center gap-1.5"><ArrowDownCircle size={10} className="text-orange-400" />Variable Expenses</p>
            <div className="bg-gray-800/30 border border-violet-500/20 rounded-2xl overflow-hidden divide-y divide-white/[0.05]">
              {/* Groceries locked row */}
              <div className="flex items-center gap-3 px-4 py-2.5 bg-violet-500/5">
                <span className="text-sm w-6 text-center shrink-0">🛒</span>
                <span className="flex-1 text-sm text-gray-400 truncate">Groceries</span>
                <span className="text-xs text-violet-400 bg-violet-500/10 px-2 py-1 rounded-lg border border-violet-500/20">{groceryBudget > 0 ? `Auto · ${formatPrice(groceryBudget)}` : 'Set in Shopping Budget'}</span>
              </div>
              {/* Fuel locked row */}
              <div className="flex items-center gap-3 px-4 py-2.5 bg-amber-500/5">
                <span className="text-sm w-6 text-center shrink-0"><Fuel size={14} className="text-amber-400 mx-auto" /></span>
                <span className="flex-1 text-sm text-gray-400 truncate">Fuel</span>
                <span className="text-xs text-amber-400 bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/20">Auto from Fuel page</span>
              </div>
              {FINANCE_VARIABLE_CATEGORIES.filter(c => c.id !== 'groceries').map(cat => (
                <div key={cat.id} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="text-sm w-6 text-center shrink-0">{cat.icon}</span>
                  <span className="flex-1 text-sm text-gray-300 truncate">{cat.label}</span>
                  <div className="relative w-36 shrink-0"><span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-500">{CURRENCY}</span>
                    <input type="number" step="0.01" min="0" value={planTargets[cat.id] || ''} onChange={e => setPlanTargets({ ...planTargets, [cat.id]: e.target.value })} placeholder="0.00" className="w-full pl-8 pr-2 py-1.5 bg-gray-800/60 border border-violet-500/15 rounded-lg text-sm text-right outline-none focus:border-orange-500 transition-colors" /></div>
                </div>
              ))}
              {planCustomVar.map(cat => (
                <div key={cat.id} className="flex items-center gap-2 px-4 py-2.5">
                  <input type="text" value={cat.icon} onChange={e => setPlanCustomVar(p => p.map(c => c.id === cat.id ? { ...c, icon: e.target.value } : c))} maxLength={4} className="w-8 text-center text-sm bg-transparent outline-none shrink-0" />
                  <input type="text" value={cat.label} onChange={e => setPlanCustomVar(p => p.map(c => c.id === cat.id ? { ...c, label: e.target.value } : c))} className="flex-1 text-sm text-gray-200 bg-transparent border-b border-violet-500/20 outline-none py-0.5" />
                  <div className="relative w-32 shrink-0"><span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-500">{CURRENCY}</span>
                    <input type="number" step="0.01" min="0" value={planTargets[cat.id] || ''} onChange={e => setPlanTargets({ ...planTargets, [cat.id]: e.target.value })} placeholder="0.00" className="w-full pl-8 pr-2 py-1.5 bg-gray-800/60 border border-violet-500/15 rounded-lg text-sm text-right outline-none focus:border-orange-500 transition-colors" /></div>
                  <button type="button" onClick={() => { setPlanCustomVar(p => p.filter(c => c.id !== cat.id)); const { [cat.id]: _, ...rest } = planTargets; setPlanTargets(rest); }} className="text-gray-600 hover:text-rose-400 shrink-0 cursor-pointer"><X size={13} /></button>
                </div>
              ))}
              <button type="button" onClick={() => setPlanCustomVar(p => [...p, { id: `cv-${Date.now()}`, label: '', icon: '📋' }])} className="w-full px-4 py-2.5 flex items-center gap-1.5 text-xs text-orange-400 hover:bg-orange-500/5 transition-colors cursor-pointer"><Plus size={11} />Add custom variable category</button>
            </div>
          </div>

          {/* Live budget summary */}
          {(() => {
            const income  = parseFloat(planIncome) || 0;
            const savings = parseFloat(planSavings) || 0;
            const fxd = FINANCE_FIXED_CATEGORIES.reduce((s, c) => s + (parseFloat(planTargets[c.id] || '0') || 0), 0);
            const vrbl = FINANCE_VARIABLE_CATEGORIES.filter(c => c.id !== 'groceries').reduce((s, c) => s + (parseFloat(planTargets[c.id] || '0') || 0), 0);
            const allocated = fxd + vrbl + savings + groceryBudget;
            const remaining = income - allocated;
            const over = income > 0 && remaining < 0;
            return (
              <div className="bg-gray-800/40 rounded-2xl p-4 border border-violet-500/10 space-y-2.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Budget Summary</p>
                <div className="space-y-1.5 text-sm">
                  {[['Fixed', formatPrice(fxd), 'text-blue-400'], ['Variable', formatPrice(vrbl), 'text-orange-400'], ['Groceries (auto)', formatPrice(groceryBudget), 'text-amber-400'], ['Savings Target', formatPrice(savings), 'text-purple-400']].map(([l, v, c]) => (
                    <div key={l} className="flex justify-between"><span className="text-gray-500">{l}</span><span className={cn('font-semibold font-mono', c)}>{v}</span></div>
                  ))}
                  <div className="border-t border-violet-500/10 pt-2 flex justify-between font-semibold">
                    <span className="text-gray-400">Total Allocated</span>
                    <span className={cn('font-mono', over ? 'text-rose-400' : 'text-gray-200')}>{formatPrice(allocated)}</span>
                  </div>
                  {income > 0 && <div className="flex justify-between text-xs"><span className="text-gray-500">Remaining</span><span className={cn('font-semibold font-mono', over ? 'text-rose-400' : remaining === 0 ? 'text-emerald-400' : 'text-gray-400')}>{over ? `Over by ${formatPrice(Math.abs(remaining))}` : formatPrice(remaining)}</span></div>}
                </div>
                {income > 0 && <div className="h-1.5 bg-gray-700/60 rounded-full overflow-hidden"><div className="h-full rounded-full transition-all duration-300" style={{ width: `${Math.min(Math.round((allocated / income) * 100), 100)}%`, backgroundColor: over ? '#f43f5e' : allocated / income > 0.9 ? '#f97316' : '#10b981' }} /></div>}
              </div>
            );
          })()}

          <div className="flex gap-3">
            <button type="button" onClick={() => setPlanModal(false)} className="flex-1 py-2.5 border border-violet-500/20 rounded-xl text-sm text-gray-400 hover:bg-gray-800/40 transition-colors cursor-pointer">Cancel</button>
            <button type="submit" className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer">Save Plan</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════
// OVERVIEW TAB
// ══════════════════════════════════════════════════════════════
interface OverviewProps {
  totalIncome: number; totalFixed: number; totalVariable: number; totalAllVariable: number;
  totalExpenses: number; netSavings: number; grocerySpent: number; groceryBudget: number;
  fuelSpent: number; monthTx: FinanceTransaction[]; currentPlan: any;
  onEdit: (tx: FinanceTransaction) => void; onDelete: (id: string) => void;
}

const OverviewTab: React.FC<OverviewProps> = ({
  totalIncome, totalFixed, totalVariable, totalAllVariable, totalExpenses,
  netSavings, grocerySpent, groceryBudget, fuelSpent, monthTx, currentPlan, onEdit, onDelete,
}) => {
  const savingsRate = totalIncome > 0 ? Math.round((Math.max(0, netSavings) / totalIncome) * 100) : 0;
  const recentTx = [...monthTx].sort((a, b) => b.date - a.date).slice(0, 8);

  // Waterfall bar data
  const bars = [
    { label: 'Income', value: totalIncome, color: '#10b981' },
    { label: 'Fixed', value: totalFixed, color: '#3b82f6' },
    { label: 'Variable', value: totalVariable, color: '#f97316' },
    { label: 'Groceries', value: grocerySpent, color: '#f59e0b' },
    { label: 'Fuel', value: fuelSpent, color: '#a855f7' },
    { label: 'Net', value: Math.max(0, netSavings), color: netSavings >= 0 ? '#10b981' : '#f43f5e' },
  ].filter(b => b.value > 0);
  const maxBar = Math.max(...bars.map(b => b.value), 1);

  return (
    <div className="space-y-5">

      {/* Spending flow visualization */}
      {(totalIncome > 0 || totalExpenses > 0) && (
        <div className="bg-gray-900/70 backdrop-blur-xl rounded-2xl border border-violet-500/20 p-5">
          <h2 className="text-sm font-semibold text-gray-200 flex items-center gap-2 mb-4">
            <BarChart2 size={14} className="text-violet-400" /> Period Cash Flow
          </h2>
          <div className="space-y-2.5">
            {bars.map(b => (
              <div key={b.label}>
                <div className="flex items-center justify-between mb-1 text-xs">
                  <span className="text-gray-400">{b.label}</span>
                  <span className="font-mono font-semibold text-gray-200 tabular-nums">{formatPrice(b.value)}</span>
                </div>
                <div className="h-6 bg-gray-800/60 rounded-lg overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }} animate={{ width: `${(b.value / maxBar) * 100}%` }}
                    transition={{ duration: 0.7, ease: 'easeOut' }}
                    className="h-full rounded-lg flex items-center px-2"
                    style={{ backgroundColor: b.color + 'cc' }}
                  >
                    <span className="text-[10px] font-bold text-white/80 truncate">{Math.round((b.value / maxBar) * 100)}%</span>
                  </motion.div>
                </div>
              </div>
            ))}
          </div>

          {totalIncome > 0 && (
            <div className="mt-4 pt-4 border-t border-white/[0.05] flex items-center justify-between">
              <span className="text-xs text-gray-500">Savings Rate</span>
              <div className="flex items-center gap-2">
                <span className={cn('text-sm font-bold font-mono', savingsRate >= 20 ? 'text-emerald-400' : savingsRate >= 10 ? 'text-amber-400' : 'text-rose-400')}>{savingsRate}%</span>
                {savingsRate >= 20 ? <TrendingUp size={13} className="text-emerald-400" /> : <TrendingDown size={13} className="text-rose-400" />}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Budget plan progress */}
      {currentPlan && (totalIncome > 0 || totalExpenses > 0) && (
        <div className="bg-gray-900/70 backdrop-blur-xl rounded-2xl border border-violet-500/20 p-5 space-y-3">
          <h2 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
            <Target size={14} className="text-cyan-400" />Budget Plan Progress
          </h2>
          {[
            { label: 'Income', actual: totalIncome, goal: currentPlan.incomeGoal, color: '#10b981', isExpense: false },
            { label: 'Fixed Costs', actual: totalFixed, goal: currentPlan.fixedBudget || currentPlan.categoryTargets?.filter((t: FinanceCategoryTarget) => t.type === 'fixed').reduce((s: number, t: FinanceCategoryTarget) => s + t.targetAmount, 0), color: '#3b82f6', isExpense: true },
            { label: 'Variable + Auto', actual: totalAllVariable, goal: (currentPlan.variableBudget || currentPlan.categoryTargets?.filter((t: FinanceCategoryTarget) => t.type === 'variable').reduce((s: number, t: FinanceCategoryTarget) => s + t.targetAmount, 0) || 0) + groceryBudget, color: '#f97316', isExpense: true },
            { label: 'Net Savings', actual: Math.max(0, netSavings), goal: currentPlan.savingsGoal, color: '#a855f7', isExpense: false },
          ].filter(r => r.goal > 0).map(row => {
            const p = row.goal > 0 ? pct(row.actual, row.goal) : 0;
            const over = row.isExpense && row.actual > row.goal;
            return (
              <div key={row.label} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">{row.label}</span>
                  <div className="flex items-center gap-2">
                    <span className={cn('font-semibold font-mono tabular-nums', over ? 'text-rose-400' : 'text-gray-200')}>{formatPrice(row.actual)}</span>
                    <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-bold', over ? 'bg-rose-500/15 text-rose-400' : 'bg-gray-800/60 text-gray-500')}>{p}%{row.goal ? ` of ${formatPrice(row.goal)}` : ''}</span>
                  </div>
                </div>
                <div className="h-2 bg-gray-800/60 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(p, 100)}%` }} transition={{ duration: 0.7 }}
                    className="h-full rounded-full" style={{ backgroundColor: row.isExpense ? barColor(row.actual, row.goal) : row.color }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Recent transactions */}
      <div className="bg-gray-900/70 backdrop-blur-xl rounded-2xl border border-violet-500/20 overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.04] flex items-center justify-between">
          <h2 className="font-semibold text-gray-200 text-sm">Recent Activity</h2>
          <span className="text-xs text-gray-500">{monthTx.length} entries this period</span>
        </div>
        {recentTx.length === 0 ? (
          <div className="p-10 text-center">
            <ClipboardList size={28} className="mx-auto text-gray-700 mb-2" />
            <p className="text-sm text-gray-500">No entries yet</p>
            <p className="text-xs text-gray-600 mt-1">Add income or expense entries above</p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {recentTx.map(tx => <TxRow key={tx.id} tx={tx} onEdit={onEdit} onDelete={onDelete} />)}
          </div>
        )}
      </div>

      {/* Auto-integration notice */}
      {(grocerySpent > 0 || fuelSpent > 0) && (
        <div className="bg-violet-500/5 border border-violet-500/15 rounded-xl p-4 flex items-start gap-3">
          <Zap size={14} className="text-violet-400 mt-0.5 shrink-0" />
          <p className="text-sm text-violet-300">
            <strong>{formatPrice(grocerySpent + fuelSpent)}</strong> auto-integrated this period:
            <span className="text-amber-400"> {formatPrice(grocerySpent)} groceries</span> +
            <span className="text-purple-400"> {formatPrice(fuelSpent)} fuel</span> — pulled directly from your Shopping Trips and Fuel pages.
          </p>
        </div>
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════
// TRANSACTION TAB (Income, Fixed)
// ══════════════════════════════════════════════════════════════
interface TransactionTabProps {
  title: string; tabColor: 'emerald' | 'blue';
  txList: FinanceTransaction[]; type: FinanceTransactionType; total: number;
  onAdd: () => void; onEdit: (tx: FinanceTransaction) => void; onDelete: (id: string) => void;
  currentPlan: any; customCats?: CustomFinanceCategory[];
  onAddCustomCat?: (cat: { label: string; icon: string }) => void;
  onDeleteCustomCat?: (id: string) => void;
}

const TransactionTab: React.FC<TransactionTabProps> = ({
  title, tabColor, txList, type, total, onAdd, onEdit, onDelete, currentPlan, customCats = [], onAddCustomCat, onDeleteCustomCat,
}) => {
  const colors = { emerald: { border: 'border-emerald-500/25', accent: 'text-emerald-400', bg: 'bg-emerald-500/8' }, blue: { border: 'border-blue-500/25', accent: 'text-blue-400', bg: 'bg-blue-500/8' } };
  const c = colors[tabColor];
  const planTarget = currentPlan?.categoryTargets?.filter((t: FinanceCategoryTarget) => t.type === type || type === 'income').reduce((s: number, t: FinanceCategoryTarget) => s + t.targetAmount, 0) ?? 0;
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggle = (id: string) => setExpanded(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  const [addingCat, setAddingCat] = useState(false);
  const [newIcon, setNewIcon] = useState('📌');
  const [newLabel, setNewLabel] = useState('');
  const saveNewCat = () => { if (newLabel.trim() && onAddCustomCat) { onAddCustomCat({ label: newLabel.trim(), icon: newIcon || '📌' }); setNewLabel(''); setNewIcon('📌'); setAddingCat(false); } };

  const groups = useMemo(() => {
    const map = new Map<string, { total: number; items: FinanceTransaction[] }>();
    txList.forEach(tx => { const e = map.get(tx.category) || { total: 0, items: [] }; e.total += tx.amount; e.items.push(tx); map.set(tx.category, e); });
    return Array.from(map.entries()).sort((a, b) => b[1].total - a[1].total);
  }, [txList]);

  return (
    <div className="space-y-4">
      {/* Header card */}
      <div className={cn('rounded-2xl border p-5 flex items-center justify-between', c.bg, c.border)}>
        <div>
          <p className="text-xs text-gray-500">{title} This Period</p>
          <p className={cn('text-3xl font-bold font-mono tabular-nums mt-0.5', c.accent)}>{formatPrice(total)}</p>
          {planTarget > 0 && <p className="text-xs text-gray-500 mt-1">Target: {formatPrice(planTarget)} · {pct(total, planTarget)}% used</p>}
        </div>
        <button onClick={onAdd} className="flex items-center gap-2 px-4 py-2 bg-gray-900/70 border border-violet-500/20 rounded-xl text-sm font-semibold text-gray-300 hover:bg-gray-800/60 transition-colors cursor-pointer">
          <Plus size={14} /> Add {type === 'income' ? 'Income' : 'Expense'}
        </button>
      </div>

      {/* Category groups */}
      {groups.length === 0 ? (
        <div className="bg-gray-900/70 backdrop-blur-xl rounded-2xl border border-violet-500/20 p-12 text-center">
          <ClipboardList size={28} className="mx-auto text-gray-700 mb-2" />
          <p className="text-sm text-gray-500 mb-4">No {title.toLowerCase()} entries this period</p>
          <button onClick={onAdd} className="px-5 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer"><span className="flex items-center gap-1.5"><Plus size={13} /> Add Entry</span></button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {groups.map(([catId, { total: catTotal, items }]) => {
            const isOpen = expanded.has(catId);
            const isCustom = customCats.some(c => c.id === catId);
            return (
              <div key={catId} className="bg-gray-900/70 backdrop-blur-xl rounded-2xl border border-violet-500/20 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-gray-800/30 hover:bg-gray-800/50 transition-colors">
                  <button onClick={() => toggle(catId)} className="flex items-center gap-2.5 flex-1 min-w-0 text-left cursor-pointer">
                    <ChevronDown size={14} className={cn('text-gray-500 transition-transform duration-200 shrink-0', isOpen && 'rotate-180')} />
                    <span className="text-base shrink-0">{getCatIcon(type, catId)}</span>
                    <span className="text-sm font-semibold text-gray-300 truncate">{getCatLabel(type, catId)}</span>
                    <span className="text-xs text-gray-600 shrink-0">({items.length})</span>
                  </button>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-bold font-mono tabular-nums text-gray-100">{formatPrice(catTotal)}</span>
                    {isCustom && onDeleteCustomCat && (
                      <button onClick={() => { if (confirm(`Delete "${getCatLabel(type, catId)}" category?`)) onDeleteCustomCat(catId); }} className="p-1 text-gray-600 hover:text-rose-400 rounded-lg transition-colors cursor-pointer"><X size={11} /></button>
                    )}
                  </div>
                </div>
                <AnimatePresence>
                  {isOpen && (
                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                      <div className="divide-y divide-white/[0.04]">
                        {items.sort((a, b) => b.date - a.date).map(tx => <TxRow key={tx.id} tx={tx} onEdit={onEdit} onDelete={onDelete} compact />)}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}

      {/* Add custom category */}
      {onAddCustomCat && (
        <div>
          {!addingCat ? (
            <button onClick={() => setAddingCat(true)} className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs text-gray-500 hover:text-gray-300 hover:bg-gray-800/40 rounded-2xl border border-dashed border-violet-500/20 transition-colors cursor-pointer"><Plus size={12} /> New Category</button>
          ) : (
            <div className="flex items-center gap-2 px-4 py-3 bg-gray-900/70 rounded-2xl border border-dashed border-violet-500/30">
              <input type="text" value={newIcon} onChange={e => setNewIcon(e.target.value)} maxLength={4} className="w-8 text-center text-base bg-transparent outline-none shrink-0" />
              <input type="text" value={newLabel} onChange={e => setNewLabel(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') saveNewCat(); if (e.key === 'Escape') setAddingCat(false); }} placeholder="Category name…" autoFocus className="flex-1 text-sm bg-transparent outline-none border-b border-violet-500/20 py-0.5 text-gray-200" />
              <button onClick={saveNewCat} disabled={!newLabel.trim()} className="p-1 text-violet-400 hover:text-violet-200 disabled:opacity-30 cursor-pointer"><Check size={14} /></button>
              <button onClick={() => { setAddingCat(false); setNewLabel(''); setNewIcon('📌'); }} className="p-1 text-gray-500 hover:text-rose-400 cursor-pointer"><X size={14} /></button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════
// VARIABLE TAB (includes grocery + fuel auto rows)
// ══════════════════════════════════════════════════════════════
interface VariableTabProps {
  txList: FinanceTransaction[]; totalVariable: number; grocerySpent: number; groceryBudget: number;
  fuelSpent: number; onAdd: () => void; onEdit: (tx: FinanceTransaction) => void; onDelete: (id: string) => void;
  currentPlan: any; customCats?: CustomFinanceCategory[];
  onAddCustomCat?: (cat: { label: string; icon: string }) => void;
  onDeleteCustomCat?: (id: string) => void;
}

const VariableTab: React.FC<VariableTabProps> = ({
  txList, totalVariable, grocerySpent, groceryBudget, fuelSpent, onAdd, onEdit, onDelete, currentPlan, customCats = [], onAddCustomCat, onDeleteCustomCat,
}) => {
  const totalAll = totalVariable + grocerySpent + fuelSpent;
  const planTarget = currentPlan?.categoryTargets?.filter((t: FinanceCategoryTarget) => t.type === 'variable').reduce((s: number, t: FinanceCategoryTarget) => s + t.targetAmount, 0) ?? 0;
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggle = (id: string) => setExpanded(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  const [addingCat, setAddingCat] = useState(false);
  const [newIcon, setNewIcon] = useState('📋');
  const [newLabel, setNewLabel] = useState('');
  const saveNewCat = () => { if (newLabel.trim() && onAddCustomCat) { onAddCustomCat({ label: newLabel.trim(), icon: newIcon || '📋' }); setNewLabel(''); setNewIcon('📋'); setAddingCat(false); } };

  const groups = useMemo(() => {
    const map = new Map<string, { total: number; items: FinanceTransaction[] }>();
    txList.forEach(tx => { const e = map.get(tx.category) || { total: 0, items: [] }; e.total += tx.amount; e.items.push(tx); map.set(tx.category, e); });
    return Array.from(map.entries()).sort((a, b) => b[1].total - a[1].total);
  }, [txList]);

  return (
    <div className="space-y-4">
      {/* Header card */}
      <div className="bg-orange-500/8 border border-orange-500/20 rounded-2xl p-5 flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500">Variable Costs This Period</p>
          <p className="text-3xl font-bold font-mono tabular-nums text-orange-400 mt-0.5">{formatPrice(totalAll)}</p>
          {planTarget > 0 && <p className="text-xs text-gray-500 mt-1">Target: {formatPrice(planTarget + groceryBudget)} · {pct(totalAll, planTarget + groceryBudget)}% used</p>}
        </div>
        <button onClick={onAdd} className="flex items-center gap-2 px-4 py-2 bg-gray-900/70 border border-violet-500/20 rounded-xl text-sm font-semibold text-gray-300 hover:bg-gray-800/60 transition-colors cursor-pointer">
          <Plus size={14} /> Add Expense
        </button>
      </div>

      {/* Grocery auto row */}
      {(() => {
        const groceryOpen = expanded.has('__grocery__');
        return (
          <div className="bg-gray-900/70 backdrop-blur-xl rounded-2xl border border-amber-500/25 overflow-hidden">
            <button onClick={() => toggle('__grocery__')} className="w-full px-4 py-3 flex items-center justify-between bg-amber-500/5 hover:bg-amber-500/10 transition-colors cursor-pointer">
              <div className="flex items-center gap-2.5">
                <ChevronDown size={14} className={cn('text-gray-500 transition-transform duration-200', groceryOpen && 'rotate-180')} />
                <ShoppingCart size={14} className="text-amber-400 shrink-0" />
                <span className="text-sm font-semibold text-gray-300">Groceries</span>
                <span className="text-[10px] bg-amber-500/15 text-amber-400 px-1.5 py-0.5 rounded-full border border-amber-500/20 font-semibold">Auto from trips</span>
              </div>
              <span className="text-sm font-bold font-mono tabular-nums text-gray-100">{formatPrice(grocerySpent)}</span>
            </button>
            <AnimatePresence>
              {groceryOpen && (
                <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                  <div className="px-4 py-3 space-y-2 border-t border-white/[0.04]">
                    {groceryBudget > 0 && (() => {
                      const p = Math.min(pct(grocerySpent, groceryBudget), 100);
                      const over = grocerySpent > groceryBudget;
                      return (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs"><span className="text-gray-500">Budget: {formatPrice(groceryBudget)}</span><span className={over ? 'text-rose-400 font-semibold' : 'text-gray-500'}>{over ? `Over by ${formatPrice(grocerySpent - groceryBudget)}` : `${formatPrice(groceryBudget - grocerySpent)} remaining`}</span></div>
                          <div className="h-1.5 bg-gray-800/60 rounded-full overflow-hidden"><div className="h-full rounded-full transition-all duration-500" style={{ width: `${p}%`, backgroundColor: over ? '#f43f5e' : '#10b981' }} /></div>
                        </div>
                      );
                    })()}
                    <p className="text-xs text-gray-600">Automatically pulled from your completed shopping trips this period.</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })()}

      {/* Fuel auto row */}
      {fuelSpent > 0 && (() => {
        const fuelOpen = expanded.has('__fuel__');
        return (
          <div className="bg-gray-900/70 backdrop-blur-xl rounded-2xl border border-purple-500/25 overflow-hidden">
            <button onClick={() => toggle('__fuel__')} className="w-full px-4 py-3 flex items-center justify-between bg-purple-500/5 hover:bg-purple-500/10 transition-colors cursor-pointer">
              <div className="flex items-center gap-2.5">
                <ChevronDown size={14} className={cn('text-gray-500 transition-transform duration-200', fuelOpen && 'rotate-180')} />
                <Fuel size={14} className="text-purple-400 shrink-0" />
                <span className="text-sm font-semibold text-gray-300">Fuel</span>
                <span className="text-[10px] bg-purple-500/15 text-purple-400 px-1.5 py-0.5 rounded-full border border-purple-500/20 font-semibold">Auto from Fuel page</span>
              </div>
              <span className="text-sm font-bold font-mono tabular-nums text-gray-100">{formatPrice(fuelSpent)}</span>
            </button>
            <AnimatePresence>
              {fuelOpen && (
                <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                  <div className="px-4 py-3 border-t border-white/[0.04]">
                    <p className="text-xs text-gray-600">Automatically pulled from your fuel fill-up records this period.</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })()}

      {/* Manual variable entries */}
      {groups.filter(([cid]) => cid !== 'groceries').length === 0 ? (
        <div className="bg-gray-900/70 backdrop-blur-xl rounded-2xl border border-violet-500/20 p-12 text-center">
          <ClipboardList size={28} className="mx-auto text-gray-700 mb-2" />
          <p className="text-sm text-gray-500 mb-4">No manual variable expenses this period</p>
          <button onClick={onAdd} className="px-5 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer"><span className="flex items-center gap-1.5"><Plus size={13} /> Add Expense</span></button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {groups.filter(([cid]) => cid !== 'groceries').map(([catId, { total: catTotal, items }]) => {
            const isOpen = expanded.has(catId);
            const isCustom = customCats.some(c => c.id === catId);
            return (
              <div key={catId} className="bg-gray-900/70 backdrop-blur-xl rounded-2xl border border-violet-500/20 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-gray-800/30 hover:bg-gray-800/50 transition-colors">
                  <button onClick={() => toggle(catId)} className="flex items-center gap-2.5 flex-1 min-w-0 text-left cursor-pointer">
                    <ChevronDown size={14} className={cn('text-gray-500 transition-transform duration-200 shrink-0', isOpen && 'rotate-180')} />
                    <span className="text-base shrink-0">{getCatIcon('variable', catId)}</span>
                    <span className="text-sm font-semibold text-gray-300 truncate">{getCatLabel('variable', catId)}</span>
                    <span className="text-xs text-gray-600 shrink-0">({items.length})</span>
                  </button>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-bold font-mono tabular-nums text-gray-100">{formatPrice(catTotal)}</span>
                    {isCustom && onDeleteCustomCat && (
                      <button onClick={() => { if (confirm(`Delete this category?`)) onDeleteCustomCat(catId); }} className="p-1 text-gray-600 hover:text-rose-400 rounded-lg transition-colors cursor-pointer"><X size={11} /></button>
                    )}
                  </div>
                </div>
                <AnimatePresence>
                  {isOpen && (
                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                      <div className="divide-y divide-white/[0.04]">
                        {items.sort((a, b) => b.date - a.date).map(tx => <TxRow key={tx.id} tx={tx} onEdit={onEdit} onDelete={onDelete} compact />)}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}

      {/* Add custom category */}
      {onAddCustomCat && (
        <div>
          {!addingCat ? (
            <button onClick={() => setAddingCat(true)} className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs text-gray-500 hover:text-gray-300 hover:bg-gray-800/40 rounded-2xl border border-dashed border-violet-500/20 transition-colors cursor-pointer"><Plus size={12} /> New Category</button>
          ) : (
            <div className="flex items-center gap-2 px-4 py-3 bg-gray-900/70 rounded-2xl border border-dashed border-orange-500/30">
              <input type="text" value={newIcon} onChange={e => setNewIcon(e.target.value)} maxLength={4} className="w-8 text-center text-base bg-transparent outline-none shrink-0" />
              <input type="text" value={newLabel} onChange={e => setNewLabel(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') saveNewCat(); if (e.key === 'Escape') setAddingCat(false); }} placeholder="Category name…" autoFocus className="flex-1 text-sm bg-transparent outline-none border-b border-violet-500/20 py-0.5 text-gray-200" />
              <button onClick={saveNewCat} disabled={!newLabel.trim()} className="p-1 text-orange-400 hover:text-orange-200 disabled:opacity-30 cursor-pointer"><Check size={14} /></button>
              <button onClick={() => { setAddingCat(false); setNewLabel(''); setNewIcon('📋'); }} className="p-1 text-gray-500 hover:text-rose-400 cursor-pointer"><X size={14} /></button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════
// PLAN TAB
// ══════════════════════════════════════════════════════════════
interface PlanTabProps {
  currentPlan: any; totalIncome: number; totalFixed: number; totalAllVariable: number; netSavings: number;
  fixedTx: FinanceTransaction[]; varTx: FinanceTransaction[]; grocerySpent: number; groceryBudget: number;
  fuelSpent: number; onOpenPlan: () => void; month: number; year: number;
}

const PlanTab: React.FC<PlanTabProps> = ({
  currentPlan, totalIncome, totalFixed, totalAllVariable, netSavings,
  fixedTx, varTx, grocerySpent, groceryBudget, fuelSpent, onOpenPlan, month, year,
}) => {
  if (!currentPlan) return (
    <div className="bg-gray-900/70 backdrop-blur-xl rounded-2xl border border-violet-500/20 p-14 text-center">
      <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-cyan-500/10 flex items-center justify-center"><Target size={24} className="text-cyan-400" /></div>
      <p className="text-base font-semibold text-gray-300">No budget plan set for {MONTHS[month - 1]}</p>
      <p className="text-sm text-gray-500 mt-1 mb-5">Set income goals, expense targets and savings goals</p>
      <button onClick={onOpenPlan} className="px-6 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer">Set Budget Plan</button>
    </div>
  );

  const allCats = [...FINANCE_FIXED_CATEGORIES, ...FINANCE_VARIABLE_CATEGORIES];
  const actualByCat = new Map<string, number>();
  fixedTx.forEach(tx => actualByCat.set(tx.category, (actualByCat.get(tx.category) || 0) + tx.amount));
  varTx.forEach(tx => actualByCat.set(tx.category, (actualByCat.get(tx.category) || 0) + tx.amount));

  return (
    <div className="space-y-5">
      {/* Plan summary strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-gray-900/70 backdrop-blur-xl rounded-2xl border border-emerald-500/20 p-4 relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />
          <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Income Goal</p>
          <p className="text-xl font-bold text-emerald-400 font-mono">{formatPrice(currentPlan.incomeGoal || 0)}</p>
          <p className="text-xs text-gray-500 mt-1">Actual: <span className="text-gray-300 font-mono">{formatPrice(totalIncome)}</span></p>
        </div>
        <div className="bg-gray-900/70 backdrop-blur-xl rounded-2xl border border-purple-500/20 p-4 relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-purple-500/40 to-transparent" />
          <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Savings Goal</p>
          <p className="text-xl font-bold text-purple-400 font-mono">{formatPrice(currentPlan.savingsGoal || 0)}</p>
          {currentPlan.savingsGoal > 0 && (() => {
            const actual = Math.max(0, netSavings);
            const goal = currentPlan.savingsGoal;
            const p = goal > 0 ? Math.min(pct(actual, goal), 100) : 0;
            const onTrack = actual >= goal;
            return (
              <div className="mt-1.5 space-y-1">
                <div className="h-1.5 bg-gray-800/60 rounded-full overflow-hidden"><div className="h-full rounded-full transition-all duration-500" style={{ width: `${p}%`, backgroundColor: onTrack ? '#10b981' : '#a855f7' }} /></div>
                <p className={cn('text-xs', onTrack ? 'text-emerald-400' : 'text-amber-400')}>{formatPrice(actual)} saved {onTrack ? '✓' : `— ${formatPrice(goal - actual)} short`}</p>
              </div>
            );
          })()}
        </div>
        <div className="bg-gray-900/70 backdrop-blur-xl rounded-2xl border border-violet-500/20 p-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">This Period</p>
            <p className="text-sm font-semibold text-gray-300">{MONTHS[month - 1]} {year}</p>
          </div>
          <button onClick={onOpenPlan} className="p-2 hover:bg-gray-800/60 rounded-xl text-gray-500 hover:text-violet-400 transition-colors cursor-pointer"><Edit3 size={14} /></button>
        </div>
      </div>

      {/* Category targets breakdown */}
      {(currentPlan.categoryTargets?.length > 0 || groceryBudget > 0) && (
        <div className="bg-gray-900/70 backdrop-blur-xl rounded-2xl border border-violet-500/20 overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.04]">
            <h2 className="font-semibold text-gray-200 text-sm">Actual vs Budget</h2>
            <p className="text-xs text-gray-500 mt-0.5">Category-level spending vs your plan</p>
          </div>
          <div className="p-5 space-y-4">
            {currentPlan.categoryTargets.map((ct: FinanceCategoryTarget) => {
              const cat = allCats.find(c => c.id === ct.category);
              const actual = actualByCat.get(ct.category) || 0;
              const p = pct(actual, ct.targetAmount);
              const over = actual > ct.targetAmount;
              return (
                <div key={ct.category} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{cat?.icon}</span>
                      <span className="text-sm text-gray-300">{cat?.label || ct.category}</span>
                      <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full text-xs font-semibold', ct.type === 'fixed' ? 'bg-blue-500/15 text-blue-400' : 'bg-orange-500/15 text-orange-400')}>{ct.type}</span>
                    </div>
                    <div className="text-right flex items-center gap-1.5">
                      <span className={cn('text-sm font-bold font-mono tabular-nums', over ? 'text-rose-400' : 'text-gray-200')}>{formatPrice(actual)}</span>
                      <span className="text-xs text-gray-600 font-mono">/ {formatPrice(ct.targetAmount)}</span>
                    </div>
                  </div>
                  <div className="h-2 bg-gray-800/60 rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(p, 100)}%` }} transition={{ duration: 0.6 }} className="h-full rounded-full" style={{ backgroundColor: barColor(actual, ct.targetAmount) }} />
                  </div>
                  <p className="text-[10px] text-gray-600">{over ? `▲ Over by ${formatPrice(actual - ct.targetAmount)}` : `${100 - p}% remaining`}</p>
                </div>
              );
            })}

            {/* Groceries row */}
            {groceryBudget > 0 && (() => {
              const over = grocerySpent > groceryBudget;
              const p = pct(grocerySpent, groceryBudget);
              return (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">🛒</span><span className="text-sm text-gray-300">Groceries</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 font-semibold">auto</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={cn('text-sm font-bold font-mono tabular-nums', over ? 'text-rose-400' : 'text-gray-200')}>{formatPrice(grocerySpent)}</span>
                      <span className="text-xs text-gray-600 font-mono">/ {formatPrice(groceryBudget)}</span>
                    </div>
                  </div>
                  <div className="h-2 bg-gray-800/60 rounded-full overflow-hidden"><motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(p, 100)}%` }} transition={{ duration: 0.6 }} className="h-full rounded-full" style={{ backgroundColor: barColor(grocerySpent, groceryBudget) }} /></div>
                </div>
              );
            })()}

            {/* Fuel row if there's spend */}
            {fuelSpent > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Fuel size={13} className="text-purple-400" /><span className="text-sm text-gray-300">Fuel</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-500/15 text-purple-400 font-semibold">auto</span>
                  </div>
                  <span className="text-sm font-bold font-mono tabular-nums text-gray-200">{formatPrice(fuelSpent)}</span>
                </div>
                <div className="h-2 bg-purple-500/20 rounded-full"><div className="h-full rounded-full bg-purple-500" style={{ width: '100%' }} /></div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════
// SAVINGS TAB
// ══════════════════════════════════════════════════════════════
const SavingsTab: React.FC<{
  goals: SavingsGoal[];
  onAdd: (g: Omit<SavingsGoal, 'id' | 'createdAt' | 'contributions'>) => void;
  onUpdate: (id: string, updates: Partial<SavingsGoal>) => void;
  onDelete: (id: string) => void;
  onContribute: (goalId: string, c: Omit<SavingsContribution, 'id'>) => void;
  onDeleteContribution: (goalId: string, cId: string) => void;
}> = ({ goals, onAdd, onUpdate, onDelete, onContribute, onDeleteContribution }) => {
  const [goalModal, setGoalModal] = useState<{ open: boolean; mode: 'add'|'edit'; id?: string; name: string; emoji: string; targetAmount: number; monthlyContribution: number; deadline: string; }>({ open: false, mode: 'add', name: '', emoji: '🎯', targetAmount: 0, monthlyContribution: 0, deadline: '' });
  const [contributeModal, setContributeModal] = useState<{ open: boolean; goalId: string; goalName: string; amount: number; note: string; date: string; }>({ open: false, goalId: '', goalName: '', amount: 0, note: '', date: new Date().toISOString().slice(0, 10) });
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set());
  const toggleExpand = (id: string) => setExpandedGoals(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const openAddGoal  = () => setGoalModal({ open: true, mode: 'add', name: '', emoji: '🎯', targetAmount: 0, monthlyContribution: 0, deadline: '' });
  const openEditGoal = (g: SavingsGoal) => setGoalModal({ open: true, mode: 'edit', id: g.id, name: g.name, emoji: g.emoji, targetAmount: g.targetAmount, monthlyContribution: g.monthlyContribution ?? 0, deadline: g.deadline ?? '' });
  const closeGoalModal = () => setGoalModal(s => ({ ...s, open: false }));
  const saveGoal = () => {
    const { mode, id, name, emoji, targetAmount, monthlyContribution, deadline } = goalModal;
    if (!name.trim() || targetAmount <= 0) return;
    const extras = { ...(deadline ? { deadline } : {}), ...(monthlyContribution > 0 ? { monthlyContribution } : {}) };
    if (mode === 'add') onAdd({ name: name.trim(), emoji: emoji || '🎯', targetAmount, ...extras });
    else if (id) onUpdate(id, { name: name.trim(), emoji: emoji || '🎯', targetAmount, ...extras });
    closeGoalModal();
  };

  const openContribute   = (g: SavingsGoal) => setContributeModal({ open: true, goalId: g.id, goalName: g.name, amount: 0, note: '', date: new Date().toISOString().slice(0, 10) });
  const closeContribute  = () => setContributeModal(s => ({ ...s, open: false }));
  const saveContribution = () => { const { goalId, amount, note, date } = contributeModal; if (amount <= 0) return; onContribute(goalId, { amount, ...(note.trim() ? { note } : {}), date }); closeContribute(); };

  const totalSaved  = goals.reduce((s, g) => s + g.contributions.reduce((acc, c) => acc + c.amount, 0), 0);
  const totalTarget = goals.reduce((s, g) => s + g.targetAmount, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-gray-100">Savings Goals</h2>
          {goals.length > 0 && <p className="text-xs text-gray-500 mt-0.5">{formatPrice(totalSaved)} saved of {formatPrice(totalTarget)} across {goals.length} goal{goals.length !== 1 ? 's' : ''}</p>}
        </div>
        <button onClick={openAddGoal} className="flex items-center gap-1.5 px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer"><Plus size={14} /> New Goal</button>
      </div>

      {goals.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-gray-900/70 backdrop-blur-xl rounded-2xl border border-violet-500/20">
          <div className="w-14 h-14 rounded-2xl bg-purple-500/10 flex items-center justify-center mb-4"><PiggyBank size={24} className="text-purple-400" /></div>
          <p className="text-base font-semibold text-gray-300">No savings goals yet</p>
          <p className="text-sm text-gray-500 mt-1 mb-5 max-w-xs">Create a goal like "Emergency Fund" or "New Car" and track your progress.</p>
          <button onClick={openAddGoal} className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer">Create First Goal</button>
        </div>
      )}

      <div className="space-y-3">
        {goals.map(goal => {
          const saved    = goal.contributions.reduce((s, c) => s + c.amount, 0);
          const progress = goal.targetAmount > 0 ? Math.min(100, (saved / goal.targetAmount) * 100) : 0;
          const isComplete = saved >= goal.targetAmount;
          const expanded = expandedGoals.has(goal.id);
          let daysLeft: number|null = null; let deadlineLabel = '';
          if (goal.deadline) { const diff = new Date(goal.deadline).getTime() - Date.now(); daysLeft = Math.ceil(diff / 86400000); deadlineLabel = daysLeft < 0 ? 'Overdue' : daysLeft === 0 ? 'Due today' : `${daysLeft}d left`; }
          return (
            <div key={goal.id} className="bg-gray-900/70 backdrop-blur-xl rounded-2xl border border-violet-500/20 overflow-hidden">
              <div className="px-5 py-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl mt-0.5 shrink-0">{goal.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-100">{goal.name}</span>
                      {isComplete && <span className="flex items-center gap-1 text-xs bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20 font-semibold"><CheckCircle2 size={10} /> Achieved!</span>}
                      {(goal.monthlyContribution ?? 0) > 0 && <span className="text-xs bg-violet-500/15 text-violet-400 px-2 py-0.5 rounded-full border border-violet-500/20">{CURRENCY}{goal.monthlyContribution!.toLocaleString()}/mo</span>}
                      {goal.deadline && <span className={cn('flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium', daysLeft !== null && daysLeft < 0 ? 'bg-rose-500/15 text-rose-400' : daysLeft !== null && daysLeft <= 30 ? 'bg-amber-500/15 text-amber-400' : 'bg-gray-800/60 text-gray-400')}><Calendar size={10} />{deadlineLabel}</span>}
                    </div>
                    <div className="mt-2.5">
                      <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                        <span>{CURRENCY}{saved.toLocaleString()} saved</span>
                        <span>{Math.round(progress)}% of {CURRENCY}{goal.targetAmount.toLocaleString()}</span>
                      </div>
                      <div className="h-2 bg-gray-800/60 rounded-full overflow-hidden"><div className={cn('h-full rounded-full transition-all duration-500', isComplete ? 'bg-emerald-500' : 'bg-purple-500')} style={{ width: `${progress}%` }} /></div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => openContribute(goal)} className="p-1.5 text-purple-400 hover:bg-purple-500/15 rounded-lg transition-colors cursor-pointer" title="Add money"><Plus size={14} /></button>
                    <button onClick={() => openEditGoal(goal)} className="p-1.5 text-gray-500 hover:text-violet-400 hover:bg-violet-500/15 rounded-lg transition-colors cursor-pointer"><Edit3 size={13} /></button>
                    <button onClick={() => { if (confirm(`Delete "${goal.name}"?`)) onDelete(goal.id); }} className="p-1.5 text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"><Trash2 size={13} /></button>
                  </div>
                </div>
                <button onClick={() => openContribute(goal)} className="mt-3 w-full py-2 text-sm font-medium text-purple-400 bg-purple-500/10 hover:bg-purple-500/15 rounded-xl transition-colors cursor-pointer border border-purple-500/20">+ Add Money</button>
              </div>
              {goal.contributions.length > 0 && (
                <>
                  <button onClick={() => toggleExpand(goal.id)} className="w-full flex items-center justify-between px-5 py-2.5 text-xs font-medium text-gray-500 bg-gray-800/20 hover:bg-gray-800/40 border-t border-white/[0.04] transition-colors cursor-pointer">
                    <span>{goal.contributions.length} contribution{goal.contributions.length !== 1 ? 's' : ''}</span>
                    {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </button>
                  {expanded && (
                    <div className="border-t border-white/[0.04]">
                      {[...goal.contributions].reverse().map(c => (
                        <div key={c.id} className="flex items-center gap-3 px-5 py-2.5 group hover:bg-gray-800/20">
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-semibold text-emerald-400">+{CURRENCY}{c.amount.toLocaleString()}</span>
                            {c.note && <span className="text-xs text-gray-500 ml-2">{c.note}</span>}
                            <span className="text-xs text-gray-600 ml-2">{new Date(c.date).toLocaleDateString('en-NA', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                          </div>
                          <button onClick={() => onDeleteContribution(goal.id, c.id)} className="opacity-0 group-hover:opacity-100 p-1 text-gray-500 hover:text-rose-400 transition-all cursor-pointer"><X size={12} /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Add/Edit Goal Modal */}
      <Modal isOpen={goalModal.open} onClose={closeGoalModal} title={goalModal.mode === 'add' ? 'New Savings Goal' : 'Edit Goal'}
        footer={<div className="flex gap-2"><button onClick={closeGoalModal} className="flex-1 py-2.5 border border-violet-500/20 rounded-xl text-sm font-medium text-gray-400 hover:bg-gray-800/40 transition-colors cursor-pointer">Cancel</button><button onClick={saveGoal} disabled={!goalModal.name.trim() || goalModal.targetAmount <= 0} className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer">{goalModal.mode === 'add' ? 'Create Goal' : 'Save Changes'}</button></div>}>
        <div className="space-y-4 p-1">
          <div className="flex gap-3">
            <div className="w-20 shrink-0"><label className="block text-xs font-semibold text-gray-400 mb-1.5">EMOJI</label><input type="text" value={goalModal.emoji} onChange={e => setGoalModal(s => ({ ...s, emoji: e.target.value }))} className="w-full text-center text-2xl bg-gray-800/60 border border-violet-500/20 rounded-xl px-2 py-2 outline-none focus:ring-2 focus:ring-purple-500" maxLength={2} /></div>
            <div className="flex-1"><label className="block text-xs font-semibold text-gray-400 mb-1.5">GOAL NAME *</label><input type="text" value={goalModal.name} onChange={e => setGoalModal(s => ({ ...s, name: e.target.value }))} placeholder="e.g. Emergency Fund" className="w-full bg-gray-800/60 border border-violet-500/20 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500" /></div>
          </div>
          <div><label className="block text-xs font-semibold text-gray-400 mb-1.5">TARGET AMOUNT ({CURRENCY}) *</label><input type="number" min={1} value={goalModal.targetAmount || ''} onChange={e => setGoalModal(s => ({ ...s, targetAmount: parseFloat(e.target.value) || 0 }))} placeholder="0.00" className="w-full bg-gray-800/60 border border-violet-500/20 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-semibold text-gray-400 mb-1.5">DEADLINE (optional)</label><input type="date" value={goalModal.deadline} onChange={e => setGoalModal(s => ({ ...s, deadline: e.target.value }))} className="w-full bg-gray-800/60 border border-violet-500/20 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500" /></div>
            <div><label className="block text-xs font-semibold text-gray-400 mb-1.5">MONTHLY ({CURRENCY})</label><input type="number" min={0} value={goalModal.monthlyContribution || ''} onChange={e => setGoalModal(s => ({ ...s, monthlyContribution: parseFloat(e.target.value) || 0 }))} placeholder="0.00" className="w-full bg-gray-800/60 border border-violet-500/20 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500" /></div>
          </div>
          {(() => {
            const { deadline, monthlyContribution, targetAmount } = goalModal;
            if (!deadline || monthlyContribution <= 0) return null;
            const msLeft = new Date(deadline).getTime() - Date.now();
            if (msLeft <= 0) return null;
            const months = Math.max(1, Math.round(msLeft / (1000 * 60 * 60 * 24 * 30.44)));
            const projected = monthlyContribution * months;
            const isOnTrack = projected >= targetAmount;
            return (
              <div className={cn('rounded-xl px-4 py-3 border text-sm', isOnTrack ? 'bg-emerald-500/8 border-emerald-500/20' : 'bg-amber-500/8 border-amber-500/20')}>
                <div className="flex items-center justify-between mb-1"><span className={cn('font-semibold text-xs', isOnTrack ? 'text-emerald-400' : 'text-amber-400')}>{isOnTrack ? '✓ On track' : '⚠ Shortfall'}</span><span className="text-xs text-gray-500">{months} month{months !== 1 ? 's' : ''} to deadline</span></div>
                <p className="text-gray-300 text-xs">Projected: <span className="font-bold font-mono">{CURRENCY}{projected.toLocaleString()}</span>{!isOnTrack && <span className="text-amber-400 ml-2">{CURRENCY}{Math.round(targetAmount - projected).toLocaleString()} short</span>}</p>
                <div className="mt-1.5 h-1.5 bg-gray-700/60 rounded-full overflow-hidden"><div className={cn('h-full rounded-full', isOnTrack ? 'bg-emerald-500' : 'bg-amber-400')} style={{ width: `${Math.min(100, Math.round((projected / targetAmount) * 100))}%` }} /></div>
              </div>
            );
          })()}
        </div>
      </Modal>

      {/* Contribute Modal */}
      <Modal isOpen={contributeModal.open} onClose={closeContribute} title={`Add Money — ${contributeModal.goalName}`}
        footer={<div className="flex gap-2"><button onClick={closeContribute} className="flex-1 py-2.5 border border-violet-500/20 rounded-xl text-sm text-gray-400 hover:bg-gray-800/40 transition-colors cursor-pointer">Cancel</button><button onClick={saveContribution} disabled={contributeModal.amount <= 0} className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer">Add Money</button></div>}>
        <div className="space-y-4 p-1">
          <div><label className="block text-xs font-semibold text-gray-400 mb-1.5">AMOUNT ({CURRENCY}) *</label><input type="number" min={1} value={contributeModal.amount || ''} onChange={e => setContributeModal(s => ({ ...s, amount: parseFloat(e.target.value) || 0 }))} placeholder="0.00" className="w-full bg-gray-800/60 border border-violet-500/20 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500" autoFocus /></div>
          <div><label className="block text-xs font-semibold text-gray-400 mb-1.5">NOTE (optional)</label><input type="text" value={contributeModal.note} onChange={e => setContributeModal(s => ({ ...s, note: e.target.value }))} placeholder="e.g. Monthly transfer" className="w-full bg-gray-800/60 border border-violet-500/20 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500" /></div>
          <div><label className="block text-xs font-semibold text-gray-400 mb-1.5">DATE</label><input type="date" value={contributeModal.date} onChange={e => setContributeModal(s => ({ ...s, date: e.target.value }))} className="w-full bg-gray-800/60 border border-violet-500/20 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500" /></div>
        </div>
      </Modal>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════
// TRANSACTION ROW
// ══════════════════════════════════════════════════════════════
const TxRow: React.FC<{
  tx: FinanceTransaction;
  onEdit: (tx: FinanceTransaction) => void;
  onDelete: (id: string) => void;
  compact?: boolean;
}> = ({ tx, onEdit, onDelete, compact }) => {
  const typeColor = { income: 'text-emerald-400', fixed: 'text-blue-400', variable: 'text-orange-400' }[tx.type];
  const dateFmt = new Date(tx.date).toLocaleDateString('en-NA', { day: 'numeric', month: 'short' });
  return (
    <div className={cn('flex items-center gap-3 group hover:bg-gray-800/20 transition-colors', compact ? 'px-4 py-2.5' : 'px-5 py-3')}>
      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-sm" style={{ backgroundColor: tx.type === 'income' ? '#10b98122' : tx.type === 'fixed' ? '#3b82f622' : '#f9731622' }}>
        <span className="text-xs">{getCatIcon(tx.type, tx.category)}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-200 truncate">{tx.description || getCatLabel(tx.type, tx.category)}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-xs text-gray-500">{dateFmt}</span>
          {tx.recurring && <span className="text-[10px] bg-violet-500/15 text-violet-400 px-1.5 py-0.5 rounded-full flex items-center gap-0.5 border border-violet-500/20"><Repeat size={8} />recurring</span>}
        </div>
      </div>
      <span className={cn('text-sm font-bold font-mono tabular-nums shrink-0', typeColor)}>
        {tx.type === 'income' ? '+' : '-'}{formatPrice(tx.amount)}
      </span>
      <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => onEdit(tx)} className="p-1.5 text-gray-500 hover:text-violet-400 hover:bg-violet-500/15 rounded-lg transition-colors cursor-pointer"><Edit3 size={12} /></button>
        <button onClick={() => { if (confirm('Delete this entry?')) onDelete(tx.id); }} className="p-1.5 text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"><Trash2 size={12} /></button>
      </div>
    </div>
  );
};

export default Finance;
