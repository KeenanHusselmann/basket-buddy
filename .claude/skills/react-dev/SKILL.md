---
name: react-dev
version: 1.0.0
description: This skill should be used when building React components with TypeScript, typing hooks, handling events, or when React TypeScript patterns are needed. Covers type-safe patterns for React 18 including generic components, proper event typing, and React Router v6 integration.
---

# React TypeScript — Type-Safe Patterns

Type-safe React = compile-time guarantees = confident refactoring.

## When to Use

- Building typed React components
- Implementing generic components
- Typing event handlers, forms, refs
- Context API with proper typing
- Custom hooks with proper typing
- React Router v6 integration

## Component Props Patterns

**Extend native elements:**
```typescript
type ButtonProps = {
  variant: 'primary' | 'secondary' | 'danger';
  loading?: boolean;
} & React.ComponentPropsWithoutRef<'button'>;

const Button: React.FC<ButtonProps> = ({ variant, loading, children, disabled, ...props }) => (
  <button
    disabled={disabled || loading}
    className={cn(
      'px-4 py-2 rounded-lg font-medium transition-colors',
      variant === 'primary' && 'bg-violet-600 hover:bg-violet-700 text-white',
      variant === 'danger' && 'bg-rose-500 hover:bg-rose-600 text-white',
      (disabled || loading) && 'opacity-50 cursor-not-allowed'
    )}
    {...props}
  >
    {loading ? <Spinner size={16} /> : children}
  </button>
);
```

**Discriminated unions for variants:**
```typescript
type TransactionBadgeProps =
  | { type: 'income'; amount: number }
  | { type: 'expense'; amount: number }
  | { type: 'neutral'; label: string };
```

**Children typing:**
```typescript
type ModalProps = {
  children: React.ReactNode;          // Anything renderable
  title: string;
  isOpen: boolean;
  onClose: () => void;
};
```

## Event Handler Typing

```typescript
// Form submit
const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  const formData = new FormData(e.currentTarget);
  const amount = Number(formData.get('amount'));
};

// Input change
const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  setValue(e.target.value);
};

// Select change
const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
  setCategory(e.target.value as TransactionCategory);
};

// Button click
const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
  e.preventDefault();
};
```

## Hooks Typing

**useState — explicit for unions/null:**
```typescript
const [transaction, setTransaction] = useState<Transaction | null>(null);
const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
const [amount, setAmount] = useState<number>(0);
```

**useRef — DOM refs:**
```typescript
const inputRef = useRef<HTMLInputElement>(null);
// Usage: inputRef.current?.focus()
```

**useReducer — discriminated union actions:**
```typescript
type FormAction =
  | { type: 'SET_AMOUNT'; payload: number }
  | { type: 'SET_CATEGORY'; payload: string }
  | { type: 'RESET' };

function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case 'SET_AMOUNT': return { ...state, amount: action.payload };
    case 'RESET': return initialState;
    default: return state;
  }
}
```

**useContext — null guard (BasketBuddy pattern):**
```typescript
// In context file
export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within AppProvider');
  return context;
};
```

**Custom hooks — tuple returns:**
```typescript
function useToggle(initial = false): [boolean, () => void, (val: boolean) => void] {
  const [value, setValue] = useState(initial);
  const toggle = useCallback(() => setValue(v => !v), []);
  return [value, toggle, setValue];
}

// Usage: const [isOpen, toggleOpen, setOpen] = useToggle();
```

## Generic Components (BasketBuddy Patterns)

**Generic data table:**
```typescript
type Column<T> = {
  key: keyof T;
  header: string;
  render?: (value: T[keyof T], item: T) => React.ReactNode;
  className?: string;
};

type DataTableProps<T extends { id?: string }> = {
  data: T[];
  columns: Column<T>[];
  onEdit?: (item: T) => void;
  onDelete?: (id: string) => void;
};

function DataTable<T extends { id?: string }>({ data, columns, onEdit, onDelete }: DataTableProps<T>) {
  // ...
}
```

## React Router v6 Patterns

```typescript
import { useNavigate, useParams, useLocation } from 'react-router-dom';

// Typed params
const { id } = useParams<{ id: string }>();

// Navigation with state
const navigate = useNavigate();
navigate('/finance', { state: { openModal: true } });

// Location state typing
const location = useLocation();
const state = location.state as { openModal?: boolean } | null;
```

## Async Patterns with Firebase

```typescript
// Typed async handler
const handleSave = async (data: Omit<Transaction, 'id'>): Promise<void> => {
  setStatus('loading');
  try {
    await addTransaction({ ...data, userId: user!.uid });
    setStatus('idle');
    onClose();
  } catch (error) {
    console.error('Failed to save transaction:', error);
    setStatus('error');
  }
};

// Cleanup pattern for Firestore subscriptions
useEffect(() => {
  if (!user) return;
  const unsubscribe = subscribeToTransactions(user.uid, setTransactions);
  return () => unsubscribe(); // Cleanup on unmount
}, [user]);
```

## Type Narrowing

```typescript
// Narrowing Firestore optional fields
const amount = transaction.amount ?? 0;
const category = transaction.category ?? 'Other';

// Narrowing with type guards
function isExpense(t: Transaction): t is Transaction & { type: 'expense' } {
  return t.type === 'expense';
}

const expenses = transactions.filter(isExpense);
```
