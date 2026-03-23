// ==========================================
// BasketBuddy - Shopping Lists Page
// Monthly bulk purchase planning (distinct from shopping trips)
// ==========================================

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ListChecks, Plus, Trash2, Edit2, Check, ChevronLeft, ChevronRight, ChevronDown,
  X, Search, ShoppingBag, Package, CheckSquare, ClipboardList, TrendingUp, TrendingDown, Minus, Bookmark, BookmarkCheck,
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { formatPrice, cn } from '../utils/helpers';
import { UNITS, CURRENCY } from '../config/constants';
import type { ShoppingListItem } from '../types';
import Modal from '../components/common/Modal';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const card = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

type ItemFormState = {
  itemName: string;
  itemId: string;
  categoryId: string;
  quantity: number;
  unit: string;
  estimatedPrice: number;
  notes: string;
};

const DEFAULT_ITEM_FORM: ItemFormState = {
  itemName: '',
  itemId: '',
  categoryId: '',
  quantity: 1,
  unit: 'each',
  estimatedPrice: 0,
  notes: '',
};

const inputCls =
  'w-full bg-gray-800/60 border border-green-500/20 rounded-xl px-3 py-2.5 text-gray-100 placeholder-gray-500 focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm outline-none transition-all';
const labelCls = 'block text-xs font-medium text-gray-400 mb-1.5';

// ──────────────────────────────────────────────────────────────
const ShoppingLists: React.FC = () => {
  const {
    shoppingLists, items, categories, budgets,
    addShoppingList, updateShoppingList, deleteShoppingList,
    addShoppingListItem, updateShoppingListItem, removeShoppingListItem,
  } = useApp();

  const now = new Date();
  const [viewMonth, setViewMonth] = useState(now.getMonth() + 1);
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [activeListId, setActiveListId] = useState<string | null>(null);

  // Modals
  const [createOpen, setCreateOpen] = useState(false);
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [editingListId, setEditingListId] = useState<string | null>(null); // rename inline
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  // Forms
  const [createName, setCreateName] = useState('');
  const [renameName, setRenameName] = useState('');
  const [itemForm, setItemForm] = useState<ItemFormState>(DEFAULT_ITEM_FORM);
  const [itemSearch, setItemSearch] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const [collapsedCats, setCollapsedCats] = useState<Set<string>>(new Set());

  // ── Quick Budget panel — persisted to localStorage ─────────
  const lsKey = (listId: string | null) => listId ? `bb_qpins_${listId}` : null;

  const [quickPinnedIds, setQuickPinnedIdsRaw] = useState<Set<string>>(() => {
    // Will be populated once activeListId is known (see useEffect below)
    return new Set();
  });
  const [quickPanelOpen, setQuickPanelOpen] = useState<boolean>(() => {
    try { return localStorage.getItem('bb_qpanel_open') !== 'false'; } catch { return true; }
  });

  // Persist panel open/close state
  const setQuickPanelOpenPersist = (open: boolean | ((prev: boolean) => boolean)) => {
    setQuickPanelOpen((prev) => {
      const next = typeof open === 'function' ? open(prev) : open;
      try { localStorage.setItem('bb_qpanel_open', String(next)); } catch { /* ignore */ }
      return next;
    });
  };

  // Setter that also writes to localStorage
  const setQuickPinnedIds = (updater: Set<string> | ((prev: Set<string>) => Set<string>)) => {
    setQuickPinnedIdsRaw((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      const key = lsKey(activeListId);
      if (key) {
        try { localStorage.setItem(key, JSON.stringify([...next])); } catch { /* ignore */ }
      }
      return next;
    });
  };

  // ── Month navigation ──────────────────────────────────────
  const isCurrentPeriod = viewMonth === now.getMonth() + 1 && viewYear === now.getFullYear();
  const prevMonth = () => {
    if (viewMonth === 1) { setViewMonth(12); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (isCurrentPeriod) return;
    if (viewMonth === 12) { setViewMonth(1); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  };

  // ── Derived data ──────────────────────────────────────────
  const monthLists = useMemo(
    () => shoppingLists.filter((l) => l.month === viewMonth && l.year === viewYear),
    [shoppingLists, viewMonth, viewYear],
  );

  const activeList = useMemo(
    () => monthLists.find((l) => l.id === activeListId) ?? monthLists[0] ?? null,
    [monthLists, activeListId],
  );

  // Auto-select first list when month changes
  useEffect(() => {
    setActiveListId(monthLists[0]?.id ?? null);
  }, [viewMonth, viewYear]); // eslint-disable-line react-hooks/exhaustive-deps

  // Summary stats across all lists this month
  const totalEstimated = useMemo(
    () => monthLists.reduce((s, l) => s + l.items.reduce((is, i) => is + i.quantity * i.estimatedPrice, 0), 0),
    [monthLists],
  );
  const totalItemCount = monthLists.reduce((s, l) => s + l.items.length, 0);
  const checkedCount = monthLists.reduce((s, l) => s + l.items.filter((i) => i.checked).length, 0);

  // Budget for the viewed month
  const activeBudget = useMemo(
    () => budgets.find((b) => b.month === viewMonth && b.year === viewYear) ?? null,
    [budgets, viewMonth, viewYear],
  );

  // Active list computed
  const activeTotal = activeList?.items.reduce((s, i) => s + i.quantity * i.estimatedPrice, 0) ?? 0;
  const activePct = activeList && activeList.items.length > 0
    ? Math.round((activeList.items.filter((i) => i.checked).length / activeList.items.length) * 100)
    : 0;

  // Autocomplete search
  const searchResults = useMemo(() => {
    if (!itemSearch.trim()) return [];
    const q = itemSearch.toLowerCase();
    return items.filter((i) => i.name.toLowerCase().includes(q)).slice(0, 6);
  }, [items, itemSearch]);

  // Group items by category for active list
  const groupedItems = useMemo(() => {
    if (!activeList) return [];
    const map = new Map<string, ShoppingListItem[]>();
    for (const item of activeList.items) {
      const key = item.categoryId ?? '__none__';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    return Array.from(map.entries()).map(([catId, catItems]) => {
      const cat = categories.find((c) => c.id === catId);
      const catTotal = catItems.reduce((s, i) => s + i.quantity * i.estimatedPrice, 0);
      const budgetEntry = activeBudget?.categoryBudgets.find((cb) => cb.categoryId === catId);
      return {
        catId,
        catName: cat?.name ?? 'Uncategorized',
        catIcon: cat?.icon ?? '📦',
        catColor: cat?.color ?? '#6b7280',
        items: catItems,
        catTotal,
        budgetedAmount: budgetEntry?.amount ?? 0,
        hasBudget: !!budgetEntry,
      };
    });
  }, [activeList, categories, activeBudget]);

  // Items pinned to the Quick Budget panel
  const quickPinnedItems = useMemo(
    () => (activeList?.items ?? []).filter((i) => quickPinnedIds.has(i.id)),
    [activeList, quickPinnedIds],
  );
  const quickTotal = quickPinnedItems.reduce((s, i) => s + i.quantity * i.estimatedPrice, 0);

  // Load pinned IDs from localStorage when active list changes
  useEffect(() => {
    const key = lsKey(activeListId);
    if (!key) { setQuickPinnedIdsRaw(new Set()); return; }
    try {
      const stored = localStorage.getItem(key);
      setQuickPinnedIdsRaw(stored ? new Set(JSON.parse(stored) as string[]) : new Set());
    } catch {
      setQuickPinnedIdsRaw(new Set());
    }
  }, [activeListId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handlers ──────────────────────────────────────────────
  const handleCreateList = () => {
    if (!createName.trim()) return;
    const newId = addShoppingList({
      name: createName.trim(),
      month: viewMonth,
      year: viewYear,
      items: [],
    });
    setActiveListId(newId);
    setCreateOpen(false);
    setCreateName('');
  };

  const handleRenameList = () => {
    if (!editingListId || !renameName.trim()) return;
    updateShoppingList(editingListId, { name: renameName.trim() });
    setEditingListId(null);
    setRenameName('');
  };

  const handleDeleteList = (listId: string) => {
    if (!window.confirm('Delete this shopping list? This cannot be undone.')) return;
    deleteShoppingList(listId);
    if (activeList?.id === listId) {
      const remaining = monthLists.filter((l) => l.id !== listId);
      setActiveListId(remaining[0]?.id ?? null);
    }
  };

  const handleAddOrUpdateItem = () => {
    if (!activeList || !itemForm.itemName.trim()) return;
    const payload: Omit<ShoppingListItem, 'id'> = {
      itemName: itemForm.itemName.trim(),
      itemId: itemForm.itemId || undefined,
      categoryId: itemForm.categoryId || undefined,
      quantity: itemForm.quantity,
      unit: itemForm.unit,
      estimatedPrice: itemForm.estimatedPrice,
      notes: itemForm.notes || undefined,
      checked: false,
    };
    if (editingItemId) {
      updateShoppingListItem(activeList.id, editingItemId, {
        itemName: payload.itemName,
        itemId: payload.itemId,
        categoryId: payload.categoryId,
        quantity: payload.quantity,
        unit: payload.unit,
        estimatedPrice: payload.estimatedPrice,
        notes: payload.notes,
      });
    } else {
      addShoppingListItem(activeList.id, payload);
    }
    closeItemModal();
  };

  const closeItemModal = () => {
    setAddItemOpen(false);
    setEditingItemId(null);
    setItemForm(DEFAULT_ITEM_FORM);
    setItemSearch('');
    setShowSuggestions(false);
  };

  const handleEditItem = (item: ShoppingListItem) => {
    setEditingItemId(item.id);
    setItemForm({
      itemName: item.itemName,
      itemId: item.itemId ?? '',
      categoryId: item.categoryId ?? '',
      quantity: item.quantity,
      unit: item.unit,
      estimatedPrice: item.estimatedPrice,
      notes: item.notes ?? '',
    });
    setItemSearch(item.itemName);
    setAddItemOpen(true);
  };

  const handleSelectLibraryItem = (si: typeof items[0]) => {
    const cat = categories.find((c) => c.id === si.categoryId);
    setItemForm((f) => ({
      ...f,
      itemName: si.name,
      itemId: si.id,
      categoryId: si.categoryId,
      unit: si.unit,
    }));
    setItemSearch(si.name);
    setShowSuggestions(false);
  };

  const openAddItem = () => {
    setEditingItemId(null);
    setItemForm(DEFAULT_ITEM_FORM);
    setItemSearch('');
    setAddItemOpen(true);
  };

  const toggleCat = (catId: string) => {
    setCollapsedCats((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  };

  const toggleQuickPin = (itemId: string) => {
    setQuickPinnedIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  // ── Render ────────────────────────────────────────────────
  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-5 max-w-5xl mx-auto">

      {/* ── Header ── */}
      <motion.div variants={card} className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <div className="p-2 bg-green-500/10 rounded-xl">
              <ListChecks size={20} className="text-green-400" />
            </div>
            Shopping Lists
          </h1>
          <p className="text-gray-500 text-sm mt-1 ml-12">Plan your monthly bulk purchases</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Month navigator */}
          <div className="flex items-center gap-1 bg-gray-900/70 backdrop-blur-xl border border-green-500/20 rounded-xl px-1 py-1">
            <button
              onClick={prevMonth}
              aria-label="Previous month"
              className="p-2 rounded-lg hover:bg-white/8 transition-colors text-gray-400 hover:text-gray-200 cursor-pointer"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-semibold text-gray-200 min-w-[130px] text-center">
              {MONTH_NAMES[viewMonth - 1]} {viewYear}
            </span>
            <button
              onClick={nextMonth}
              disabled={isCurrentPeriod}
              aria-label="Next month"
              className="p-2 rounded-lg hover:bg-white/8 transition-colors text-gray-400 hover:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronRight size={16} />
            </button>
          </div>
          <button
            onClick={() => { setCreateName(''); setCreateOpen(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-medium transition-colors cursor-pointer"
          >
            <Plus size={16} /> New List
          </button>
        </div>
      </motion.div>

      {/* ── Summary stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: ClipboardList, label: 'Lists',           value: monthLists.length.toString(),                color: 'violet' as const },
          { icon: ShoppingBag,   label: 'Total Estimated', value: formatPrice(totalEstimated),                 color: 'emerald' as const },
          { icon: Package,       label: 'Items',           value: totalItemCount.toString(),                   color: 'blue' as const },
          { icon: CheckSquare,   label: 'Checked',         value: `${checkedCount} / ${totalItemCount}`,      color: 'amber' as const },
        ].map(({ icon: Icon, label, value, color }) => (
          <motion.div
            key={label}
            variants={card}
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

      {/* ── Main content ── */}
      {monthLists.length === 0 ? (
        /* Empty state */
        <motion.div
          variants={card}
          className="bg-gray-900/70 backdrop-blur-xl rounded-2xl border border-green-500/20 p-14 text-center"
        >
          <div className="w-16 h-16 bg-green-500/10 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <ListChecks size={32} className="text-green-400" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">
            No lists for {MONTH_NAMES[viewMonth - 1]} {viewYear}
          </h3>
          <p className="text-gray-500 text-sm mb-6 max-w-sm mx-auto">
            Create a shopping list to plan your bulk purchases — things like rice, cooking oil, cleaning
            supplies and other monthly staples.
          </p>
          <button
            onClick={() => { setCreateName(''); setCreateOpen(true); }}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition-colors cursor-pointer"
          >
            <Plus size={16} /> Create First List
          </button>
        </motion.div>
      ) : (
        <div className="space-y-4">

          {/* ── List tabs ── */}
          <motion.div variants={card} className="flex items-center gap-2 overflow-x-auto pb-1">
            {monthLists.map((list) => (
              <button
                key={list.id}
                onClick={() => setActiveListId(list.id)}
                className={cn(
                  'flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer whitespace-nowrap',
                  activeList?.id === list.id
                    ? 'bg-green-600 text-white shadow-lg shadow-green-500/20'
                    : 'bg-gray-800/60 text-gray-400 hover:text-gray-200 hover:bg-gray-700/60 border border-green-500/20',
                )}
              >
                {list.name}
                <span className="ml-2 text-xs opacity-60">{list.items.length}</span>
              </button>
            ))}
          </motion.div>

          {/* ── Two-column layout: Quick Pick + Active List ── */}
          <div className="grid gap-4 lg:grid-cols-[300px_1fr]">

            {/* ── Quick Budget Panel ── */}
            <motion.div variants={card} className="bg-gray-900/70 backdrop-blur-xl rounded-2xl border border-green-500/20 overflow-hidden h-fit lg:sticky lg:top-4">
              {/* Panel header */}
              <div className="px-4 py-3 border-b border-green-500/20 flex items-center justify-between relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-green-500/50 to-transparent" />
                <div className="flex items-center gap-2">
                  <BookmarkCheck size={15} className="text-green-400" />
                  <span className="text-sm font-semibold text-gray-200">Quick Budget</span>
                  {quickPinnedIds.size > 0 && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 bg-green-500/20 text-green-300 rounded-full border border-green-500/25">
                      {quickPinnedIds.size}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {quickPinnedIds.size > 0 && (
                    <button
                      onClick={() => setQuickPinnedIds(new Set())}
                      className="p-1 text-gray-600 hover:text-rose-400 transition-colors rounded-lg hover:bg-rose-500/10 cursor-pointer"
                      aria-label="Clear all pinned items"
                    >
                      <X size={13} />
                    </button>
                  )}
                  <button
                    onClick={() => setQuickPanelOpenPersist((o) => !o)}
                    className="p-1 text-gray-500 hover:text-gray-300 transition-colors rounded-lg hover:bg-white/5 cursor-pointer"
                    aria-label={quickPanelOpen ? 'Collapse panel' : 'Expand panel'}
                  >
                    <ChevronDown
                      size={14}
                      className="transition-transform duration-200"
                      style={{ transform: quickPanelOpen ? 'rotate(0deg)' : 'rotate(-90deg)' }}
                    />
                  </button>
                </div>
              </div>

              <AnimatePresence initial={false}>
                {quickPanelOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    style={{ overflow: 'hidden' }}
                  >
                    {/* Empty state */}
                    {quickPinnedItems.length === 0 ? (
                      <div className="px-4 py-10 text-center">
                        <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center mx-auto mb-3">
                          <Bookmark size={18} className="text-green-500/50" />
                        </div>
                        <p className="text-xs font-medium text-gray-500 mb-1">No items pinned yet</p>
                        <p className="text-[11px] text-gray-700 leading-relaxed">
                          Click the <Bookmark size={10} className="inline text-green-500/60 mx-0.5" /> on any item in your list to pin it here for a focused budget view.
                        </p>
                      </div>
                    ) : (
                      <div>
                        {/* Pinned item rows */}
                        <div className="max-h-[50vh] overflow-y-auto divide-y divide-green-500/8">
                          {quickPinnedItems.map((item) => {
                            const cat = categories.find((c) => c.id === item.categoryId);
                            const lineTotal = item.quantity * item.estimatedPrice;
                            return (
                              <div
                                key={item.id}
                                className="px-3 py-2.5 flex items-center gap-2.5 group hover:bg-gray-800/30 transition-colors"
                              >
                                <span className="text-sm flex-shrink-0">{cat?.icon ?? '📦'}</span>
                                <div className="flex-1 min-w-0">
                                  <p className={cn(
                                    'text-xs font-medium leading-tight truncate',
                                    item.checked ? 'line-through text-gray-600' : 'text-gray-200',
                                  )}>
                                    {item.itemName}
                                  </p>
                                  <p className="text-[10px] text-gray-600 leading-tight">
                                    {item.quantity} {item.unit} × {formatPrice(item.estimatedPrice)}
                                  </p>
                                </div>
                                <span className={cn(
                                  'flex-shrink-0 text-xs font-bold font-mono tabular-nums',
                                  item.checked ? 'text-gray-600' : 'text-emerald-400',
                                )}>
                                  {formatPrice(lineTotal)}
                                </span>
                                <button
                                  onClick={() => toggleQuickPin(item.id)}
                                  aria-label="Remove from quick budget"
                                  className="flex-shrink-0 p-1 text-green-500 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                                >
                                  <X size={11} />
                                </button>
                              </div>
                            );
                          })}
                        </div>

                        {/* Running total */}
                        <div className="px-4 py-3 border-t border-green-500/15 bg-gray-800/20">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-[10px] text-gray-600 uppercase tracking-wider font-semibold">Pinned Total</p>
                              <p className="text-[10px] text-gray-700 mt-0.5">
                                {quickPinnedItems.filter((i) => i.checked).length} of {quickPinnedItems.length} checked
                              </p>
                            </div>
                            <span className="text-lg font-bold text-emerald-400 font-mono tabular-nums">
                              {formatPrice(quickTotal)}
                            </span>
                          </div>
                          {/* Mini progress bar */}
                          {quickPinnedItems.length > 0 && (() => {
                            const pct = Math.round((quickPinnedItems.filter((i) => i.checked).length / quickPinnedItems.length) * 100);
                            return (
                              <div className="mt-2 h-1 bg-gray-800 rounded-full overflow-hidden">
                                <motion.div
                                  animate={{ width: `${pct}%` }}
                                  transition={{ duration: 0.4 }}
                                  className="h-full bg-gradient-to-r from-green-600 to-emerald-500 rounded-full"
                                />
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

          {/* ── Active list panel ── */}
          {activeList && (
            <motion.div
              key={activeList.id}
              variants={card}
              className="bg-gray-900/70 backdrop-blur-xl rounded-2xl border border-green-500/20 overflow-hidden"
            >
              {/* List header */}
              <div className="px-5 py-4 border-b border-green-500/20">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {/* Inline rename */}
                    {editingListId === activeList.id ? (
                      <div className="flex items-center gap-2 mb-1">
                        <input
                          value={renameName}
                          onChange={(e) => setRenameName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRenameList();
                            if (e.key === 'Escape') setEditingListId(null);
                          }}
                          className="flex-1 min-w-0 bg-gray-800/60 border border-green-500/20 rounded-lg px-3 py-1.5 text-white text-base font-semibold outline-none focus:ring-2 focus:ring-green-500"
                          autoFocus
                        />
                        <button
                          onClick={handleRenameList}
                          className="p-1.5 bg-green-600 rounded-lg text-white hover:bg-green-700 transition-colors cursor-pointer"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          onClick={() => setEditingListId(null)}
                          className="p-1.5 bg-gray-700 rounded-lg text-gray-300 hover:bg-gray-600 transition-colors cursor-pointer"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <h2 className="text-lg font-bold text-white truncate">{activeList.name}</h2>
                    )}
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-sm text-gray-400">
                        {activeList.items.filter((i) => i.checked).length} / {activeList.items.length} items checked
                      </span>
                      {activeList.items.length > 0 && (
                        <span className="text-sm font-semibold text-emerald-400 font-mono tabular-nums">
                          {formatPrice(activeTotal)} estimated
                        </span>
                      )}
                    </div>
                  </div>

                  {/* List actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => { setRenameName(activeList.name); setEditingListId(activeList.id); }}
                      aria-label="Rename list"
                      className="p-2 bg-gray-800/60 hover:bg-green-500/10 text-gray-400 hover:text-green-400 rounded-xl transition-colors cursor-pointer border border-green-500/20"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => handleDeleteList(activeList.id)}
                      aria-label="Delete list"
                      className="p-2 bg-gray-800/60 hover:bg-rose-500/10 text-gray-400 hover:text-rose-400 rounded-xl transition-colors cursor-pointer border border-green-500/20"
                    >
                      <Trash2 size={14} />
                    </button>
                    <button
                      onClick={openAddItem}
                      className="flex items-center gap-1.5 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-medium transition-colors cursor-pointer"
                    >
                      <Plus size={14} /> Add Item
                    </button>
                  </div>
                </div>

                {/* Progress bar */}
                {activeList.items.length > 0 && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                      <span>{activePct}% complete</span>
                      <span>{activeList.items.filter((i) => i.checked).length} bought</span>
                    </div>
                    <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${activePct}%` }}
                        transition={{ duration: 0.7, ease: 'easeOut' }}
                        className="h-full bg-gradient-to-r from-green-600 to-green-400 rounded-full"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Items */}
              {activeList.items.length === 0 ? (
                <div className="py-12 px-6 text-center">
                  <Package size={32} className="text-gray-700 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm mb-4">No items yet. Add your first bulk item.</p>
                  <button
                    onClick={openAddItem}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-medium transition-colors cursor-pointer"
                  >
                    <Plus size={14} /> Add First Item
                  </button>
                </div>
              ) : (
                <div>
                  {groupedItems.map(({ catId, catName, catIcon, catColor, items: catItems, catTotal, budgetedAmount, hasBudget }) => (
                    <div key={catId} className="border-b border-green-500/10 last:border-0">
                      {/* Category header */}
                      <button
                        type="button"
                        onClick={() => toggleCat(catId)}
                        className="w-full px-5 py-2.5 flex items-center gap-2.5 cursor-pointer hover:bg-white/[0.02] transition-colors text-left"
                        style={{ backgroundColor: `${catColor}08` }}
                      >
                        <ChevronDown
                          size={13}
                          className="flex-shrink-0 text-gray-500 transition-transform duration-200"
                          style={{ transform: collapsedCats.has(catId) ? 'rotate(-90deg)' : 'rotate(0deg)' }}
                        />
                        <span
                          className="w-1 h-4 rounded-full flex-shrink-0"
                          style={{ backgroundColor: catColor }}
                        />
                        <span className="text-sm">{catIcon}</span>
                        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                          {catName}
                        </span>

                        {/* Category totals + budget */}
                        <div className="ml-auto flex items-center gap-3">
                          {/* Listed total */}
                          <span className="text-sm font-bold text-white font-mono tabular-nums">
                            {formatPrice(catTotal)}
                          </span>

                          {/* Budget comparison pill */}
                          {hasBudget && budgetedAmount > 0 && (() => {
                            const diff = budgetedAmount - catTotal;
                            const pct = Math.min((catTotal / budgetedAmount) * 100, 100);
                            const over = diff < 0;
                            const exact = diff === 0;
                            return (
                              <div className={cn(
                                'flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold',
                                over
                                  ? 'bg-rose-500/15 text-rose-400 border border-rose-500/20'
                                  : exact
                                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                                  : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20',
                              )}>
                                {over
                                  ? <TrendingUp size={10} />
                                  : exact
                                  ? <Minus size={10} />
                                  : <TrendingDown size={10} />}
                                <span>
                                  {over ? '+' : ''}{formatPrice(Math.abs(diff))}
                                  {' '}/{' '}{formatPrice(budgetedAmount)}
                                </span>
                              </div>
                            );
                          })()}

                          {/* Item count */}
                          <span className="text-[10px] text-gray-600 font-mono">
                            {catItems.filter((i) => i.checked).length}/{catItems.length}
                          </span>
                        </div>
                      </button>

                      {/* Item rows */}
                      <AnimatePresence initial={false}>
                        {!collapsedCats.has(catId) && (
                          <motion.div
                            key="items"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2, ease: 'easeInOut' }}
                            style={{ overflow: 'hidden' }}
                          >
                      {catItems.map((item) => {
                        const lineTotal = item.quantity * item.estimatedPrice;
                        return (
                          <div
                            key={item.id}
                            className={cn(
                              'px-5 py-3 flex items-center gap-3 hover:bg-gray-800/20 transition-colors group',
                              item.checked && 'opacity-55',
                            )}
                          >
                            {/* Custom checkbox */}
                            <button
                              onClick={() =>
                                updateShoppingListItem(activeList.id, item.id, { checked: !item.checked })
                              }
                              aria-label={item.checked ? 'Uncheck item' : 'Check item'}
                              className="flex-shrink-0 w-5 h-5 rounded-md border-2 transition-all cursor-pointer flex items-center justify-center"
                              style={{
                                borderColor: item.checked ? '#4ade80' : '#4b5563',
                                backgroundColor: item.checked ? '#4ade80' : 'transparent',
                              }}
                            >
                              {item.checked && <Check size={11} className="text-white" />}
                            </button>

                            {/* Item name */}
                            <span
                              className={cn(
                                'flex-1 min-w-0 text-sm font-medium truncate',
                                item.checked ? 'line-through text-gray-500' : 'text-gray-200',
                              )}
                            >
                              {item.itemName}
                              {item.notes && (
                                <span className="ml-2 text-xs text-gray-600 normal-case not-italic hidden sm:inline">
                                  ({item.notes})
                                </span>
                              )}
                            </span>

                            {/* Quantity badge */}
                            <span className="flex-shrink-0 text-xs font-semibold px-2 py-0.5 bg-gray-700/60 rounded-md text-gray-300 font-mono">
                              {item.quantity} {item.unit}
                            </span>

                            {/* Per-unit price */}
                            <span className="flex-shrink-0 text-xs text-gray-500 font-mono hidden md:block">
                              @ {formatPrice(item.estimatedPrice)}
                            </span>

                            {/* Line total */}
                            <span
                              className={cn(
                                'flex-shrink-0 text-sm font-bold font-mono tabular-nums w-24 text-right',
                                item.checked ? 'text-gray-600' : 'text-emerald-400',
                              )}
                            >
                              {formatPrice(lineTotal)}
                            </span>

                            {/* Row actions (revealed on hover) */}
                            <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => toggleQuickPin(item.id)}
                                aria-label={quickPinnedIds.has(item.id) ? 'Unpin from quick budget' : 'Pin to quick budget'}
                                className={cn(
                                  'p-1.5 rounded-lg transition-colors cursor-pointer',
                                  quickPinnedIds.has(item.id)
                                    ? 'text-green-400 bg-green-500/15 hover:bg-green-500/25'
                                    : 'text-gray-500 hover:text-green-400 hover:bg-green-500/10',
                                )}
                              >
                                {quickPinnedIds.has(item.id)
                                  ? <BookmarkCheck size={13} />
                                  : <Bookmark size={13} />}
                              </button>
                              <button
                                onClick={() => handleEditItem(item)}
                                aria-label="Edit item"
                                className="p-1.5 text-gray-500 hover:text-green-400 rounded-lg hover:bg-green-500/10 transition-colors cursor-pointer"
                              >
                                <Edit2 size={13} />
                              </button>
                              <button
                                onClick={() => removeShoppingListItem(activeList.id, item.id)}
                                aria-label="Delete item"
                                className="p-1.5 text-gray-500 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}

                  {/* Footer totals */}
                  <div className="px-5 py-4 flex items-center justify-between bg-gray-800/20 border-t border-green-500/10">
                    <span className="text-sm text-gray-500">
                      {activeList.items.filter((i) => i.checked).length} of {activeList.items.length} items checked
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Total Estimated:</span>
                      <span className="text-base font-bold text-emerald-400 font-mono tabular-nums">
                        {formatPrice(activeTotal)}
                      </span>
                    </div>
                  </div>

                  {/* ── Category budget overview bars ── */}
                  {activeBudget && groupedItems.some((g) => g.hasBudget) && (
                    <div className="border-t border-green-500/20 px-5 py-4 space-y-3 bg-gray-900/40">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                        Budget Overview — {MONTH_NAMES[viewMonth - 1]} {viewYear}
                      </p>
                      {groupedItems.map((g) => {
                        if (!g.hasBudget || g.budgetedAmount === 0) return null;
                        const pct = Math.min((g.catTotal / g.budgetedAmount) * 100, 100);
                        const over = g.catTotal > g.budgetedAmount;
                        const diff = g.budgetedAmount - g.catTotal;
                        return (
                          <div key={g.catId}>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="flex items-center gap-1.5 text-xs text-gray-400">
                                <span>{g.catIcon}</span> {g.catName}
                              </span>
                              <span className="flex items-center gap-2 text-xs font-mono">
                                <span className={over ? 'text-rose-400 font-bold' : 'text-white'}>
                                  {formatPrice(g.catTotal)}
                                </span>
                                <span className="text-gray-600">/</span>
                                <span className="text-gray-500">{formatPrice(g.budgetedAmount)}</span>
                                <span className={cn(
                                  'text-[10px] font-semibold',
                                  over ? 'text-rose-400' : 'text-emerald-400'
                                )}>
                                  {over ? '▲' : '▼'} {formatPrice(Math.abs(diff))}
                                </span>
                              </span>
                            </div>
                            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{ duration: 0.6, ease: 'easeOut' }}
                                className={cn(
                                  'h-full rounded-full',
                                  over
                                    ? 'bg-gradient-to-r from-rose-600 to-rose-400'
                                    : pct > 80
                                    ? 'bg-gradient-to-r from-amber-600 to-amber-400'
                                    : 'bg-gradient-to-r from-green-600 to-emerald-500',
                                )}
                              />
                            </div>
                          </div>
                        );
                      })}

                      {/* Grand total vs total budgeted */}
                      {(() => {
                        const totalBudgeted = groupedItems
                          .filter((g) => g.hasBudget)
                          .reduce((s, g) => s + g.budgetedAmount, 0);
                        const totalListed = groupedItems
                          .filter((g) => g.hasBudget)
                          .reduce((s, g) => s + g.catTotal, 0);
                        if (totalBudgeted === 0) return null;
                        const over = totalListed > totalBudgeted;
                        return (
                          <div className="pt-2 border-t border-green-500/10 flex items-center justify-between">
                            <span className="text-xs text-gray-500">Total (budgeted categories)</span>
                            <span className="flex items-center gap-2 text-sm font-bold font-mono tabular-nums">
                              <span className={over ? 'text-rose-400' : 'text-emerald-400'}>
                                {formatPrice(totalListed)}
                              </span>
                              <span className="text-gray-600 text-xs font-normal">/ {formatPrice(totalBudgeted)}</span>
                            </span>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────
          Modal: Create List
      ─────────────────────────────────────────────────────── */}
      <Modal
        isOpen={createOpen}
        onClose={() => { setCreateOpen(false); setCreateName(''); }}
        title="Create Shopping List"
      >
        <div className="space-y-4">
          <div>
            <label className={labelCls}>List Name *</label>
            <input
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreateList(); }}
              placeholder="e.g. January Bulk Buy, Monthly Staples"
              className={inputCls}
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Month</label>
              <select
                value={viewMonth}
                onChange={(e) => setViewMonth(Number(e.target.value))}
                className={inputCls}
              >
                {MONTH_NAMES.map((m, i) => (
                  <option key={i} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Year</label>
              <select
                value={viewYear}
                onChange={(e) => setViewYear(Number(e.target.value))}
                className={inputCls}
              >
                {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <button
              onClick={() => { setCreateOpen(false); setCreateName(''); }}
              className="px-4 py-2 bg-gray-800/60 hover:bg-gray-700/60 text-gray-300 rounded-xl text-sm font-medium transition-colors cursor-pointer border border-green-500/20"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateList}
              disabled={!createName.trim()}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create List
            </button>
          </div>
        </div>
      </Modal>

      {/* ────────────────────────────────────────────────────────
          Modal: Add / Edit Item
      ─────────────────────────────────────────────────────── */}
      <Modal
        isOpen={addItemOpen}
        onClose={closeItemModal}
        title={editingItemId ? 'Edit Item' : 'Add Item to List'}
      >
        <div className="space-y-4">
          {/* Item search with autocomplete */}
          <div ref={searchRef}>
            <label className={labelCls}>Item Name *</label>
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
              <input
                value={itemSearch}
                onChange={(e) => {
                  setItemSearch(e.target.value);
                  setItemForm((f) => ({ ...f, itemName: e.target.value, itemId: '', categoryId: '' }));
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                placeholder="Search item library or type a new item…"
                className={cn(inputCls, 'pl-9')}
                autoFocus
              />
            </div>

            {/* Autocomplete dropdown */}
            {showSuggestions && searchResults.length > 0 && (
              <div className="mt-1 bg-gray-800/95 border border-green-500/20 rounded-xl overflow-hidden shadow-xl">
                {searchResults.map((si) => {
                  const cat = categories.find((c) => c.id === si.categoryId);
                  return (
                    <button
                      key={si.id}
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); handleSelectLibraryItem(si); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-green-500/10 transition-colors text-left cursor-pointer"
                    >
                      <span className="text-base">{cat?.icon ?? '📦'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-200">{si.name}</p>
                        <p className="text-xs text-gray-500">{cat?.name ?? 'No category'} · {si.unit}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quantity + Unit */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Quantity *</label>
              <input
                type="number"
                min="0.01"
                step="0.5"
                value={itemForm.quantity}
                onChange={(e) => setItemForm((f) => ({ ...f, quantity: Number(e.target.value) || 1 }))}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Unit</label>
              <select
                value={itemForm.unit}
                onChange={(e) => setItemForm((f) => ({ ...f, unit: e.target.value }))}
                className={inputCls}
              >
                {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>

          {/* Estimated price per unit */}
          <div>
            <label className={labelCls}>Price per {itemForm.unit} ({CURRENCY})</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={itemForm.estimatedPrice || ''}
              onChange={(e) => setItemForm((f) => ({ ...f, estimatedPrice: Number(e.target.value) || 0 }))}
              className={inputCls}
              placeholder="0.00"
            />
          </div>

          {/* Line total preview */}
          {itemForm.quantity > 0 && itemForm.estimatedPrice > 0 && (
            <div className="flex items-center justify-between bg-emerald-500/5 border border-emerald-500/20 rounded-xl px-4 py-3">
              <span className="text-sm text-gray-400">
                {itemForm.quantity} {itemForm.unit} × {formatPrice(itemForm.estimatedPrice)} =
              </span>
              <span className="text-base font-bold text-emerald-400 font-mono tabular-nums">
                {formatPrice(itemForm.quantity * itemForm.estimatedPrice)}
              </span>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className={labelCls}>Notes (optional)</label>
            <input
              value={itemForm.notes}
              onChange={(e) => setItemForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="e.g. Parmalat 2L, buy at Checkers…"
              className={inputCls}
            />
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <button
              onClick={closeItemModal}
              className="px-4 py-2 bg-gray-800/60 hover:bg-gray-700/60 text-gray-300 rounded-xl text-sm font-medium transition-colors cursor-pointer border border-green-500/20"
            >
              Cancel
            </button>
            <button
              onClick={handleAddOrUpdateItem}
              disabled={!itemForm.itemName.trim()}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {editingItemId ? 'Update Item' : 'Add Item'}
            </button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
};

export default ShoppingLists;
