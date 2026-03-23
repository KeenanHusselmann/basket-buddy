---
name: senior-architect
description: Comprehensive software architecture skill for designing scalable, maintainable systems. Includes architecture pattern evaluation, tech stack decision frameworks, and dependency analysis. Use when designing system architecture, making technical decisions, evaluating trade-offs, or defining integration patterns for BasketBuddy.
---

# Senior Architect — System Design for BasketBuddy

Architecture guidance for the Firebase + React + TypeScript PWA.

## Current Architecture

```
┌─────────────────────────────────────────┐
│              Browser / PWA              │
│  ┌───────────────────────────────────┐  │
│  │         React 18 + Vite           │  │
│  │  ┌──────────┐  ┌───────────────┐  │  │
│  │  │  Router  │  │   Contexts    │  │  │
│  │  │  (RRv6)  │  │ App/Auth/Theme│  │  │
│  │  └──────────┘  └───────────────┘  │  │
│  │  ┌──────────────────────────────┐ │  │
│  │  │   Pages (12 feature areas)   │ │  │
│  │  └──────────────────────────────┘ │  │
│  └───────────────────────────────────┘  │
│              │  Firebase SDK           │
└──────────────┼──────────────────────────┘
               ↓
┌─────────────────────────────────────────┐
│             Firebase Platform           │
│  ┌─────────────┐  ┌──────────────────┐  │
│  │  Firestore  │  │   Authentication  │  │
│  │  (NoSQL DB) │  │  Email + Google   │  │
│  └─────────────┘  └──────────────────┘  │
│  ┌─────────────┐                        │
│  │   Hosting   │                        │
│  │  (PWA/SPA)  │                        │
│  └─────────────┘                        │
└─────────────────────────────────────────┘
```

## Architectural Decisions & Rationale

### Why Context API over Redux/Zustand
- App is single-user with ~10 data collections
- No complex cross-slice derived state that would need selectors
- Firebase's `onSnapshot` provides real-time reactivity that maps naturally to Context
- **When to reconsider**: If >5 contexts start causing re-render performance issues

### Why Firestore over SQL
- Offline support built-in (critical for PWA use while shopping)
- Real-time listeners eliminate polling
- User-scoped collections are simple to secure
- **When to reconsider**: Complex reporting queries that need aggregations

### Why Single AppContext vs Per-Feature Contexts
- All features share common user identity
- Cross-feature relationships (trips → items → stores) need shared access
- **Risk**: Large context causes unnecessary re-renders — mitigate with `useMemo` for derived state

## Adding New Features — Decision Framework

### 1. Data Layer Decision
```
New feature needs data?
├── User-specific data → Firestore collection
│   ├── Simple CRUD → onSnapshot subscription
│   └── Complex queries → Add compound index to firestore.indexes.json
├── Computed from existing data → Derive in component/context, don't store
└── Shared reference data (categories, etc.) → constants.ts
```

### 2. State Location Decision
```
Where does state live?
├── UI-only (modal open, form values) → local useState
├── Shared across 2-3 sibling components → lift to parent
├── Required by many unrelated components → AppContext
└── Persisted across sessions → Firestore
```

### 3. Component Location Decision
```
src/
  components/
    common/       → Used in 3+ different pages
    layout/       → Part of app shell (Header, Sidebar, Layout)
    [feature]/    → Used only within one feature area
  pages/          → Top-level route components
```

## Scalability Patterns

### Context Performance
```typescript
// Split frequently-changing from rarely-changing state
// Currently fine for BasketBuddy's scale

// If performance degrades:
// 1. Split AppContext into DomainContexts
// 2. Use React.memo on child components
// 3. Use useCallback for handlers passed as props
```

### Code Splitting (when pages get heavy)
```typescript
// In App.tsx — lazy load heavy pages
const Analytics = React.lazy(() => import('./pages/Analytics'));
const StoreOptimizer = React.lazy(() => import('./pages/StoreOptimizer'));

// Wrap in Suspense
<Suspense fallback={<PageLoader />}>
  <Analytics />
</Suspense>
```

### Firebase Cost Optimization
- Use `limit()` on all list queries to prevent full-collection reads
- Use `onSnapshot` for frequently-accessed data (transactions, items)
- Use `getDoc` for single-document reads (user profile)
- Cache expensive aggregations in a dedicated `userStats` document

## Architecture Checklist for New Features

Before implementing:
- [ ] Identified Firestore collection name (snake_case, plural)
- [ ] Defined TypeScript interface in `src/types/index.ts`
- [ ] Verified security rules design
- [ ] Identified required Firestore indexes
- [ ] Decided state location (local vs AppContext)
- [ ] Identified which existing pages/components integrate with this feature
- [ ] Checked if feature affects existing Security Rules

After implementing:
- [ ] No circular imports
- [ ] Feature works offline (Firestore offline cache)
- [ ] Security rules deployed before code
- [ ] No N+1 query patterns (fetching items inside a loop)
