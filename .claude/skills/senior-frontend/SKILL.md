---
name: senior-frontend
description: Comprehensive frontend development skill for building modern, performant web applications using ReactJS, TypeScript, Tailwind CSS. Includes component scaffolding, performance optimization, and UI best practices. Use when developing frontend features, optimizing performance, implementing UI/UX designs, managing state, or reviewing frontend code.
---

# Senior Frontend

Complete toolkit for senior frontend development with modern tools and best practices.

## Core Principles

### Code Quality Standards
- **TypeScript strict mode** — No `any`, no implicit undefined, no unchecked indexed access
- **Functional components only** — No class components
- **Hooks over HOCs** — Custom hooks for shared logic
- **Co-locate state** — useState when local, Context when shared across tree
- **Memoize correctly** — useMemo for expensive computations, useCallback for stable function refs

### React Patterns (BasketBuddy Stack)

**Component structure:**
```tsx
// 1. Imports
import React, { useState, useMemo } from 'react';
import { Icon } from 'lucide-react';
import { useAppContext } from '../contexts/AppContext';
import type { MyType } from '../types';

// 2. Interface
interface Props {
  item: MyType;
  onSave: (data: Omit<MyType, 'id'>) => Promise<void>;
}

// 3. Component
const MyComponent: React.FC<Props> = ({ item, onSave }) => {
  // a. All hooks at top
  const { loading } = useAppContext();
  const [isEditing, setIsEditing] = useState(false);
  
  // b. Derived state / memos
  const formattedAmount = useMemo(() => 
    formatCurrency(item.amount), [item.amount]
  );
  
  // c. Handlers
  const handleSave = async (data: Omit<MyType, 'id'>) => {
    try {
      await onSave(data);
      setIsEditing(false);
    } catch (error) {
      console.error('Save failed:', error);
    }
  };
  
  // d. Render
  return <div>...</div>;
};

export default MyComponent;
```

### Performance Checklist
- [ ] Lists use stable `key` props (never array index for dynamic lists)
- [ ] `useCallback` wraps event handlers passed as props
- [ ] `useMemo` wraps expensive filter/sort/map operations
- [ ] Images have explicit width/height to prevent layout shift
- [ ] Firestore listeners cleaned up in useEffect return
- [ ] No unnecessary re-renders (check with React DevTools Profiler)

### Tailwind CSS Best Practices

**Dark mode** — always provide `dark:` variant:
```tsx
// ✅ Correct
<div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">

// ❌ Missing dark mode
<div className="bg-white text-gray-900">
```

**Responsive** — mobile-first:
```tsx
// Stack on mobile, side-by-side on md+
<div className="flex flex-col md:flex-row gap-4">
```

**Touch targets** — minimum 44px:
```tsx
<button className="p-3 min-h-[44px] min-w-[44px]"> {/* 44px tap target */}
```

### State Management (AppContext Pattern)

```tsx
// Consuming context
const { stores, items, loading, error } = useAppContext();

// Loading state
if (loading) return <LoadingSpinner />;

// Error state  
if (error) return <ErrorMessage message={error} />;

// Empty state
if (items.length === 0) return <EmptyState onAdd={() => setModalOpen(true)} />;
```

### Bundle Size Rules
- Import only needed Lucide icons (named imports, not wildcard)
- Lazy-load pages with `React.lazy()` if they get heavy
- Keep Recharts imports specific: `import { LineChart, Line, XAxis } from 'recharts'`

## Review Checklist

Before submitting any frontend work:
- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] No `any` types anywhere
- [ ] All Firestore `onSnapshot` listeners have cleanup functions
- [ ] Dark mode tested (toggle theme in app)
- [ ] Mobile layout verified at 375px width
- [ ] Loading states for every async operation
- [ ] Empty states for every list/collection
- [ ] Error states for every try/catch
- [ ] Numbers use `formatCurrency()` from `src/utils/helpers.ts`
- [ ] Dates use `formatDate()` from `src/utils/helpers.ts`
