---
name: ui-ux-pro-max
description: "UI/UX design intelligence for BasketBuddy. 50 styles, 21 palettes, 50 font pairings, 20 charts, Tailwind CSS stack. Actions: plan, build, create, design, implement, review, fix, improve, optimize, enhance, refactor, check UI/UX code. Projects: dashboard, finance tracker, budget planner, mobile app, .tsx. Elements: button, modal, navbar, sidebar, card, table, form, chart. Styles: glassmorphism, minimalism, dark mode, responsive. Topics: color palette, accessibility, animation, layout, typography, spacing, hover, shadow, gradient."
---

# UI/UX Pro Max — Design Intelligence for BasketBuddy

Comprehensive design guide for the BasketBuddy finance PWA. Applied to React + TypeScript + Tailwind CSS stack.

## When to Apply

Reference these guidelines when:
- Designing new UI components or pages
- Choosing color system and typography
- Reviewing code for UX issues
- Building dashboard cards or data tables
- Implementing accessibility requirements
- Adding charts (Recharts)
- Designing mobile-first layouts

## Rule Categories by Priority

| Priority | Category | Impact |
|----------|----------|--------|
| 1 | Accessibility | CRITICAL |
| 2 | Touch & Interaction | CRITICAL |
| 3 | Performance | HIGH |
| 4 | Layout & Responsive | HIGH |
| 5 | Typography & Color | MEDIUM |
| 6 | Animation | MEDIUM |
| 7 | Charts & Data | HIGH (finance app) |

## Quick Reference

### 1. Accessibility (CRITICAL)

- `color-contrast` — 4.5:1 ratio minimum for text
- `focus-states` — `focus:ring-2 focus:ring-violet-500 focus:outline-none`
- `aria-labels` — icon-only buttons need `aria-label`
- `keyboard-nav` — Tab order matches visual order
- `form-labels` — Every input needs associated `<label>`

### 2. Touch & Interaction (CRITICAL for mobile shopping app)

- `touch-target-size` — Minimum 44×44px: use `p-3` or `min-h-[44px]`
- `loading-buttons` — Disable + show spinner during async: `disabled={isSaving}`
- `error-feedback` — Clear error messages near the problem field
- `cursor-pointer` — `cursor-pointer` on all clickable divs/cards

### 3. Layout & Responsive (HIGH)

- `readable-font-size` — `text-base` (16px) minimum on mobile
- `horizontal-scroll` — `overflow-x-auto` on tables, never on page
- `z-index-management` — Modal: `z-50`, Sidebar: `z-40`, Floating calc: `z-30`
- `safe-areas` — `pb-safe` for iOS bottom bar consideration

### 4. Typography & Color for Finance (MEDIUM)

**Finance number display:**
```tsx
// Large summary numbers
<span className="text-3xl font-bold font-mono tabular-nums text-gray-900 dark:text-white">
  R 12,450.00
</span>

// Small labels
<span className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
  Monthly Budget
</span>
```

**Semantic finance colors:**
```tsx
// Income / positive
className="text-emerald-600 dark:text-emerald-400"

// Expense / negative
className="text-rose-600 dark:text-rose-400"

// Neutral / informational
className="text-violet-600 dark:text-violet-400"

// Warning
className="text-amber-600 dark:text-amber-400"
```

### 5. Animation (MEDIUM)

```tsx
// ✅ Performant transitions
className="transition-colors duration-200 ease-out"
className="transition-transform duration-200 motion-safe:hover:-translate-y-0.5"

// ❌ Avoid layout-triggering animations
// Never animate: width, height, padding, margin
// Always animate: transform, opacity, color
```

### 6. Charts & Data Visualization (HIGH for finance app)

**Recharts color system for BasketBuddy:**
```tsx
const CHART_COLORS = {
  income: '#10b981',    // emerald-500
  expense: '#f43f5e',   // rose-500
  budget: '#8b5cf6',    // violet-500
  fuel: '#f59e0b',      // amber-500
  medical: '#06b6d4',   // cyan-500
  neutral: '#94a3b8',   // slate-400
};
```

**Chart type selection:**
| Data Type | Chart | Recharts Component |
|-----------|-------|-------------------|
| Spending over time | Line | `<LineChart>` |
| Category breakdown | Donut | `<PieChart>` |
| Income vs Expense | Bar | `<BarChart>` |
| Budget vs Actual | Bar (grouped) | `<BarChart>` |
| Cumulative savings | Area | `<AreaChart>` |

**Always include:**
- `<Tooltip formatter={(v) => formatCurrency(v)}>`
- `<Legend>` for multi-series charts
- Responsive wrapper: `<ResponsiveContainer width="100%" height={300}>`
- `<CartesianGrid strokeDasharray="3 3" className="opacity-30" />`

## Common UI Patterns for Finance Apps

### Card Pattern
```tsx
<div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4 md:p-6">
  {/* content */}
</div>
```

### Summary Metric Card
```tsx
<div className="bg-gradient-to-br from-violet-500 to-violet-700 rounded-xl p-4 text-white">
  <p className="text-violet-100 text-sm font-medium">Total Balance</p>
  <p className="text-3xl font-bold font-mono tabular-nums mt-1">R 12,450</p>
  <p className="text-violet-200 text-xs mt-1">↑ 8.2% vs last month</p>
</div>
```

### Empty State
```tsx
<div className="flex flex-col items-center justify-center py-16 text-center">
  <Icon className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" />
  <p className="text-gray-500 dark:text-gray-400 font-medium">No items yet</p>
  <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Add your first item to get started</p>
  <button onClick={onAdd} className="mt-4 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-medium transition-colors">
    Add Item
  </button>
</div>
```

### Delete Confirmation
Always confirm destructive actions:
```tsx
{confirmDelete === item.id ? (
  <div className="flex gap-2">
    <button onClick={() => handleDelete(item.id)} className="px-2 py-1 bg-rose-500 text-white rounded text-xs">Confirm</button>
    <button onClick={() => setConfirmDelete(null)} className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs">Cancel</button>
  </div>
) : (
  <button onClick={() => setConfirmDelete(item.id)} className="p-1.5 text-gray-400 hover:text-rose-500 transition-colors rounded">
    <Trash2 size={14} />
  </button>
)}
```

## Anti-Patterns to ALWAYS Avoid

| Anti-Pattern | Fix |
|-------------|-----|
| Raw numbers without currency symbol | Use `formatCurrency()` |
| Missing dark mode on any element | Add `dark:` variant |
| Tap targets under 44px | Add `p-3` or `min-h-[44px]` |
| Emoji as icons | Use Lucide React icons |
| Delete without confirmation | Add inline confirm UI |
| Missing loading states | Add spinner or skeleton |
| Missing empty states | Add empty state component |
| White text on light bg in dark mode | Use `dark:text-gray-100` |
| `z-index: 9999` | Use defined z-index scale |
