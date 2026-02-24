// ==========================================
// BasketBuddy - Helper Utilities
// ==========================================

import { CURRENCY } from '../config/constants';
import { PriceEntry, ShoppingTrip, ShoppingTripItem, GroceryItem, Store, Category, OptimizedCart } from '../types';

/** Format price with Namibian Dollar */
export const formatPrice = (amount: number): string => {
  return `${CURRENCY} ${amount.toFixed(2)}`;
};

/** Format compact price */
export const formatCompact = (amount: number): string => {
  if (amount >= 1000) return `${CURRENCY} ${(amount / 1000).toFixed(1)}k`;
  return formatPrice(amount);
};

/** Calculate percentage */
export const calcPercentage = (part: number, total: number): number => {
  if (total === 0) return 0;
  return Math.round((part / total) * 100);
};

/** Get budget status color */
export const getBudgetColor = (spent: number, budget: number): string => {
  const pct = calcPercentage(spent, budget);
  if (pct >= 100) return '#EF4444';
  if (pct >= 80) return '#F59E0B';
  if (pct >= 60) return '#3B82F6';
  return '#10B981';
};

/** Get budget status label */
export const getBudgetStatus = (spent: number, budget: number): string => {
  const pct = calcPercentage(spent, budget);
  if (pct >= 100) return 'Over Budget!';
  if (pct >= 80) return 'Almost There';
  if (pct >= 60) return 'On Track';
  return 'Looking Good';
};

/** Calculate trip totals */
export const calcTripTotal = (items: ShoppingTripItem[], useActual = false): number => {
  return items.reduce((sum, item) => {
    const price = useActual && item.actualPrice !== undefined ? item.actualPrice : item.estimatedPrice;
    return sum + price * item.quantity;
  }, 0);
};

/** Find cheapest store for an item */
export const findCheapestStore = (
  prices: PriceEntry[],
  stores: Store[]
): { store: Store; price: number; isSpecial: boolean } | null => {
  if (prices.length === 0) return null;

  let cheapest: PriceEntry | null = null;
  let cheapestPrice = Infinity;

  prices.forEach((p) => {
    const effectivePrice = p.isOnSpecial && p.specialPrice ? p.specialPrice : p.normalPrice;
    if (effectivePrice < cheapestPrice) {
      cheapestPrice = effectivePrice;
      cheapest = p;
    }
  });

  if (!cheapest) return null;
  const store = stores.find((s) => s.id === (cheapest as PriceEntry).storeId);
  if (!store) return null;

  return {
    store,
    price: cheapestPrice,
    isSpecial: (cheapest as PriceEntry).isOnSpecial,
  };
};

/** Smart Cart Optimizer - finds cheapest combination of stores */
export const optimizeCart = (
  selectedItems: { itemId: string; itemName: string; quantity: number }[],
  prices: PriceEntry[],
  stores: Store[]
): OptimizedCart => {
  const storeMap: Map<string, OptimizedCart['storeBreakdown'][0]> = new Map();
  let totalCost = 0;
  let totalSavings = 0;

  selectedItems.forEach(({ itemId, itemName }) => {
    const itemPrices = prices.filter((p) => p.itemId === itemId);
    if (itemPrices.length === 0) return;

    // Find cheapest option
    let cheapest: PriceEntry | null = null;
    let cheapestPrice = Infinity;
    let highestPrice = 0;

    itemPrices.forEach((p) => {
      const effectivePrice = p.isOnSpecial && p.specialPrice ? p.specialPrice : p.normalPrice;
      if (effectivePrice < cheapestPrice) {
        cheapestPrice = effectivePrice;
        cheapest = p;
      }
      if (p.normalPrice > highestPrice) {
        highestPrice = p.normalPrice;
      }
    });

    if (!cheapest) return;

    const store = stores.find((s) => s.id === (cheapest as PriceEntry).storeId);
    if (!store) return;

    const isSpecial = (cheapest as PriceEntry).isOnSpecial && (cheapest as PriceEntry).specialPrice !== undefined;

    if (!storeMap.has(store.id)) {
      storeMap.set(store.id, {
        storeId: store.id,
        storeName: store.name,
        storeColor: store.color,
        items: [],
        subtotal: 0,
      });
    }

    const storeEntry = storeMap.get(store.id)!;
    storeEntry.items.push({ itemId, itemName, price: cheapestPrice, isSpecial });
    storeEntry.subtotal += cheapestPrice;
    totalCost += cheapestPrice;
    totalSavings += highestPrice - cheapestPrice;
  });

  return {
    totalCost,
    totalSavings,
    storeBreakdown: Array.from(storeMap.values()),
  };
};

/** Generate a unique ID */
export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
};

/** Format date */
export const formatDate = (timestamp: number): string => {
  return new Date(timestamp).toLocaleDateString('en-NA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

/** Format relative date */
export const formatRelativeDate = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return formatDate(timestamp);
};

/** Check if a special is still active */
export const isSpecialActive = (entry: PriceEntry): boolean => {
  if (!entry.isOnSpecial || !entry.specialPrice) return false;
  if (entry.specialEndDate && entry.specialEndDate < Date.now()) return false;
  return true;
};

/** Get days until restock needed */
export const daysUntilRestock = (lastPurchased: number, frequency: number): number => {
  const nextDate = lastPurchased + frequency * 24 * 60 * 60 * 1000;
  const diff = nextDate - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

/** Debounce function */
export const debounce = <T extends (...args: any[]) => any>(fn: T, delay: number) => {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
};

/** Class names helper */
export const cn = (...classes: (string | boolean | undefined | null)[]): string => {
  return classes.filter(Boolean).join(' ');
};
