// ==========================================
// BasketBuddy - Shopping Trips Page (v2)
// ==========================================

import React, { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingCart, Plus, Play, Check, Trash2, ChevronDown,
  Package, CheckCircle2, Pencil, X, MapPin, Calendar,
  TrendingUp, Wallet, ReceiptText, Store,
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import Modal from '../components/common/Modal';
import { cn, formatPrice, calcTripTotal } from '../utils/helpers';
import { CURRENCY } from '../config/constants';
import { ShoppingTripItem } from '../types';

// ── Animation variants ────────────────────────────────────────
const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const cardVariant = { hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0 } };

// ── Helpers ───────────────────────────────────────────────────
const inputCls =
  'w-full bg-gray-800/60 border border-green-500/20 rounded-xl px-3 py-2.5 text-gray-100 placeholder-gray-500 focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm outline-none transition-all';
const labelCls = 'block text-xs font-medium text-gray-400 mb-1.5';

type TripStatus = 'planned' | 'in-progress' | 'completed';

const STATUS_META: Record<TripStatus, { label: string; color: string; bg: string; border: string; dot: string }> = {
  planned:       { label: 'Planned',  color: 'text-green-300',  bg: 'bg-green-500/15',  border: 'border-green-500/30',  dot: 'bg-green-400'  },
  'in-progress': { label: 'Shopping', color: 'text-blue-300',    bg: 'bg-blue-500/15',    border: 'border-blue-500/30',    dot: 'bg-blue-400'    },
  completed:     { label: 'Complete', color: 'text-emerald-300', bg: 'bg-emerald-500/15', border: 'border-emerald-500/30', dot: 'bg-emerald-400' },
};

const ACCENT_GRADIENT: Record<TripStatus, string> = {
  planned:       'from-green-500/60 via-green-500/30 to-transparent',
  'in-progress': 'from-blue-500/60 via-blue-400/30 to-transparent',
  completed:     'from-emerald-500/60 via-emerald-500/30 to-transparent',
};

// ─────────────────────────────────────────────────────────────
const Trips: React.FC = () => {
  const {
    trips, stores, items, categories, prices,
    addTrip, updateTrip, deleteTrip,
    addTripItem, updateTripItem, removeTripItem,
  } = useApp();

  const [tripModal, setTripModal]       = useState(false);
  const [addItemModal, setAddItemModal] = useState(false);
  const [expandedTrip, setExpandedTrip] = useState<string | null>(null);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | TripStatus>('all');

  const [tripForm, setTripForm] = useState({
    name: '', storeId: '', budget: '', date: new Date().toISOString().split('T')[0],
  });
  const [itemForm, setItemForm] = useState({ itemId: '', quantity: '1', estimatedPrice: '' });

  const [editItemModal, setEditItemModal] = useState(false);
  const [editingTripItem, setEditingTripItem] = useState<{ tripId: string; ti: ShoppingTripItem } | null>(null);
  const [editItemForm, setEditItemForm] = useState({ quantity: '1', estimatedPrice: '' });

  // ── Derived data ──────────────────────────────────────────
  const filteredTrips = useMemo(() => {
    const sorted = [...trips].sort((a, b) => (b.createdAt ?? b.date ?? 0) - (a.createdAt ?? a.date ?? 0));
    if (filter === 'all') return sorted;
    return sorted.filter((t) => t.status === filter);
  }, [trips, filter]);

  const statusCounts = useMemo(() => ({
    all:           trips.length,
    planned:       trips.filter((t) => t.status === 'planned').length,
    'in-progress': trips.filter((t) => t.status === 'in-progress').length,
    completed:     trips.filter((t) => t.status === 'completed').length,
  }), [trips]);

  const totalSpent = useMemo(
    () => trips.filter((t) => t.status === 'completed').reduce((s, t) => s + (t.totalSpent ?? 0), 0),
    [trips],
  );
  const avgSpent = useMemo(() => {
    const done = trips.filter((t) => t.status === 'completed');
    return done.length ? totalSpent / done.length : 0;
  }, [trips, totalSpent]);

  // ── Formatters ────────────────────────────────────────────
  /** Returns a human-friendly date string with year when not current year */
  const formatTripDate = (ts: number): string => {
    const d = new Date(ts);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
    const tripDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    if (tripDay.getTime() === today.getTime()) return 'Today';
    if (tripDay.getTime() === yesterday.getTime()) return 'Yesterday';
    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    if (d.getFullYear() !== now.getFullYear()) opts.year = 'numeric';
    return d.toLocaleDateString('en-NA', opts);
  };

  // ── Handlers ──────────────────────────────────────────────
  const handleCreateTrip = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tripForm.name.trim() || !tripForm.storeId) return;
    addTrip({
      name: tripForm.name.trim(),
      storeId: tripForm.storeId,
      budget: parseFloat(tripForm.budget) || 0,
      date: new Date(tripForm.date).getTime(),
      status: 'planned',
      items: [],
      totalSpent: 0,
      sharedWith: [],
      notes: '',
    });
    toast.success(`Trip "${tripForm.name.trim()}" created`);
    setTripModal(false);
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTripId || !itemForm.itemId) return;
    const item = items.find((i) => i.id === itemForm.itemId);
    if (!item) return;
    const trip = trips.find((t) => t.id === selectedTripId);
    const storePrice = prices.find((p) => p.itemId === item.id && p.storeId === trip?.storeId);
    const estimatedPrice = itemForm.estimatedPrice
      ? parseFloat(itemForm.estimatedPrice)
      : storePrice
        ? (storePrice.isOnSpecial && storePrice.specialPrice ? storePrice.specialPrice : storePrice.normalPrice)
        : 0;
    addTripItem(selectedTripId, {
      itemId: item.id,
      itemName: item.name,
      categoryId: item.categoryId,
      quantity: parseInt(itemForm.quantity) || 1,
      unit: item.unit,
      estimatedPrice,
      checked: false,
      storeId: trip?.storeId || '',
    });
    toast.success(`"${item.name}" added`);
    setAddItemModal(false);
    setItemForm({ itemId: '', quantity: '1', estimatedPrice: '' });
  };

  const handleEditItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTripItem) return;
    updateTripItem(editingTripItem.tripId, editingTripItem.ti.id, {
      quantity: parseInt(editItemForm.quantity) || 1,
      estimatedPrice: parseFloat(editItemForm.estimatedPrice) || 0,
    });
    toast.success(`"${editingTripItem.ti.itemName}" updated`);
    setEditItemModal(false);
    setEditingTripItem(null);
  };

  const startTrip = (id: string) => {
    updateTrip(id, { status: 'in-progress' });
    toast('Trip started — happy shopping!', { icon: '🛒' });
    setExpandedTrip(id);
  };

  const completeTrip = (id: string) => {
    const trip = trips.find((t) => t.id === id);
    if (!trip) return;
    const spent = trip.items.reduce(
      (sum, i) => sum + (i.actualPrice !== undefined ? i.actualPrice : i.estimatedPrice) * i.quantity,
      0,
    );
    updateTrip(id, { status: 'completed', totalSpent: spent, completedAt: Date.now() });
    toast.success(`Trip complete! Spent ${formatPrice(spent)}`, { duration: 4000 });
  };

  const toggleItem = (tripId: string, itemId: string, checked: boolean) =>
    updateTripItem(tripId, itemId, { checked });

  const setActualPrice = (tripId: string, itemId: string, price: string) =>
    updateTripItem(tripId, itemId, { actualPrice: parseFloat(price) || 0 });

  const openAddItemForTrip = (tripId: string) => {
    setSelectedTripId(tripId);
    setItemForm({ itemId: '', quantity: '1', estimatedPrice: '' });
    setAddItemModal(true);
  };

  // ── Render ────────────────────────────────────────────────
  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-5 max-w-5xl mx-auto">

      {/* ── Header ── */}
      <motion.div variants={cardVariant} className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <div className="p-2 bg-green-500/10 rounded-xl">
              <ShoppingCart size={20} className="text-green-400" />
            </div>
            Shopping Trips
          </h1>
          <p className="text-gray-500 text-sm mt-1 ml-12">Plan, track and complete your grocery runs</p>
        </div>
        <button
          onClick={() => {
            setTripForm({ name: '', storeId: stores[0]?.id || '', budget: '', date: new Date().toISOString().split('T')[0] });
            setTripModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-medium transition-colors shadow-lg shadow-green-500/20 cursor-pointer"
        >
          <Plus size={16} /> New Trip
        </button>
      </motion.div>

      {/* ── Stats strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {([
          { icon: ReceiptText,  label: 'Total Trips',   value: trips.length.toString(),                         color: 'violet' },
          { icon: ShoppingCart, label: 'In Progress',   value: statusCounts['in-progress'].toString(),          color: 'blue'   },
          { icon: Wallet,       label: 'Total Spent',   value: formatPrice(totalSpent),                         color: 'emerald'},
          { icon: TrendingUp,   label: 'Avg per Trip',  value: avgSpent > 0 ? formatPrice(avgSpent) : '—',      color: 'amber'  },
        ] as const).map(({ icon: Icon, label, value, color }) => (
          <motion.div
            key={label}
            variants={cardVariant}
            className="bg-gray-900/70 backdrop-blur-xl rounded-2xl p-4 border border-green-500/20 hover:border-green-500/40 transition-all duration-300 relative overflow-hidden"
          >
            <div className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-${color}-500/60 to-transparent`} />
            <div className={`p-2 bg-${color}-500/10 rounded-xl w-fit mb-3`}>
              <Icon size={16} className={`text-${color}-400`} />
            </div>
            <p className="text-lg font-bold text-white font-mono tabular-nums">{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </motion.div>
        ))}
      </div>

      {/* ── Filter tabs ── */}
      <motion.div variants={cardVariant} className="flex items-center gap-2 flex-wrap">
        {(['all', 'planned', 'in-progress', 'completed'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={cn(
              'px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer whitespace-nowrap',
              filter === status
                ? 'bg-green-600 text-white shadow-lg shadow-green-500/20'
                : 'bg-gray-900/70 text-gray-400 border border-green-500/20 hover:text-gray-200 hover:border-green-500/40',
            )}
          >
            {status === 'all' ? 'All' : status === 'in-progress' ? 'Shopping' : status.charAt(0).toUpperCase() + status.slice(1)}
            <span className="ml-1.5 text-xs opacity-60">({statusCounts[status]})</span>
          </button>
        ))}
      </motion.div>

      {/* ── Trips list ── */}
      {filteredTrips.length === 0 ? (
        <motion.div
          variants={cardVariant}
          className="bg-gray-900/70 backdrop-blur-xl rounded-2xl border border-green-500/20 p-14 text-center"
        >
          <div className="w-16 h-16 bg-green-500/10 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <ShoppingCart size={32} className="text-green-400" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">
            No trips{filter !== 'all' ? ` with status "${filter}"` : ' yet'}
          </h3>
          <p className="text-gray-500 text-sm mb-6 max-w-sm mx-auto">
            Plan your next grocery run and track exactly what you spend.
          </p>
          <button
            onClick={() => {
              setTripForm({ name: '', storeId: stores[0]?.id || '', budget: '', date: new Date().toISOString().split('T')[0] });
              setTripModal(true);
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition-colors cursor-pointer"
          >
            <Plus size={16} /> Create First Trip
          </button>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {filteredTrips.map((trip) => {
            const store  = stores.find((s) => s.id === trip.storeId);
            const isExpanded = expandedTrip === trip.id;
            const status = trip.status as TripStatus;
            const meta   = STATUS_META[status];
            const estimated  = calcTripTotal(trip.items, false);
            const actual     = calcTripTotal(trip.items, true);
            const displayAmt = status === 'completed' ? (trip.totalSpent ?? actual) : estimated;
            const budgetPct  = trip.budget > 0 ? Math.min((estimated / trip.budget) * 100, 100) : 0;
            const budgetOver = trip.budget > 0 && estimated > trip.budget;
            const checkedCount = trip.items.filter((i) => i.checked).length;

            // Group items by category for expanded view
            const catMap = new Map<string, ShoppingTripItem[]>();
            for (const ti of trip.items) {
              const k = ti.categoryId ?? '__none__';
              if (!catMap.has(k)) catMap.set(k, []);
              catMap.get(k)!.push(ti);
            }
            const grouped = Array.from(catMap.entries()).map(([catId, catItems]) => {
              const cat = categories.find((c) => c.id === catId);
              return {
                catId, catItems,
                catName:  cat?.name  ?? 'Uncategorized',
                catIcon:  cat?.icon  ?? '📦',
                catColor: cat?.color ?? '#6b7280',
              };
            });

            return (
              <motion.div
                key={trip.id}
                variants={cardVariant}
                layout
                className={cn(
                  'bg-gray-900/70 backdrop-blur-xl rounded-2xl border overflow-hidden transition-all duration-300',
                  status === 'in-progress'
                    ? 'border-blue-500/40 shadow-lg shadow-blue-500/5'
                    : 'border-green-500/20',
                )}
              >
                {/* Status accent line */}
                <div className={`h-px w-full bg-gradient-to-r ${ACCENT_GRADIENT[status]}`} />

                {/* ── Trip card header ── */}
                <button
                  type="button"
                  className="w-full px-5 py-4 flex items-center gap-4 cursor-pointer hover:bg-white/[0.02] transition-colors text-left"
                  onClick={() => setExpandedTrip(isExpanded ? null : trip.id)}
                  aria-expanded={isExpanded}
                >
                  {/* Store icon */}
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center text-lg flex-shrink-0 border"
                    style={{
                      backgroundColor: store?.color ? `${store.color}18` : '#4ade8018',
                      borderColor:     store?.color ? `${store.color}30` : '#4ade8030',
                    }}
                  >
                    {store?.icon ?? <Store size={20} className="text-gray-400" />}
                  </div>

                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-100 text-sm">{trip.name}</h3>
                      <span className={cn(
                        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border',
                        meta.color, meta.bg, meta.border,
                      )}>
                        <span className={cn('w-1.5 h-1.5 rounded-full', meta.dot)} />
                        {meta.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <MapPin size={10} /> {store?.name ?? 'Unknown store'}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <Calendar size={10} />
                        {status === 'completed' && trip.completedAt
                          ? `Completed ${formatTripDate(trip.completedAt)}`
                          : formatTripDate(trip.date)}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <Package size={10} /> {trip.items.length} item{trip.items.length !== 1 ? 's' : ''}
                      </span>
                      {trip.items.length > 0 && status === 'in-progress' && (
                        <span className="text-xs text-blue-400 font-medium">
                          {checkedCount}/{trip.items.length} checked
                        </span>
                      )}
                    </div>
                    {/* Budget bar */}
                    {trip.budget > 0 && (
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex-1 h-1 bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              'h-full rounded-full transition-all duration-700',
                              budgetOver ? 'bg-rose-500' : budgetPct > 80 ? 'bg-amber-500' : 'bg-green-500',
                            )}
                            style={{ width: `${budgetPct}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-gray-500 font-mono flex-shrink-0 tabular-nums">
                          {Math.round(budgetPct)}%
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Amount + chevron */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right">
                      <p className={cn(
                        'text-base font-bold font-mono tabular-nums',
                        status === 'completed' ? 'text-emerald-400' : 'text-white',
                      )}>
                        {formatPrice(displayAmt)}
                      </p>
                      {trip.budget > 0 && (
                        <p className="text-[10px] text-gray-600 font-mono">of {formatPrice(trip.budget)}</p>
                      )}
                    </div>
                    <ChevronDown
                      size={16}
                      className="text-gray-500 transition-transform duration-200 flex-shrink-0"
                      style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
                    />
                  </div>
                </button>

                {/* ── Expanded content ── */}
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      key="expanded"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22, ease: 'easeInOut' }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div className="border-t border-green-500/15">

                        {/* Action toolbar */}
                        <div className="px-5 py-3 flex flex-wrap items-center gap-2 bg-gray-800/20">
                          {status !== 'completed' && (
                            <button
                              onClick={() => openAddItemForTrip(trip.id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
                            >
                              <Plus size={12} /> Add Item
                            </button>
                          )}
                          {status === 'planned' && (
                            <button
                              onClick={() => startTrip(trip.id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
                            >
                              <Play size={12} /> Start Shopping
                            </button>
                          )}
                          {status === 'in-progress' && (
                            <button
                              onClick={() => completeTrip(trip.id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
                            >
                              <CheckCircle2 size={12} /> Complete Trip
                            </button>
                          )}
                          <button
                            onClick={() => {
                              if (!window.confirm('Delete this trip? This cannot be undone.')) return;
                              deleteTrip(trip.id);
                              toast.success('Trip deleted');
                              if (expandedTrip === trip.id) setExpandedTrip(null);
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg text-xs font-medium transition-colors cursor-pointer border border-rose-500/20"
                          >
                            <Trash2 size={12} /> Delete
                          </button>
                          {trip.items.length > 0 && (
                            <span className="ml-auto text-xs text-gray-500 font-mono">
                              {checkedCount} / {trip.items.length} items
                            </span>
                          )}
                        </div>

                        {/* Items */}
                        {trip.items.length === 0 ? (
                          <div className="py-10 text-center">
                            <Package size={28} className="text-gray-700 mx-auto mb-2.5" />
                            <p className="text-gray-500 text-sm">No items yet — add your first item above.</p>
                          </div>
                        ) : (
                          <div>
                            {grouped.map(({ catId, catName, catIcon, catColor, catItems }) => (
                              <div key={catId} className="border-t border-green-500/8 first:border-0">
                                {/* Category sub-header */}
                                <div
                                  className="px-5 py-2 flex items-center gap-2"
                                  style={{ backgroundColor: `${catColor}07` }}
                                >
                                  <span className="w-1 h-3.5 rounded-full flex-shrink-0" style={{ backgroundColor: catColor }} />
                                  <span className="text-sm">{catIcon}</span>
                                  <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                                    {catName}
                                  </span>
                                  <span className="ml-auto text-[10px] font-mono text-gray-600">
                                    {catItems.filter((i) => i.checked).length}/{catItems.length}
                                  </span>
                                </div>

                                {/* Item rows */}
                                {catItems.map((ti) => {
                                  const displayPrice = ti.actualPrice !== undefined ? ti.actualPrice : ti.estimatedPrice;
                                  const lineTotal = displayPrice * ti.quantity;
                                  return (
                                    <div
                                      key={ti.id}
                                      className={cn(
                                        'px-5 py-3 flex items-center gap-3 hover:bg-gray-800/20 transition-colors group',
                                        ti.checked && 'opacity-50',
                                      )}
                                    >
                                      {/* Checkbox */}
                                      {status !== 'completed' ? (
                                        <button
                                          onClick={() => toggleItem(trip.id, ti.id, !ti.checked)}
                                          aria-label={ti.checked ? 'Uncheck item' : 'Check item'}
                                          className="flex-shrink-0 w-5 h-5 rounded-md border-2 transition-all cursor-pointer flex items-center justify-center"
                                          style={{
                                            borderColor:     ti.checked ? '#10b981' : '#4b5563',
                                            backgroundColor: ti.checked ? '#10b981' : 'transparent',
                                          }}
                                        >
                                          {ti.checked && <Check size={11} className="text-white" />}
                                        </button>
                                      ) : (
                                        <div className="flex-shrink-0 w-5 h-5 rounded-md bg-emerald-500 flex items-center justify-center">
                                          <Check size={11} className="text-white" />
                                        </div>
                                      )}

                                      {/* Name */}
                                      <span className={cn(
                                        'flex-1 min-w-0 text-sm font-medium truncate',
                                        ti.checked ? 'text-gray-600 line-through' : 'text-gray-200',
                                      )}>
                                        {ti.itemName}
                                      </span>

                                      {/* Qty badge */}
                                      <span className="flex-shrink-0 text-xs font-semibold px-2 py-0.5 bg-gray-700/60 rounded-md text-gray-300 font-mono tabular-nums">
                                        {ti.quantity} {ti.unit}
                                      </span>

                                      {/* Actual price input when in-progress */}
                                      {status === 'in-progress' ? (
                                        <div className="flex-shrink-0 flex items-center gap-1">
                                          <span className="text-xs text-gray-500">{CURRENCY}</span>
                                          <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            placeholder={ti.estimatedPrice.toFixed(2)}
                                            value={ti.actualPrice !== undefined ? ti.actualPrice : ''}
                                            onChange={(e) => setActualPrice(trip.id, ti.id, e.target.value)}
                                            className="w-20 px-2 py-1 text-right text-sm bg-gray-800/60 border border-green-500/20 rounded-lg outline-none focus:ring-1 focus:ring-green-500 text-gray-100 tabular-nums"
                                          />
                                        </div>
                                      ) : (
                                        <span className="flex-shrink-0 text-xs text-gray-500 font-mono hidden sm:block tabular-nums">
                                          @ {formatPrice(ti.estimatedPrice)}
                                        </span>
                                      )}

                                      {/* Line total */}
                                      <span className={cn(
                                        'flex-shrink-0 text-sm font-bold font-mono tabular-nums w-20 text-right',
                                        ti.checked ? 'text-gray-600' : status === 'completed' ? 'text-emerald-400' : 'text-white',
                                      )}>
                                        {formatPrice(lineTotal)}
                                      </span>

                                      {/* Row actions (hover-reveal) */}
                                      {status !== 'completed' && (
                                        <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <button
                                            onClick={() => {
                                              setEditingTripItem({ tripId: trip.id, ti });
                                              setEditItemForm({ quantity: String(ti.quantity), estimatedPrice: String(ti.estimatedPrice) });
                                              setEditItemModal(true);
                                            }}
                                            aria-label="Edit item"
                                            className="p-1.5 text-gray-500 hover:text-green-400 rounded-lg hover:bg-green-500/10 transition-colors cursor-pointer"
                                          >
                                            <Pencil size={13} />
                                          </button>
                                          <button
                                            onClick={() => removeTripItem(trip.id, ti.id)}
                                            aria-label="Remove item"
                                            className="p-1.5 text-gray-500 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
                                          >
                                            <X size={13} />
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            ))}

                            {/* Footer total */}
                            <div className="px-5 py-3.5 bg-gray-800/30 border-t border-green-500/10 flex items-center justify-between">
                              <div className="flex items-center gap-4 text-xs text-gray-500">
                                {trip.budget > 0 && (
                                  <span>
                                    Budget:{' '}
                                    <span className={cn('font-semibold font-mono tabular-nums', budgetOver ? 'text-rose-400' : 'text-gray-400')}>
                                      {formatPrice(trip.budget)}
                                    </span>
                                  </span>
                                )}
                                {status === 'in-progress' && actual > 0 && actual !== estimated && (
                                  <span>
                                    Actual:{' '}
                                    <span className="text-blue-400 font-semibold font-mono tabular-nums">{formatPrice(actual)}</span>
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500">
                                  {status === 'completed' ? 'Spent:' : 'Estimated:'}
                                </span>
                                <span className={cn(
                                  'text-base font-bold font-mono tabular-nums',
                                  status === 'completed' ? 'text-emerald-400' : 'text-white',
                                )}>
                                  {formatPrice(status === 'completed' ? (trip.totalSpent ?? actual) : estimated)}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ── Modal: Create Trip ── */}
      <Modal
        isOpen={tripModal}
        onClose={() => setTripModal(false)}
        title="New Shopping Trip"
        footer={
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setTripModal(false)}
              className="flex-1 py-2.5 bg-gray-800/60 hover:bg-gray-700/60 text-gray-300 rounded-xl text-sm font-medium transition-colors cursor-pointer border border-green-500/20"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="trip-form"
              className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-medium transition-colors cursor-pointer"
            >
              Create Trip
            </button>
          </div>
        }
      >
        <form id="trip-form" onSubmit={handleCreateTrip} className="space-y-4">
          <div>
            <label className={labelCls}>Trip Name *</label>
            <input
              type="text"
              value={tripForm.name}
              onChange={(e) => setTripForm({ ...tripForm, name: e.target.value })}
              placeholder="e.g. Weekly Groceries"
              className={inputCls}
              autoFocus
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Store *</label>
              <select
                value={tripForm.storeId}
                onChange={(e) => setTripForm({ ...tripForm, storeId: e.target.value })}
                className={inputCls}
                required
              >
                <option value="">Select store…</option>
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>{s.icon} {s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Date</label>
              <input
                type="date"
                value={tripForm.date}
                onChange={(e) => setTripForm({ ...tripForm, date: e.target.value })}
                className={inputCls}
              />
            </div>
          </div>
          <div>
            <label className={labelCls}>Budget ({CURRENCY}) — optional</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={tripForm.budget}
              onChange={(e) => setTripForm({ ...tripForm, budget: e.target.value })}
              placeholder="Set a spending limit"
              className={inputCls}
            />
          </div>
        </form>
      </Modal>

      {/* ── Modal: Add Item ── */}
      <Modal
        isOpen={addItemModal}
        onClose={() => { setAddItemModal(false); setItemForm({ itemId: '', quantity: '1', estimatedPrice: '' }); }}
        title="Add Item to Trip"
        footer={
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setAddItemModal(false)}
              className="flex-1 py-2.5 bg-gray-800/60 hover:bg-gray-700/60 text-gray-300 rounded-xl text-sm font-medium transition-colors cursor-pointer border border-green-500/20"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="add-item-form"
              className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-medium transition-colors cursor-pointer"
            >
              Add to Trip
            </button>
          </div>
        }
      >
        <form id="add-item-form" onSubmit={handleAddItem} className="space-y-4">
          {(() => {
            const tripStoreId = trips.find((t) => t.id === selectedTripId)?.storeId || '';
            const itemsAtStore = items
              .filter((item) => prices.some((p) => p.itemId === item.id && p.storeId === tripStoreId))
              .sort((a, b) => a.name.localeCompare(b.name));
            const storeName = stores.find((s) => s.id === tripStoreId)?.name || 'this store';
            return (
              <>
                <div>
                  <label className={labelCls}>Select Item *</label>
                  <select
                    value={itemForm.itemId}
                    onChange={(e) => {
                      const id = e.target.value;
                      const storePrice = prices.find((p) => p.itemId === id && p.storeId === tripStoreId);
                      const autoPrice = storePrice
                        ? String(storePrice.isOnSpecial && storePrice.specialPrice ? storePrice.specialPrice : storePrice.normalPrice)
                        : '';
                      setItemForm({ ...itemForm, itemId: id, estimatedPrice: autoPrice });
                    }}
                    className={inputCls}
                    required
                  >
                    <option value="">
                      {itemsAtStore.length === 0 ? `No items registered at ${storeName}` : 'Choose an item…'}
                    </option>
                    {itemsAtStore.map((item) => {
                      const cat = categories.find((c) => c.id === item.categoryId);
                      const sp = prices.find((p) => p.itemId === item.id && p.storeId === tripStoreId);
                      const price = sp ? (sp.isOnSpecial && sp.specialPrice ? sp.specialPrice : sp.normalPrice) : null;
                      return (
                        <option key={item.id} value={item.id}>
                          {cat?.icon} {item.name} ({item.unit}){price != null ? ` — N$${price}` : ''}
                        </option>
                      );
                    })}
                  </select>
                  {itemsAtStore.length === 0 && (
                    <p className="text-xs text-amber-400 mt-1.5">
                      No items have prices at {storeName}. Go to Items → add prices first.
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Quantity</label>
                    <input
                      type="number"
                      min="1"
                      value={itemForm.quantity}
                      onChange={(e) => setItemForm({ ...itemForm, quantity: e.target.value })}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Est. Price ({CURRENCY})</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={itemForm.estimatedPrice}
                      onChange={(e) => setItemForm({ ...itemForm, estimatedPrice: e.target.value })}
                      placeholder="Auto from prices"
                      className={inputCls}
                    />
                  </div>
                </div>
              </>
            );
          })()}
        </form>
      </Modal>

      {/* ── Modal: Edit Trip Item ── */}
      <Modal
        isOpen={editItemModal}
        onClose={() => { setEditItemModal(false); setEditingTripItem(null); }}
        title={editingTripItem ? `Edit "${editingTripItem.ti.itemName}"` : 'Edit Item'}
        footer={
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => { setEditItemModal(false); setEditingTripItem(null); }}
              className="flex-1 py-2.5 bg-gray-800/60 hover:bg-gray-700/60 text-gray-300 rounded-xl text-sm font-medium transition-colors cursor-pointer border border-green-500/20"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="edit-item-form"
              className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-medium transition-colors cursor-pointer"
            >
              Save Changes
            </button>
          </div>
        }
      >
        <form id="edit-item-form" onSubmit={handleEditItem} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Quantity</label>
              <input
                type="number"
                min="1"
                value={editItemForm.quantity}
                onChange={(e) => setEditItemForm({ ...editItemForm, quantity: e.target.value })}
                className={inputCls}
                required
              />
            </div>
            <div>
              <label className={labelCls}>Est. Price ({CURRENCY})</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={editItemForm.estimatedPrice}
                onChange={(e) => setEditItemForm({ ...editItemForm, estimatedPrice: e.target.value })}
                className={inputCls}
                required
              />
            </div>
          </div>
          {editingTripItem && (
            <p className="text-xs text-gray-500">Unit: {editingTripItem.ti.unit}</p>
          )}
        </form>
      </Modal>
    </motion.div>
  );
};

export default Trips;
