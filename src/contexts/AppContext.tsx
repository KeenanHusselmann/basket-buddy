// ==========================================
// BasketBuddy - App Data Context
// Uses localStorage for offline-first, syncs to Firestore when available
// ==========================================

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import {
  Store, Category, GroceryItem, PriceEntry,
  ShoppingTrip, ShoppingTripItem, MonthlyBudget, RestockReminder,
  FinanceTransaction, FinancePlan, SavingsGoal, SavingsContribution,
} from '../types';
import { DEFAULT_STORES, DEFAULT_CATEGORIES, DEFAULT_ITEMS } from '../config/constants';
import { generateId } from '../utils/helpers';
import { useAuth } from './AuthContext';
import { loadUserData, saveUserData, fastSaveUserData, type UserAppData, type PendingDelete } from '../services/firestore';
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
  financePlans: FinancePlan[];
  savingsGoals: SavingsGoal[];
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
  // Finance Transactions
  addTransaction: (tx: Omit<FinanceTransaction, 'id' | 'createdAt'>) => void;
  updateTransaction: (id: string, updates: Partial<FinanceTransaction>) => void;
  deleteTransaction: (id: string) => void;
  // Finance Plans
  setFinancePlan: (plan: Omit<FinancePlan, 'id' | 'createdAt'>) => void;
  // Savings Goals
  addSavingsGoal: (goal: Omit<SavingsGoal, 'id' | 'createdAt' | 'contributions'>) => void;
  updateSavingsGoal: (id: string, updates: Partial<Omit<SavingsGoal, 'contributions'>>) => void;
  deleteSavingsGoal: (id: string) => void;
  addSavingsContribution: (goalId: string, contribution: Omit<SavingsContribution, 'id'>) => void;
  deleteSavingsContribution: (goalId: string, contributionId: string) => void;
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
// Set when local state has unsaved changes, cleared after a successful Firestore write.
// Survives a hard refresh so we can detect that localStorage is newer than Firestore.
const PENDING_KEY = 'bb-pending-save';

/** One-time migration: split old 'fruits-veg' into separate Fruits + Vegetables */
function migrateCategories(categories: typeof DEFAULT_CATEGORIES): typeof DEFAULT_CATEGORIES {
  let result = categories;

  // Migration 1: split 'fruits-veg' → 'fruits' + 'vegetables'
  const hasFruitsVeg = result.some((c) => c.id === 'fruits-veg');
  if (hasFruitsVeg) {
    const hasFruits = result.some((c) => c.id === 'fruits');
    const hasVegetables = result.some((c) => c.id === 'vegetables');
    result = [
      ...result.filter((c) => c.id !== 'fruits-veg'),
      ...(hasFruits ? [] : [{ id: 'fruits', name: 'Fruits', icon: '🍎', color: '#f97316', isCustom: false } as const]),
      ...(hasVegetables ? [] : [{ id: 'vegetables', name: 'Vegetables', icon: '🥬', color: '#4CAF50', isCustom: false } as const]),
    ];
  }

  // Migration 2: rename 'Spices & Condiments' → 'Spices' and inject 'Condiments'
  const hasCondiments = result.some((c) => c.id === 'condiments');
  if (!hasCondiments) {
    result = result.map((c) =>
      c.id === 'spices' ? { ...c, name: 'Spices' } : c
    );
    result = [...result, { id: 'condiments', name: 'Condiments', icon: '🫙', color: '#A0522D', isCustom: false }];
  }

  return result;
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
        savingsGoals: parsed.savingsGoals || [],
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
    savingsGoals: [],
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
  // Tracks explicit deletes so fastSaveUserData can remove them without a getDocs read
  const pendingDeletesRef = useRef<PendingDelete[]>([]);
  // When Firestore quota is exhausted, pause auto-saves until this timestamp.
  const quotaPausedUntilRef = useRef<number>(0);
  // Gate auto-save until the initial Firestore load is complete.
  // Must be real state (not a ref) so flipping it triggers the auto-save
  // effect to re-run and notice any dirty changes queued during load.
  const [firestoreLoaded, setFirestoreLoaded] = useState(false);

  /** Wraps setState and marks data as needing a Firestore save */
  const setDirtyState: typeof setState = useCallback((value) => {
    isDirtyRef.current = true;
    localStorage.setItem(PENDING_KEY, '1'); // survives hard-refresh
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
      setFirestoreLoaded(true);
      setReady(true);
      return;
    }

    let cancelled = false;
    (async () => {
      let needsDefaultsSaved = false;
      try {
        const cloudData = await loadUserData(user.uid);
        if (cancelled) return;
        const hasPendingLocalSave = localStorage.getItem(PENDING_KEY) === '1';

        if (cloudData && !hasPendingLocalSave) {
          // Normal case: Firestore has the latest data — load it.
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
            savingsGoals: cloudData.savingsGoals || [],
          };
          // Track whether defaults were injected so we save them back
          needsDefaultsSaved = !cloudData.items?.length;
          setState(loaded);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(loaded));
          console.log('[AppContext] Loaded data from Firestore, items:', resolvedItems.length, needsDefaultsSaved ? '(defaults injected — will save)' : '');
        } else {
          // Either first-time user OR local has unsaved changes from before a
          // hard-refresh (PENDING_KEY was set). In both cases, local state is
          // the source of truth — save it up to Firestore now.
          const current = loadState();
          setState(current);
          if (hasPendingLocalSave) {
            console.log('[AppContext] Pending local changes detected — saving local state to Firestore');
          } else {
            console.log('[AppContext] First-time user — initialising Firestore with local/default data');
          }
          try {
            await saveUserData(user.uid, current);
            localStorage.removeItem(PENDING_KEY);
            console.log('[AppContext] Saved local state to Firestore ✓');
          } catch (saveErr: any) {
            console.error('[AppContext] Failed to save to Firestore:', saveErr);
            if (saveErr?.code === 'permission-denied') {
              toast.error('Firestore permission denied. Update your security rules.', { duration: 8000 });
            }
          }
        }
      } catch (e) {
        console.error('[AppContext] Firestore load failed, using local:', e);
      } finally {
        if (!cancelled) {
          // Only clear dirty flag when no defaults need to be saved back
          isDirtyRef.current = needsDefaultsSaved;
          setFirestoreLoaded(true);
          setReady(true);
        }
      }
    })();

    return () => {
      cancelled = true;
      // Reset on user-change so a new login re-gates the auto-save
      setFirestoreLoaded(false);
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

  /** Reject a promise after `ms` milliseconds — prevents the spinner sticking on mobile */
  const withSyncTimeout = <T,>(p: Promise<T>, ms = 20000): Promise<T> =>
    Promise.race([
      p,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('Sync timed out — check your connection')), ms)
      ),
    ]);

  /** Centralised error handler for Firestore save failures */
  const handleSyncError = (err: any, source: 'syncNow' | 'auto') => {
    setSyncStatus('error');
    setTimeout(() => setSyncStatus('idle'), 5000);
    console.error(`[AppContext] ${source} FAILED:`, err);
    if (err?.code === 'resource-exhausted') {
      // Pause all auto-saves for 5 minutes to let quota recover
      quotaPausedUntilRef.current = Date.now() + 5 * 60 * 1000;
      toast.error(
        '⚠️ Firestore free-tier quota exceeded. Saves paused for 5 min. Your data is safe in local storage.',
        { duration: 12000, id: 'fs-quota' }
      );
    } else if (err?.code === 'permission-denied') {
      toast.error(
        '⚠️ Permission denied — update Firestore security rules in Firebase Console.',
        { duration: 10000, id: 'fs-perm' }
      );
    } else {
      toast.error(
        (source === 'syncNow' ? 'Sync' : 'Cloud sync') + ' failed: ' + (err?.message || 'unknown error'),
        { id: 'fs-err' }
      );
    }
  };

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
    if (Date.now() < quotaPausedUntilRef.current) {
      toast.error('Quota recovery in progress — try again in a few minutes.', { id: 'fs-quota' });
      return;
    }
    setSyncStatus('saving');
    try {
      await withSyncTimeout(saveUserData(user.uid, state));
      isDirtyRef.current = false;
      localStorage.removeItem(PENDING_KEY);
      setSyncStatus('saved');
      toast.success('Data synced to cloud ✓');
      setTimeout(() => setSyncStatus('idle'), 3000);
    } catch (err: any) {
      handleSyncError(err, 'syncNow');
    }
  }, [user, isDemo, state]);  // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced auto-save to Firestore — only fires when isDirtyRef is true
  useEffect(() => {
    if (!user || isDemo || !isFirebaseConfigured || !firestoreLoaded) return;
    if (!isDirtyRef.current) return;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    // 3 s debounce: batches rapid changes while saving quickly enough that
    // a page reload within a few seconds still captures the data.
    saveTimerRef.current = setTimeout(async () => {
      if (Date.now() < quotaPausedUntilRef.current) {
        console.log('[AppContext] Auto-save skipped — quota pause active');
        return;
      }
      console.log('[AppContext] Auto-saving to Firestore…');
      setSyncStatus('saving');
      const deletesToFlush = [...pendingDeletesRef.current];
      try {
        // Fast path: upsert-only (no getDocs reads) + targeted deletes ~3x faster
        await withSyncTimeout(fastSaveUserData(user.uid, state, deletesToFlush), 45_000);
        isDirtyRef.current = false;
        pendingDeletesRef.current = pendingDeletesRef.current.slice(deletesToFlush.length);
        localStorage.removeItem(PENDING_KEY);
        setSyncStatus('saved');
        console.log('[AppContext] Saved to Firestore ✓');
        setTimeout(() => setSyncStatus('idle'), 3000);
      } catch (err: any) {
        const isTimeout = err?.message?.includes('timed out');
        if (isTimeout) {
          // Data is safe in localStorage (PENDING_KEY is still set).
          // Leave isDirtyRef true so the next state change triggers a retry.
          setSyncStatus('idle');
          console.warn('[AppContext] Auto-save timed out — will retry on next change. Data is safe locally.');
        } else {
          handleSyncError(err, 'auto');
        }
      }
    }, 3_000);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [state, user, isDemo, firestoreLoaded]);

  // Save immediately when the user navigates away or closes the tab
  useEffect(() => {
    if (!user || isDemo || !isFirebaseConfigured) return;

    const saveIfDirty = () => {
      if (!isDirtyRef.current || Date.now() < quotaPausedUntilRef.current) return;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      // Fire-and-forget — best effort before the page unloads
      saveUserData(user.uid, state).then(() => {
        isDirtyRef.current = false;
        localStorage.removeItem(PENDING_KEY);
        console.log('[AppContext] Saved on page hide/unload ✓');
      }).catch((e) => console.warn('[AppContext] Save on hide failed:', e));
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') saveIfDirty();
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pagehide', saveIfDirty);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', saveIfDirty);
    };
  }, [user, isDemo, state]); // eslint-disable-line react-hooks/exhaustive-deps

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
    setDirtyState((s) => {
      const priceIds = s.prices.filter((p) => p.storeId === id).map((p) => p.id);
      pendingDeletesRef.current.push(
        { col: 'stores', id },
        ...priceIds.map((pid) => ({ col: 'prices', id: pid })),
      );
      return {
        ...s,
        stores: s.stores.filter((st) => st.id !== id),
        prices: s.prices.filter((p) => p.storeId !== id),
      };
    });
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
    setDirtyState((s) => {
      const itemIds = s.items.filter((i) => i.categoryId === id).map((i) => i.id);
      const priceIds = s.prices.filter((p) => itemIds.includes(p.itemId)).map((p) => p.id);
      pendingDeletesRef.current.push(
        { col: 'categories', id },
        ...itemIds.map((iid) => ({ col: 'items', id: iid })),
        ...priceIds.map((pid) => ({ col: 'prices', id: pid })),
      );
      return {
        ...s,
        categories: s.categories.filter((c) => c.id !== id),
        items: s.items.filter((i) => i.categoryId !== id),
        prices: s.prices.filter((p) => !itemIds.includes(p.itemId)),
      };
    });
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
    setDirtyState((s) => {
      const priceIds = s.prices.filter((p) => p.itemId === id).map((p) => p.id);
      pendingDeletesRef.current.push(
        { col: 'items', id },
        ...priceIds.map((pid) => ({ col: 'prices', id: pid })),
      );
      return {
        ...s,
        items: s.items.filter((i) => i.id !== id),
        prices: s.prices.filter((p) => p.itemId !== id),
      };
    });
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
    pendingDeletesRef.current.push({ col: 'prices', id });
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
    pendingDeletesRef.current.push({ col: 'trips', id });
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
    pendingDeletesRef.current.push({ col: 'reminders', id });
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
    pendingDeletesRef.current.push({ col: 'transactions', id });
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

  // ── Savings Goals CRUD ─────────────────────────────────────
  const addSavingsGoal = useCallback((goal: Omit<SavingsGoal, 'id' | 'createdAt' | 'contributions'>) => {
    setDirtyState((s) => ({
      ...s,
      savingsGoals: [...s.savingsGoals, { ...goal, id: generateId(), contributions: [], createdAt: Date.now() }],
    }));
  }, [setDirtyState]);

  const updateSavingsGoal = useCallback((id: string, updates: Partial<Omit<SavingsGoal, 'contributions'>>) => {
    setDirtyState((s) => ({
      ...s,
      savingsGoals: s.savingsGoals.map((g) => (g.id === id ? { ...g, ...updates } : g)),
    }));
  }, [setDirtyState]);

  const deleteSavingsGoal = useCallback((id: string) => {
    pendingDeletesRef.current.push({ col: 'savingsGoals', id });
    setDirtyState((s) => ({ ...s, savingsGoals: s.savingsGoals.filter((g) => g.id !== id) }));
  }, [setDirtyState]);

  const addSavingsContribution = useCallback((goalId: string, contribution: Omit<SavingsContribution, 'id'>) => {
    setDirtyState((s) => ({
      ...s,
      savingsGoals: s.savingsGoals.map((g) =>
        g.id === goalId
          ? { ...g, contributions: [...g.contributions, { ...contribution, id: generateId() }] }
          : g
      ),
    }));
  }, [setDirtyState]);

  const deleteSavingsContribution = useCallback((goalId: string, contributionId: string) => {
    setDirtyState((s) => ({
      ...s,
      savingsGoals: s.savingsGoals.map((g) =>
        g.id === goalId
          ? { ...g, contributions: g.contributions.filter((c) => c.id !== contributionId) }
          : g
      ),
    }));
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
        addSavingsGoal, updateSavingsGoal, deleteSavingsGoal,
        addSavingsContribution, deleteSavingsContribution,
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
