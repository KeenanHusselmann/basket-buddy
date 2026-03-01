// ==========================================
// BasketBuddy - Fuel & Transport Page
// ==========================================

import React, { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Fuel as FuelIcon, Plus, Pencil, Trash2, ChevronDown,
  DropletIcon, TrendingUp, Receipt, Calendar,
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import Modal from '../components/common/Modal';
import { formatPrice } from '../utils/helpers';
import { CURRENCY } from '../config/constants';
import { FuelType, FuelFillup } from '../types';

const FUEL_TYPES: { value: FuelType; label: string; color: string }[] = [
  { value: 'petrol-93', label: '⛽ Petrol 93', color: '#ef4444' },
  { value: 'petrol-95', label: '⛽ Petrol 95', color: '#f97316' },
  { value: 'diesel',    label: '🚛 Diesel',    color: '#3b82f6' },
  { value: 'other',     label: '🔋 Other',     color: '#8b5cf6' },
];

function fuelLabel(type: FuelType): string {
  return FUEL_TYPES.find((f) => f.value === type)?.label ?? type;
}
function fuelColor(type: FuelType): string {
  return FUEL_TYPES.find((f) => f.value === type)?.color ?? '#6b7280';
}

const emptyForm = () => ({
  date: new Date().toISOString().split('T')[0],
  fuelType: 'petrol-93' as FuelType,
  stationName: '',
  litres: '',
  pricePerLitre: '',
  totalCost: '',
  odometer: '',
  notes: '',
});

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const fadeUp    = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

const Fuel: React.FC = () => {
  const { fuelFillups, addFuelFillup, updateFuelFillup, deleteFuelFillup } = useApp();

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear]   = useState(now.getFullYear());

  const [addModal, setAddModal]   = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [editTarget, setEditTarget] = useState<FuelFillup | null>(null);
  const [form, setForm] = useState(emptyForm());

  // ── Derived ──────────────────────────────────────────────
  const monthFillups = useMemo(() => {
    return [...fuelFillups]
      .filter((f) => {
        const d = new Date(f.date);
        return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
      })
      .sort((a, b) => b.date - a.date);
  }, [fuelFillups, selectedMonth, selectedYear]);

  const totalCostMonth   = useMemo(() => monthFillups.reduce((s, f) => s + f.totalCost, 0),   [monthFillups]);
  const totalLitresMonth = useMemo(() => monthFillups.reduce((s, f) => s + f.litres, 0),       [monthFillups]);
  const avgPricePerLitre = totalLitresMonth > 0
    ? totalCostMonth / totalLitresMonth
    : 0;

  // All-time stats
  const totalCostAll   = fuelFillups.reduce((s, f) => s + f.totalCost, 0);

  // Month navigation helpers
  const monthLabel = new Date(selectedYear, selectedMonth, 1)
    .toLocaleDateString('en-NA', { month: 'long', year: 'numeric' });

  const prevMonth = () => {
    if (selectedMonth === 0) { setSelectedMonth(11); setSelectedYear(y => y - 1); }
    else setSelectedMonth(m => m - 1);
  };
  const nextMonth = () => {
    const isCurrentMonth = selectedMonth === now.getMonth() && selectedYear === now.getFullYear();
    if (isCurrentMonth) return;
    if (selectedMonth === 11) { setSelectedMonth(0); setSelectedYear(y => y + 1); }
    else setSelectedMonth(m => m + 1);
  };

  // ── Auto-calc total when litres/price changes ─────────────
  const recalcTotal = (l: string, p: string) => {
    const litres = parseFloat(l);
    const price  = parseFloat(p);
    if (!isNaN(litres) && !isNaN(price)) {
      return (litres * price).toFixed(2);
    }
    return '';
  };

  const handleLitresChange = (val: string) => {
    setForm((f) => ({ ...f, litres: val, totalCost: recalcTotal(val, f.pricePerLitre) }));
  };
  const handlePriceChange = (val: string) => {
    setForm((f) => ({ ...f, pricePerLitre: val, totalCost: recalcTotal(f.litres, val) }));
  };

  // ── Add ──────────────────────────────────────────────────
  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const litres       = parseFloat(form.litres);
    const ppl          = parseFloat(form.pricePerLitre);
    const totalCost    = parseFloat(form.totalCost) || litres * ppl;
    if (!form.stationName.trim() || isNaN(litres) || isNaN(ppl)) {
      toast.error('Please fill in station name, litres, and price per litre.');
      return;
    }
    addFuelFillup({
      date:          new Date(form.date).getTime(),
      fuelType:      form.fuelType,
      stationName:   form.stationName.trim(),
      litres,
      pricePerLitre: ppl,
      totalCost,
      odometer:      form.odometer ? parseInt(form.odometer) : undefined,
      notes:         form.notes.trim() || undefined,
    });
    toast.success('Fill-up logged ⛽');
    setAddModal(false);
    setForm(emptyForm());
  };

  // ── Edit ─────────────────────────────────────────────────
  const openEdit = (f: FuelFillup) => {
    setEditTarget(f);
    const d = new Date(f.date);
    setForm({
      date:          d.toISOString().split('T')[0],
      fuelType:      f.fuelType,
      stationName:   f.stationName,
      litres:        String(f.litres),
      pricePerLitre: String(f.pricePerLitre),
      totalCost:     String(f.totalCost),
      odometer:      f.odometer !== undefined ? String(f.odometer) : '',
      notes:         f.notes || '',
    });
    setEditModal(true);
  };

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    const litres    = parseFloat(form.litres);
    const ppl       = parseFloat(form.pricePerLitre);
    const totalCost = parseFloat(form.totalCost) || litres * ppl;
    updateFuelFillup(editTarget.id, {
      date:          new Date(form.date).getTime(),
      fuelType:      form.fuelType,
      stationName:   form.stationName.trim(),
      litres,
      pricePerLitre: ppl,
      totalCost,
      odometer:      form.odometer ? parseInt(form.odometer) : undefined,
      notes:         form.notes.trim() || undefined,
    });
    toast.success('Fill-up updated');
    setEditModal(false);
    setEditTarget(null);
  };

  // ── Delete ───────────────────────────────────────────────
  const handleDelete = (id: string, station: string) => {
    deleteFuelFillup(id);
    toast.success(`Removed "${station}"`);
  };

  // ── Form JSX (shared between add + edit modals) ──────────
  const formContent = (id: string, onSubmit: (e: React.FormEvent) => void) => (
    <form id={id} onSubmit={onSubmit} className="space-y-4">
      {/* Date + Fuel Type */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Date *</label>
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-800 dark:text-gray-200 outline-none focus:border-brand-500 transition-colors"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Fuel Type *</label>
          <select
            value={form.fuelType}
            onChange={(e) => setForm({ ...form, fuelType: e.target.value as FuelType })}
            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-800 dark:text-gray-200 outline-none focus:border-brand-500 transition-colors"
          >
            {FUEL_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Station Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Station Name *</label>
        <input
          type="text"
          value={form.stationName}
          onChange={(e) => setForm({ ...form, stationName: e.target.value })}
          placeholder="e.g. Engen Windhoek, Total, Puma…"
          className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-800 dark:text-gray-200 outline-none focus:border-brand-500 transition-colors"
          required
        />
      </div>

      {/* Litres + Price/L + Total */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Litres *</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={form.litres}
            onChange={(e) => handleLitresChange(e.target.value)}
            placeholder="0.00"
            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-800 dark:text-gray-200 outline-none focus:border-brand-500 transition-colors"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Price/Litre ({CURRENCY}) *</label>
          <input
            type="number"
            step="0.001"
            min="0"
            value={form.pricePerLitre}
            onChange={(e) => handlePriceChange(e.target.value)}
            placeholder="0.000"
            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-800 dark:text-gray-200 outline-none focus:border-brand-500 transition-colors"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Total Cost ({CURRENCY})</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={form.totalCost}
            onChange={(e) => setForm({ ...form, totalCost: e.target.value })}
            placeholder="Auto-calculated"
            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-800 dark:text-gray-200 outline-none focus:border-brand-500 transition-colors"
          />
        </div>
      </div>

      {/* Odometer + Notes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Odometer (km)</label>
          <input
            type="number"
            min="0"
            value={form.odometer}
            onChange={(e) => setForm({ ...form, odometer: e.target.value })}
            placeholder="Optional"
            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-800 dark:text-gray-200 outline-none focus:border-brand-500 transition-colors"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Notes</label>
          <input
            type="text"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Optional"
            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-800 dark:text-gray-200 outline-none focus:border-brand-500 transition-colors"
          />
        </div>
      </div>
    </form>
  );

  // ── Render ────────────────────────────────────────────────
  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">

      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FuelIcon size={24} className="text-amber-500" />
            Fuel & Transport
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-0.5 text-sm">
            Track every fill-up. Fuel costs are kept separate from your grocery budget.
          </p>
        </div>
        <button
          onClick={() => { setForm(emptyForm()); setAddModal(true); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-medium transition-colors shadow-sm"
        >
          <Plus size={16} /> Log Fill-up
        </button>
      </motion.div>

      {/* Summary Cards */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
              <Receipt size={16} className="text-amber-600 dark:text-amber-400" />
            </div>
          </div>
          <p className="text-xl font-bold text-gray-900 dark:text-white">{formatPrice(totalCostMonth)}</p>
          <p className="text-xs text-gray-500 mt-0.5">This month's fuel cost</p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
              <DropletIcon size={16} className="text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <p className="text-xl font-bold text-gray-900 dark:text-white">{totalLitresMonth.toFixed(1)} L</p>
          <p className="text-xs text-gray-500 mt-0.5">{monthFillups.length} fill-up{monthFillups.length !== 1 ? 's' : ''} this month</p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-xl">
              <TrendingUp size={16} className="text-green-600 dark:text-green-400" />
            </div>
          </div>
          <p className="text-xl font-bold text-gray-900 dark:text-white">
            {avgPricePerLitre > 0 ? `${CURRENCY}${avgPricePerLitre.toFixed(3)}` : '—'}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">Avg price per litre</p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
              <FuelIcon size={16} className="text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <p className="text-xl font-bold text-gray-900 dark:text-white">{formatPrice(totalCostAll)}</p>
          <p className="text-xs text-gray-500 mt-0.5">All-time fuel spend</p>
        </div>
      </motion.div>

      {/* Month Navigator + Fill-up List */}
      <motion.div variants={fadeUp} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">

        {/* Month Nav */}
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
            <Calendar size={16} className="text-amber-500" />
            {monthLabel}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={prevMonth}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-gray-500"
            >
              <ChevronDown size={16} className="rotate-90" />
            </button>
            <button
              onClick={nextMonth}
              disabled={selectedMonth === now.getMonth() && selectedYear === now.getFullYear()}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronDown size={16} className="-rotate-90" />
            </button>
          </div>
        </div>

        {monthFillups.length === 0 ? (
          <div className="p-12 text-center">
            <FuelIcon size={40} className="mx-auto text-gray-300 dark:text-gray-700 mb-3" />
            <p className="text-gray-500 text-sm">No fill-ups recorded for {monthLabel}.</p>
            <button
              onClick={() => { setForm(emptyForm()); setAddModal(true); }}
              className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-amber-500 text-white rounded-xl text-sm font-medium hover:bg-amber-600 transition-colors"
            >
              <Plus size={14} /> Log Fill-up
            </button>
          </div>
        ) : (
          <>
            {/* Table header */}
            <div className="px-5 py-2 bg-gray-50 dark:bg-gray-800/40 grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
              <span>Station / Type</span>
              <span className="text-right">Litres</span>
              <span className="text-right hidden sm:block">Price/L</span>
              <span className="text-right">Total</span>
              <span className="hidden sm:block text-right">Odometer</span>
              <span />
            </div>

            <AnimatePresence>
              {monthFillups.map((f) => {
                const dateStr = new Date(f.date).toLocaleDateString('en-NA', {
                  day: 'numeric', month: 'short', year: 'numeric',
                });
                return (
                  <motion.div
                    key={f.id}
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="px-5 py-3.5 grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-3 items-center border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
                  >
                    {/* Station + type + date */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: fuelColor(f.fuelType) }}
                        />
                        <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{f.stationName}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5 ml-4">
                        {fuelLabel(f.fuelType)} · {dateStr}
                        {f.notes && <> · <em>{f.notes}</em></>}
                      </p>
                    </div>

                    {/* Litres */}
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 text-right flex-shrink-0">
                      {f.litres.toFixed(2)} L
                    </span>

                    {/* Price/L */}
                    <span className="text-xs text-gray-500 text-right flex-shrink-0 hidden sm:block">
                      {CURRENCY}{f.pricePerLitre.toFixed(3)}
                    </span>

                    {/* Total */}
                    <span className="text-sm font-semibold text-amber-600 dark:text-amber-400 text-right flex-shrink-0">
                      {formatPrice(f.totalCost)}
                    </span>

                    {/* Odometer */}
                    <span className="text-xs text-gray-400 text-right flex-shrink-0 hidden sm:block">
                      {f.odometer !== undefined ? `${f.odometer.toLocaleString()} km` : '—'}
                    </span>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => openEdit(f)}
                        className="p-1 text-gray-300 hover:text-brand-500 transition-colors"
                        title="Edit"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(f.id, f.stationName)}
                        className="p-1 text-gray-300 hover:text-red-500 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {/* Month total footer */}
            <div className="px-5 py-3 bg-gray-50 dark:bg-gray-800/30 flex items-center justify-between">
              <span className="text-sm text-gray-500">
                {monthFillups.length} fill-up{monthFillups.length !== 1 ? 's' : ''} · {totalLitresMonth.toFixed(1)} L total
              </span>
              <span className="text-lg font-bold text-amber-600 dark:text-amber-400">
                {formatPrice(totalCostMonth)}
              </span>
            </div>
          </>
        )}
      </motion.div>

      {/* Add Fill-up Modal */}
      <Modal
        isOpen={addModal}
        onClose={() => setAddModal(false)}
        title="Log Fuel Fill-up"
        footer={
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setAddModal(false)}
              className="flex-1 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="add-fuel-form"
              className="flex-1 py-2.5 bg-amber-500 text-white rounded-xl text-sm font-medium hover:bg-amber-600 transition-colors"
            >
              Save Fill-up
            </button>
          </div>
        }
      >
        {formContent('add-fuel-form', handleAdd)}
      </Modal>

      {/* Edit Fill-up Modal */}
      <Modal
        isOpen={editModal}
        onClose={() => { setEditModal(false); setEditTarget(null); }}
        title="Edit Fill-up"
        footer={
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => { setEditModal(false); setEditTarget(null); }}
              className="flex-1 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="edit-fuel-form"
              className="flex-1 py-2.5 bg-amber-500 text-white rounded-xl text-sm font-medium hover:bg-amber-600 transition-colors"
            >
              Save Changes
            </button>
          </div>
        }
      >
        {formContent('edit-fuel-form', handleEdit)}
      </Modal>
    </motion.div>
  );
};

export default Fuel;
