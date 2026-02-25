// ==========================================
// BasketBuddy - Items & Prices Management
// ==========================================

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, Edit3, Trash2, Tag, DollarSign, Filter,
  ChevronDown, ChevronRight, Star, AlertCircle, Package, FolderPlus, Gift,
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import Modal from '../components/common/Modal';
import { UNITS, CURRENCY } from '../config/constants';
import { cn, formatPrice, isSpecialActive, getEffectiveUnitPrice, generateId } from '../utils/helpers';
import { GroceryItem, PriceEntry, ComboDeal } from '../types';

const CATEGORY_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
  '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1',
  '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e',
];

const Items: React.FC = () => {
  const {
    items, categories, stores, prices,
    addItem, updateItem, deleteItem,
    setPrice, updatePrice, deletePrice,
    addCategory,
  } = useApp();

  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('all');
  const [filterStore, setFilterStore] = useState('all');
  const [itemModal, setItemModal] = useState(false);
  const [priceModal, setPriceModal] = useState(false);
  const [editPriceId, setEditPriceId] = useState<string | null>(null);
  const [editItemId, setEditItemId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  // Remember the last store the user picked so it persists across modal opens
  const lastUsedStoreId = React.useRef<string>('');
  // Start with all categories collapsed
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());
  const [catModal, setCatModal] = useState(false);
  const [catForm, setCatForm] = useState({ name: '', icon: '📦', color: '#6366f1' });

  const [itemForm, setItemForm] = useState({
    name: '', categoryId: '', unit: 'each', brand: '', notes: '',
  });

  const [priceForm, setPriceForm] = useState({
    storeId: '', normalPrice: '', specialPrice: '', isOnSpecial: false,
    specialEndDate: '',
    comboDealType: 'none' as 'none' | ComboDeal['type'],
    comboDealQty: '',
    comboDealForPrice: '',
    comboDealDesc: '',
  });

  // Filtered items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchSearch = !search || item.name.toLowerCase().includes(search.toLowerCase()) || item.brand?.toLowerCase().includes(search.toLowerCase());
      const matchCat = filterCat === 'all' || item.categoryId === filterCat;
      const matchStore = filterStore === 'all' || prices.some((p) => p.itemId === item.id && p.storeId === filterStore);
      return matchSearch && matchCat && matchStore;
    });
  }, [items, search, filterCat, filterStore, prices]);

  // Group filtered items by category
  const groupedItems = useMemo(() => {
    const map = new Map<string, typeof filteredItems>();
    filteredItems.forEach((item) => {
      const group = map.get(item.categoryId) || [];
      group.push(item);
      map.set(item.categoryId, group);
    });
    // Sort groups by category name
    return Array.from(map.entries())
      .map(([catId, catItems]) => ({
        category: categories.find((c) => c.id === catId),
        items: catItems,
      }))
      .sort((a, b) => (a.category?.name || '').localeCompare(b.category?.name || ''));
  }, [filteredItems, categories]);

  // Open add item
  const openAddItem = () => {
    setEditItemId(null);
    setItemForm({ name: '', categoryId: categories[0]?.id || '', unit: 'each', brand: '', notes: '' });
    setItemModal(true);
  };

  // Toggle category expand/collapse
  const toggleCategory = (catId: string) => {
    setExpandedCats((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  };

  // Expand all / collapse all
  const expandAll = () => {
    setExpandedCats(new Set(groupedItems.map((g) => g.category?.id || 'uncategorized')));
  };
  const collapseAll = () => setExpandedCats(new Set());

  // Submit new category
  const submitCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catForm.name.trim()) return;
    addCategory({ name: catForm.name.trim(), icon: catForm.icon, color: catForm.color, isCustom: true });
    setCatForm({ name: '', icon: '📦', color: '#6366f1' });
    setCatModal(false);
  };

  // Open edit item
  const openEditItem = (item: GroceryItem) => {
    setEditItemId(item.id);
    setItemForm({
      name: item.name,
      categoryId: item.categoryId,
      unit: item.unit,
      brand: item.brand || '',
      notes: item.notes || '',
    });
    setItemModal(true);
  };

  // Open set price (new)
  const openSetPrice = (itemId: string) => {
    setSelectedItem(itemId);
    setEditPriceId(null);
    const defaultStore = lastUsedStoreId.current || stores[0]?.id || '';
    setPriceForm({
      storeId: defaultStore, normalPrice: '', specialPrice: '', isOnSpecial: false,
      specialEndDate: '', comboDealType: 'none', comboDealQty: '', comboDealForPrice: '', comboDealDesc: '',
    });
    setPriceModal(true);
  };

  // Open edit price (existing)
  const openEditPrice = (price: PriceEntry) => {
    setSelectedItem(price.itemId);
    setEditPriceId(price.id);
    const cd = price.comboDeal;
    setPriceForm({
      storeId: price.storeId,
      normalPrice: String(price.normalPrice),
      specialPrice: price.specialPrice != null ? String(price.specialPrice) : '',
      isOnSpecial: price.isOnSpecial,
      specialEndDate: price.specialEndDate
        ? new Date(price.specialEndDate).toISOString().split('T')[0]
        : '',
      comboDealType: cd?.type ?? 'none',
      comboDealQty: cd?.quantity != null ? String(cd.quantity) : '',
      comboDealForPrice: cd?.forPrice != null ? String(cd.forPrice) : '',
      comboDealDesc: cd?.description ?? '',
    });
    setPriceModal(true);
  };

  // Submit item
  const submitItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemForm.name.trim() || !itemForm.categoryId) return;
    if (editItemId) {
      updateItem(editItemId, itemForm);
    } else {
      addItem(itemForm);
    }
    setItemModal(false);
  };

  // Submit price
  const submitPrice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || !priceForm.storeId || !priceForm.normalPrice) return;
    let comboDeal: ComboDeal | undefined;
    if (priceForm.comboDealType !== 'none') {
      comboDeal = { type: priceForm.comboDealType };
      if (priceForm.comboDealType === 'multi-buy') {
        if (priceForm.comboDealQty) comboDeal.quantity = parseFloat(priceForm.comboDealQty);
        if (priceForm.comboDealForPrice) comboDeal.forPrice = parseFloat(priceForm.comboDealForPrice);
      } else if (priceForm.comboDealType === 'custom') {
        comboDeal.description = priceForm.comboDealDesc;
      }
    }
    const payload = {
      itemId: selectedItem,
      storeId: priceForm.storeId,
      normalPrice: parseFloat(priceForm.normalPrice),
      specialPrice: priceForm.specialPrice ? parseFloat(priceForm.specialPrice) : undefined,
      isOnSpecial: priceForm.isOnSpecial,
      specialEndDate: priceForm.specialEndDate ? new Date(priceForm.specialEndDate).getTime() : undefined,
      comboDeal,
    };
    if (editPriceId) {
      updatePrice(editPriceId, payload);
    } else {
      setPrice(payload);
    }
    setPriceModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Items & Prices</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">
            {items.length} items · {prices.length} prices tracked
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCatModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <FolderPlus size={16} /> Add Category
          </button>
          <button
            onClick={openAddItem}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand-500 text-white rounded-xl text-sm font-medium hover:bg-brand-600 transition-colors shadow-lg shadow-brand-500/20"
          >
            <Plus size={16} /> Add Item
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-sm text-gray-800 dark:text-gray-200 outline-none focus:border-brand-500 transition-colors"
          />
        </div>
        <select
          value={filterCat}
          onChange={(e) => setFilterCat(e.target.value)}
          className="px-3 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-sm text-gray-700 dark:text-gray-300 outline-none focus:border-brand-500"
        >
          <option value="all">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
          ))}
        </select>
        <select
          value={filterStore}
          onChange={(e) => setFilterStore(e.target.value)}
          className="px-3 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-sm text-gray-700 dark:text-gray-300 outline-none focus:border-brand-500"
        >
          <option value="all">All Stores</option>
          {stores.map((s) => (
            <option key={s.id} value={s.id}>{s.icon} {s.name}</option>
          ))}
        </select>
      </div>

      {/* Items Grouped by Category */}
      <div className="space-y-4">
        {filteredItems.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-12 text-center">
            <Package className="mx-auto text-gray-300 dark:text-gray-700 mb-3" size={48} />
            <p className="text-gray-500 font-medium mb-1">No items yet</p>
            <p className="text-gray-400 text-sm mb-4">Start by adding grocery items you buy regularly</p>
            <button
              onClick={openAddItem}
              className="px-4 py-2 bg-brand-500 text-white rounded-xl text-sm font-medium hover:bg-brand-600 transition-colors"
            >
              Add First Item
            </button>
          </div>
        ) : (
          <>
            {/* Expand / Collapse controls */}
            <div className="flex items-center gap-2 text-xs">
              <button onClick={expandAll} className="text-brand-500 hover:text-brand-600 font-medium">Expand All</button>
              <span className="text-gray-300 dark:text-gray-600">|</span>
              <button onClick={collapseAll} className="text-brand-500 hover:text-brand-600 font-medium">Collapse All</button>
              <span className="ml-auto text-gray-400">{groupedItems.length} categories</span>
            </div>

            {groupedItems.map((group) => {
              const cat = group.category;
              const catId = cat?.id || 'uncategorized';
              const isExpanded = expandedCats.has(catId);

              return (
                <motion.div
                  key={catId}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden"
                >
                  {/* Category Header — clickable */}
                  <button
                    type="button"
                    onClick={() => toggleCategory(catId)}
                    className="w-full flex items-center gap-3 px-5 py-3.5 text-left select-none hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
                    style={{ backgroundColor: `${cat?.color || '#999'}10` }}
                  >
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                      style={{ backgroundColor: `${cat?.color || '#999'}20` }}
                    >
                      {cat?.icon || '📦'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="font-semibold text-gray-800 dark:text-gray-200">{cat?.name || 'Uncategorized'}</h2>
                      <p className="text-xs text-gray-400">{group.items.length} item{group.items.length !== 1 ? 's' : ''}</p>
                    </div>
                    <motion.div
                      animate={{ rotate: isExpanded ? 90 : 0 }}
                      transition={{ duration: 0.2 }}
                      className="text-gray-400"
                    >
                      <ChevronRight size={18} />
                    </motion.div>
                  </button>

                  {/* Items in Category — shown only when expanded */}
                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: 'easeInOut' }}
                        className="overflow-hidden border-t border-gray-100 dark:border-gray-800"
                      >
                        <div className="divide-y divide-gray-100 dark:divide-gray-800">
                          {group.items.map((item) => {
                    const itemPrices = prices.filter((p) => p.itemId === item.id);
                    const cheapest = itemPrices.length > 0
                      ? Math.min(...itemPrices.map((p) => getEffectiveUnitPrice(p)))
                      : null;
                    const hasSpecial = itemPrices.some((p) => isSpecialActive(p));

                    return (
                      <div key={item.id} className="px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                        <div className="flex items-start gap-4">
                          {/* Item Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-medium text-gray-800 dark:text-gray-200">{item.name}</h3>
                              {item.brand && (
                                <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-500 rounded-full">{item.brand}</span>
                              )}
                              {hasSpecial && (
                                <span className="text-xs px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-full font-medium flex items-center gap-1">
                                  <Star size={10} /> On Special
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5">{item.unit}</p>

                            {/* Price Tags */}
                            {itemPrices.length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-2">
                                {itemPrices.map((p) => {
                                  const store = stores.find((s) => s.id === p.storeId);
                                  const active = isSpecialActive(p);
                                  return (
                                    <div
                                      key={p.id}
                                      className={cn(
                                        'flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs',
                                        active
                                          ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30'
                                          : 'bg-gray-50 dark:bg-gray-800'
                                      )}
                                    >
                                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: store?.color }} />
                                      <span className="text-gray-500 dark:text-gray-400">{store?.name}:</span>
                                      {active ? (
                                        <>
                                          <span className="line-through text-gray-400">{formatPrice(p.normalPrice)}</span>
                                          <span className="font-semibold text-amber-600 dark:text-amber-400">{formatPrice(p.specialPrice!)}</span>
                                        </>
                                      ) : (
                                        <span className="font-medium text-gray-700 dark:text-gray-300">{formatPrice(p.normalPrice)}</span>
                                      )}
                                      {/* Combo deal badge */}
                                      {p.comboDeal && (() => {
                                        const cd = p.comboDeal;
                                        const unitPrice = getEffectiveUnitPrice(p);
                                        const isCheaperThanNormal = unitPrice < p.normalPrice;
                                        let label = '';
                                        let unitLabel = '';
                                        if (cd.type === 'multi-buy' && cd.quantity && cd.forPrice) {
                                          label = `${cd.quantity} for ${formatPrice(cd.forPrice)}`;
                                          unitLabel = `${formatPrice(unitPrice)}/unit`;
                                        } else if (cd.type === 'bogo') {
                                          label = 'B1G1';
                                          unitLabel = `${formatPrice(unitPrice)}/unit`;
                                        } else {
                                          label = cd.description || 'Deal';
                                        }
                                        return (
                                          <span className="ml-1 flex items-center gap-1 flex-wrap">
                                            <span className="px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded text-[10px] font-semibold flex items-center gap-0.5 whitespace-nowrap">
                                              <Gift size={9} />{label}
                                            </span>
                                            {unitLabel && isCheaperThanNormal && (
                                              <span className="px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded text-[10px] font-bold whitespace-nowrap">
                                                = {unitLabel}
                                              </span>
                                            )}
                                          </span>
                                        );
                                      })()}
                                      {/* Edit / Delete buttons — always visible */}
                                      <span className="flex items-center gap-0.5 ml-1">
                                        <button
                                          type="button"
                                          onClick={() => openEditPrice(p)}
                                          className="p-0.5 rounded hover:bg-brand-100 dark:hover:bg-brand-900/30 text-gray-400 hover:text-brand-500 transition-colors"
                                          title="Edit price"
                                        >
                                          <Edit3 size={10} />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => deletePrice(p.id)}
                                          className="p-0.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500 transition-colors"
                                          title="Remove price"
                                        >
                                          <Trash2 size={10} />
                                        </button>
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          {/* Cheapest & Actions */}
                          <div className="flex flex-col items-end gap-2 flex-shrink-0">
                            {cheapest !== null && (
                              <div className="text-right">
                                <p className="text-xs text-gray-400">Best price</p>
                                <p className="text-lg font-bold text-green-600 dark:text-green-400">{formatPrice(cheapest)}</p>
                              </div>
                            )}
                            <div className="flex gap-1">
                              <button
                                onClick={() => openSetPrice(item.id)}
                                className="p-1.5 text-gray-400 hover:text-green-500 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                                title="Set price"
                              >
                                <DollarSign size={14} />
                              </button>
                              <button
                                onClick={() => openEditItem(item)}
                                className="p-1.5 text-gray-400 hover:text-brand-500 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors"
                                title="Edit"
                              >
                                <Edit3 size={14} />
                              </button>
                              <button
                                onClick={() => { if (confirm('Delete this item?')) deleteItem(item.id); }}
                                className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                title="Delete"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </>
        )}
      </div>

      {/* Add/Edit Item Modal */}
      <Modal isOpen={itemModal} onClose={() => setItemModal(false)} title={editItemId ? 'Edit Item' : 'Add New Item'}>
        <form onSubmit={submitItem} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Item Name *</label>
            <input
              type="text"
              value={itemForm.name}
              onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
              placeholder="e.g., Full Cream Milk"
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-800 dark:text-gray-200 outline-none focus:border-brand-500 transition-colors"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Category *</label>
              <select
                value={itemForm.categoryId}
                onChange={(e) => setItemForm({ ...itemForm, categoryId: e.target.value })}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-800 dark:text-gray-200 outline-none focus:border-brand-500"
                required
              >
                <option value="">Select...</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Unit</label>
              <input
                type="text"
                list="units-list"
                value={itemForm.unit}
                onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })}
                placeholder="e.g. 5kg, 2L, each…"
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-800 dark:text-gray-200 outline-none focus:border-brand-500 transition-colors"
              />
              <datalist id="units-list">
                {UNITS.map((u) => <option key={u} value={u} />)}
              </datalist>
              <p className="text-xs text-gray-400 mt-1">Pick a common unit or type your own (e.g. 5kg, 750ml)</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Brand (optional)</label>
            <input
              type="text"
              value={itemForm.brand}
              onChange={(e) => setItemForm({ ...itemForm, brand: e.target.value })}
              placeholder="e.g., Parmalat"
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-800 dark:text-gray-200 outline-none focus:border-brand-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Notes (optional)</label>
            <textarea
              value={itemForm.notes}
              onChange={(e) => setItemForm({ ...itemForm, notes: e.target.value })}
              placeholder="Any notes about this item..."
              rows={2}
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-800 dark:text-gray-200 outline-none focus:border-brand-500 transition-colors resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setItemModal(false)}
              className="flex-1 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 bg-brand-500 text-white rounded-xl text-sm font-medium hover:bg-brand-600 transition-colors"
            >
              {editItemId ? 'Save' : 'Add Item'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Set Price Modal */}
      <Modal isOpen={priceModal} onClose={() => setPriceModal(false)} title={editPriceId ? 'Edit Price' : 'Add Price'}>
        <form onSubmit={submitPrice} className="space-y-4">
          {selectedItem && (
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                {items.find((i) => i.id === selectedItem)?.name}
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Store *</label>
            <select
              value={priceForm.storeId}
              onChange={(e) => {
                lastUsedStoreId.current = e.target.value;
                setPriceForm({ ...priceForm, storeId: e.target.value });
              }}
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-800 dark:text-gray-200 outline-none focus:border-brand-500"
              required
            >
              {stores.map((s) => (
                <option key={s.id} value={s.id}>{s.icon} {s.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Normal Price ({CURRENCY}) *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={priceForm.normalPrice}
              onChange={(e) => setPriceForm({ ...priceForm, normalPrice: e.target.value })}
              placeholder="0.00"
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-800 dark:text-gray-200 outline-none focus:border-brand-500 transition-colors"
              required
            />
          </div>

          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={priceForm.isOnSpecial}
                onChange={(e) => setPriceForm({ ...priceForm, isOnSpecial: e.target.checked })}
                className="w-4 h-4 rounded text-brand-500 focus:ring-brand-500"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                <Tag size={14} className="text-amber-500" /> Item is on special
              </span>
            </label>
          </div>

          {priceForm.isOnSpecial && (
            <div className="space-y-4 pl-6 border-l-2 border-amber-300 dark:border-amber-700">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Special Price ({CURRENCY}) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={priceForm.specialPrice}
                  onChange={(e) => setPriceForm({ ...priceForm, specialPrice: e.target.value })}
                  placeholder="0.00"
                  className="w-full px-4 py-2.5 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-xl text-gray-800 dark:text-gray-200 outline-none focus:border-amber-500 transition-colors"
                  required={priceForm.isOnSpecial && priceForm.comboDealType === 'none'}
                />
              </div>

              {/* Combo Deal */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1">
                  <Gift size={14} className="text-purple-500" /> Combo Deal (optional)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['none', 'multi-buy', 'bogo', 'custom'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setPriceForm({ ...priceForm, comboDealType: t })}
                      className={cn(
                        'py-2 px-3 rounded-xl text-xs font-medium border transition-colors',
                        priceForm.comboDealType === t
                          ? 'bg-purple-500 border-purple-500 text-white'
                          : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
                      )}
                    >
                      {t === 'none' ? 'None' : t === 'multi-buy' ? 'Multi-buy' : t === 'bogo' ? 'Buy 1 Get 1' : 'Custom'}
                    </button>
                  ))}
                </div>

                {priceForm.comboDealType === 'multi-buy' && (
                  <div className="mt-3 flex items-center gap-2">
                    <div className="flex-1">
                      <label className="block text-xs text-gray-500 mb-1">Qty</label>
                      <input
                        type="number" min="2" step="1"
                        value={priceForm.comboDealQty}
                        onChange={(e) => setPriceForm({ ...priceForm, comboDealQty: e.target.value })}
                        placeholder="2"
                        className="w-full px-3 py-2 bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800/30 rounded-xl text-sm text-gray-800 dark:text-gray-200 outline-none focus:border-purple-500"
                      />
                    </div>
                    <span className="text-gray-400 text-sm mt-4">for</span>
                    <div className="flex-1">
                      <label className="block text-xs text-gray-500 mb-1">Price ({CURRENCY})</label>
                      <input
                        type="number" min="0" step="0.01"
                        value={priceForm.comboDealForPrice}
                        onChange={(e) => setPriceForm({ ...priceForm, comboDealForPrice: e.target.value })}
                        placeholder="30.00"
                        className="w-full px-3 py-2 bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800/30 rounded-xl text-sm text-gray-800 dark:text-gray-200 outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>
                )}

                {priceForm.comboDealType === 'bogo' && (
                  <p className="mt-2 text-xs text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 px-3 py-2 rounded-lg">
                    Buy 1 Get 1 Free will be shown as a badge on this item.
                  </p>
                )}

                {priceForm.comboDealType === 'custom' && (
                  <div className="mt-3">
                    <input
                      type="text"
                      value={priceForm.comboDealDesc}
                      onChange={(e) => setPriceForm({ ...priceForm, comboDealDesc: e.target.value })}
                      placeholder="e.g. 3 for 2, Free gift with purchase…"
                      className="w-full px-3 py-2 bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800/30 rounded-xl text-sm text-gray-800 dark:text-gray-200 outline-none focus:border-purple-500"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Special Ends (optional)</label>
                <input
                  type="date"
                  value={priceForm.specialEndDate}
                  onChange={(e) => setPriceForm({ ...priceForm, specialEndDate: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-800 dark:text-gray-200 outline-none focus:border-brand-500 transition-colors"
                />
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setPriceModal(false)}
              className="flex-1 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 bg-green-500 text-white rounded-xl text-sm font-medium hover:bg-green-600 transition-colors"
            >
              {editPriceId ? 'Update Price' : 'Set Price'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Category Modal */}
      <Modal isOpen={catModal} onClose={() => setCatModal(false)} title="Add New Category">
        <form onSubmit={submitCategory} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Category Name *</label>
            <input
              type="text"
              value={catForm.name}
              onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
              placeholder="e.g., Baby Products"
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-800 dark:text-gray-200 outline-none focus:border-brand-500 transition-colors"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Icon (emoji)</label>
            <input
              type="text"
              value={catForm.icon}
              onChange={(e) => setCatForm({ ...catForm, icon: e.target.value })}
              placeholder="📦"
              maxLength={4}
              className="w-20 px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-2xl text-center outline-none focus:border-brand-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Color</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCatForm({ ...catForm, color: c })}
                  className={cn(
                    'w-8 h-8 rounded-full transition-all',
                    catForm.color === c ? 'ring-2 ring-offset-2 ring-brand-500 dark:ring-offset-gray-900 scale-110' : 'hover:scale-105'
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
              style={{ backgroundColor: `${catForm.color}20` }}
            >
              {catForm.icon}
            </div>
            <span className="font-medium text-gray-700 dark:text-gray-300">{catForm.name || 'Category Preview'}</span>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setCatModal(false)}
              className="flex-1 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 bg-brand-500 text-white rounded-xl text-sm font-medium hover:bg-brand-600 transition-colors"
            >
              Add Category
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Items;
