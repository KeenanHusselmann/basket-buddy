// ==========================================
// BasketBuddy - App Data Context
// Uses localStorage for offline-first, syncs to Firestore when available
// ==========================================

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import {
  Store, Category, GroceryItem, PriceEntry,
  ShoppingTrip, ShoppingTripItem, MonthlyBudget, RestockReminder,
} from '../types';
import { DEFAULT_STORES, DEFAULT_CATEGORIES } from '../config/constants';
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
  reminders: RestockReminder[];
}

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
  // Helpers
  getStore: (id: string) => Store | undefined;
  getCategory: (id: string) => Category | undefined;
  getItem: (id: string) => GroceryItem | undefined;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEY = 'bb-app-data';

function loadState(): AppState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        stores: parsed.stores || DEFAULT_STORES,
        categories: parsed.categories || DEFAULT_CATEGORIES,
        items: parsed.items || [],
        prices: parsed.prices || [],
        trips: parsed.trips || [],
        budgets: parsed.budgets || [],
        reminders: parsed.reminders || [],
      };
    }
  } catch (e) {
    console.error('Failed to load state:', e);
  }
  return {
    stores: DEFAULT_STORES,
    categories: DEFAULT_CATEGORIES,
    items: [],
    prices: [],
    trips: [],
    budgets: [],
    reminders: [],
  };
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isDemo } = useAuth();
  const [state, setState] = useState<AppState>(loadState);
  const [firestoreLoaded, setFirestoreLoaded] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialLoad = useRef(true);

  // Load data from Firestore when user logs in
  useEffect(() => {
    if (!user) return;
    if (isDemo || !isFirebaseConfigured) {
      setFirestoreLoaded(true);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const cloudData = await loadUserData(user.uid);
        if (cancelled) return;
        if (cloudData) {
          const loaded: AppState = {
            stores: cloudData.stores?.length ? cloudData.stores : DEFAULT_STORES,
            categories: cloudData.categories?.length ? cloudData.categories : DEFAULT_CATEGORIES,
            items: cloudData.items || [],
            prices: cloudData.prices || [],
            trips: cloudData.trips || [],
            budgets: cloudData.budgets || [],
            reminders: cloudData.reminders || [],
          };
          setState(loaded);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(loaded));
          console.log('[AppContext] Loaded data from Firestore');
        } else {
          // First-time user — save current local state to Firestore
          const current = loadState();
          setState(current);
          await saveUserData(user.uid, current);
          console.log('[AppContext] Initialized Firestore with default data');
        }
      } catch (e) {
        console.error('[AppContext] Firestore load failed, using local:', e);
      } finally {
        if (!cancelled) {
          setFirestoreLoaded(true);
          isInitialLoad.current = false;
        }
      }
    })();

    return () => { cancelled = true; };
  }, [user, isDemo]);

  // Persist to localStorage on every change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  // Debounced save to Firestore on state changes
  useEffect(() => {
    if (!user || isDemo || !isFirebaseConfigured || !firestoreLoaded) return;
    if (isInitialLoad.current) return;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveUserData(user.uid, state);
    }, 1500); // debounce 1.5s

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [state, user, isDemo, firestoreLoaded]);

  // ── Store CRUD ─────────────────────────────────────────────
  const addStore = useCallback((store: Omit<Store, 'id' | 'createdAt'>) => {
    setState((s) => ({
      ...s,
      stores: [...s.stores, { ...store, id: generateId(), createdAt: Date.now() }],
    }));
  }, []);

  const updateStore = useCallback((id: string, updates: Partial<Store>) => {
    setState((s) => ({
      ...s,
      stores: s.stores.map((st) => (st.id === id ? { ...st, ...updates } : st)),
    }));
  }, []);

  const deleteStore = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      stores: s.stores.filter((st) => st.id !== id),
      prices: s.prices.filter((p) => p.storeId !== id),
    }));
  }, []);

  // ── Category CRUD ──────────────────────────────────────────
  const addCategory = useCallback((cat: Omit<Category, 'id'>) => {
    setState((s) => ({
      ...s,
      categories: [...s.categories, { ...cat, id: generateId() }],
    }));
  }, []);

  const updateCategory = useCallback((id: string, updates: Partial<Category>) => {
    setState((s) => ({
      ...s,
      categories: s.categories.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    }));
  }, []);

  const deleteCategory = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      categories: s.categories.filter((c) => c.id !== id),
    }));
  }, []);

  // ── Item CRUD ──────────────────────────────────────────────
  const addItem = useCallback((item: Omit<GroceryItem, 'id' | 'createdAt'>) => {
    setState((s) => ({
      ...s,
      items: [...s.items, { ...item, id: generateId(), createdAt: Date.now() }],
    }));
  }, []);

  const updateItem = useCallback((id: string, updates: Partial<GroceryItem>) => {
    setState((s) => ({
      ...s,
      items: s.items.map((i) => (i.id === id ? { ...i, ...updates } : i)),
    }));
  }, []);

  const deleteItem = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      items: s.items.filter((i) => i.id !== id),
      prices: s.prices.filter((p) => p.itemId !== id),
    }));
  }, []);

  // ── Price CRUD ─────────────────────────────────────────────
  const setPrice = useCallback((entry: Omit<PriceEntry, 'id' | 'updatedAt'>) => {
    setState((s) => {
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
  }, []);

  const updatePrice = useCallback((id: string, updates: Partial<PriceEntry>) => {
    setState((s) => ({
      ...s,
      prices: s.prices.map((p) => (p.id === id ? { ...p, ...updates, updatedAt: Date.now() } : p)),
    }));
  }, []);

  const deletePrice = useCallback((id: string) => {
    setState((s) => ({ ...s, prices: s.prices.filter((p) => p.id !== id) }));
  }, []);

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
    setState((s) => ({
      ...s,
      trips: [...s.trips, { ...trip, id: generateId(), createdAt: Date.now() }],
    }));
  }, []);

  const updateTrip = useCallback((id: string, updates: Partial<ShoppingTrip>) => {
    setState((s) => ({
      ...s,
      trips: s.trips.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    }));
  }, []);

  const deleteTrip = useCallback((id: string) => {
    setState((s) => ({ ...s, trips: s.trips.filter((t) => t.id !== id) }));
  }, []);

  const addTripItem = useCallback((tripId: string, item: Omit<ShoppingTripItem, 'id'>) => {
    setState((s) => ({
      ...s,
      trips: s.trips.map((t) =>
        t.id === tripId
          ? { ...t, items: [...t.items, { ...item, id: generateId() }] }
          : t
      ),
    }));
  }, []);

  const updateTripItem = useCallback(
    (tripId: string, itemId: string, updates: Partial<ShoppingTripItem>) => {
      setState((s) => ({
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
    []
  );

  const removeTripItem = useCallback((tripId: string, itemId: string) => {
    setState((s) => ({
      ...s,
      trips: s.trips.map((t) =>
        t.id === tripId ? { ...t, items: t.items.filter((i) => i.id !== itemId) } : t
      ),
    }));
  }, []);

  // ── Budget CRUD ────────────────────────────────────────────
  const setBudget = useCallback((budget: Omit<MonthlyBudget, 'id' | 'createdAt'>) => {
    setState((s) => {
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
  }, []);

  const updateBudget = useCallback((id: string, updates: Partial<MonthlyBudget>) => {
    setState((s) => ({
      ...s,
      budgets: s.budgets.map((b) => (b.id === id ? { ...b, ...updates } : b)),
    }));
  }, []);

  // ── Reminder CRUD ──────────────────────────────────────────
  const addReminder = useCallback((reminder: Omit<RestockReminder, 'id'>) => {
    setState((s) => ({
      ...s,
      reminders: [...s.reminders, { ...reminder, id: generateId() }],
    }));
  }, []);

  const updateReminder = useCallback((id: string, updates: Partial<RestockReminder>) => {
    setState((s) => ({
      ...s,
      reminders: s.reminders.map((r) => (r.id === id ? { ...r, ...updates } : r)),
    }));
  }, []);

  const deleteReminder = useCallback((id: string) => {
    setState((s) => ({ ...s, reminders: s.reminders.filter((r) => r.id !== id) }));
  }, []);

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
        getStore, getCategory, getItem,
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
