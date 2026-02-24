// ==========================================
// BasketBuddy - Firestore Sync Service
// Handles reading/writing user data to Firestore
// ==========================================

import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp,
  collection,
  writeBatch,
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
} from '../types';

// ── Types ────────────────────────────────────────────────────
export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  createdAt: unknown; // serverTimestamp
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
}

// ── Helpers ──────────────────────────────────────────────────
function userDocRef(uid: string) {
  if (!db) throw new Error('Firestore not initialized');
  return doc(db, 'users', uid);
}

function dataDocRef(uid: string) {
  if (!db) throw new Error('Firestore not initialized');
  return doc(db, 'users', uid, 'appData', 'main');
}

// ── User Profile ─────────────────────────────────────────────

/** Create or update the user profile document on login/signup */
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
    // First time — create profile
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
    // Returning user — update last login
    await updateDoc(ref, {
      lastLoginAt: serverTimestamp(),
      displayName: user.displayName || snap.data().displayName || '',
      photoURL: user.photoURL ?? snap.data().photoURL ?? null,
    });
    console.log('[Firestore] User profile updated for', user.uid);
  }
}

// ── App Data Read/Write ──────────────────────────────────────

/** Load app data from Firestore for a user. Returns null if no data exists. */
export async function loadUserData(uid: string): Promise<UserAppData | null> {
  if (!isFirebaseConfigured || !db) return null;

  try {
    const snap = await getDoc(dataDocRef(uid));
    if (snap.exists()) {
      const data = snap.data() as UserAppData;
      console.log('[Firestore] Loaded app data for', uid);
      return data;
    }
    console.log('[Firestore] No app data found for', uid);
    return null;
  } catch (e) {
    console.error('[Firestore] Failed to load app data:', e);
    return null;
  }
}

/** Save full app data to Firestore for a user */
export async function saveUserData(uid: string, data: UserAppData): Promise<void> {
  if (!isFirebaseConfigured || !db) return;

  try {
    await setDoc(dataDocRef(uid), {
      stores: data.stores,
      categories: data.categories,
      items: data.items,
      prices: data.prices,
      trips: data.trips,
      budgets: data.budgets,
      reminders: data.reminders,
      updatedAt: serverTimestamp(),
    });
  } catch (e) {
    console.error('[Firestore] Failed to save app data:', e);
  }
}
