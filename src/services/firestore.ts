// ==========================================
// BasketBuddy - Firestore Sync Service
// Data model:
//   users/{uid}                   ← profile doc
//   users/{uid}/stores/{id}       ← store docs
//   users/{uid}/categories/{id}   ← category docs
//   users/{uid}/items/{id}        ← item docs
//   users/{uid}/prices/{id}       ← price docs
//   users/{uid}/trips/{id}        ← trip docs
//   users/{uid}/budgets/{id}      ← budget docs
//   users/{uid}/reminders/{id}    ← reminder docs
// ==========================================

import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  getDocs,
  collection,
  writeBatch,
  serverTimestamp,
  getCountFromServer,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../config/firebase';
import type {
  Store,
  Category,
  GroceryItem,
  PriceEntry,
  ShoppingTrip,
  MonthlyBudget,
  RestockReminder,
  FinanceTransaction,
  FinancePlan,
  SavingsGoal,
  FuelFillup,
} from '../types';

// ── Types ────────────────────────────────────────────────────
export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  createdAt: unknown;
  lastLoginAt: unknown;
}

export interface UserAppData {
  stores: Store[];
  categories: Category[];
  items: GroceryItem[];
  prices: PriceEntry[];
  trips: ShoppingTrip[];
  budgets: MonthlyBudget[];
  reminders: RestockReminder[];
  transactions: FinanceTransaction[];
  financePlans: FinancePlan[];
  savingsGoals: SavingsGoal[];
  fuelFillups: FuelFillup[];
}

// ── Helpers ──────────────────────────────────────────────────
function userDocRef(uid: string) {
  if (!db) throw new Error('Firestore not initialized');
  return doc(db!, 'users', uid);
}

function subCol(uid: string, name: string) {
  if (!db) throw new Error('Firestore not initialized');
  return collection(db!, 'users', uid, name);
}

const SUBCOLLECTIONS: Array<keyof UserAppData> = [
  'stores', 'categories', 'items', 'prices', 'trips', 'budgets', 'reminders',
  'transactions', 'financePlans', 'savingsGoals', 'fuelFillups',
];

/** Recursively remove undefined values — Firestore rejects them */
function stripUndefined<T>(obj: T): T {
  if (Array.isArray(obj)) return obj.map(stripUndefined) as unknown as T;
  if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, stripUndefined(v)])
    ) as T;
  }
  return obj;
}

// ── Quota gate ───────────────────────────────────────────────
// When Firestore returns resource-exhausted, the SDK enters exponential backoff
// and subsequent operations hang (sometimes for minutes) before failing.
// We track quota exhaustion here so callers can fail immediately instead of timing out.
let _quotaExhaustedUntil = 0;
const QUOTA_PAUSE_MS = 10 * 60 * 1000; // 10 minutes

/** Call this from anywhere a resource-exhausted error is caught. */
export function setQuotaExhausted(): void {
  _quotaExhaustedUntil = Date.now() + QUOTA_PAUSE_MS;
  // NOTE: We intentionally do NOT call terminate() on the Firestore SDK here.
  // Firebase SDK's getFirestore() returns a memoized instance — after terminate()
  // the same dead instance is returned, making recovery impossible.
  // The quota gate (isQuotaExhausted) is sufficient to block all new saves.
  // The SDK's own exponential backoff will pause background reconnects automatically.
}

/** Returns true if quota is known to be exhausted right now. */
export function isQuotaExhausted(): boolean {
  return Date.now() < _quotaExhaustedUntil;
}

/**
 * Wraps a Firestore operation with a short timeout.
 * When quota is exceeded the SDK enters max-backoff and operations hang;
 * this makes them fail fast so callers get a resource-exhausted error immediately.
 */
async function withBatchTimeout<T>(p: Promise<T>, ms = 12_000): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject({ code: 'resource-exhausted', message: 'Batch timeout — quota likely exceeded' }), ms)
    ),
  ]);
}

/**
 * Sync one subcollection: delete removed docs, upsert all current docs.
 * Handles Firestore's 500-op batch limit automatically.
 */
async function syncSubcollection(
  uid: string,
  name: string,
  newItems: Array<{ id: string } & Record<string, unknown>>
): Promise<void> {
  if (!db) return;
  const firestore = db;

  const colRef = subCol(uid, name);
  const existingSnap = await getDocs(colRef);
  const newIds = new Set(newItems.map((i) => i.id));

  const BATCH_SIZE = 490;
  let batch = writeBatch(firestore);
  let opCount = 0;

  const flush = async () => {
    if (opCount > 0) {
      await batch.commit();
      batch = writeBatch(firestore);
      opCount = 0;
    }
  };

  // Delete docs that no longer exist in local state
  for (const d of existingSnap.docs) {
    if (!newIds.has(d.id)) {
      batch.delete(d.ref);
      opCount++;
      if (opCount >= BATCH_SIZE) await flush();
    }
  }

  // Upsert all current docs
  for (const item of newItems) {
    batch.set(doc(colRef, item.id), stripUndefined(item) as Record<string, unknown>);
    opCount++;
    if (opCount >= BATCH_SIZE) await flush();
  }

  await flush();
}

// ── User Profile ─────────────────────────────────────────────
export async function createOrUpdateUserProfile(user: {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}): Promise<void> {
  if (!isFirebaseConfigured || !db) return;

  const ref = userDocRef(user.uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    await setDoc(ref, {
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || '',
      photoURL: user.photoURL || null,
      createdAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
    });
    console.log('[Firestore] User profile created for', user.uid);
  } else {
    await updateDoc(ref, {
      lastLoginAt: serverTimestamp(),
      displayName: user.displayName || snap.data().displayName || '',
      photoURL: user.photoURL ?? snap.data().photoURL ?? null,
    });
    console.log('[Firestore] User profile updated for', user.uid);
  }
}

/**
 * Returns the server-side `lastSyncAt` timestamp from the user profile doc
 * as a JS millisecond timestamp (or 0 if unavailable).
 * Cost: exactly 1 Firestore read — use this as a cheap gate before loadUserData.
 */
export async function getCloudLastModified(uid: string): Promise<number> {
  if (!isFirebaseConfigured || !db) return 0;
  try {
    const snap = await getDoc(userDocRef(uid));
    if (!snap.exists()) return 0;
    const ts = snap.data()?.lastSyncAt;
    // Firestore Timestamp has a .toMillis() method; fall back for plain numbers
    if (ts && typeof ts.toMillis === 'function') return ts.toMillis();
    if (typeof ts === 'number') return ts;
    return 0;
  } catch {
    return 0;
  }
}

export interface CloudCounts {
  stores: number; categories: number; items: number; prices: number;
  trips: number; budgets: number; reminders: number; transactions: number;
  financePlans: number; savingsGoals: number; fuelFillups: number;
}

/**
 * Reads ONLY the document counts from each Firestore subcollection.
 * Cost: 1 read per collection (11 total) regardless of how many docs exist.
 * Use this to verify a save succeeded without re-downloading all data.
 */
export async function verifyCloudCounts(uid: string): Promise<CloudCounts | null> {
  if (!isFirebaseConfigured || !db) return null;
  try {
    const results = await Promise.all(
      SUBCOLLECTIONS.map((name) => getCountFromServer(subCol(uid, name)))
    );
    const [stores, categories, items, prices, trips, budgets, reminders,
           transactions, financePlans, savingsGoals, fuelFillups] = results.map((r) => r.data().count);
    return { stores, categories, items, prices, trips, budgets, reminders,
             transactions, financePlans, savingsGoals, fuelFillups };
  } catch (e) {
    console.error('[Firestore] verifyCloudCounts failed:', e);
    return null;
  }
}

// ── Load all app data from subcollections ────────────────────
export async function loadUserData(uid: string): Promise<UserAppData | null> {
  if (!isFirebaseConfigured || !db) return null;

  try {
    const [
      storesSnap, categoriesSnap, itemsSnap,
      pricesSnap, tripsSnap, budgetsSnap, remindersSnap,
      transactionsSnap, financePlansSnap, savingsGoalsSnap, fuelFillupsSnap,
    ] = await Promise.all(SUBCOLLECTIONS.map((name) => getDocs(subCol(uid, name))));

    const totalDocs =
      storesSnap.size + categoriesSnap.size + itemsSnap.size +
      pricesSnap.size + tripsSnap.size + budgetsSnap.size + remindersSnap.size +
      transactionsSnap.size + financePlansSnap.size + savingsGoalsSnap.size +
      fuelFillupsSnap.size;

    if (totalDocs === 0) {
      console.log('[Firestore] No app data found for', uid);
      return null;
    }

    const result: UserAppData = {
      stores:       storesSnap.docs.map((d) => d.data() as Store),
      categories:   categoriesSnap.docs.map((d) => d.data() as Category),
      items:        itemsSnap.docs.map((d) => d.data() as GroceryItem),
      prices:       pricesSnap.docs.map((d) => d.data() as PriceEntry),
      trips:        tripsSnap.docs.map((d) => d.data() as ShoppingTrip),
      budgets:      budgetsSnap.docs.map((d) => d.data() as MonthlyBudget),
      reminders:    remindersSnap.docs.map((d) => d.data() as RestockReminder),
      transactions: transactionsSnap.docs.map((d) => d.data() as FinanceTransaction),
      financePlans: financePlansSnap.docs.map((d) => d.data() as FinancePlan),
      savingsGoals: savingsGoalsSnap.docs.map((d) => d.data() as SavingsGoal),
      fuelFillups:  fuelFillupsSnap.docs.map((d) => d.data() as FuelFillup),
    };

    console.log(
      `[Firestore] Loaded — stores:${result.stores.length} categories:${result.categories.length}` +
      ` items:${result.items.length} prices:${result.prices.length}`
    );
    return result;
  } catch (e) {
    console.error('[Firestore] Failed to load app data:', e);
    // Re-throw so AppContext can distinguish a genuine new user (null) from a
    // load failure — preventing the "first-time user" branch from wiping cloud data.
    throw e;
  }
}

// ── Fast upsert-only save (no getDocs reads) ─────────────────
// Used for auto-saves: ~3x faster because it skips reading existing docs.
// Explicit deletes (from tracked CRUD operations) are handled separately.
export interface PendingDelete { col: string; id: string; }

export async function fastSaveUserData(
  uid: string,
  data: UserAppData,
  deletes: PendingDelete[],
  // When provided, only write docs whose IDs appear in the map.
  // When undefined (e.g. first sync / localStorage recovery), write everything.
  dirtyDocs?: Map<string, Set<string>>,
): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  const firestore = db;
  const BATCH_SIZE = 490;
  let batch = writeBatch(firestore);
  let opCount = 0;

  const flush = async () => {
    if (opCount > 0) {
      try {
        await withBatchTimeout(batch.commit());
      } catch (err: any) {
        const isQuota = err?.code === 'resource-exhausted' ||
          (err?.message || '').toLowerCase().includes('quota');
        if (isQuota) {
          setQuotaExhausted();
          const e = new Error('Quota exceeded') as any;
          e.code = 'resource-exhausted';
          throw e;
        }
        throw err;
      }
      batch = writeBatch(firestore);
      opCount = 0;
    }
  };

  // Process explicit deletes first
  for (const { col, id } of deletes) {
    batch.delete(doc(firestore, 'users', uid, col, id));
    opCount++;
    if (opCount >= BATCH_SIZE) await flush();
  }

  // Upsert only changed documents (or all, if dirtyDocs not provided)
  const entries: [string, Array<{ id: string } & Record<string, unknown>>][] = [
    ['stores',       data.stores       as any || []],
    ['categories',   data.categories   as any || []],
    ['items',        data.items        as any || []],
    ['prices',       data.prices       as any || []],
    ['trips',        data.trips        as any || []],
    ['budgets',      data.budgets      as any || []],
    ['reminders',    data.reminders    as any || []],
    ['transactions', data.transactions as any || []],
    ['financePlans', data.financePlans as any || []],
    ['savingsGoals', data.savingsGoals as any || []],
    ['fuelFillups',  data.fuelFillups  as any || []],
  ];

  for (const [col, items] of entries) {
    const dirtyIds = dirtyDocs?.get(col);
    // If a dirtyDocs map is provided, only write docs that changed.
    // If the collection isn't in the map at all, skip it entirely.
    const toWrite = dirtyDocs
      ? (dirtyIds ? items.filter((item) => dirtyIds.has(item.id)) : [])
      : items;
    for (const item of toWrite) {
      batch.set(
        doc(firestore, 'users', uid, col, item.id),
        stripUndefined(item) as Record<string, unknown>,
      );
      opCount++;
      if (opCount >= BATCH_SIZE) await flush();
    }
  }

  await flush();
  await updateDoc(userDocRef(uid), { lastSyncAt: serverTimestamp() }).catch(() => {});
}

// ── Save all app data to subcollections ──────────────────────
export async function saveUserData(uid: string, data: UserAppData): Promise<void> {
  if (!isFirebaseConfigured || !db) {
    console.warn('[Firestore] Cannot save — Firestore not configured');
    return;
  }

  try {
    await Promise.all([
      syncSubcollection(uid, 'stores',        data.stores        as any || []),
      syncSubcollection(uid, 'categories',    data.categories    as any || []),
      syncSubcollection(uid, 'items',         data.items         as any || []),
      syncSubcollection(uid, 'prices',        data.prices        as any || []),
      syncSubcollection(uid, 'trips',         data.trips         as any || []),
      syncSubcollection(uid, 'budgets',       data.budgets       as any || []),
      syncSubcollection(uid, 'reminders',     data.reminders     as any || []),
      syncSubcollection(uid, 'transactions',  data.transactions  as any || []),
      syncSubcollection(uid, 'financePlans',  data.financePlans  as any || []),
      syncSubcollection(uid, 'savingsGoals',  data.savingsGoals  as any || []),
    ]);

    // Stamp last sync time on the profile doc
    await updateDoc(userDocRef(uid), { lastSyncAt: serverTimestamp() }).catch(() => {});

    console.log(
      `[Firestore] Saved — stores:${data.stores?.length ?? 0}` +
      ` categories:${data.categories?.length ?? 0}` +
      ` items:${data.items?.length ?? 0}` +
      ` prices:${data.prices?.length ?? 0}` +
      ` trips:${data.trips?.length ?? 0}`
    );
  } catch (e) {
    console.error('[Firestore] Failed to save app data:', e);
    throw e;
  }
}

