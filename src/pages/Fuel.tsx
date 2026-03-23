// ==========================================
// BasketBuddy — Fuel & Transport v3
// Inline form | 4 Tabs | Smart Insights
// Dark-only | Amber accent
// ==========================================

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  Fuel as FuelIcon, Plus, Edit3, Trash2, ChevronLeft, ChevronRight,
  LayoutGrid, List, BarChart3, Gauge, MapPin, Droplets,
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, X,
  Zap, Calendar, ArrowRight, Activity,
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { cn, formatPrice } from '../utils/helpers';
import { CURRENCY } from '../config/constants';
import type { FuelType, FuelFillup } from '../types';

// ── Fuel type config ─────────────────────────────────────────
const FUEL_TYPES: { value: FuelType; label: string; shortLabel: string; color: string; bg: string }[] = [
  { value: 'petrol-93', label: 'Petrol 93', shortLabel: 'P93', color: '#ef4444', bg: 'bg-red-500/15 text-red-300' },
  { value: 'petrol-95', label: 'Petrol 95', shortLabel: 'P95', color: '#f97316', bg: 'bg-orange-500/15 text-orange-300' },
  { value: 'diesel',    label: 'Diesel',    shortLabel: 'DSL', color: '#3b82f6', bg: 'bg-blue-500/15 text-blue-300' },
  { value: 'other',     label: 'Other',     shortLabel: 'OTH', color: '#8b5cf6', bg: 'bg-violet-500/15 text-violet-300' },
];
const ftConf = (t: FuelType) => FUEL_TYPES.find(f => f.value === t) ?? FUEL_TYPES[3];

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTHS_FULL  = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const TABS = [
  { id: 'overview',    label: 'Overview',    icon: LayoutGrid },
  { id: 'fillups',     label: 'Fill-ups',    icon: List },
  { id: 'efficiency',  label: 'Efficiency',  icon: Gauge },
  { id: 'analytics',   label: 'Analytics',   icon: BarChart3 },
] as const;
type TabId = (typeof TABS)[number]['id'];

// ── Form default ──────────────────────────────────────────────
const emptyForm = () => ({
  date:          new Date().toISOString().split('T')[0],
  fuelType:      'petrol-95' as FuelType,
  stationName:   '',
  litres:        '',
  pricePerLitre: '',
  totalCost:     '',
  odometer:      '',
  notes:         '',
});
const recalc = (l: string, p: string) => {
  const lv = parseFloat(l), pv = parseFloat(p);
  return !isNaN(lv) && !isNaN(pv) ? (lv * pv).toFixed(2) : '';
};

// ── Dark tooltip ──────────────────────────────────────────────
const DarkTip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 border border-white/10 rounded-xl px-3 py-2.5 shadow-2xl text-xs">
      {label && <p className="text-gray-400 mb-1.5 border-b border-white/5 pb-1">{label}</p>}
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2 py-0.5">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.fill ?? p.stroke ?? p.color }} />
          <span className="text-gray-400">{p.name}</span>
          <span className="ml-auto pl-3 font-bold text-white font-mono tabular-nums">
            {p.name === 'Price/L' || p.name === 'km/L'
              ? `${p.name === 'Price/L' ? CURRENCY : ''}${Number(p.value).toFixed(3)}`
              : formatPrice(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
};

// ── Chip KPI ──────────────────────────────────────────────────
const Chip: React.FC<{
  icon: React.ReactNode; label: string; value: string;
  sub?: string; cls?: string;
}> = ({ icon, label, value, sub, cls = 'text-amber-400' }) => (
  <div className="bg-gray-800/40 rounded-xl p-3.5 space-y-1">
    <div className="flex items-center gap-1.5 text-gray-500">
      {icon}
      <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
    </div>
    <p className={cn('text-sm font-bold font-mono tabular-nums', cls)}>{value}</p>
    {sub && <p className="text-[10px] text-gray-600">{sub}</p>}
  </div>
);

// ══════════════════════════════════════════════════════════════
const FuelPage: React.FC = () => {
  const { fuelFillups, addFuelFillup, updateFuelFillup, deleteFuelFillup } = useApp();

  const now   = new Date();
  const [activeTab,  setActiveTab]  = useState<TabId>('overview');
  const [viewMonth,  setViewMonth]  = useState(now.getMonth());
  const [viewYear,   setViewYear]   = useState(now.getFullYear());
  const [confirmDel, setConfirmDel] = useState<string | null>(null);

  // Inline form
  const [showForm,   setShowForm]   = useState(false);
  const [editTarget, setEditTarget] = useState<FuelFillup | null>(null);
  const [form,       setForm]       = useState(emptyForm());
  const formRef = useRef<HTMLDivElement>(null);

  const isCurrentMonth = viewMonth === now.getMonth() && viewYear === now.getFullYear();

  const prevMonth = () => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); } else setViewMonth(m => m - 1); };
  const nextMonth = () => {
    if (isCurrentMonth) return;
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); } else setViewMonth(m => m + 1);
  };

  // Scroll form into view when shown
  useEffect(() => {
    if (showForm) setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 80);
  }, [showForm]);

  // ── Sort all fill-ups ─────────────────────────────────────
  const allSorted = useMemo(
    () => [...fuelFillups].sort((a, b) => b.date - a.date),
    [fuelFillups],
  );

  // ── Month fill-ups ────────────────────────────────────────
  const monthFillups = useMemo(
    () => allSorted.filter(f => {
      const d = new Date(f.date);
      return d.getMonth() === viewMonth && d.getFullYear() === viewYear;
    }),
    [allSorted, viewMonth, viewYear],
  );

  // ── Month KPIs ────────────────────────────────────────────
  const totalCostMonth   = useMemo(() => monthFillups.reduce((s, f) => s + f.totalCost, 0), [monthFillups]);
  const totalLitresMonth = useMemo(() => monthFillups.reduce((s, f) => s + f.litres,    0), [monthFillups]);
  const avgPplMonth      = totalLitresMonth > 0 ? totalCostMonth / totalLitresMonth : 0;

  // ── Prev month ────────────────────────────────────────────
  const pmIdx  = viewMonth === 0 ? 11 : viewMonth - 1;
  const pmYear = viewMonth === 0 ? viewYear - 1 : viewYear;
  const prevMonthCost = useMemo(() =>
    fuelFillups.filter(f => { const d = new Date(f.date); return d.getMonth() === pmIdx && d.getFullYear() === pmYear; })
      .reduce((s, f) => s + f.totalCost, 0),
    [fuelFillups, pmIdx, pmYear],
  );
  const costDelta = prevMonthCost > 0 ? ((totalCostMonth - prevMonthCost) / prevMonthCost) * 100 : 0;

  // ── Latest price trend ────────────────────────────────────
  const latestFillup = allSorted[0] ?? null;
  const prevFillup   = allSorted[1] ?? null;
  const priceTrend   = latestFillup && prevFillup ? latestFillup.pricePerLitre - prevFillup.pricePerLitre : 0;

  // ── Year-to-date ─────────────────────────────────────────
  const ytdCost = useMemo(() =>
    fuelFillups.filter(f => new Date(f.date).getFullYear() === now.getFullYear())
      .reduce((s, f) => s + f.totalCost, 0),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [fuelFillups]);

  // ── 3-month avg price/L ───────────────────────────────────
  const avg3MonthPpl = useMemo(() => {
    const cutoff = new Date(now.getFullYear(), now.getMonth() - 3, 1).getTime();
    const recent = fuelFillups.filter(f => f.date >= cutoff);
    const totalL = recent.reduce((s, f) => s + f.litres, 0);
    const totalC = recent.reduce((s, f) => s + f.totalCost, 0);
    return totalL > 0 ? totalC / totalL : 0;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fuelFillups]);
  const priceSpikeWarning = latestFillup && avg3MonthPpl > 0
    ? ((latestFillup.pricePerLitre - avg3MonthPpl) / avg3MonthPpl) * 100
    : 0;

  // ── 6-month history ───────────────────────────────────────
  const monthHistory = useMemo(() => Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const m = d.getMonth(), y = d.getFullYear();
    const mf = fuelFillups.filter(f => { const fd = new Date(f.date); return fd.getMonth() === m && fd.getFullYear() === y; });
    const cost   = mf.reduce((s, f) => s + f.totalCost, 0);
    const litres = mf.reduce((s, f) => s + f.litres, 0);
    return { label: MONTHS_SHORT[m], month: m, year: y, cost, litres, avgPpl: litres > 0 ? cost / litres : 0, fills: mf.length };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [fuelFillups]);

  // ── Price/L trend (last 25) ───────────────────────────────
  const priceTrendData = useMemo(() =>
    [...fuelFillups].sort((a, b) => a.date - b.date).slice(-25).map(f => ({
      date:      new Date(f.date).toLocaleDateString('en-NA', { day: 'numeric', month: 'short' }),
      'Price/L': parseFloat(f.pricePerLitre.toFixed(3)),
      color:     ftConf(f.fuelType).color,
    })),
    [fuelFillups],
  );

  // ── Fuel type breakdown (month) ───────────────────────────
  const fuelTypePie = useMemo(() => {
    const map = new Map<FuelType, { cost: number; litres: number }>();
    monthFillups.forEach(f => {
      const ex = map.get(f.fuelType) ?? { cost: 0, litres: 0 };
      map.set(f.fuelType, { cost: ex.cost + f.totalCost, litres: ex.litres + f.litres });
    });
    return Array.from(map.entries()).map(([type, v]) => ({
      name: ftConf(type).label, value: v.cost, litres: v.litres, color: ftConf(type).color,
    }));
  }, [monthFillups]);

  // ── Station stats ─────────────────────────────────────────
  const stationStats = useMemo(() => {
    const map = new Map<string, { total: number; count: number; litres: number; lastDate: number }>();
    fuelFillups.forEach(f => {
      const ex = map.get(f.stationName) ?? { total: 0, count: 0, litres: 0, lastDate: 0 };
      map.set(f.stationName, { total: ex.total + f.pricePerLitre, count: ex.count + 1, litres: ex.litres + f.litres, lastDate: Math.max(ex.lastDate, f.date) });
    });
    return Array.from(map.entries())
      .map(([name, v]) => ({ name, avgPpl: v.total / v.count, fills: v.count, litres: v.litres, lastDate: v.lastDate }))
      .sort((a, b) => a.avgPpl - b.avgPpl)
      .slice(0, 8);
  }, [fuelFillups]);

  // ── Efficiency (km/L) ─────────────────────────────────────
  const efficiencyRows = useMemo(() => {
    const withOdo = [...fuelFillups].filter(f => f.odometer !== undefined).sort((a, b) => a.date - b.date);
    const rows: { date: string; station: string; litres: number; km: number; kmPerL: number; cost: number; cpkm: number }[] = [];
    for (let i = 1; i < withOdo.length; i++) {
      const prev = withOdo[i - 1], curr = withOdo[i];
      const km = curr.odometer! - prev.odometer!;
      if (km > 0 && curr.litres > 0) {
        rows.push({
          date:    new Date(curr.date).toLocaleDateString('en-NA', { day: 'numeric', month: 'short' }),
          station: curr.stationName,
          litres:  curr.litres,
          km,
          kmPerL:  parseFloat((km / curr.litres).toFixed(2)),
          cost:    curr.totalCost,
          cpkm:    parseFloat((curr.totalCost / km).toFixed(3)),
        });
      }
    }
    return rows.reverse();
  }, [fuelFillups]);

  const avgKmPerL = efficiencyRows.length > 0
    ? efficiencyRows.reduce((s, r) => s + r.kmPerL, 0) / efficiencyRows.length : 0;
  const avgCpKm   = efficiencyRows.length > 0
    ? efficiencyRows.reduce((s, r) => s + r.cpkm,   0) / efficiencyRows.length : 0;

  // ── Fill-up intervals ─────────────────────────────────────
  const fillupIntervalDays = useMemo(() => {
    if (allSorted.length < 2) return 0;
    const intervals = [];
    for (let i = 0; i < allSorted.length - 1; i++) {
      intervals.push((allSorted[i].date - allSorted[i + 1].date) / 86_400_000);
    }
    return parseFloat((intervals.reduce((s, v) => s + v, 0) / intervals.length).toFixed(1));
  }, [allSorted]);

  const daysLastFillup = latestFillup
    ? Math.floor((Date.now() - latestFillup.date) / 86_400_000) : null;

  const nextFillupIn = fillupIntervalDays > 0 && daysLastFillup !== null
    ? Math.max(0, Math.round(fillupIntervalDays - daysLastFillup)) : null;

  // ── km/L chart ────────────────────────────────────────────
  const efficiencyChartData = useMemo(
    () => efficiencyRows.slice(0, 15).reverse().map(r => ({ date: r.date, 'km/L': r.kmPerL })),
    [efficiencyRows],
  );

  // ── Form helpers ──────────────────────────────────────────
  const openAdd = () => {
    setForm(emptyForm()); setEditTarget(null); setShowForm(true);
    setActiveTab('fillups');
  };
  const openEdit = (f: FuelFillup) => {
    setEditTarget(f);
    setForm({
      date:          new Date(f.date).toISOString().split('T')[0],
      fuelType:      f.fuelType,
      stationName:   f.stationName,
      litres:        String(f.litres),
      pricePerLitre: String(f.pricePerLitre),
      totalCost:     String(f.totalCost),
      odometer:      f.odometer !== undefined ? String(f.odometer) : '',
      notes:         f.notes || '',
    });
    setShowForm(true);
  };
  const closeForm = () => { setShowForm(false); setEditTarget(null); setForm(emptyForm()); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const litres    = parseFloat(form.litres);
    const ppl       = parseFloat(form.pricePerLitre);
    const totalCost = parseFloat(form.totalCost) || litres * ppl;
    if (!form.stationName.trim() || isNaN(litres) || isNaN(ppl)) return;
    const payload = {
      date:          new Date(form.date).getTime(),
      fuelType:      form.fuelType,
      stationName:   form.stationName.trim(),
      litres, pricePerLitre: ppl, totalCost,
      odometer:  form.odometer ? parseInt(form.odometer) : undefined,
      notes:     form.notes.trim() || undefined,
    };
    if (editTarget) updateFuelFillup(editTarget.id, payload);
    else            addFuelFillup(payload);
    closeForm();
  };

  // ── Inline form JSX ───────────────────────────────────────
  const inlineForm = (
    <AnimatePresence>
      {showForm && (
        <motion.div
          ref={formRef}
          key="inline-form"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden"
        >
          <div className="bg-gray-900/70 backdrop-blur-xl rounded-2xl border border-amber-500/30 p-5 relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-200 flex items-center gap-2">
                <FuelIcon size={14} className="text-amber-400" />
                {editTarget ? 'Edit Fill-up' : 'New Fill-up'}
              </h3>
              <button onClick={closeForm} className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-gray-800/40 transition-colors cursor-pointer" aria-label="Close">
                <X size={14} />
              </button>
            </div>

            <form id="fuel-form" onSubmit={handleSubmit} className="space-y-3.5">
              {/* Row 1: Date + Type */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Date *</label>
                  <input type="date" required value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
                    className="w-full px-3 py-2.5 bg-gray-800/50 border border-violet-500/20 rounded-xl text-sm text-gray-200 outline-none focus:ring-2 focus:ring-amber-500 transition-all" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Fuel Type *</label>
                  <select value={form.fuelType} onChange={e => setForm({ ...form, fuelType: e.target.value as FuelType })}
                    className="w-full px-3 py-2.5 bg-gray-800/50 border border-violet-500/20 rounded-xl text-sm text-gray-200 outline-none focus:ring-2 focus:ring-amber-500 transition-all">
                    {FUEL_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              </div>

              {/* Station */}
              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Station *</label>
                <div className="relative">
                  <MapPin size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input type="text" required value={form.stationName} onChange={e => setForm({ ...form, stationName: e.target.value })}
                    placeholder="e.g. Engen Main St, Total CBD…"
                    list="stations-datalist"
                    className="w-full pl-9 pr-3 py-2.5 bg-gray-800/50 border border-violet-500/20 rounded-xl text-sm text-gray-200 outline-none focus:ring-2 focus:ring-amber-500 transition-all" />
                  <datalist id="stations-datalist">
                    {stationStats.map(s => <option key={s.name} value={s.name} />)}
                  </datalist>
                </div>
              </div>

              {/* Row 3: Litres + Price/L + Total */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Litres *',       key: 'litres',        step: '0.01',  placeholder: '0.00' },
                  { label: `Price/L (${CURRENCY}) *`, key: 'pricePerLitre', step: '0.001', placeholder: '0.000' },
                  { label: `Total (${CURRENCY})`, key: 'totalCost',    step: '0.01',  placeholder: 'Auto' },
                ].map(({ label, key, step, placeholder }) => (
                  <div key={key}>
                    <label className="block text-[10px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider">{label}</label>
                    <input type="number" step={step} min="0"
                      value={form[key as keyof typeof form]}
                      required={key !== 'totalCost'}
                      placeholder={placeholder}
                      onChange={e => {
                        const val = e.target.value;
                        if (key === 'litres')
                          setForm(f => ({ ...f, litres: val,         totalCost: recalc(val, f.pricePerLitre) }));
                        else if (key === 'pricePerLitre')
                          setForm(f => ({ ...f, pricePerLitre: val,  totalCost: recalc(f.litres, val) }));
                        else
                          setForm(f => ({ ...f, [key]: val }));
                      }}
                      className="w-full px-3 py-2.5 bg-gray-800/50 border border-violet-500/20 rounded-xl text-sm text-right text-gray-200 outline-none focus:ring-2 focus:ring-amber-500 transition-all" />
                  </div>
                ))}
              </div>

              {/* Row 4: Odometer + Notes */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Odometer (km)</label>
                  <input type="number" min="0" value={form.odometer} onChange={e => setForm({ ...form, odometer: e.target.value })}
                    placeholder="Optional — enables efficiency"
                    className="w-full px-3 py-2.5 bg-gray-800/50 border border-violet-500/20 rounded-xl text-sm text-gray-200 outline-none focus:ring-2 focus:ring-amber-500 transition-all" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Notes</label>
                  <input type="text" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                    placeholder="Optional"
                    className="w-full px-3 py-2.5 bg-gray-800/50 border border-violet-500/20 rounded-xl text-sm text-gray-200 outline-none focus:ring-2 focus:ring-amber-500 transition-all" />
                </div>
              </div>

              {/* Tip: odometer */}
              {!form.odometer && (
                <p className="text-[10px] text-gray-600 flex items-center gap-1.5">
                  <Gauge size={10} className="text-violet-400" />
                  Adding odometer readings unlocks km/L efficiency tracking in the Efficiency tab.
                </p>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={closeForm}
                  className="flex-1 py-2.5 border border-violet-500/20 rounded-xl text-sm text-gray-400 hover:bg-gray-800/40 transition-colors cursor-pointer">
                  Cancel
                </button>
                <button type="submit"
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer">
                  {editTarget ? 'Save Changes' : 'Save Fill-up'}
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // ──────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 max-w-4xl mx-auto">

      {/* ── Header ──────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <FuelIcon size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Fuel & Transport</h1>
            <p className="text-xs text-gray-500 mt-0.5">Fill-ups, efficiency &amp; cost trends</p>
          </div>
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-semibold transition-colors shadow-lg shadow-amber-500/20 cursor-pointer">
          <Plus size={12} />Log Fill-up
        </button>
      </div>

      {/* ── KPI summary strip ───────────────────────────── */}
      <div className="bg-gray-900/70 backdrop-blur-xl rounded-2xl border border-violet-500/20 p-5 relative overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Chip
            icon={<FuelIcon size={11} />}
            label="Month Cost"
            value={totalCostMonth > 0 ? formatPrice(totalCostMonth) : '—'}
            sub={prevMonthCost > 0 ? `${costDelta >= 0 ? '+' : ''}${costDelta.toFixed(1)}% vs prev` : undefined}
            cls={costDelta > 10 ? 'text-rose-400' : costDelta < -10 ? 'text-emerald-400' : 'text-amber-400'}
          />
          <Chip
            icon={<Droplets size={11} />}
            label="Litres"
            value={totalLitresMonth > 0 ? `${totalLitresMonth.toFixed(1)} L` : '—'}
            sub={`${monthFillups.length} fill-up${monthFillups.length !== 1 ? 's' : ''}`}
            cls="text-blue-400"
          />
          <Chip
            icon={priceTrend <= 0 ? <TrendingDown size={11} /> : <TrendingUp size={11} />}
            label="Avg Price/L"
            value={avgPplMonth > 0 ? `${CURRENCY}${avgPplMonth.toFixed(3)}` : '—'}
            sub={latestFillup ? `Latest: ${CURRENCY}${latestFillup.pricePerLitre.toFixed(3)}` : undefined}
            cls={priceTrend <= 0 ? 'text-emerald-400' : 'text-rose-400'}
          />
          <Chip
            icon={<Activity size={11} />}
            label="YTD Cost"
            value={ytdCost > 0 ? formatPrice(ytdCost) : '—'}
            sub={`${now.getFullYear()} total`}
            cls="text-violet-400"
          />
        </div>

        {/* Price spike warning */}
        {priceSpikeWarning > 8 && latestFillup && (
          <div className="mt-3 pt-3 border-t border-white/[0.04] flex items-center gap-2.5">
            <AlertTriangle size={13} className="text-amber-400 shrink-0" />
            <p className="text-xs text-amber-300">
              Latest fill-up at <strong>{CURRENCY}{latestFillup.pricePerLitre.toFixed(3)}/L</strong> is{' '}
              <strong>{priceSpikeWarning.toFixed(1)}% above</strong> your 3-month average of{' '}
              {CURRENCY}{avg3MonthPpl.toFixed(3)}/L.
            </p>
          </div>
        )}
        {priceSpikeWarning < -5 && latestFillup && (
          <div className="mt-3 pt-3 border-t border-white/[0.04] flex items-center gap-2.5">
            <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
            <p className="text-xs text-emerald-300">
              Latest fill-up at <strong>{CURRENCY}{latestFillup.pricePerLitre.toFixed(3)}/L</strong> is{' '}
              <strong>{Math.abs(priceSpikeWarning).toFixed(1)}% below</strong> your 3-month average — great timing!
            </p>
          </div>
        )}
      </div>

      {/* ── Tabs ────────────────────────────────────────── */}
      <div className="flex gap-1 bg-gray-900/40 backdrop-blur-xl rounded-2xl border border-violet-500/20 p-1.5">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id}
            onClick={() => { setActiveTab(id); if (id !== 'fillups') closeForm(); }}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer',
              activeTab === id
                ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20'
                : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/40',
            )}
          >
            <Icon size={12} /><span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* ── Tab content ─────────────────────────────────── */}
      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }}>

          {/* ════ OVERVIEW ════════════════════════════════ */}
          {activeTab === 'overview' && (
            <div className="space-y-5">
              {fuelFillups.length === 0 ? (
                <div className="bg-gray-900/70 backdrop-blur-xl rounded-2xl border border-violet-500/20 p-16 text-center">
                  <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                    <FuelIcon size={26} className="text-amber-400" />
                  </div>
                  <p className="text-base font-semibold text-gray-300">No fill-ups yet</p>
                  <p className="text-sm text-gray-500 mt-1 mb-5">Start logging your fuel fill-ups to see cost trends and efficiency data.</p>
                  <button onClick={openAdd} className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer">
                    Log First Fill-up
                  </button>
                </div>
              ) : (
                <>
                  {/* 6-month bar chart */}
                  <div className="bg-gray-900/70 backdrop-blur-xl rounded-2xl border border-violet-500/20 p-5">
                    <h2 className="text-sm font-semibold text-gray-200 flex items-center gap-2 mb-4">
                      <BarChart3 size={14} className="text-amber-400" />6-Month Cost History
                    </h2>
                    <ResponsiveContainer width="100%" height={190}>
                      <BarChart data={monthHistory} barCategoryGap="30%">
                        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                        <XAxis dataKey="label" stroke="#4b5563" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis stroke="#4b5563" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false}
                          tickFormatter={v => `${CURRENCY}${v >= 1000 ? `${Math.round(v / 1000)}k` : v}`} width={42} />
                        <Tooltip content={<DarkTip />} />
                        <Bar dataKey="cost" name="Cost" radius={[4, 4, 0, 0]}>
                          {monthHistory.map((h, i) => (
                            <Cell key={i} fill={h.month === now.getMonth() && h.year === now.getFullYear() ? '#f59e0b' : '#374151'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Price/L trend */}
                  {priceTrendData.length > 2 && (
                    <div className="bg-gray-900/70 backdrop-blur-xl rounded-2xl border border-violet-500/20 p-5">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
                          <TrendingUp size={14} className="text-amber-400" />Price per Litre — Trend
                        </h2>
                        <span className="text-xs text-gray-600">Last {priceTrendData.length} fill-ups</span>
                      </div>
                      <ResponsiveContainer width="100%" height={170}>
                        <AreaChart data={priceTrendData}>
                          <defs>
                            <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%"  stopColor="#f59e0b" stopOpacity={0.22} />
                              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                          <XAxis dataKey="date" stroke="#4b5563" tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                          <YAxis stroke="#4b5563" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false}
                            tickFormatter={v => `${CURRENCY}${v.toFixed(2)}`} width={46} domain={['auto', 'auto']} />
                          <Tooltip content={<DarkTip />} />
                          <Area type="monotone" dataKey="Price/L" stroke="#f59e0b" strokeWidth={2}
                            fill="url(#priceGrad)" dot={false} activeDot={{ r: 4, fill: '#f59e0b' }} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Station snapshot */}
                  {stationStats.length > 0 && (
                    <div className="bg-gray-900/70 backdrop-blur-xl rounded-2xl border border-violet-500/20 overflow-hidden">
                      <div className="px-5 py-4 border-b border-white/[0.04] flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
                          <MapPin size={14} className="text-amber-400" />Station Snapshot
                        </h2>
                        <div className="flex gap-3 text-[10px]">
                          {stationStats[0] && <span className="text-emerald-400">Best: {stationStats[0].name}</span>}
                          {stationStats.length > 1 && stationStats[stationStats.length - 1] && (
                            <span className="text-rose-400">Priciest: {stationStats[stationStats.length - 1].name}</span>
                          )}
                        </div>
                      </div>
                      <div className="divide-y divide-white/[0.04]">
                        {stationStats.map((s, i) => {
                          const maxP = stationStats[stationStats.length - 1]?.avgPpl ?? 1;
                          const pct  = maxP > 0 ? (s.avgPpl / maxP) * 100 : 0;
                          return (
                            <div key={s.name} className="px-5 py-3 flex items-center gap-3">
                              <span className="text-xs font-bold text-gray-600 w-4 text-right">{i + 1}</span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1.5">
                                  <span className="text-sm text-gray-300 font-medium truncate">{s.name}</span>
                                  <span className={cn('text-xs font-bold font-mono tabular-nums', i === 0 ? 'text-emerald-400' : 'text-gray-300')}>
                                    {CURRENCY}{s.avgPpl.toFixed(3)}/L
                                  </span>
                                </div>
                                <div className="h-1.5 bg-gray-800/60 rounded-full overflow-hidden">
                                  <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: i === 0 ? '#10b981' : '#f59e0b' }} />
                                </div>
                              </div>
                              <span className="text-[10px] text-gray-600 shrink-0">{s.fills}×</span>
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

          {/* ════ FILL-UPS ════════════════════════════════ */}
          {activeTab === 'fillups' && (
            <div className="space-y-4">

              {/* Month navigator */}
              <div className="flex items-center justify-between bg-gray-900/70 backdrop-blur-xl rounded-2xl border border-violet-500/20 px-4 py-3">
                <button onClick={prevMonth} aria-label="Previous month"
                  className="p-2 rounded-xl hover:bg-gray-800/60 text-gray-400 hover:text-gray-200 transition-colors cursor-pointer">
                  <ChevronLeft size={18} />
                </button>
                <div className="text-center">
                  <p className="text-sm font-bold text-gray-100">{MONTHS_FULL[viewMonth]} {viewYear}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    {monthFillups.length} fill-up{monthFillups.length !== 1 ? 's' : ''} · {formatPrice(totalCostMonth)}
                  </p>
                </div>
                <button onClick={nextMonth} disabled={isCurrentMonth} aria-label="Next month"
                  className="p-2 rounded-xl hover:bg-gray-800/60 text-gray-400 hover:text-gray-200 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-default">
                  <ChevronRight size={18} />
                </button>
              </div>

              {/* Inline form */}
              {inlineForm}

              {/* Fill-up list */}
              {monthFillups.length === 0 ? (
                <div className="bg-gray-900/70 backdrop-blur-xl rounded-2xl border border-violet-500/20 p-12 text-center">
                  <FuelIcon size={26} className="mx-auto text-gray-700 mb-3" />
                  <p className="text-sm text-gray-500 mb-4">No fill-ups for {MONTHS_FULL[viewMonth]}</p>
                  {!showForm && (
                    <button onClick={openAdd}
                      className="flex items-center gap-1.5 mx-auto px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer">
                      <Plus size={12} />Log Fill-up
                    </button>
                  )}
                </div>
              ) : (
                <div className="bg-gray-900/70 backdrop-blur-xl rounded-2xl border border-violet-500/20 overflow-hidden">
                  {/* Table header (sm+) */}
                  <div className="hidden sm:grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-3 px-5 py-2.5 bg-gray-800/30 text-[10px] font-bold uppercase tracking-widest text-gray-500 border-b border-white/[0.04]">
                    <span>Station / Type</span>
                    <span className="text-right">Litres</span>
                    <span className="text-right">Price/L</span>
                    <span className="text-right">Total</span>
                    <span className="text-right">Odometer</span>
                    <span />
                  </div>

                  <AnimatePresence>
                    {monthFillups.map(f => {
                      const conf    = ftConf(f.fuelType);
                      const dateStr = new Date(f.date).toLocaleDateString('en-NA', { day: 'numeric', month: 'short' });
                      return (
                        <motion.div key={f.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, height: 0 }}
                          className="border-b border-white/[0.04] last:border-0">
                          <div className="px-5 py-3.5 flex sm:grid sm:grid-cols-[1fr_auto_auto_auto_auto_auto] gap-3 items-center hover:bg-gray-800/20 transition-colors">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: conf.color }} />
                                <span className="text-sm font-medium text-gray-200 truncate">{f.stationName}</span>
                              </div>
                              <p className="text-[11px] text-gray-500 mt-0.5 ml-4">
                                <span className={cn('px-1.5 py-0.5 rounded text-[9px] font-bold mr-1', conf.bg)}>{conf.shortLabel}</span>
                                {dateStr}{f.notes && <> · <em>{f.notes}</em></>}
                              </p>
                            </div>
                            <span className="hidden sm:block text-sm font-medium text-gray-300 text-right shrink-0">{f.litres.toFixed(2)} L</span>
                            <span className="hidden sm:block text-xs text-gray-500 text-right shrink-0">{CURRENCY}{f.pricePerLitre.toFixed(3)}</span>
                            <span className="text-sm font-bold text-amber-400 text-right shrink-0 sm:ml-0 ml-auto">{formatPrice(f.totalCost)}</span>
                            <span className="hidden sm:block text-xs text-gray-500 text-right shrink-0">
                              {f.odometer !== undefined ? `${f.odometer.toLocaleString()} km` : '—'}
                            </span>
                            <div className="flex items-center gap-1 shrink-0">
                              <button onClick={() => openEdit(f)} aria-label="Edit"
                                className="p-1.5 rounded-lg text-gray-500 hover:text-amber-400 hover:bg-amber-500/10 transition-colors cursor-pointer">
                                <Edit3 size={13} />
                              </button>
                              <button onClick={() => setConfirmDel(f.id)} aria-label="Delete"
                                className="p-1.5 rounded-lg text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer">
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                          <AnimatePresence>
                            {confirmDel === f.id && (
                              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                                className="px-5 py-3 bg-rose-500/8 border-t border-rose-500/20 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <AlertTriangle size={13} className="text-rose-400" />
                                  <span className="text-xs text-rose-300">Delete this fill-up?</span>
                                </div>
                                <div className="flex gap-2">
                                  <button onClick={() => setConfirmDel(null)} className="px-3 py-1.5 text-xs text-gray-400 bg-gray-800/60 rounded-lg hover:bg-gray-700 transition-colors cursor-pointer">Cancel</button>
                                  <button onClick={() => { deleteFuelFillup(f.id); setConfirmDel(null); }} className="px-3 py-1.5 text-xs text-white bg-rose-500 hover:bg-rose-600 rounded-lg transition-colors cursor-pointer">Delete</button>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>

                  <div className="px-5 py-3 bg-gray-800/20 flex items-center justify-between border-t border-white/[0.04]">
                    <span className="text-xs text-gray-500">{totalLitresMonth.toFixed(1)} L · {monthFillups.length} fill-up{monthFillups.length !== 1 ? 's' : ''}</span>
                    <span className="text-sm font-bold text-amber-400">{formatPrice(totalCostMonth)}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ════ EFFICIENCY ══════════════════════════════ */}
          {activeTab === 'efficiency' && (
            <div className="space-y-5">
              {/* Efficiency KPI strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Chip
                  icon={<Gauge size={11} />}
                  label="Avg km/L"
                  value={avgKmPerL > 0 ? `${avgKmPerL.toFixed(1)} km/L` : '—'}
                  sub={avgKmPerL > 0 ? `${efficiencyRows.length} readings` : 'Add odometer to track'}
                  cls="text-violet-400"
                />
                <Chip
                  icon={<Activity size={11} />}
                  label="Cost per km"
                  value={avgCpKm > 0 ? `${CURRENCY}${avgCpKm.toFixed(3)}/km` : '—'}
                  sub={avgCpKm > 0 ? `${formatPrice(avgCpKm * 100)}/100 km` : undefined}
                  cls="text-orange-400"
                />
                <Chip
                  icon={<Calendar size={11} />}
                  label="Fill-up Interval"
                  value={fillupIntervalDays > 0 ? `${fillupIntervalDays} days` : '—'}
                  sub={daysLastFillup !== null ? `${daysLastFillup}d since last fill` : undefined}
                  cls="text-blue-400"
                />
                <Chip
                  icon={<Zap size={11} />}
                  label="Next Fill-up"
                  value={nextFillupIn !== null ? (nextFillupIn === 0 ? 'Today!' : `in ${nextFillupIn}d`) : '—'}
                  sub={nextFillupIn !== null && nextFillupIn <= 3 ? 'Running low soon' : undefined}
                  cls={nextFillupIn !== null && nextFillupIn <= 3 ? 'text-amber-400' : 'text-gray-400'}
                />
              </div>

              {efficiencyRows.length === 0 ? (
                <div className="bg-gray-900/70 backdrop-blur-xl rounded-2xl border border-violet-500/20 p-12 flex items-center gap-5">
                  <div className="w-12 h-12 rounded-2xl bg-violet-500/10 flex items-center justify-center shrink-0">
                    <Gauge size={22} className="text-violet-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-300 mb-1">Odometer readings needed</p>
                    <p className="text-xs text-gray-500">Add odometer (km) values when logging fill-ups. The app will calculate km/L and cost per km between consecutive fill-ups automatically.</p>
                  </div>
                  <button onClick={openAdd} className="ml-auto flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 shrink-0 cursor-pointer transition-colors">
                    Add reading <ArrowRight size={12} />
                  </button>
                </div>
              ) : (
                <>
                  {/* km/L chart */}
                  {efficiencyChartData.length > 1 && (
                    <div className="bg-gray-900/70 backdrop-blur-xl rounded-2xl border border-violet-500/20 p-5">
                      <h2 className="text-sm font-semibold text-gray-200 flex items-center gap-2 mb-4">
                        <Gauge size={14} className="text-violet-400" />Fuel Efficiency Trend
                        <span className="ml-auto text-xs font-normal text-gray-600">Avg: {avgKmPerL.toFixed(1)} km/L</span>
                      </h2>
                      <ResponsiveContainer width="100%" height={180}>
                        <AreaChart data={efficiencyChartData}>
                          <defs>
                            <linearGradient id="kmGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%"  stopColor="#8b5cf6" stopOpacity={0.25} />
                              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                          <XAxis dataKey="date" stroke="#4b5563" tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                          <YAxis stroke="#4b5563" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} width={36} domain={['auto', 'auto']} />
                          <Tooltip content={<DarkTip />} />
                          <Area type="monotone" dataKey="km/L" stroke="#8b5cf6" strokeWidth={2}
                            fill="url(#kmGrad)" dot={{ r: 3, fill: '#8b5cf6' }} activeDot={{ r: 5, fill: '#8b5cf6' }} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Efficiency table */}
                  <div className="bg-gray-900/70 backdrop-blur-xl rounded-2xl border border-violet-500/20 overflow-hidden">
                    <div className="px-5 py-4 border-b border-white/[0.04] flex items-center justify-between">
                      <h2 className="text-sm font-semibold text-gray-200">Trip-by-Trip Efficiency</h2>
                      <span className="text-xs text-gray-600">
                        Overall avg: <span className="text-violet-400 font-bold">{avgKmPerL.toFixed(1)} km/L</span>
                      </span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs min-w-[360px]">
                        <thead>
                          <tr className="border-b border-white/[0.04]">
                            <th className="text-left px-5 py-2.5 text-gray-500 font-semibold uppercase tracking-wider">Station</th>
                            <th className="text-right px-4 py-2.5 text-gray-500 font-semibold uppercase tracking-wider">km</th>
                            <th className="text-right px-4 py-2.5 text-gray-500 font-semibold uppercase tracking-wider">Litres</th>
                            <th className="text-right px-4 py-2.5 text-gray-500 font-semibold uppercase tracking-wider">km/L</th>
                            <th className="text-right px-5 py-2.5 text-gray-500 font-semibold uppercase tracking-wider">Cost/km</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.04]">
                          {efficiencyRows.slice(0, 15).map((r, i) => {
                            const good = r.kmPerL >= avgKmPerL;
                            return (
                              <tr key={i} className="hover:bg-gray-800/20 transition-colors">
                                <td className="px-5 py-2.5">
                                  <p className="font-medium text-gray-300 truncate">{r.station}</p>
                                  <p className="text-[10px] text-gray-600">{r.date}</p>
                                </td>
                                <td className="px-4 py-2.5 text-right font-mono tabular-nums text-gray-400">{r.km} km</td>
                                <td className="px-4 py-2.5 text-right font-mono tabular-nums text-gray-400">{r.litres.toFixed(2)} L</td>
                                <td className="px-4 py-2.5 text-right">
                                  <span className={cn('font-bold font-mono tabular-nums mr-1', good ? 'text-emerald-400' : 'text-rose-400')}>{r.kmPerL}</span>
                                  {good ? <CheckCircle2 size={9} className="inline text-emerald-400" /> : <TrendingDown size={9} className="inline text-rose-400" />}
                                </td>
                                <td className="px-5 py-2.5 text-right font-mono tabular-nums text-gray-500">{CURRENCY}{r.cpkm.toFixed(3)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ════ ANALYTICS ══════════════════════════════ */}
          {activeTab === 'analytics' && (
            <div className="space-y-5">
              {fuelFillups.length === 0 ? (
                <div className="bg-gray-900/70 backdrop-blur-xl rounded-2xl border border-violet-500/20 p-14 text-center">
                  <BarChart3 size={26} className="mx-auto text-gray-700 mb-3" />
                  <p className="text-sm text-gray-500">Add fill-ups to see analytics</p>
                </div>
              ) : (
                <>
                  {/* Fuel type donut + 6-month table */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Donut */}
                    <div className="bg-gray-900/70 backdrop-blur-xl rounded-2xl border border-violet-500/20 p-5">
                      <h2 className="text-sm font-semibold text-gray-200 mb-3">
                        Fuel Type Mix — {MONTHS_SHORT[viewMonth]}
                      </h2>
                      {fuelTypePie.length === 0 ? (
                        <div className="h-32 flex items-center justify-center">
                          <p className="text-xs text-gray-600">No data for this month</p>
                        </div>
                      ) : (
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <PieChart width={140} height={140}>
                              <Pie dataKey="value" data={fuelTypePie} cx="50%" cy="50%"
                                innerRadius={44} outerRadius={64} paddingAngle={2} startAngle={90} endAngle={-270}>
                                {fuelTypePie.map((d, i) => <Cell key={i} fill={d.color} />)}
                              </Pie>
                              <Tooltip content={<DarkTip />} />
                            </PieChart>
                          </div>
                          <div className="flex-1 space-y-2">
                            {fuelTypePie.map(d => (
                              <div key={d.name} className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5">
                                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                                  <span className="text-xs text-gray-400">{d.name}</span>
                                </div>
                                <span className="text-xs font-bold font-mono text-gray-200 tabular-nums">{formatPrice(d.value)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 6-month summary table */}
                    <div className="bg-gray-900/70 backdrop-blur-xl rounded-2xl border border-violet-500/20 overflow-hidden">
                      <div className="px-5 py-4 border-b border-white/[0.04] flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-gray-200">6-Month Summary</h2>
                        <span className="text-xs text-gray-600">YTD: <span className="text-amber-400 font-bold font-mono">{formatPrice(ytdCost)}</span></span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs min-w-[280px]">
                          <thead>
                            <tr className="border-b border-white/[0.04]">
                              <th className="text-left px-4 py-2.5 text-gray-500 font-semibold uppercase tracking-wider">Month</th>
                              <th className="text-right px-4 py-2.5 text-gray-500 font-semibold uppercase tracking-wider">Cost</th>
                              <th className="text-right px-4 py-2.5 text-gray-500 font-semibold uppercase tracking-wider">Litres</th>
                              <th className="text-right px-4 py-2.5 text-gray-500 font-semibold uppercase tracking-wider">Avg/L</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/[0.04]">
                            {[...monthHistory].reverse().map((h, i) => {
                              const isNow = h.month === now.getMonth() && h.year === now.getFullYear();
                              return (
                                <tr key={i} className={cn('transition-colors', isNow ? 'bg-amber-500/8' : 'hover:bg-gray-800/20')}>
                                  <td className="px-4 py-2.5 font-medium text-gray-300">{h.label}{isNow ? ' ← now' : ''}</td>
                                  <td className="px-4 py-2.5 text-right font-mono tabular-nums text-amber-400 font-semibold">{h.cost > 0 ? formatPrice(h.cost) : '—'}</td>
                                  <td className="px-4 py-2.5 text-right font-mono tabular-nums text-gray-400">{h.litres > 0 ? `${h.litres.toFixed(1)}L` : '—'}</td>
                                  <td className="px-4 py-2.5 text-right font-mono tabular-nums text-gray-500">{h.avgPpl > 0 ? `${CURRENCY}${h.avgPpl.toFixed(3)}` : '—'}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* All-time station leaderboard */}
                  {stationStats.length > 0 && (
                    <div className="bg-gray-900/70 backdrop-blur-xl rounded-2xl border border-violet-500/20 overflow-hidden">
                      <div className="px-5 py-4 border-b border-white/[0.04]">
                        <h2 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
                          <MapPin size={14} className="text-amber-400" />Station Leaderboard
                          <span className="text-xs font-normal text-gray-600 ml-1">All time · sorted cheapest first</span>
                        </h2>
                      </div>
                      <div className="divide-y divide-white/[0.04]">
                        {stationStats.map((s, i) => {
                          const maxP = stationStats[stationStats.length - 1]?.avgPpl ?? 1;
                          const pct  = maxP > 0 ? (s.avgPpl / maxP) * 100 : 0;
                          const savings = stationStats.length > 1
                            ? (stationStats[stationStats.length - 1].avgPpl - s.avgPpl) * s.litres
                            : 0;
                          return (
                            <div key={s.name} className="px-5 py-3.5 flex items-center gap-3 hover:bg-gray-800/20 transition-colors">
                              <span className={cn('text-xs font-black w-5 text-center rounded-full shrink-0', i === 0 ? 'text-emerald-400' : 'text-gray-600')}>{i + 1}</span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1.5">
                                  <span className="text-sm text-gray-300 font-medium truncate">{s.name}</span>
                                  <div className="flex items-center gap-3 shrink-0">
                                    {i === 0 && savings > 0.5 && (
                                      <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">saved {formatPrice(savings)}</span>
                                    )}
                                    <span className={cn('text-xs font-bold font-mono tabular-nums', i === 0 ? 'text-emerald-400' : 'text-gray-300')}>
                                      {CURRENCY}{s.avgPpl.toFixed(3)}/L
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 h-1.5 bg-gray-800/60 rounded-full overflow-hidden">
                                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: i === 0 ? '#10b981' : '#f59e0b' }} />
                                  </div>
                                  <span className="text-[10px] text-gray-600 shrink-0">{s.fills}× · {s.litres.toFixed(0)}L</span>
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

        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default FuelPage;
