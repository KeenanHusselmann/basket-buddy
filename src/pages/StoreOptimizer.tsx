// ==========================================
// BasketBuddy - Smart Cart Optimizer
// ==========================================

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Plus, Trash2, ShoppingCart, ArrowRight, Zap, MapPin, Check } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { optimizeCart, formatPrice, cn } from '../utils/helpers';
import { CURRENCY } from '../config/constants';

const StoreOptimizer: React.FC = () => {
  const { items, prices, stores, categories, addTrip } = useApp();
  const [selectedItems, setSelectedItems] = useState<{ itemId: string; itemName: string; quantity: number }[]>([]);
  const [addItemId, setAddItemId] = useState('');
  const [optimized, setOptimized] = useState(false);

  const result = useMemo(() => {
    if (selectedItems.length === 0) return null;
    return optimizeCart(selectedItems, prices, stores);
  }, [selectedItems, prices, stores]);

  const addItem = () => {
    if (!addItemId) return;
    if (selectedItems.some((i) => i.itemId === addItemId)) return;
    const item = items.find((i) => i.id === addItemId);
    if (!item) return;
    setSelectedItems([...selectedItems, { itemId: item.id, itemName: item.name, quantity: 1 }]);
    setAddItemId('');
  };

  const removeItem = (itemId: string) => {
    setSelectedItems(selectedItems.filter((i) => i.itemId !== itemId));
    if (selectedItems.length <= 1) setOptimized(false);
  };

  const updateQuantity = (itemId: string, qty: number) => {
    setSelectedItems(selectedItems.map((i) => i.itemId === itemId ? { ...i, quantity: Math.max(1, qty) } : i));
  };

  // Create trips from optimized result
  const createTrips = () => {
    if (!result) return;
    result.storeBreakdown.forEach((sb) => {
      addTrip({
        name: `Smart Cart - ${sb.storeName}`,
        storeId: sb.storeId,
        budget: sb.subtotal * 1.1,
        date: Date.now(),
        status: 'planned',
        items: sb.items.map((item, idx) => ({
          id: `opt-${idx}`,
          itemId: item.itemId,
          itemName: item.itemName,
          categoryId: items.find((i) => i.id === item.itemId)?.categoryId || '',
          quantity: selectedItems.find((si) => si.itemId === item.itemId)?.quantity || 1,
          unit: items.find((i) => i.id === item.itemId)?.unit || 'each',
          estimatedPrice: item.price,
          checked: false,
          storeId: sb.storeId,
        })),
        totalSpent: 0,
        sharedWith: [],
      });
    });
    setOptimized(true);
  };

  // Calculate non-optimized cost (buying everything at most expensive)
  const nonOptimizedCost = useMemo(() => {
    return selectedItems.reduce((total, si) => {
      const itemPrices = prices.filter((p) => p.itemId === si.itemId);
      if (itemPrices.length === 0) return total;
      const maxPrice = Math.max(...itemPrices.map((p) => p.normalPrice));
      return total + maxPrice * si.quantity;
    }, 0);
  }, [selectedItems, prices]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Sparkles className="text-brand-500" size={24} /> Smart Cart Optimizer
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">
          Build your list and we'll find the cheapest store combination
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Shopping List */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800">
              <h2 className="font-semibold text-gray-800 dark:text-gray-200">Your Shopping List</h2>
            </div>

            {/* Add Item */}
            <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex gap-2">
              <select
                value={addItemId}
                onChange={(e) => setAddItemId(e.target.value)}
                className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-800 dark:text-gray-200 outline-none focus:border-brand-500"
              >
                <option value="">Select an item...</option>
                {items
                  .filter((i) => !selectedItems.some((si) => si.itemId === i.id))
                  .map((item) => {
                    const cat = categories.find((c) => c.id === item.categoryId);
                    const hasPrices = prices.some((p) => p.itemId === item.id);
                    return (
                      <option key={item.id} value={item.id} disabled={!hasPrices}>
                        {cat?.icon} {item.name} {!hasPrices ? '(no prices)' : ''}
                      </option>
                    );
                  })}
              </select>
              <button
                onClick={addItem}
                disabled={!addItemId}
                className="px-4 py-2 bg-brand-500 text-white rounded-xl text-sm font-medium hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Plus size={16} />
              </button>
            </div>

            {/* Item List */}
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {selectedItems.length === 0 ? (
                <div className="p-8 text-center">
                  <ShoppingCart className="mx-auto text-gray-300 dark:text-gray-700 mb-3" size={40} />
                  <p className="text-gray-400 text-sm">Add items to optimize your shopping</p>
                </div>
              ) : (
                selectedItems.map((si) => {
                  const cat = categories.find((c) => c.id === items.find((i) => i.id === si.itemId)?.categoryId);
                  return (
                    <div key={si.itemId} className="px-4 py-3 flex items-center gap-3">
                      <span className="text-lg">{cat?.icon || '📦'}</span>
                      <span className="flex-1 text-sm font-medium text-gray-800 dark:text-gray-200">{si.itemName}</span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => updateQuantity(si.itemId, si.quantity - 1)}
                          className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 text-sm"
                        >
                          -
                        </button>
                        <span className="w-8 text-center text-sm font-medium text-gray-800 dark:text-gray-200">{si.quantity}</span>
                        <button
                          onClick={() => updateQuantity(si.itemId, si.quantity + 1)}
                          className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 text-sm"
                        >
                          +
                        </button>
                      </div>
                      <button
                        onClick={() => removeItem(si.itemId)}
                        className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {selectedItems.length > 0 && (
              <div className="p-4 bg-gray-50 dark:bg-gray-800/30">
                <p className="text-xs text-gray-400 mb-2">{selectedItems.length} items in list</p>
                {!optimized ? (
                  <button
                    onClick={() => setOptimized(false)}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-brand-600 to-brand-500 text-white rounded-xl font-medium hover:from-brand-500 hover:to-brand-400 transition-all shadow-lg shadow-brand-500/20"
                  >
                    <Zap size={18} /> Optimize My Cart
                  </button>
                ) : (
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                    <Check size={18} /> Trips created from optimization!
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Results */}
        <div className="space-y-4">
          {result && selectedItems.length > 0 ? (
            <>
              {/* Savings Summary */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-6 text-white"
              >
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles size={20} />
                  <h3 className="font-semibold">Optimization Result</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm opacity-80">Optimized Total</p>
                    <p className="text-3xl font-bold">{formatPrice(result.totalCost)}</p>
                  </div>
                  <div>
                    <p className="text-sm opacity-80">You Save</p>
                    <p className="text-3xl font-bold">{formatPrice(result.totalSavings)}</p>
                  </div>
                </div>
                {nonOptimizedCost > result.totalCost && (
                  <div className="mt-3 pt-3 border-t border-white/20 text-sm opacity-80">
                    vs {formatPrice(nonOptimizedCost)} buying at most expensive stores
                  </div>
                )}
              </motion.div>

              {/* Store Breakdown */}
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                  <MapPin size={16} /> Store-by-Store Plan
                </h3>
                {result.storeBreakdown.map((sb, idx) => (
                  <motion.div
                    key={sb.storeId}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden"
                  >
                    <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: sb.storeColor }} />
                        <h4 className="font-medium text-gray-800 dark:text-gray-200">{sb.storeName}</h4>
                        <span className="text-xs text-gray-400">{sb.items.length} items</span>
                      </div>
                      <span className="font-semibold text-gray-800 dark:text-gray-200">{formatPrice(sb.subtotal)}</span>
                    </div>
                    <div className="divide-y divide-gray-50 dark:divide-gray-800">
                      {sb.items.map((item) => (
                        <div key={item.itemId} className="px-4 py-2 flex items-center justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {item.itemName}
                            {item.isSpecial && (
                              <span className="ml-1.5 text-[10px] px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-full">SPECIAL</span>
                            )}
                          </span>
                          <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{formatPrice(item.price)}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Action */}
              {!optimized && (
                <button
                  onClick={createTrips}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-brand-500 text-white rounded-xl font-medium hover:bg-brand-600 transition-colors"
                >
                  <ShoppingCart size={18} /> Create Shopping Trips from Plan
                </button>
              )}
            </>
          ) : (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-12 text-center">
              <Zap className="mx-auto text-gray-300 dark:text-gray-700 mb-3" size={48} />
              <p className="text-gray-500 font-medium mb-1">Add items to see the magic</p>
              <p className="text-gray-400 text-sm">
                The optimizer will find the cheapest store for each item and create a smart shopping plan
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StoreOptimizer;
