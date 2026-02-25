// ==========================================
// BasketBuddy - App Data Context
// Uses localStorage for offline-first, syncs to Firestore when available
// ==========================================

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import {
  Store, Category, GroceryItem, PriceEntry,
  ShoppingTrip, ShoppingTripItem, MonthlyBudget, RestockReminder,
  FinanceTransaction, FinancePlan,
} from '../types';
import { DEFAULT_STORES, DEFAULT_CATEGORIES, DEFAULT_ITEMS } from '../config/constants';
import { generateId } from '../utils/helpers';
import { useAuth } from './AuthContext';
import { loadUserData, saveUserData, type UserAppData } from '../services/firestore';
import { isFirebaseConfigured } from '../config/firebase';

// ── State Shape ──────────────────────────────────────────────
interface AppState {
  stores: Store[];
  categories: Category[];
  items: GroceryItem[];
  prices: PriceEntry[];
  trips: ShoppingTrip[];
  budgets: MonthlyBudget[];
  reminders: RestockReminder[];  transactions: FinanceTransaction[];
  financePlans: FinancePlan[];}

// ── Context Interface ────────────────────────────────────────
interface AppContextType extends AppState {
  // Stores
  addStore: (store: Omit<Store, 'id' | 'createdAt'>) => void;
  updateStore: (id: string, updates: Partial<Store>) => void;
  deleteStore: (id: string) => void;
  // Categories
  addCategory: (cat: Omit<Category, 'id'>) => void;
  updateCategory: (id: string, updates: Partial<Category>) => void;
  deleteCategory: (id: string) => void;
  // Items
  addItem: (item: Omit<GroceryItem, 'id' | 'createdAt'>) => void;
  updateItem: (id: string, updates: Partial<GroceryItem>) => void;
  deleteItem: (id: string) => void;
  // Prices
  setPrice: (entry: Omit<PriceEntry, 'id' | 'updatedAt'>) => void;
  updatePrice: (id: string, updates: Partial<PriceEntry>) => void;
  deletePrice: (id: string) => void;
  getPricesForItem: (itemId: string) => PriceEntry[];
  getPricesForStore: (storeId: string) => PriceEntry[];
  // Trips
  addTrip: (trip: Omit<ShoppingTrip, 'id' | 'createdAt'>) => void;
  updateTrip: (id: string, updates: Partial<ShoppingTrip>) => void;
  deleteTrip: (id: string) => void;
  addTripItem: (tripId: string, item: Omit<ShoppingTripItem, 'id'>) => void;
  updateTripItem: (tripId: string, itemId: string, updates: Partial<ShoppingTripItem>) => void;
  removeTripItem: (tripId: string, itemId: string) => void;
  // Budgets
  setBudget: (budget: Omit<MonthlyBudget, 'id' | 'createdAt'>) => void;
  updateBudget: (id: string, updates: Partial<MonthlyBudget>) => void;
  // Reminders
  addReminder: (reminder: Omit<RestockReminder, 'id'>) => void;
  updateReminder: (id: string, updates: Partial<RestockReminder>) => void;
  deleteReminder: (id: string) => void;
  // Finance Transactions
  addTransaction: (tx: Omit<FinanceTransaction, 'id' | 'createdAt'>) => void;
  updateTransaction: (id: string, updates: Partial<FinanceTransaction>) => void;
  deleteTransaction: (id: string) => void;
  // Finance Plans
  setFinancePlan: (plan: Omit<FinancePlan, 'id' | 'createdAt'>) => void;
  // Helpers
  getStore: (id: string) => Store | undefined;
  getCategory: (id: string) => Category | undefined;
  getItem: (id: string) => GroceryItem | undefined;
  // Sync
  syncNow: () => Promise<void>;
  syncStatus: 'idle' | 'saving' | 'saved' | 'error';
  ready: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEY = 'bb-app-data';

/** One-time migration: split old 'fruits-veg' into separate Fruits + Vegetables */
function migrateCategories(categories: typeof DEFAULT_CATEGORIES): typeof DEFAULT_CATEGORIES {
  const hasFruitsVeg = categories.some((c) => c.id === 'fruits-veg');
  const hasFruits = categories.some((c) => c.id === 'fruits');
  const hasVegetables = categories.some((c) => c.id === 'vegetables');
  if (!hasFruitsVeg) return categories; // already migrated
  return [
    ...categories.filter((c) => c.id !== 'fruits-veg'),
    ...(hasFruits ? [] : [{ id: 'fruits', name: 'Fruits', icon: '🍎', color: '#f97316', isCustom: false } as const]),
    ...(hasVegetables ? [] : [{ id: 'vegetables', name: 'Vegetables', icon: '🥬', color: '#4CAF50', isCustom: false } as const]),
  ];
}

/** Migrate item categoryIds — replace old 'fruits-veg' with 'fruits' */
function migrateItems(items: GroceryItem[]): GroceryItem[] {
  return items.map((item) =>
    item.categoryId === 'fruits-veg' ? { ...item, categoryId: 'fruits' } : item
  );
}

function loadState(): AppState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      const rawItems: GroceryItem[] = Array.isArray(parsed.items) ? parsed.items : [];
      const migratedItems = migrateItems(rawItems);
      return {
        stores: parsed.stores?.length ? parsed.stores : DEFAULT_STORES,
        categories: migrateCategories(parsed.categories?.length ? parsed.categories : DEFAULT_CATEGORIES),
        // Always guarantee at least DEFAULT_ITEMS
        items: migratedItems.length > 0 ? migratedItems : DEFAULT_ITEMS,
        prices: parsed.prices || [],
        trips: parsed.trips || [],
        budgets: parsed.budgets || [],
        reminders: parsed.reminders || [],
        transactions: parsed.transactions || [],
        financePlans: parsed.financePlans || [],
      };
    }
  } catch (e) {
    console.error('Failed to load state:', e);
  }
  return {
    stores: DEFAULT_STORES,
    categories: DEFAULT_CATEGORIES,
    items: DEFAULT_ITEMS,
    prices: [],
    trips: [],
    budgets: [],
    reminders: [],
    transactions: [],
    financePlans: [],
  };
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isDemo } = useAuth();
  const [state, setState] = useState<AppState>(loadState);
  // ready starts true — items render immediately from local/default state.
  // Firestore syncs in the background and updates state when done.
  const [ready, setReady] = useState(true);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDirtyRef = useRef(false);
  // Guard: do NOT auto-save until the initial Firestore load has finished.
  // (ready starts true for instant local render, but that also unblocks the
  //  auto-save effect — this separate ref prevents a race where a save fires
  //  mid-load and overwrites cloud data with empty/default local state.)
  const firestoreLoadedRef = useRef(false);

  /** Wraps setState and marks data as needing a Firestore save */
  const setDirtyState: typeof setState = useCallback((value) => {
    isDirtyRef.current = true;
    setState(value);
  }, []);

  // Load data from Firestore when user logs in
  useEffect(() => {
    // ── DIAGNOSTICS ─────────────────────────────────────────
    console.group('%c[BasketBuddy] Auth & Firebase status', 'color:#6366f1;font-weight:bold');
    console.log('user:', user ? `✅ ${user.email} (uid: ${user.uid})` : '❌ null');
    console.log('isDemo:', isDemo);
    console.log('isFirebaseConfigured:', isFirebaseConfigured);
    console.log('VITE_FIREBASE_PROJECT_ID:', import.meta.env.VITE_FIREBASE_PROJECT_ID || '❌ undefined — restart dev server!');
    console.groupEnd();
    // ────────────────────────────────────────────────────────

    if (!user) return;
    if (isDemo || !isFirebaseConfigured) {
      setReady(true);
      return;
    }

    let cancelled = false;
    (async () => {
      let needsDefaultsSaved = false;
      try {
        const cloudData = await loadUserData(user.uid);
        if (cancelled) return;
        if (cloudData) {
          const migratedCats = migrateCategories(
            cloudData.categories?.length ? cloudData.categories : DEFAULT_CATEGORIES
          );
          const resolvedItems = cloudData.items?.length
            ? migrateItems(cloudData.items)
            : DEFAULT_ITEMS;
          const loaded: AppState = {
            stores: cloudData.stores?.length ? cloudData.stores : DEFAULT_STORES,
            categories: migratedCats,
            items: resolvedItems,
            prices: cloudData.prices || [],
            trips: cloudData.trips || [],
            budgets: cloudData.budgets || [],
            reminders: cloudData.reminders || [],
            transactions: cloudData.transactions || [],
            financePlans: cloudData.financePlans || [],
          };
          // Track whether defaults were injected so we save them back
          needsDefaultsSaved = !cloudData.items?.length;
          setState(loaded);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(loaded));
          console.log('[AppContext] Loaded data from Firestore, items:', resolvedItems.length, needsDefaultsSaved ? '(defaults injected — will save)' : '');
        } else {
          // First-time user — save current local data to Firestore immediately
          const current = loadState();
          setState(current);
          try {
            await saveUserData(user.uid, current);
            console.log('[AppContext] Initialized Firestore with default data');
          } catch (saveErr: any) {
            console.error('[AppContext] Failed to init Firestore:', saveErr);
            if (saveErr?.code === 'permission-denied') {
              toast.error('Firestore permission denied. Update your security rules.', { duration: 8000 });
            }
          }
        }
      } catch (e) {
        console.error('[AppContext] Firestore load failed, using local:', e);
      } finally {
        if (!cancelled) {
          firestoreLoadedRef.current = true;
          // Only clear dirty flag when no defaults need to be saved back
          isDirtyRef.current = needsDefaultsSaved;
          setReady(true);
        }
      }
    })();

    return () => {
      cancelled = true;
      // Reset on user-change so a new login re-gates the auto-save
      firestoreLoadedRef.current = false;
    };
  }, [user, isDemo]);

  // Persist to localStorage on every change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  // Safety net: whenever items are empty, restore defaults immediately
  useEffect(() => {
    if (state.items.length === 0) {
      console.warn('[AppContext] items empty — restoring DEFAULT_ITEMS');
      setDirtyState((s) => ({ ...s, items: DEFAULT_ITEMS }));
    }
  }, [state.items.length]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Force-save current state to Firestore immediately, bypassing the dirty flag */
  const syncNow = useCallback(async () => {
    console.group('%c[BasketBuddy] syncNow', 'color:#22c55e;font-weight:bold');
    console.log('user:', user ? `✅ ${user.email}` : '❌ not signed in');
    console.log('isDemo:', isDemo);
    console.log('isFirebaseConfigured:', isFirebaseConfigured);
    console.log('items count:', state.items.length);
    console.log('stores count:', state.stores.length);
    console.groupEnd();

    if (!user || isDemo || !isFirebaseConfigured) {
      toast.error(!user ? 'Not signed in.' : isDemo ? 'Demo mode — no cloud sync.' : 'Firebase not configured — check .env and restart dev server.');
      return;
    }
    setSyncStatus('saving');
    try {
      await saveUserData(user.uid, state);
      isDirtyRef.current = false;
      setSyncStatus('saved');
      toast.success('Data synced to cloud ✓');
      setTimeout(() => setSyncStatus('idle'), 3000);
    } catch (err: any) {
      setSyncStatus('error');
      console.error('[AppContext] syncNow FAILED:', err);
      if (err?.code === 'permission-denied') {
        toast.error(
          '⚠️ Permission denied — update Firestore security rules in Firebase Console.',
          { duration: 10000, id: 'fs-perm' }
        );
      } else {
        toast.error('Sync failed: ' + (err?.message || 'unknown error'), { id: 'fs-err' });
      }
    }
  }, [user, isDemo, state]);

  // Debounced auto-save to Firestore — only fires when isDirtyRef is true
  useEffect(() => {
    if (!user || isDemo || !isFirebaseConfigured || !firestoreLoadedRef.current) return;
    if (!isDirtyRef.current) return;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      console.log('[AppContext] Auto-saving to Firestore…');
      setSyncStatus('saving');
      try {
        await saveUserData(user.uid, state);
        isDirtyRef.current = false;
        setSyncStatus('saved');
        console.log('[AppContext] Saved to Firestore ✓');
        setTimeout(() => setSyncStatus('idle'), 3000);
      } catch (err: any) {
        setSyncStatus('error');
        console.error('[AppContext] Firestore save FAILED:', err);
        if (err?.code === 'permission-denied') {
          toast.error(
            '⚠️ Firestore permission denied — update your security rules.',
            { duration: 10000, id: 'fs-perm' }
          );
        } else {
          toast.error('Cloud sync failed: ' + (err?.message || 'unknown error'), { id: 'fs-err' });
        }
      }
    }, 1000);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [state, user, isDemo, ready]);

  // ── Store CRUD ─────────────────────────────────────────────
  const addStore = useCallback((store: Omit<Store, 'id' | 'createdAt'>) => {
    setDirtyState((s) => ({
      ...s,
      stores: [...s.stores, { ...store, id: generateId(), createdAt: Date.now() }],
    }));
  }, [setDirtyState]);

  const updateStore = useCallback((id: string, updates: Partial<Store>) => {
    setDirtyState((s) => ({
      ...s,
      stores: s.stores.map((st) => (st.id === id ? { ...st, ...updates } : st)),
    }));
  }, [setDirtyState]);

  const deleteStore = useCallback((id: string) => {
    setDirtyState((s) => ({
      ...s,
      stores: s.stores.filter((st) => st.id !== id),
      prices: s.prices.filter((p) => p.storeId !== id),
    }));
  }, [setDirtyState]);

  // ── Category CRUD ──────────────────────────────────────────
  const addCategory = useCallback((cat: Omit<Category, 'id'>) => {
    setDirtyState((s) => ({
      ...s,
      categories: [...s.categories, { ...cat, id: generateId() }],
    }));
  }, [setDirtyState]);

  const updateCategory = useCallback((id: string, updates: Partial<Category>) => {
    setDirtyState((s) => ({
      ...s,
      categories: s.categories.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    }));
  }, [setDirtyState]);

  const deleteCategory = useCallback((id: string) => {
    setDirtyState((s) => ({
      ...s,
      categories: s.categories.filter((c) => c.id !== id),
    }));
  }, [setDirtyState]);

  // ── Item CRUD ──────────────────────────────────────────────
  const addItem = useCallback((item: Omit<GroceryItem, 'id' | 'createdAt'>) => {
    setDirtyState((s) => ({
      ...s,
      items: [...s.items, { ...item, id: generateId(), createdAt: Date.now() }],
    }));
  }, [setDirtyState]);

  const updateItem = useCallback((id: string, updates: Partial<GroceryItem>) => {
    setDirtyState((s) => ({
      ...s,
      items: s.items.map((i) => (i.id === id ? { ...i, ...updates } : i)),
    }));
  }, [setDirtyState]);

  const deleteItem = useCallback((id: string) => {
    setDirtyState((s) => ({
      ...s,
      items: s.items.filter((i) => i.id !== id),
      prices: s.prices.filter((p) => p.itemId !== id),
    }));
  }, [setDirtyState]);

  // ── Price CRUD ─────────────────────────────────────────────
  const setPrice = useCallback((entry: Omit<PriceEntry, 'id' | 'updatedAt'>) => {
    setDirtyState((s) => {
      const existing = s.prices.find(
        (p) => p.itemId === entry.itemId && p.storeId === entry.storeId
      );
      if (existing) {
        return {
          ...s,
          prices: s.prices.map((p) =>
            p.id === existing.id ? { ...p, ...entry, updatedAt: Date.now() } : p
          ),
        };
      }
      return {
        ...s,
        prices: [...s.prices, { ...entry, id: generateId(), updatedAt: Date.now() }],
      };
    });
  }, [setDirtyState]);

  const updatePrice = useCallback((id: string, updates: Partial<PriceEntry>) => {
    setDirtyState((s) => ({
      ...s,
      prices: s.prices.map((p) => (p.id === id ? { ...p, ...updates, updatedAt: Date.now() } : p)),
    }));
  }, [setDirtyState]);

  const deletePrice = useCallback((id: string) => {
    setDirtyState((s) => ({ ...s, prices: s.prices.filter((p) => p.id !== id) }));
  }, [setDirtyState]);

  const getPricesForItem = useCallback(
    (itemId: string) => state.prices.filter((p) => p.itemId === itemId),
    [state.prices]
  );

  const getPricesForStore = useCallback(
    (storeId: string) => state.prices.filter((p) => p.storeId === storeId),
    [state.prices]
  );

  // ── Trip CRUD ──────────────────────────────────────────────
  const addTrip = useCallback((trip: Omit<ShoppingTrip, 'id' | 'createdAt'>) => {
    setDirtyState((s) => ({
      ...s,
      trips: [...s.trips, { ...trip, id: generateId(), createdAt: Date.now() }],
    }));
  }, [setDirtyState]);

  const updateTrip = useCallback((id: string, updates: Partial<ShoppingTrip>) => {
    setDirtyState((s) => ({
      ...s,
      trips: s.trips.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    }));
  }, [setDirtyState]);

  const deleteTrip = useCallback((id: string) => {
    setDirtyState((s) => ({ ...s, trips: s.trips.filter((t) => t.id !== id) }));
  }, [setDirtyState]);

  const addTripItem = useCallback((tripId: string, item: Omit<ShoppingTripItem, 'id'>) => {
    setDirtyState((s) => ({
      ...s,
      trips: s.trips.map((t) =>
        t.id === tripId
          ? { ...t, items: [...t.items, { ...item, id: generateId() }] }
          : t
      ),
    }));
  }, [setDirtyState]);

  const updateTripItem = useCallback(
    (tripId: string, itemId: string, updates: Partial<ShoppingTripItem>) => {
      setDirtyState((s) => ({
        ...s,
        trips: s.trips.map((t) =>
          t.id === tripId
            ? {
                ...t,
                items: t.items.map((i) => (i.id === itemId ? { ...i, ...updates } : i)),
              }
            : t
        ),
      }));
    },
    [setDirtyState]
  );

  const removeTripItem = useCallback((tripId: string, itemId: string) => {
    setDirtyState((s) => ({
      ...s,
      trips: s.trips.map((t) =>
        t.id === tripId ? { ...t, items: t.items.filter((i) => i.id !== itemId) } : t
      ),
    }));
  }, [setDirtyState]);

  // ── Budget CRUD ────────────────────────────────────────────
  const setBudget = useCallback((budget: Omit<MonthlyBudget, 'id' | 'createdAt'>) => {
    setDirtyState((s) => {
      const existing = s.budgets.find(
        (b) => b.month === budget.month && b.year === budget.year
      );
      if (existing) {
        return {
          ...s,
          budgets: s.budgets.map((b) =>
            b.id === existing.id ? { ...b, ...budget } : b
          ),
        };
      }
      return {
        ...s,
        budgets: [...s.budgets, { ...budget, id: generateId(), createdAt: Date.now() }],
      };
    });
  }, [setDirtyState]);

  const updateBudget = useCallback((id: string, updates: Partial<MonthlyBudget>) => {
    setDirtyState((s) => ({
      ...s,
      budgets: s.budgets.map((b) => (b.id === id ? { ...b, ...updates } : b)),
    }));
  }, [setDirtyState]);

  // ── Reminder CRUD ──────────────────────────────────────────
  const addReminder = useCallback((reminder: Omit<RestockReminder, 'id'>) => {
    setDirtyState((s) => ({
      ...s,
      reminders: [...s.reminders, { ...reminder, id: generateId() }],
    }));
  }, [setDirtyState]);

  const updateReminder = useCallback((id: string, updates: Partial<RestockReminder>) => {
    setDirtyState((s) => ({
      ...s,
      reminders: s.reminders.map((r) => (r.id === id ? { ...r, ...updates } : r)),
    }));
  }, [setDirtyState]);

  const deleteReminder = useCallback((id: string) => {
    setDirtyState((s) => ({ ...s, reminders: s.reminders.filter((r) => r.id !== id) }));
  }, [setDirtyState]);

  // ── Finance Transaction CRUD ───────────────────────────────
  const addTransaction = useCallback((tx: Omit<FinanceTransaction, 'id' | 'createdAt'>) => {
    setDirtyState((s) => ({
      ...s,
      transactions: [...s.transactions, { ...tx, id: generateId(), createdAt: Date.now() }],
    }));
  }, [setDirtyState]);

  const updateTransaction = useCallback((id: string, updates: Partial<FinanceTransaction>) => {
    setDirtyState((s) => ({
      ...s,
      transactions: s.transactions.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    }));
  }, [setDirtyState]);

  const deleteTransaction = useCallback((id: string) => {
    setDirtyState((s) => ({ ...s, transactions: s.transactions.filter((t) => t.id !== id) }));
  }, [setDirtyState]);

  // ── Finance Plan CRUD ──────────────────────────────────────
  const setFinancePlan = useCallback((plan: Omit<FinancePlan, 'id' | 'createdAt'>) => {
    setDirtyState((s) => {
      const existing = s.financePlans.find(
        (p) => p.month === plan.month && p.year === plan.year
      );
      if (existing) {
        return {
          ...s,
          financePlans: s.financePlans.map((p) =>
            p.id === existing.id ? { ...p, ...plan } : p
          ),
        };
      }
      return {
        ...s,
        financePlans: [...s.financePlans, { ...plan, id: generateId(), createdAt: Date.now() }],
      };
    });
  }, [setDirtyState]);

  // ── Lookup Helpers ─────────────────────────────────────────
  const getStore = useCallback((id: string) => state.stores.find((s) => s.id === id), [state.stores]);
  const getCategory = useCallback((id: string) => state.categories.find((c) => c.id === id), [state.categories]);
  const getItem = useCallback((id: string) => state.items.find((i) => i.id === id), [state.items]);

  return (
    <AppContext.Provider
      value={{
        ...state,
        addStore, updateStore, deleteStore,
        addCategory, updateCategory, deleteCategory,
        addItem, updateItem, deleteItem,
        setPrice, updatePrice, deletePrice, getPricesForItem, getPricesForStore,
        addTrip, updateTrip, deleteTrip, addTripItem, updateTripItem, removeTripItem,
        setBudget, updateBudget,
        addReminder, updateReminder, deleteReminder,
        addTransaction, updateTransaction, deleteTransaction,
        setFinancePlan,
        getStore, getCategory, getItem,
        syncNow, syncStatus, ready,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};
