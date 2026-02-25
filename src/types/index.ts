// ==========================================
// BasketBuddy - Type Definitions
// ==========================================

export interface Store {
  id: string;
  name: string;
  color: string;
  icon: string;
  isCustom: boolean;
  createdBy?: string;
  createdAt: number;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  isCustom: boolean;
}

export interface GroceryItem {
  id: string;
  name: string;
  categoryId: string;
  unit: string;
  brand?: string;
  notes?: string;
  image?: string;
  createdBy?: string;
  createdAt: number;
}

export interface ComboDeal {
  type: 'multi-buy' | 'bogo' | 'custom';
  quantity?: number;     // e.g. 2 in "2 for N$30"
  forPrice?: number;     // e.g. 30 in "2 for N$30"
  description?: string;  // custom label
}

export interface PriceEntry {
  id: string;
  itemId: string;
  storeId: string;
  normalPrice: number;
  specialPrice?: number;
  isOnSpecial: boolean;
  specialStartDate?: number;
  specialEndDate?: number;
  comboDeal?: ComboDeal;
  updatedAt: number;
  updatedBy?: string;
}

export interface ShoppingTrip {
  id: string;
  name: string;
  storeId: string;
  budget: number;
  date: number;
  status: 'planned' | 'in-progress' | 'completed';
  items: ShoppingTripItem[];
  totalSpent: number;
  notes?: string;
  createdBy?: string;
  sharedWith: string[];
  createdAt: number;
  completedAt?: number;
}

export interface ShoppingTripItem {
  id: string;
  itemId: string;
  itemName: string;
  categoryId: string;
  quantity: number;
  unit: string;
  estimatedPrice: number;
  actualPrice?: number;
  checked: boolean;
  storeId: string;
}

export interface MonthlyBudget {
  id: string;
  month: number;
  year: number;
  totalBudget: number;
  categoryBudgets: CategoryBudget[];
  createdBy?: string;
  createdAt: number;
}

export interface CategoryBudget {
  categoryId: string;
  amount: number;
  spent: number;
}

export interface RestockReminder {
  id: string;
  itemId: string;
  itemName: string;
  frequency: number; // days
  lastPurchased: number;
  nextReminder: number;
  enabled: boolean;
}

export interface SpendingRecord {
  id: string;
  tripId: string;
  storeId: string;
  categoryId: string;
  itemId: string;
  amount: number;
  quantity: number;
  date: number;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  currency: string;
  createdAt: number;
}

// UI Types
export type ThemeMode = 'light' | 'dark';

export interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: string;
  badge?: number;
}

export interface ChartDataPoint {
  name: string;
  value: number;
  color?: string;
}

export interface StoreComparison {
  itemId: string;
  itemName: string;
  prices: {
    storeId: string;
    storeName: string;
    normalPrice: number;
    specialPrice?: number;
    isOnSpecial: boolean;
    isCheapest: boolean;
  }[];
}

export interface OptimizedCart {
  totalCost: number;
  totalSavings: number;
  storeBreakdown: {
    storeId: string;
    storeName: string;
    storeColor: string;
    items: {
      itemId: string;
      itemName: string;
      price: number;
      isSpecial: boolean;
    }[];
    subtotal: number;
  }[];
}

// ── Personal Finance Types ───────────────────────────────────

export type FinanceTransactionType = 'income' | 'fixed' | 'variable';

export interface FinanceTransaction {
  id: string;
  month: number;
  year: number;
  type: FinanceTransactionType;
  category: string;       // e.g. "Salary", "Rent", "Fuel"
  description: string;
  amount: number;
  date: number;           // epoch ms
  recurring: boolean;
  notes?: string;
  createdAt: number;
}

export interface FinanceCategoryTarget {
  category: string;
  type: 'fixed' | 'variable';
  targetAmount: number;
}

export interface FinancePlan {
  id: string;
  month: number;
  year: number;
  incomeGoal: number;
  savingsGoal: number;
  categoryTargets: FinanceCategoryTarget[];
  createdAt: number;
}
