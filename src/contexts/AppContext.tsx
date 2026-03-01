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
  FuelFillup,
} from '../types';

import { generateId } from '../utils/helpers';
import { useAuth } from './AuthContext';
import { loadUserData, fastSaveUserData, getCloudLastModified, setQuotaExhausted, isQuotaExhausted, type UserAppData, type PendingDelete } from '../services/firestore';
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
  fuelFillups: FuelFillup[];
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
  // Fuel Fillups
  addFuelFillup: (fillup: Omit<FuelFillup, 'id' | 'createdAt'>) => void;
  updateFuelFillup: (id: string, updates: Partial<FuelFillup>) => void;
  deleteFuelFillup: (id: string) => void;
  // Helpers
  getStore: (id: string) => Store | undefined;
  getCategory: (id: string) => Category | undefined;
  getItem: (id: string) => GroceryItem | undefined;
  // Sync
  syncNow: () => Promise<void>;
  mergeSync: () => Promise<void>;
  syncStatus: 'idle' | 'saving' | 'saved' | 'error';
  lastSyncedAt: number | null;
  ready: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEY = 'bb-app-data';
// Set when local state has unsaved changes, cleared after a successful Firestore write.
// Survives a hard refresh so we can detect that localStorage is newer than Firestore.
const PENDING_KEY = 'bb-pending-save';
// Timestamps used to decide which device's data wins on load.
// bb-last-local-modified: updated every time the user makes a change (setDirtyState).
// bb-last-cloud-sync:     updated every time a Firestore save or load succeeds.
const LAST_LOCAL_MODIFIED_KEY  = 'bb-last-local-modified';
const LAST_CLOUD_SYNC_KEY      = 'bb-last-cloud-sync';
// Pending Firestore deletes — survives page refreshes so deletes are never lost.
const PENDING_DELETES_KEY      = 'bb-pending-deletes';
// Snapshot saved immediately before any pull-on-focus overwrites local state.
// Lets the user undo an accidental cloud overwrite within the same session.
const PRE_PULL_BACKUP_KEY = 'bb-pre-pull-backup';

/** One-time migration: split old 'fruits-veg' into separate Fruits + Vegetables */
function migrateCategories(categories: Category[]): Category[] {
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
        stores:       parsed.stores || [],
        categories:   migrateCategories(parsed.categories || []),
        items:        migratedItems,
        prices:       parsed.prices || [],
        trips:        parsed.trips || [],
        budgets:      parsed.budgets || [],
        reminders:    parsed.reminders || [],
        transactions: parsed.transactions || [],
        financePlans: parsed.financePlans || [],
        savingsGoals: parsed.savingsGoals || [],
        fuelFillups:  parsed.fuelFillups || [],
      };
    }
  } catch (e) {
    console.error('Failed to load state:', e);
  }
  return {
    stores: [],
    categories: [],
    items: [],
    prices: [],
    trips: [],
    budgets: [],
    reminders: [],
    transactions: [],
    financePlans: [],
    savingsGoals: [],
    fuelFillups: [],
  };
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isDemo } = useAuth();
  const [state, setState] = useState<AppState>(loadState);
  // ready starts true — items render immediately from local/default state.
  // Firestore syncs in the background and updates state when done.
  const [ready, setReady] = useState(true);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(() => {
    const stored = localStorage.getItem(LAST_CLOUD_SYNC_KEY);
    return stored ? parseInt(stored) : null;
  });

  /** Appends deletes to the ref AND persists to localStorage so they survive page refreshes. */
  const trackDeletes = (...entries: PendingDelete[]) => {
    pendingDeletesRef.current.push(...entries);
    try { localStorage.setItem(PENDING_DELETES_KEY, JSON.stringify(pendingDeletesRef.current)); } catch {}
  };

  /** Removes the first `count` flushed deletes from the ref and updates localStorage. */
  const flushPendingDeletes = (count: number) => {
    pendingDeletesRef.current = pendingDeletesRef.current.slice(count);
    try {
      if (pendingDeletesRef.current.length === 0) localStorage.removeItem(PENDING_DELETES_KEY);
      else localStorage.setItem(PENDING_DELETES_KEY, JSON.stringify(pendingDeletesRef.current));
    } catch {}
  };

  /** Call after every successful Firestore write to update timestamp state + localStorage */
  const markSynced = () => {
    const now = Date.now();
    setLastSyncedAt(now);
    localStorage.setItem(LAST_CLOUD_SYNC_KEY, now.toString());
  };
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDirtyRef = useRef(false);
  // Tracks explicit deletes so fastSaveUserData can remove them without a getDocs read.
  // Loaded from localStorage on mount so deletes survive page refreshes.
  const pendingDeletesRef = useRef<PendingDelete[]>(
    (() => {
      try {
        const saved = localStorage.getItem(PENDING_DELETES_KEY);
        return saved ? (JSON.parse(saved) as PendingDelete[]) : [];
      } catch { return []; }
    })()
  );
  // Tracks which specific doc IDs changed — fastSaveUserData only writes those (per-doc dirty tracking).
  // This prevents re-writing all 131+ items/prices on every save, staying under Firestore quota.
  const dirtyDocsRef = useRef<Map<string, Set<string>>>(new Map());
  // When Firestore quota is exhausted, pause auto-saves until this timestamp.
  const quotaPausedUntilRef = useRef<number>(0);

  // Stable ref to current state — lets callbacks read latest state without stale closures
  // (updated synchronously every render, safe for ref mutation)
  const stateRef = useRef(state);
  stateRef.current = state;

  /** Mark a single document as needing a Firestore write */
  const markDirty = (col: string, id: string) => {
    const set = dirtyDocsRef.current.get(col) ?? new Set<string>();
    set.add(id);
    dirtyDocsRef.current.set(col, set);
  };
  // Gate auto-save until the initial Firestore load is complete.
  // Must be real state (not a ref) so flipping it triggers the auto-save
  // effect to re-run and notice any dirty changes queued during load.
  const [firestoreLoaded, setFirestoreLoaded] = useState(false);

  /** Wraps setState and marks data as needing a Firestore save */
  const setDirtyState: typeof setState = useCallback((value) => {
    isDirtyRef.current = true;
    localStorage.setItem(PENDING_KEY, '1'); // survives hard-refresh
    localStorage.setItem(LAST_LOCAL_MODIFIED_KEY, Date.now().toString());
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
      try {
        const cloudData = await loadUserData(user.uid);
        if (cancelled) return;
        // Local only wins if it was genuinely modified AFTER the last successful cloud sync.
        // This prevents stale PENDING_KEY on other devices from overwriting fresh Firestore data.
        const lastLocalModified = parseInt(localStorage.getItem(LAST_LOCAL_MODIFIED_KEY) || '0');
        const lastCloudSync     = parseInt(localStorage.getItem(LAST_CLOUD_SYNC_KEY)     || '0');
        // Migration for pre-timestamp sessions: if PENDING_KEY is set but LAST_LOCAL_MODIFIED
        // was never stamped (old session before this key existed), stamp it now so all future
        // checks treat this device's local data as newer than the cloud.
        if (localStorage.getItem(PENDING_KEY) === '1' && lastLocalModified === 0) {
          localStorage.setItem(LAST_LOCAL_MODIFIED_KEY, (lastCloudSync + 1).toString());
        }
        const effectiveLocalModified = parseInt(localStorage.getItem(LAST_LOCAL_MODIFIED_KEY) || '0');
        // PENDING_KEY alone (without a timestamp) also wins — trusts the flag for old sessions.
        const hasPendingLocalSave = localStorage.getItem(PENDING_KEY) === '1'
          && (effectiveLocalModified === 0 || effectiveLocalModified > lastCloudSync);

        if (cloudData && !hasPendingLocalSave) {
          // Normal case: Firestore has the latest data — load it.
          const loaded: AppState = {
            stores:       cloudData.stores || [],
            categories:   migrateCategories(cloudData.categories || []),
            items:        migrateItems(cloudData.items || []),
            prices:       cloudData.prices || [],
            trips:        cloudData.trips || [],
            budgets:      cloudData.budgets || [],
            reminders:    cloudData.reminders || [],
            transactions: cloudData.transactions || [],
            financePlans: cloudData.financePlans || [],
            savingsGoals: cloudData.savingsGoals || [],
            fuelFillups:  cloudData.fuelFillups || [],
          };
          setState(loaded);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(loaded));
          markSynced();
          console.log('[AppContext] Loaded data from Firestore, items:', loaded.items.length);
        } else {
          // Either first-time user OR local has unsaved changes from before a
          // hard-refresh (PENDING_KEY was set). In both cases, local state is
          // the source of truth — save it up to Firestore now.
          const current = loadState();
          setState(current);
          if (hasPendingLocalSave) {
            console.log('[AppContext] Pending local changes detected — saving local state to Firestore');
          } else {
            console.log('[AppContext] First-time user — starting with empty Firestore state');
          }
          try {
            if (isQuotaExhausted()) {
              console.warn('[AppContext] Quota exhausted — skipping recovery save. Data is safe in localStorage.');
              // Mark dirty so auto-save retries as soon as quota clears
              isDirtyRef.current = true;
            } else {
              // Use fastSaveUserData (no getDocs reads, writes all docs since we have no dirty map from previous session)
              setSyncStatus('saving');
              const recoveryDeletes = [...pendingDeletesRef.current];
              await fastSaveUserData(user.uid, current, recoveryDeletes);
              flushPendingDeletes(recoveryDeletes.length);
              localStorage.removeItem(PENDING_KEY);
              markSynced();
              setSyncStatus('saved');
              toast.success('Local data saved to cloud ✓');
              setTimeout(() => setSyncStatus('idle'), 3000);
              console.log('[AppContext] Saved local state to Firestore ✓');
            }
          } catch (saveErr: any) {
            setSyncStatus('error');
            setTimeout(() => setSyncStatus('idle'), 5000);
            // Keep dirty flag set so auto-save retries on next user interaction
            isDirtyRef.current = true;
            if (saveErr?.code === 'resource-exhausted') {
              setQuotaExhausted();
              toast.error('Firestore quota exceeded — your data is safe locally and will retry.', { duration: 8000 });
              console.warn('[AppContext] Quota exhausted during recovery — will retry after quota resets.');
            } else if (saveErr?.code === 'permission-denied') {
              toast.error('Firestore permission denied. Update your security rules.', { duration: 8000 });
              console.error('[AppContext] Permission denied during recovery save:', saveErr);
            } else {
              toast.error('Could not upload local data: ' + (saveErr?.message || 'unknown error'), { duration: 8000 });
              console.error('[AppContext] Failed to save to Firestore:', saveErr);
            }
          }
        }
      } catch (e: any) {
        // If the load itself hit a quota error, mark it so the SDK gets terminated
        // and auto-saves are paused (same as save-path quota handling).
        if (e?.code === 'resource-exhausted') {
          setQuotaExhausted();
          quotaPausedUntilRef.current = Date.now() + 10 * 60 * 1000;
          toast.error(
            '⚠️ Firestore free-tier quota exceeded. Using local data. Saves paused for 10 min.',
            { duration: 12000, id: 'fs-quota' }
          );
          console.warn('[AppContext] Quota exhausted during initial load — SDK terminated, auto-saves paused.');
        } else {
          console.error('[AppContext] Firestore load failed, using local:', e);
        }
      } finally {
        if (!cancelled) {
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

  // Safety net removed — empty stores/items/categories is valid (new or demo account).

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
      // Set the module-level quota gate so future operations fail immediately
      // instead of hanging for minutes waiting on SDK exponential backoff.
      setQuotaExhausted();
      // Pause all auto-saves for 10 minutes to let quota recover
      quotaPausedUntilRef.current = Date.now() + 10 * 60 * 1000;
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
    if (Date.now() < quotaPausedUntilRef.current || isQuotaExhausted()) {
      toast.error('Quota recovery in progress — try again in a few minutes.', { id: 'fs-quota' });
      return;
    }
    setSyncStatus('saving');
    const deletesToFlush = [...pendingDeletesRef.current];
    // Snapshot dirty docs, pass to fast writer; clear ref before await so new changes accumulate cleanly
    const dirtyMap = dirtyDocsRef.current.size > 0 ? dirtyDocsRef.current : undefined;
    dirtyDocsRef.current = new Map();
    try {
      // Use the fast upsert path (no getDocs reads) — same as auto-save.
      // 60 s timeout for a manual sync gives plenty of headroom on slow connections.
      await withSyncTimeout(fastSaveUserData(user.uid, state, deletesToFlush, dirtyMap), 60_000);
      isDirtyRef.current = false;
      flushPendingDeletes(deletesToFlush.length);
      localStorage.removeItem(PENDING_KEY);
      markSynced();
      setSyncStatus('saved');
      toast.success('Data synced to cloud ✓');
      setTimeout(() => setSyncStatus('idle'), 3000);
    } catch (err: any) {
      // Restore dirty docs so the next attempt picks them up
      if (dirtyMap) {
        for (const [col, ids] of dirtyMap) {
          const existing = dirtyDocsRef.current.get(col) ?? new Set<string>();
          for (const id of ids) existing.add(id);
          dirtyDocsRef.current.set(col, existing);
        }
      }
      handleSyncError(err, 'syncNow');
    }
  }, [user, isDemo, state]);  // eslint-disable-line react-hooks/exhaustive-deps

  // Merge cloud + local by ID union, then push result back up.
  // Safe when devices have diverged: no data is lost.
  const mergeSync = useCallback(async () => {
    if (!user || isDemo || !isFirebaseConfigured) {
      toast.error(!user ? 'Not signed in.' : 'Not available in demo/unconfigured mode.');
      return;
    }
    if (isQuotaExhausted()) {
      toast.error('Quota recovery in progress — try again later.', { id: 'fs-quota' });
      return;
    }
    setSyncStatus('saving');
    try {
      const cloudData = await loadUserData(user.uid);
      if (!cloudData) throw new Error('Failed to load cloud data');

      // Union by ID — local copy wins when the same ID exists in both
      const mergeById = <T extends { id: string }>(local: T[], cloud: T[]): T[] => {
        const map = new Map<string, T>();
        for (const item of cloud) map.set(item.id, item);
        for (const item of local) map.set(item.id, item);
        return Array.from(map.values());
      };

      const merged: AppState = {
        stores:       mergeById(state.stores,       cloudData.stores       || []),
        categories:   migrateCategories(mergeById(state.categories, cloudData.categories || [])),
        items:        migrateItems(mergeById(state.items,     cloudData.items        || [])),
        prices:       mergeById(state.prices,       cloudData.prices       || []),
        trips:        mergeById(state.trips,        cloudData.trips        || []),
        budgets:      mergeById(state.budgets,      cloudData.budgets      || []),
        reminders:    mergeById(state.reminders,    cloudData.reminders    || []),
        transactions: mergeById(state.transactions, cloudData.transactions || []),
        financePlans: mergeById(state.financePlans, cloudData.financePlans || []),
        savingsGoals: mergeById(state.savingsGoals, cloudData.savingsGoals || []),
        fuelFillups:  mergeById(state.fuelFillups,  cloudData.fuelFillups  || []),
      };

      // Build a set of locally-deleted IDs so we don't pull them back from the cloud.
      const deletedByCol = new Map<string, Set<string>>();
      for (const { col, id } of pendingDeletesRef.current) {
        const s = deletedByCol.get(col) ?? new Set<string>();
        s.add(id);
        deletedByCol.set(col, s);
      }
      const filterDeleted = <T extends { id: string }>(items: T[], col: string): T[] => {
        const ids = deletedByCol.get(col);
        return ids ? items.filter((i) => !ids.has(i.id)) : items;
      };

      // Strip any pending-deleted IDs from the merged result so they don't come back.
      const mergedFiltered: AppState = {
        stores:       filterDeleted(merged.stores,       'stores'),
        categories:   filterDeleted(merged.categories,   'categories'),
        items:        filterDeleted(merged.items,         'items'),
        prices:       filterDeleted(merged.prices,        'prices'),
        trips:        filterDeleted(merged.trips,         'trips'),
        budgets:      filterDeleted(merged.budgets,       'budgets'),
        reminders:    filterDeleted(merged.reminders,     'reminders'),
        transactions: filterDeleted(merged.transactions,  'transactions'),
        financePlans: filterDeleted(merged.financePlans,  'financePlans'),
        savingsGoals: filterDeleted(merged.savingsGoals,  'savingsGoals'),
        fuelFillups:  filterDeleted(merged.fuelFillups,   'fuelFillups'),
      };

      setState(mergedFiltered);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(mergedFiltered));

      const deletesToFlush = [...pendingDeletesRef.current];
      await withSyncTimeout(fastSaveUserData(user.uid, mergedFiltered, deletesToFlush), 60_000);
      isDirtyRef.current = false;
      flushPendingDeletes(deletesToFlush.length);
      localStorage.removeItem(PENDING_KEY);
      markSynced();
      setSyncStatus('saved');
      toast.success('Merged & synced — all data combined ✓');
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
      if (Date.now() < quotaPausedUntilRef.current || isQuotaExhausted()) {
        console.log('[AppContext] Auto-save skipped — quota pause active');
        return;
      }
      console.log('[AppContext] Auto-saving to Firestore…');
      setSyncStatus('saving');
      const deletesToFlush = [...pendingDeletesRef.current];
      // Snapshot and clear dirty docs before awaiting — new mutations during the save will accumulate freshly
      const dirtyMap = dirtyDocsRef.current.size > 0 ? dirtyDocsRef.current : undefined;
      dirtyDocsRef.current = new Map();
      try {
        // Fast path: only write changed docs + targeted deletes (no getDocs reads)
        await withSyncTimeout(fastSaveUserData(user.uid, state, deletesToFlush, dirtyMap), 45_000);
        isDirtyRef.current = false;
        flushPendingDeletes(deletesToFlush.length);
        localStorage.removeItem(PENDING_KEY);
        markSynced();
        setSyncStatus('saved');
        console.log('[AppContext] Saved to Firestore ✓');
        setTimeout(() => setSyncStatus('idle'), 3000);
      } catch (err: any) {
        // Restore dirty docs so the next attempt retries only the affected docs
        if (dirtyMap) {
          for (const [col, ids] of dirtyMap) {
            const existing = dirtyDocsRef.current.get(col) ?? new Set<string>();
            for (const id of ids) existing.add(id);
            dirtyDocsRef.current.set(col, existing);
          }
        }
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
      if (!isDirtyRef.current || Date.now() < quotaPausedUntilRef.current || isQuotaExhausted()) return;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      // Fire-and-forget — best effort before the page unloads
      const deletes = [...pendingDeletesRef.current];
      const dirtyMap = dirtyDocsRef.current.size > 0 ? dirtyDocsRef.current : undefined;
      fastSaveUserData(user.uid, state, deletes, dirtyMap).then(() => {
        isDirtyRef.current = false;
        flushPendingDeletes(deletes.length);
        localStorage.removeItem(PENDING_KEY);
        markSynced();
        console.log('[AppContext] Saved on page hide/unload ✓');
      }).catch((e) => console.warn('[AppContext] Save on hide failed:', e));
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        saveIfDirty();
      } else if (document.visibilityState === 'visible') {
        // App regained focus. Pull from Firestore ONLY when ALL of the following are true:
        //  1. No in-session dirty changes (isDirtyRef)
        //  2. No cross-session pending save (PENDING_KEY) — this key survives page reloads,
        //     so a fresh-page-load with unsaved local data is correctly blocked.
        //  3. Local data was NOT modified more recently than the last cloud sync.
        //  4. Cloud has newer data than our last known sync (1 cheap read).
        const hasPendingLocal = localStorage.getItem(PENDING_KEY) === '1';
        const localModifiedTs = parseInt(localStorage.getItem(LAST_LOCAL_MODIFIED_KEY) || '0');
        const lastLocalSync   = parseInt(localStorage.getItem(LAST_CLOUD_SYNC_KEY) || '0');
        const localIsNewer    = localModifiedTs > lastLocalSync;

        if (!isDirtyRef.current && !hasPendingLocal && !localIsNewer && !isQuotaExhausted()) {
          if (Date.now() - lastLocalSync > 30_000) {
            (async () => {
              try {
                // Step 1: 1 read — check the profile doc's lastSyncAt timestamp.
                const cloudModified = await getCloudLastModified(user.uid);
                if (cloudModified <= lastLocalSync) {
                  markSynced();
                  console.log('[AppContext] Pull-on-focus: cloud not newer, skipping full load.');
                  return;
                }
                // Step 2: Cloud IS newer — save a backup of current local state before overwriting.
                const prePullSnapshot = localStorage.getItem(STORAGE_KEY);
                // Step 3: do the full load (11 getDocs calls).
                const cloudData = await loadUserData(user.uid);
                // Final safety check: bail if user made changes while we were loading.
                if (!cloudData || isDirtyRef.current || localStorage.getItem(PENDING_KEY) === '1') return;
                const loaded: AppState = {
                  stores:       cloudData.stores       || [],
                  categories:   migrateCategories(cloudData.categories || []),
                  items:        migrateItems(cloudData.items || []),
                  prices:       cloudData.prices       || [],
                  trips:        cloudData.trips        || [],
                  budgets:      cloudData.budgets      || [],
                  reminders:    cloudData.reminders    || [],
                  transactions: cloudData.transactions || [],
                  financePlans: cloudData.financePlans || [],
                  savingsGoals: cloudData.savingsGoals || [],
                  fuelFillups:  cloudData.fuelFillups  || [],
                };
                // Save pre-pull backup so the user can undo if needed.
                if (prePullSnapshot) localStorage.setItem(PRE_PULL_BACKUP_KEY, prePullSnapshot);
                setState(loaded);
                localStorage.setItem(STORAGE_KEY, JSON.stringify(loaded));
                markSynced();
                localStorage.removeItem(PENDING_KEY);
                console.log('[AppContext] Refreshed from Firestore on focus ✓');
                // Offer a brief undo window in case the cloud had stale data.
                toast(
                  (t) => (
                    <span className="flex items-center gap-2 text-sm">
                      Synced latest data from cloud.
                      <button
                        className="underline font-semibold text-brand-500 ml-1"
                        onClick={() => {
                          const backup = localStorage.getItem(PRE_PULL_BACKUP_KEY);
                          if (backup) {
                            try {
                              const prev = JSON.parse(backup) as AppState;
                              setState(prev);
                              localStorage.setItem(STORAGE_KEY, backup);
                              isDirtyRef.current = true;
                              localStorage.setItem(PENDING_KEY, '1');
                              localStorage.setItem(LAST_LOCAL_MODIFIED_KEY, Date.now().toString());
                              toast.dismiss(t.id);
                              toast.success('Restored your previous data. Saving…');
                            } catch { toast.error('Could not restore backup.'); }
                          } else {
                            toast.error('No backup available.');
                          }
                        }}
                      >
                        Undo
                      </button>
                    </span>
                  ),
                  { duration: 10000, id: 'pull-undo' },
                );
              } catch (e) {
                console.warn('[AppContext] Pull-on-focus failed (silent):', e);
              }
            })();
          }
        }
      }
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
    const id = generateId();
    markDirty('stores', id);
    setDirtyState((s) => ({
      ...s,
      stores: [...s.stores, { ...store, id, createdAt: Date.now() }],
    }));
  }, [setDirtyState]);

  const updateStore = useCallback((id: string, updates: Partial<Store>) => {
    markDirty('stores', id);
    setDirtyState((s) => ({
      ...s,
      stores: s.stores.map((st) => (st.id === id ? { ...st, ...updates } : st)),
    }));
  }, [setDirtyState]);

  const deleteStore = useCallback((id: string) => {
    setDirtyState((s) => {
      const priceIds = s.prices.filter((p) => p.storeId === id).map((p) => p.id);
      trackDeletes(
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
    const id = generateId();
    markDirty('categories', id);
    setDirtyState((s) => ({
      ...s,
      categories: [...s.categories, { ...cat, id }],
    }));
  }, [setDirtyState]);

  const updateCategory = useCallback((id: string, updates: Partial<Category>) => {
    markDirty('categories', id);
    setDirtyState((s) => ({
      ...s,
      categories: s.categories.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    }));
  }, [setDirtyState]);

  const deleteCategory = useCallback((id: string) => {
    setDirtyState((s) => {
      const itemIds = s.items.filter((i) => i.categoryId === id).map((i) => i.id);
      const priceIds = s.prices.filter((p) => itemIds.includes(p.itemId)).map((p) => p.id);
      trackDeletes(
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
    const id = generateId();
    markDirty('items', id);
    setDirtyState((s) => ({
      ...s,
      items: [...s.items, { ...item, id, createdAt: Date.now() }],
    }));
  }, [setDirtyState]);

  const updateItem = useCallback((id: string, updates: Partial<GroceryItem>) => {
    markDirty('items', id);
    setDirtyState((s) => ({
      ...s,
      items: s.items.map((i) => (i.id === id ? { ...i, ...updates } : i)),
    }));
  }, [setDirtyState]);

  const deleteItem = useCallback((id: string) => {
    setDirtyState((s) => {
      const priceIds = s.prices.filter((p) => p.itemId === id).map((p) => p.id);
      trackDeletes(
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
    const existing = stateRef.current.prices.find(
      (p) => p.itemId === entry.itemId && p.storeId === entry.storeId
    );
    if (existing) {
      markDirty('prices', existing.id);
      setDirtyState((s) => ({
        ...s,
        prices: s.prices.map((p) =>
          p.id === existing.id ? { ...p, ...entry, updatedAt: Date.now() } : p
        ),
      }));
    } else {
      const id = generateId();
      markDirty('prices', id);
      setDirtyState((s) => ({
        ...s,
        prices: [...s.prices, { ...entry, id, updatedAt: Date.now() }],
      }));
    }
  }, [setDirtyState]);

  const updatePrice = useCallback((id: string, updates: Partial<PriceEntry>) => {
    markDirty('prices', id);
    setDirtyState((s) => ({
      ...s,
      prices: s.prices.map((p) => (p.id === id ? { ...p, ...updates, updatedAt: Date.now() } : p)),
    }));
  }, [setDirtyState]);

  const deletePrice = useCallback((id: string) => {
    trackDeletes({ col: 'prices', id });
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
    const id = generateId();
    markDirty('trips', id);
    setDirtyState((s) => ({
      ...s,
      trips: [...s.trips, { ...trip, id, createdAt: Date.now() }],
    }));
  }, [setDirtyState]);

  const updateTrip = useCallback((id: string, updates: Partial<ShoppingTrip>) => {
    markDirty('trips', id);
    setDirtyState((s) => ({
      ...s,
      trips: s.trips.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    }));
  }, [setDirtyState]);

  const deleteTrip = useCallback((id: string) => {
    trackDeletes({ col: 'trips', id });
    setDirtyState((s) => ({ ...s, trips: s.trips.filter((t) => t.id !== id) }));
  }, [setDirtyState]);

  const addTripItem = useCallback((tripId: string, item: Omit<ShoppingTripItem, 'id'>) => {
    markDirty('trips', tripId);
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
      markDirty('trips', tripId);
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
    markDirty('trips', tripId);
    setDirtyState((s) => ({
      ...s,
      trips: s.trips.map((t) =>
        t.id === tripId ? { ...t, items: t.items.filter((i) => i.id !== itemId) } : t
      ),
    }));
  }, [setDirtyState]);

  // ── Budget CRUD ────────────────────────────────────────────
  const setBudget = useCallback((budget: Omit<MonthlyBudget, 'id' | 'createdAt'>) => {
    const existing = stateRef.current.budgets.find(
      (b) => b.month === budget.month && b.year === budget.year
    );
    if (existing) {
      markDirty('budgets', existing.id);
      setDirtyState((s) => ({
        ...s,
        budgets: s.budgets.map((b) => (b.id === existing.id ? { ...b, ...budget } : b)),
      }));
    } else {
      const id = generateId();
      markDirty('budgets', id);
      setDirtyState((s) => ({
        ...s,
        budgets: [...s.budgets, { ...budget, id, createdAt: Date.now() }],
      }));
    }
  }, [setDirtyState]);

  const updateBudget = useCallback((id: string, updates: Partial<MonthlyBudget>) => {
    markDirty('budgets', id);
    setDirtyState((s) => ({
      ...s,
      budgets: s.budgets.map((b) => (b.id === id ? { ...b, ...updates } : b)),
    }));
  }, [setDirtyState]);

  // ── Reminder CRUD ──────────────────────────────────────────
  const addReminder = useCallback((reminder: Omit<RestockReminder, 'id'>) => {
    const id = generateId();
    markDirty('reminders', id);
    setDirtyState((s) => ({
      ...s,
      reminders: [...s.reminders, { ...reminder, id }],
    }));
  }, [setDirtyState]);

  const updateReminder = useCallback((id: string, updates: Partial<RestockReminder>) => {
    markDirty('reminders', id);
    setDirtyState((s) => ({
      ...s,
      reminders: s.reminders.map((r) => (r.id === id ? { ...r, ...updates } : r)),
    }));
  }, [setDirtyState]);

  const deleteReminder = useCallback((id: string) => {
    trackDeletes({ col: 'reminders', id });
    setDirtyState((s) => ({ ...s, reminders: s.reminders.filter((r) => r.id !== id) }));
  }, [setDirtyState]);

  // ── Finance Transaction CRUD ───────────────────────────────
  const addTransaction = useCallback((tx: Omit<FinanceTransaction, 'id' | 'createdAt'>) => {
    const id = generateId();
    markDirty('transactions', id);
    setDirtyState((s) => ({
      ...s,
      transactions: [...s.transactions, { ...tx, id, createdAt: Date.now() }],
    }));
  }, [setDirtyState]);

  const updateTransaction = useCallback((id: string, updates: Partial<FinanceTransaction>) => {
    markDirty('transactions', id);
    setDirtyState((s) => ({
      ...s,
      transactions: s.transactions.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    }));
  }, [setDirtyState]);

  const deleteTransaction = useCallback((id: string) => {
    trackDeletes({ col: 'transactions', id });
    setDirtyState((s) => ({ ...s, transactions: s.transactions.filter((t) => t.id !== id) }));
  }, [setDirtyState]);

  // ── Finance Plan CRUD ──────────────────────────────────────
  const setFinancePlan = useCallback((plan: Omit<FinancePlan, 'id' | 'createdAt'>) => {
    const existing = stateRef.current.financePlans.find(
      (p) => p.month === plan.month && p.year === plan.year
    );
    if (existing) {
      markDirty('financePlans', existing.id);
      setDirtyState((s) => ({
        ...s,
        financePlans: s.financePlans.map((p) => (p.id === existing.id ? { ...p, ...plan } : p)),
      }));
    } else {
      const id = generateId();
      markDirty('financePlans', id);
      setDirtyState((s) => ({
        ...s,
        financePlans: [...s.financePlans, { ...plan, id, createdAt: Date.now() }],
      }));
    }
  }, [setDirtyState]);

  // ── Savings Goals CRUD ─────────────────────────────────────
  const addSavingsGoal = useCallback((goal: Omit<SavingsGoal, 'id' | 'createdAt' | 'contributions'>) => {
    const id = generateId();
    markDirty('savingsGoals', id);
    setDirtyState((s) => ({
      ...s,
      savingsGoals: [...s.savingsGoals, { ...goal, id, contributions: [], createdAt: Date.now() }],
    }));
  }, [setDirtyState]);

  const updateSavingsGoal = useCallback((id: string, updates: Partial<Omit<SavingsGoal, 'contributions'>>) => {
    markDirty('savingsGoals', id);
    setDirtyState((s) => ({
      ...s,
      savingsGoals: s.savingsGoals.map((g) => (g.id === id ? { ...g, ...updates } : g)),
    }));
  }, [setDirtyState]);

  const deleteSavingsGoal = useCallback((id: string) => {
    trackDeletes({ col: 'savingsGoals', id });
    setDirtyState((s) => ({ ...s, savingsGoals: s.savingsGoals.filter((g) => g.id !== id) }));
  }, [setDirtyState]);

  const addSavingsContribution = useCallback((goalId: string, contribution: Omit<SavingsContribution, 'id'>) => {
    markDirty('savingsGoals', goalId);
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
    markDirty('savingsGoals', goalId);
    setDirtyState((s) => ({
      ...s,
      savingsGoals: s.savingsGoals.map((g) =>
        g.id === goalId
          ? { ...g, contributions: g.contributions.filter((c) => c.id !== contributionId) }
          : g
      ),
    }));
  }, [setDirtyState]);
  // ── Fuel Fillup CRUD ───────────────────────────────
  const addFuelFillup = useCallback((fillup: Omit<FuelFillup, 'id' | 'createdAt'>) => {
    const id = generateId();
    markDirty('fuelFillups', id);
    setDirtyState((s) => ({
      ...s,
      fuelFillups: [...s.fuelFillups, { ...fillup, id, createdAt: Date.now() }],
    }));
  }, [setDirtyState]);

  const updateFuelFillup = useCallback((id: string, updates: Partial<FuelFillup>) => {
    markDirty('fuelFillups', id);
    setDirtyState((s) => ({
      ...s,
      fuelFillups: s.fuelFillups.map((f) => (f.id === id ? { ...f, ...updates } : f)),
    }));
  }, [setDirtyState]);

  const deleteFuelFillup = useCallback((id: string) => {
    trackDeletes({ col: 'fuelFillups', id });
    setDirtyState((s) => ({ ...s, fuelFillups: s.fuelFillups.filter((f) => f.id !== id) }));
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
        addFuelFillup, updateFuelFillup, deleteFuelFillup,
        getStore, getCategory, getItem,
        syncNow, mergeSync, syncStatus, lastSyncedAt, ready,
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
