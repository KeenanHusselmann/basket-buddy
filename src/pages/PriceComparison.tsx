// ==========================================
// BasketBuddy - Price Comparison Page
// ==========================================

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeftRight, Search, TrendingDown, Star, AlertCircle } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { cn, formatPrice, isSpecialActive } from '../utils/helpers';
import { StoreComparison } from '../types';

const PriceComparison: React.FC = () => {
  const { items, prices, stores, categories } = useApp();
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('all');
  const [sortBy, setSortBy] = useState<'name' | 'savings'>('savings');

  const comparisons: StoreComparison[] = useMemo(() => {
    return items
      .filter((item) => {
        const matchSearch = !search || item.name.toLowerCase().includes(search.toLowerCase());
        const matchCat = filterCat === 'all' || item.categoryId === filterCat;
        const hasPrices = prices.some((p) => p.itemId === item.id);
        return matchSearch && matchCat && hasPrices;
      })
      .map((item) => {
        const itemPrices = prices.filter((p) => p.itemId === item.id);
        const priceList = itemPrices.map((p) => {
          const store = stores.find((s) => s.id === p.storeId);
          const effectivePrice = isSpecialActive(p) && p.specialPrice ? p.specialPrice : p.normalPrice;
          return {
            storeId: p.storeId,
            storeName: store?.name || 'Unknown',
            normalPrice: p.normalPrice,
            specialPrice: p.specialPrice,
            isOnSpecial: isSpecialActive(p),
            isCheapest: false,
            effectivePrice,
          };
        });

        // Mark cheapest
        const minPrice = Math.min(...priceList.map((p) => p.effectivePrice));
        priceList.forEach((p) => {
          if (p.effectivePrice === minPrice) p.isCheapest = true;
        });

        return {
          itemId: item.id,
          itemName: item.name,
          prices: priceList.sort((a, b) => a.effectivePrice - b.effectivePrice),
        };
      })
      .sort((a, b) => {
        if (sortBy === 'name') return a.itemName.localeCompare(b.itemName);
        // Sort by biggest price difference (most savings potential)
        const aDiff = a.prices.length > 1
          ? a.prices[a.prices.length - 1].normalPrice - a.prices[0].normalPrice
          : 0;
        const bDiff = b.prices.length > 1
          ? b.prices[b.prices.length - 1].normalPrice - b.prices[0].normalPrice
          : 0;
        return bDiff - aDiff;
      });
  }, [items, prices, stores, search, filterCat, sortBy]);

  const totalPotentialSavings = useMemo(() => {
    return comparisons.reduce((total, comp) => {
      if (comp.prices.length < 2) return total;
      const cheapest = comp.prices[0].normalPrice;
      const mostExpensive = comp.prices[comp.prices.length - 1].normalPrice;
      return total + (mostExpensive - cheapest);
    }, 0);
  }, [comparisons]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Price Comparison</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">
          Compare prices across stores to find the best deals
        </p>
      </div>

      {/* Savings Banner */}
      {totalPotentialSavings > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-5 text-white flex items-center gap-4"
        >
          <div className="p-3 bg-white/20 rounded-xl">
            <TrendingDown size={24} />
          </div>
          <div>
            <p className="text-sm opacity-90">Potential savings by shopping smart</p>
            <p className="text-2xl font-bold">{formatPrice(totalPotentialSavings)}</p>
          </div>
        </motion.div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search items to compare..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-sm text-gray-800 dark:text-gray-200 outline-none focus:border-brand-500"
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
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="px-3 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-sm text-gray-700 dark:text-gray-300 outline-none focus:border-brand-500"
        >
          <option value="savings">Most Savings</option>
          <option value="name">Name A-Z</option>
        </select>
      </div>

      {/* Comparison Cards */}
      {comparisons.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-12 text-center">
          <ArrowLeftRight className="mx-auto text-gray-300 dark:text-gray-700 mb-3" size={48} />
          <p className="text-gray-500 font-medium mb-1">No comparisons available</p>
          <p className="text-gray-400 text-sm">Add items with prices at different stores to compare</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {comparisons.map((comp, idx) => {
            const item = items.find((i) => i.id === comp.itemId);
            const cat = categories.find((c) => c.id === item?.categoryId);
            const maxPrice = Math.max(...comp.prices.map((p) => p.normalPrice));
            const minPrice = comp.prices[0]?.normalPrice || 0;
            const savings = maxPrice - minPrice;

            return (
              <motion.div
                key={comp.itemId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
                className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden"
              >
                {/* Item Header */}
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span>{cat?.icon || '📦'}</span>
                    <h3 className="font-semibold text-sm text-gray-800 dark:text-gray-200">{comp.itemName}</h3>
                  </div>
                  {savings > 0 && (
                    <span className="text-xs font-medium px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full">
                      Save {formatPrice(savings)}
                    </span>
                  )}
                </div>

                {/* Price Bars */}
                <div className="p-4 space-y-2">
                  {comp.prices.map((p) => {
                    const store = stores.find((s) => s.id === p.storeId);
                    const effectivePrice = p.isOnSpecial && p.specialPrice ? p.specialPrice : p.normalPrice;
                    const barWidth = maxPrice > 0 ? (effectivePrice / maxPrice) * 100 : 100;

                    return (
                      <div key={p.storeId} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: store?.color }} />
                            <span className="text-gray-600 dark:text-gray-400">{p.storeName}</span>
                            {p.isOnSpecial && (
                              <Star size={10} className="text-amber-500 fill-amber-500" />
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {p.isOnSpecial && (
                              <span className="line-through text-gray-400">{formatPrice(p.normalPrice)}</span>
                            )}
                            <span className={cn(
                              'font-semibold',
                              p.isCheapest ? 'text-green-600 dark:text-green-400' : 'text-gray-700 dark:text-gray-300'
                            )}>
                              {formatPrice(effectivePrice)}
                            </span>
                            {p.isCheapest && comp.prices.length > 1 && (
                              <span className="text-[9px] font-bold px-1 py-0.5 bg-green-500 text-white rounded">BEST</span>
                            )}
                          </div>
                        </div>
                        <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${barWidth}%` }}
                            transition={{ duration: 0.5, delay: idx * 0.03 }}
                            className={cn('h-full rounded-full', p.isCheapest ? 'bg-green-500' : '')}
                            style={{ backgroundColor: p.isCheapest ? undefined : store?.color }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PriceComparison;
