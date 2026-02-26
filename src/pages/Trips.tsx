// ==========================================
// BasketBuddy - Shopping Trips Page
// ==========================================

import React, { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, ShoppingCart, Play, Check, Trash2, ChevronDown,
  ChevronUp, Package, Clock, CheckCircle2, DollarSign, Minus,
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import Modal from '../components/common/Modal';
import { cn, formatPrice, calcTripTotal, generateId } from '../utils/helpers';
import { CURRENCY } from '../config/constants';
import { ShoppingTrip, ShoppingTripItem } from '../types';

const Trips: React.FC = () => {
  const {
    trips, stores, items, categories, prices,
    addTrip, updateTrip, deleteTrip,
    addTripItem, updateTripItem, removeTripItem,
  } = useApp();

  const [tripModal, setTripModal] = useState(false);
  const [addItemModal, setAddItemModal] = useState(false);
  const [expandedTrip, setExpandedTrip] = useState<string | null>(null);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'planned' | 'in-progress' | 'completed'>('all');

  const [tripForm, setTripForm] = useState({
    name: '', storeId: '', budget: '', date: new Date().toISOString().split('T')[0],
  });

  const [itemForm, setItemForm] = useState({
    itemId: '', quantity: '1', estimatedPrice: '',
  });

  const filteredTrips = useMemo(() => {
    // Guard: old trips without createdAt fall back to date field
    const sorted = [...trips].sort((a, b) => (b.createdAt ?? b.date ?? 0) - (a.createdAt ?? a.date ?? 0));
    if (filter === 'all') return sorted;
    return sorted.filter((t) => t.status === filter);
  }, [trips, filter]);

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

  // Create trip
  const handleCreateTrip = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tripForm.name.trim() || !tripForm.storeId) return;
    addTrip({
      name: tripForm.name,
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

  // Add item to trip
  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTripId || !itemForm.itemId) return;
    const item = items.find((i) => i.id === itemForm.itemId);
    if (!item) return;

    const trip = trips.find((t) => t.id === selectedTripId);
    // Try to find an existing price at this store
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
    toast.success(`"${item.name}" added to trip`);
    setAddItemModal(false);
  };

  // Start trip
  const startTrip = (id: string) => {
    updateTrip(id, { status: 'in-progress' });
    toast('Trip started — happy shopping! 🛒', { icon: '▶️' });
  };

  // Complete trip
  const completeTrip = (id: string) => {
    const trip = trips.find((t) => t.id === id);
    if (!trip) return;
    const totalSpent = trip.items.reduce((sum, i) => {
      return sum + (i.actualPrice !== undefined ? i.actualPrice : i.estimatedPrice) * i.quantity;
    }, 0);
    updateTrip(id, { status: 'completed', totalSpent, completedAt: Date.now() });
    toast.success(`Trip complete! Spent N$${totalSpent.toFixed(2)}`, { duration: 4000 });
  };

  // Toggle item checked
  const toggleItem = (tripId: string, itemId: string, checked: boolean) => {
    updateTripItem(tripId, itemId, { checked });
  };

  // Update actual price
  const setActualPrice = (tripId: string, itemId: string, price: string) => {
    updateTripItem(tripId, itemId, { actualPrice: parseFloat(price) || 0 });
  };

  const statusCounts = {
    all: trips.length,
    planned: trips.filter((t) => t.status === 'planned').length,
    'in-progress': trips.filter((t) => t.status === 'in-progress').length,
    completed: trips.filter((t) => t.status === 'completed').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Shopping Trips</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">
            Plan, track, and complete your grocery runs
          </p>
        </div>
        <button
          onClick={() => {
            setTripForm({ name: '', storeId: stores[0]?.id || '', budget: '', date: new Date().toISOString().split('T')[0] });
            setTripModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-500 text-white rounded-xl text-sm font-medium hover:bg-brand-600 transition-colors shadow-lg shadow-brand-500/20"
        >
          <Plus size={16} /> New Trip
        </button>
      </div>

      {/* Status Tabs */}
      <div className="flex flex-wrap gap-2">
        {(['all', 'planned', 'in-progress', 'completed'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={cn(
              'px-4 py-2 rounded-xl text-sm font-medium transition-all',
              filter === status
                ? 'bg-brand-500 text-white shadow-md'
                : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-800 hover:border-brand-300'
            )}
          >
            {status === 'all' ? 'All' : status === 'in-progress' ? 'Shopping' : status.charAt(0).toUpperCase() + status.slice(1)}
            <span className="ml-1.5 text-xs opacity-60">({statusCounts[status]})</span>
          </button>
        ))}
      </div>

      {/* Trips List */}
      <div className="space-y-4">
        {filteredTrips.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-12 text-center">
            <ShoppingCart className="mx-auto text-gray-300 dark:text-gray-700 mb-3" size={48} />
            <p className="text-gray-500 font-medium mb-1">No trips yet</p>
            <p className="text-gray-400 text-sm">Plan your next grocery run</p>
          </div>
        ) : (
          filteredTrips.map((trip) => {
            const store = stores.find((s) => s.id === trip.storeId);
            const isExpanded = expandedTrip === trip.id;
            const estimated = calcTripTotal(trip.items, false);
            const actual = calcTripTotal(trip.items, true);
            const budgetPct = trip.budget > 0 ? Math.round((estimated / trip.budget) * 100) : 0;
            const checkedCount = trip.items.filter((i) => i.checked).length;

            return (
              <motion.div
                key={trip.id}
                layout
                className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm"
              >
                {/* Trip Header */}
                <div
                  className="p-4 flex items-center gap-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  onClick={() => setExpandedTrip(isExpanded ? null : trip.id)}
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                    style={{ backgroundColor: `${store?.color}15`, color: store?.color }}
                  >
                    {store?.icon || '🛒'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-800 dark:text-gray-200">{trip.name}</h3>
                      <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full',
                        trip.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                        trip.status === 'in-progress' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                        'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                      )}>
                        {trip.status === 'completed' ? '✓ Done' : trip.status === 'in-progress' ? '🛒 Shopping' : '📋 Planned'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {store?.name} · {trip.items.length} item{trip.items.length !== 1 ? 's' : ''} ·{' '}
                      {trip.status === 'completed' && trip.completedAt
                        ? `Completed ${formatTripDate(trip.completedAt)}`
                        : formatTripDate(trip.date)}
                    </p>
                    {/* Budget bar */}
                    {trip.budget > 0 && (
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full">
                          <div
                            className={cn('h-full rounded-full transition-all',
                              budgetPct > 100 ? 'bg-red-500' : budgetPct > 80 ? 'bg-amber-500' : 'bg-green-500'
                            )}
                            style={{ width: `${Math.min(budgetPct, 100)}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-gray-400 flex-shrink-0">{budgetPct}%</span>
                      </div>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-lg font-bold text-gray-800 dark:text-gray-200">
                      {formatPrice(trip.status === 'completed' ? trip.totalSpent : estimated)}
                    </p>
                    {trip.budget > 0 && (
                      <p className="text-xs text-gray-400">of {formatPrice(trip.budget)}</p>
                    )}
                  </div>
                  {isExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                </div>

                {/* Expanded Content */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-gray-100 dark:border-gray-800">
                        {/* Action Buttons */}
                        <div className="px-4 py-3 flex flex-wrap gap-2 bg-gray-50 dark:bg-gray-800/30">
                          {trip.status === 'planned' && (
                            <>
                              <button
                                onClick={() => {
                                  setSelectedTripId(trip.id);
                                  setItemForm({ itemId: '', quantity: '1', estimatedPrice: '' });
                                  setAddItemModal(true);
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-500 text-white rounded-lg text-xs font-medium hover:bg-brand-600 transition-colors"
                              >
                                <Plus size={12} /> Add Item
                              </button>
                              <button
                                onClick={() => startTrip(trip.id)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500 text-white rounded-lg text-xs font-medium hover:bg-green-600 transition-colors"
                              >
                                <Play size={12} /> Start Shopping
                              </button>
                            </>
                          )}
                          {trip.status === 'in-progress' && (
                            <>
                              <button
                                onClick={() => {
                                  setSelectedTripId(trip.id);
                                  setItemForm({ itemId: '', quantity: '1', estimatedPrice: '' });
                                  setAddItemModal(true);
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-500 text-white rounded-lg text-xs font-medium hover:bg-brand-600 transition-colors"
                              >
                                <Plus size={12} /> Add Item
                              </button>
                              <button
                                onClick={() => completeTrip(trip.id)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500 text-white rounded-lg text-xs font-medium hover:bg-green-600 transition-colors"
                              >
                                <CheckCircle2 size={12} /> Complete Trip
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => { if (confirm('Delete this trip?')) { deleteTrip(trip.id); toast.success('Trip deleted'); } }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-xs font-medium hover:bg-red-200 dark:hover:bg-red-900/30 transition-colors"
                          >
                            <Trash2 size={12} /> Delete
                          </button>
                          {trip.items.length > 0 && (
                            <span className="ml-auto text-xs text-gray-400 self-center">
                              {checkedCount}/{trip.items.length} checked
                            </span>
                          )}
                        </div>

                        {/* Items */}
                        <div className="divide-y divide-gray-100 dark:divide-gray-800">
                          {trip.items.length === 0 ? (
                            <div className="p-8 text-center text-gray-400 text-sm">
                              No items added yet. Click "Add Item" to build your list.
                            </div>
                          ) : (
                            trip.items.map((ti) => {
                              const cat = categories.find((c) => c.id === ti.categoryId);
                              return (
                                <div
                                  key={ti.id}
                                  className={cn(
                                    'px-4 py-3 flex items-center gap-3 transition-colors',
                                    ti.checked && 'bg-green-50/50 dark:bg-green-900/5'
                                  )}
                                >
                                  {/* Checkbox */}
                                  {trip.status !== 'completed' ? (
                                    <button
                                      onClick={() => toggleItem(trip.id, ti.id, !ti.checked)}
                                      className={cn(
                                        'w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all flex-shrink-0',
                                        ti.checked
                                          ? 'bg-green-500 border-green-500 text-white'
                                          : 'border-gray-300 dark:border-gray-600 hover:border-green-400'
                                      )}
                                    >
                                      {ti.checked && <Check size={14} />}
                                    </button>
                                  ) : (
                                    <div className="w-6 h-6 bg-green-500 rounded-lg flex items-center justify-center flex-shrink-0">
                                      <Check size={14} className="text-white" />
                                    </div>
                                  )}

                                  {/* Item info */}
                                  <div className="flex-1 min-w-0">
                                    <p className={cn(
                                      'text-sm font-medium',
                                      ti.checked ? 'text-gray-400 line-through' : 'text-gray-800 dark:text-gray-200'
                                    )}>
                                      {cat?.icon} {ti.itemName}
                                    </p>
                                    <p className="text-xs text-gray-400">
                                      {ti.quantity} × {ti.unit} · Est: {formatPrice(ti.estimatedPrice)}
                                    </p>
                                  </div>

                                  {/* Actual price input (when shopping) */}
                                  {trip.status === 'in-progress' && (
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                      <span className="text-xs text-gray-400">{CURRENCY}</span>
                                      <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        placeholder={ti.estimatedPrice.toFixed(2)}
                                        value={ti.actualPrice !== undefined ? ti.actualPrice : ''}
                                        onChange={(e) => setActualPrice(trip.id, ti.id, e.target.value)}
                                        className="w-20 px-2 py-1 text-right text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:border-brand-500"
                                      />
                                    </div>
                                  )}

                                  {/* Subtotal */}
                                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex-shrink-0 w-20 text-right">
                                    {formatPrice((ti.actualPrice !== undefined ? ti.actualPrice : ti.estimatedPrice) * ti.quantity)}
                                  </span>

                                  {/* Remove */}
                                  {trip.status !== 'completed' && (
                                    <button
                                      onClick={() => removeTripItem(trip.id, ti.id)}
                                      className="p-1 text-gray-300 hover:text-red-500 transition-colors flex-shrink-0"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>

                        {/* Trip Summary */}
                        {trip.items.length > 0 && (
                          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/30 flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total</span>
                            <span className="text-lg font-bold text-gray-800 dark:text-gray-200">
                              {formatPrice(trip.status === 'completed' ? trip.totalSpent : calcTripTotal(trip.items, trip.status === 'in-progress'))}
                            </span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Create Trip Modal */}
      <Modal isOpen={tripModal} onClose={() => setTripModal(false)} title="New Shopping Trip"
        footer={
          <div className="flex gap-3">
            <button type="button" form="trip-form" onClick={() => setTripModal(false)} className="flex-1 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Cancel</button>
            <button type="submit" form="trip-form" className="flex-1 py-2.5 bg-brand-500 text-white rounded-xl text-sm font-medium hover:bg-brand-600 transition-colors">Create Trip</button>
          </div>
        }
      >
        <form id="trip-form" onSubmit={handleCreateTrip} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Trip Name *</label>
            <input
              type="text"
              value={tripForm.name}
              onChange={(e) => setTripForm({ ...tripForm, name: e.target.value })}
              placeholder="e.g., Weekly groceries"
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-800 dark:text-gray-200 outline-none focus:border-brand-500 transition-colors"
              required
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Store *</label>
              <select
                value={tripForm.storeId}
                onChange={(e) => setTripForm({ ...tripForm, storeId: e.target.value })}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-800 dark:text-gray-200 outline-none focus:border-brand-500"
                required
              >
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>{s.icon} {s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Date</label>
              <input
                type="date"
                value={tripForm.date}
                onChange={(e) => setTripForm({ ...tripForm, date: e.target.value })}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-800 dark:text-gray-200 outline-none focus:border-brand-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Budget ({CURRENCY})</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={tripForm.budget}
              onChange={(e) => setTripForm({ ...tripForm, budget: e.target.value })}
              placeholder="Optional - set a spending limit"
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-800 dark:text-gray-200 outline-none focus:border-brand-500 transition-colors"
            />
          </div>
        </form>
      </Modal>

      {/* Add Item to Trip Modal */}
      <Modal isOpen={addItemModal} onClose={() => setAddItemModal(false)} title="Add Item to Trip"
        footer={
          <div className="flex gap-3">
            <button type="button" form="add-item-form" onClick={() => setAddItemModal(false)} className="flex-1 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Cancel</button>
            <button type="submit" form="add-item-form" className="flex-1 py-2.5 bg-brand-500 text-white rounded-xl text-sm font-medium hover:bg-brand-600 transition-colors">Add to Trip</button>
          </div>
        }
      >
        <form id="add-item-form" onSubmit={handleAddItem} className="space-y-4">
          {(() => {
            const tripStoreId = trips.find((t) => t.id === selectedTripId)?.storeId || '';
            const itemsAtStore = items.filter((item) =>
              prices.some((p) => p.itemId === item.id && p.storeId === tripStoreId)
            );
            const storeName = stores.find((s) => s.id === tripStoreId)?.name || 'this store';
            return (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Select Item *</label>
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
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-800 dark:text-gray-200 outline-none focus:border-brand-500"
                    required
                  >
                    <option value="">
                      {itemsAtStore.length === 0 ? `No items registered at ${storeName}` : 'Choose an item...'}
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
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1.5">
                      No items have prices registered for {storeName}. Go to Items → add prices for this store first.
                    </p>
                  )}
                </div>
              </>
            );
          })()}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Quantity</label>
              <input
                type="number"
                min="1"
                value={itemForm.quantity}
                onChange={(e) => setItemForm({ ...itemForm, quantity: e.target.value })}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-800 dark:text-gray-200 outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Est. Price ({CURRENCY})</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={itemForm.estimatedPrice}
                onChange={(e) => setItemForm({ ...itemForm, estimatedPrice: e.target.value })}
                placeholder="Auto from prices"
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-800 dark:text-gray-200 outline-none focus:border-brand-500"
              />
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Trips;
