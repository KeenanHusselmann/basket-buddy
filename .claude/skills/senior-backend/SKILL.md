---
name: senior-backend
description: Comprehensive backend/Firebase development skill for building scalable Firestore data layers, security rules, and service patterns. Includes Firestore schema design, query optimization, security implementation, and real-time subscription patterns. Use when designing Firestore collections, optimizing queries, implementing business logic, handling auth/authorization, or reviewing Firebase service code.
---

# Senior Backend — Firebase / Firestore Patterns

Complete toolkit for Firebase backend development in BasketBuddy.

## Core Principles

### Firebase Architecture Rules

1. **Every document has `userId`** — All collections are user-scoped
2. **Security rules mirror query filters** — If you filter by `userId` in code, the rule must enforce it
3. **Denormalize for reads** — Prefer embedding data over joins; Firestore has no JOINs
4. **Limit collection size** — Large collections need indexes and pagination
5. **Batch writes for related documents** — Use `writeBatch` for atomic multi-document operations

### Firestore Service Pattern

```typescript
// services/firestore.ts — Standard CRUD pattern

// ─── CREATE ───────────────────────────────────────────
export const addTransaction = async (
  data: Omit<Transaction, 'id'>
): Promise<string> => {
  const ref = await addDoc(collection(db, 'transactions'), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return ref.id;
};

// ─── READ (real-time) ────────────────────────────────
export const subscribeToTransactions = (
  userId: string,
  callback: (data: Transaction[]) => void
): Unsubscribe => {
  const q = query(
    collection(db, 'transactions'),
    where('userId', '==', userId),
    orderBy('date', 'desc'),
    limit(100)
  );
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as Transaction));
    callback(data);
  });
};

// ─── UPDATE ──────────────────────────────────────────
export const updateTransaction = async (
  id: string,
  data: Partial<Omit<Transaction, 'id' | 'userId'>>
): Promise<void> => {
  await updateDoc(doc(db, 'transactions', id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
};

// ─── DELETE ──────────────────────────────────────────
export const deleteTransaction = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, 'transactions', id));
};
```

### Security Rules Pattern

```javascript
// firestore.rules — Every collection needs these rules
match /transactions/{docId} {
  // Read: user can only read their own documents
  allow read: if request.auth != null 
    && resource.data.userId == request.auth.uid;
  
  // Create: user can only create docs with their own userId
  allow create: if request.auth != null 
    && request.resource.data.userId == request.auth.uid
    && request.resource.data.amount is number
    && request.resource.data.amount > 0;
  
  // Update: user can only update their own docs, cannot change userId
  allow update: if request.auth != null 
    && resource.data.userId == request.auth.uid
    && request.resource.data.userId == request.auth.uid;
  
  // Delete: user can only delete their own docs
  allow delete: if request.auth != null 
    && resource.data.userId == request.auth.uid;
}
```

### Query Optimization

**Compound indexes** — Firestore requires composite indexes for multi-field queries:
```typescript
// This query needs a composite index: (userId ASC, date DESC)
query(
  collection(db, 'transactions'),
  where('userId', '==', userId),
  orderBy('date', 'desc')
)

// This query needs: (userId ASC, category ASC, date DESC)
query(
  collection(db, 'transactions'),
  where('userId', '==', userId),
  where('category', '==', category),
  orderBy('date', 'desc')
)
```

**Pagination:**
```typescript
export const getTransactionPage = async (
  userId: string,
  lastVisible: QueryDocumentSnapshot | null,
  pageSize = 20
): Promise<{ data: Transaction[]; lastDoc: QueryDocumentSnapshot | null }> => {
  let q = query(
    collection(db, 'transactions'),
    where('userId', '==', userId),
    orderBy('date', 'desc'),
    limit(pageSize)
  );
  
  if (lastVisible) {
    q = query(q, startAfter(lastVisible));
  }
  
  const snapshot = await getDocs(q);
  return {
    data: snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Transaction)),
    lastDoc: snapshot.docs[snapshot.docs.length - 1] ?? null,
  };
};
```

### Batch Operations

```typescript
// Atomic write — all succeed or all fail
export const createTripWithItems = async (
  trip: Omit<Trip, 'id'>,
  items: Omit<TripItem, 'id'>[]
): Promise<string> => {
  const batch = writeBatch(db);
  
  const tripRef = doc(collection(db, 'trips'));
  batch.set(tripRef, { ...trip, createdAt: serverTimestamp() });
  
  items.forEach(item => {
    const itemRef = doc(collection(db, 'tripItems'));
    batch.set(itemRef, { ...item, tripId: tripRef.id });
  });
  
  await batch.commit();
  return tripRef.id;
};
```

### Error Handling

```typescript
// Typed Firestore errors
import { FirestoreError } from 'firebase/firestore';

const handleFirestoreError = (error: FirestoreError): string => {
  switch (error.code) {
    case 'permission-denied': return 'You do not have permission for this action.';
    case 'not-found': return 'The requested document was not found.';
    case 'unavailable': return 'Service temporarily unavailable. Please try again.';
    default: return 'An error occurred. Please try again.';
  }
};
```

## Firestore Collections — BasketBuddy

| Collection | Index Requirements | Notes |
|-----------|-------------------|-------|
| `transactions` | `(userId, date DESC)`, `(userId, category, date DESC)` | Core finance data |
| `budgets` | `(userId, year, month)` | Monthly plans |
| `items` | `(userId, category)`, `(userId, storeId)` | Product catalog |
| `trips` | `(userId, date DESC)` | Shopping logs |
| `tripItems` | `(userId, tripId)` | Trip line items |
| `fuelEntries` | `(userId, date DESC)` | Fuel log |
| `medicalClaims` | `(userId, date DESC)` | Claims |
| `appointments` | `(userId, date ASC)` | Upcoming appts |

## Security Best Practices

- NEVER expose Firebase config keys in client code as secrets — they're safe to be public (rules protect data)
- ALWAYS validate data types in security rules for sensitive fields (amount, date)
- NEVER allow unauthenticated reads for user data
- USE Firebase Auth UID as the `userId` field — never trust client-provided IDs
- DEPLOY rules changes before deploying code that depends on them: `firebase deploy --only firestore:rules`
