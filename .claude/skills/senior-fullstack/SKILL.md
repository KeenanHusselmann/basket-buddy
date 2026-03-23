---
name: senior-fullstack
description: Comprehensive fullstack development skill for building complete features with React, TypeScript, and Firebase. Includes project scaffolding, code quality analysis, architecture patterns, and complete Firebase + React stack guidance. Use when building new full features, analyzing code quality, implementing design patterns, or setting up development workflows.
---

# Senior Fullstack — Complete Feature Development

End-to-end feature development workflow for BasketBuddy (React + TypeScript + Firebase).

## The Golden Rule

**Every new feature follows this sequence — no exceptions:**

```
1. Types (src/types/index.ts)
        ↓
2. Firestore service (src/services/firestore.ts)
        ↓
3. AppContext state + subscription (src/contexts/AppContext.tsx)
        ↓
4. React Page/Component (src/pages/ or src/components/)
        ↓
5. Route registration (src/App.tsx)
        ↓
6. Navigation link (src/components/layout/Sidebar.tsx)
        ↓
7. Security rules (firestore.rules)
```

## Complete Feature Template

### Step 1: Types

```typescript
// src/types/index.ts — ADD to existing file

export interface Subscription {
  id?: string;
  userId: string;
  name: string;
  amount: number;
  currency: 'ZAR' | 'USD';
  billingCycle: 'monthly' | 'annual';
  renewalDate: string;       // ISO date string
  category: string;
  isActive: boolean;
  notes?: string;
  createdAt?: Timestamp;
}
```

### Step 2: Firestore Services

```typescript
// src/services/firestore.ts — ADD these functions

export const subscribeToSubscriptions = (
  userId: string,
  callback: (data: Subscription[]) => void
): Unsubscribe => {
  return onSnapshot(
    query(
      collection(db, 'subscriptions'),
      where('userId', '==', userId),
      orderBy('renewalDate', 'asc')
    ),
    (snapshot) => {
      callback(snapshot.docs.map(doc => ({
        id: doc.id, ...doc.data()
      } as Subscription)));
    }
  );
};

export const addSubscription = async (
  data: Omit<Subscription, 'id'>
): Promise<string> => {
  const ref = await addDoc(collection(db, 'subscriptions'), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return ref.id;
};

export const updateSubscription = async (
  id: string,
  data: Partial<Omit<Subscription, 'id' | 'userId'>>
): Promise<void> => {
  await updateDoc(doc(db, 'subscriptions', id), data);
};

export const deleteSubscription = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, 'subscriptions', id));
};
```

### Step 3: AppContext Integration

```typescript
// src/contexts/AppContext.tsx — ADD to existing context

// State
const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);

// Subscription in useEffect (inside the auth-guarded block)
const unsubSubscriptions = subscribeToSubscriptions(
  currentUser.uid,
  setSubscriptions
);

// Add to cleanup array
return () => {
  // ... existing unsubscribes
  unsubSubscriptions();
};

// Expose in context value
// subscriptions,
```

### Step 4: React Page Template

```tsx
// src/pages/Subscriptions.tsx

import React, { useState } from 'react';
import { Plus, Edit2, Trash2, CreditCard } from 'lucide-react';
import { useAppContext } from '../contexts/AppContext';
import { useAuthContext } from '../contexts/AuthContext';
import Modal from '../components/common/Modal';
import { addSubscription, updateSubscription, deleteSubscription } from '../services/firestore';
import { formatCurrency } from '../utils/helpers';
import type { Subscription } from '../types';

const Subscriptions: React.FC = () => {
  const { subscriptions } = useAppContext();
  const { currentUser } = useAuthContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Subscription | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const monthlyTotal = subscriptions
    .filter(s => s.isActive)
    .reduce((sum, s) => sum + (s.billingCycle === 'monthly' ? s.amount : s.amount / 12), 0);

  const handleSave = async (formData: Omit<Subscription, 'id'>) => {
    if (!currentUser) return;
    try {
      if (editingItem?.id) {
        await updateSubscription(editingItem.id, formData);
      } else {
        await addSubscription({ ...formData, userId: currentUser.uid });
      }
      setIsModalOpen(false);
      setEditingItem(null);
    } catch (error) {
      console.error('Error saving subscription:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteSubscription(id);
      setConfirmDelete(null);
    } catch (error) {
      console.error('Error deleting:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Subscriptions</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Monthly cost: <span className="font-semibold text-violet-600 dark:text-violet-400">{formatCurrency(monthlyTotal)}</span>
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors text-sm font-medium"
        >
          <Plus size={16} />
          Add Subscription
        </button>
      </div>

      {/* List */}
      {subscriptions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <CreditCard className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">No subscriptions tracked</p>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Add Netflix, Spotify, and more</p>
        </div>
      ) : (
        <div className="space-y-3">
          {subscriptions.map(sub => (
            <div key={sub.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">{sub.name}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{sub.category} · {sub.billingCycle}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono font-bold text-violet-600 dark:text-violet-400">{formatCurrency(sub.amount)}</span>
                <button onClick={() => { setEditingItem(sub); setIsModalOpen(true); }} className="p-1.5 text-gray-400 hover:text-blue-500 transition-colors rounded cursor-pointer">
                  <Edit2 size={14} />
                </button>
                {confirmDelete === sub.id ? (
                  <div className="flex gap-1">
                    <button onClick={() => handleDelete(sub.id!)} className="px-2 py-1 bg-rose-500 text-white rounded text-xs">Yes</button>
                    <button onClick={() => setConfirmDelete(null)} className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs">No</button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmDelete(sub.id!)} className="p-1.5 text-gray-400 hover:text-rose-500 transition-colors rounded cursor-pointer">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingItem(null); }} title={editingItem ? 'Edit Subscription' : 'Add Subscription'}>
        {/* Form here */}
      </Modal>
    </div>
  );
};

export default Subscriptions;
```

### Step 5: Route Registration

```tsx
// src/App.tsx — ADD import and route
import Subscriptions from './pages/Subscriptions';

// Inside <Routes>:
<Route path="/subscriptions" element={<Subscriptions />} />
```

### Step 6: Sidebar Navigation

```tsx
// src/components/layout/Sidebar.tsx — ADD to navigation items
{ path: '/subscriptions', label: 'Subscriptions', icon: CreditCard },
```

### Step 7: Security Rules

```javascript
// firestore.rules — ADD
match /subscriptions/{docId} {
  allow read: if request.auth != null && resource.data.userId == request.auth.uid;
  allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
  allow update: if request.auth != null && resource.data.userId == request.auth.uid;
  allow delete: if request.auth != null && resource.data.userId == request.auth.uid;
}
```

## Quality Gates

Every feature must pass before being considered done:
- [ ] `npx tsc --noEmit` → 0 errors
- [ ] TypeScript strict: 0 `any` types
- [ ] All Firestore listeners cleaned up
- [ ] Security rules cover new collection
- [ ] Dark mode on all elements
- [ ] Mobile layout at 375px
- [ ] Loading state exists
- [ ] Empty state exists
- [ ] Error state exists (try/catch on all async)
- [ ] Delete has confirmation dialog
- [ ] Numbers use `formatCurrency()`
- [ ] Route registered in App.tsx
- [ ] Navigation link in Sidebar.tsx
