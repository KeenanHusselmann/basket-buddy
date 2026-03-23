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
  // Shopping details
  address?: string;
  phone?: string;
  website?: string;
  openingHours?: string;
  notes?: string;
  loyaltyCard?: string;
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

export interface CustomFinanceCategory {
  id: string;
  label: string;
  icon: string;
  type: 'fixed' | 'variable';
}

export interface FinancePlan {
  id: string;
  month: number;
  year: number;
  incomeGoal: number;
  savingsGoal: number;
  fixedBudget?: number;
  variableBudget?: number;
  categoryTargets: FinanceCategoryTarget[];
  customCategories?: CustomFinanceCategory[];
  createdAt: number;
}

// ── Fuel / Transport Types ───────────────────────────────────

export type FuelType = 'petrol-93' | 'petrol-95' | 'diesel' | 'other';

export interface FuelFillup {
  id: string;
  date: number;           // epoch ms
  fuelType: FuelType;
  litres: number;
  pricePerLitre: number;
  totalCost: number;
  stationName: string;
  odometer?: number;
  notes?: string;
  createdAt: number;
}

export interface SavingsContribution {
  id: string;
  amount: number;
  note?: string;
  date: string;
}

export interface SavingsGoal {
  id: string;
  name: string;
  emoji: string;
  targetAmount: number;
  monthlyContribution?: number;
  contributions: SavingsContribution[];
  deadline?: string;
  createdAt: number;
}

// ── Medical Aid Types ────────────────────────────────────────

export type MedicalAidClaimCategory =
  | 'gp'
  | 'specialist'
  | 'hospital'
  | 'pharmacy'
  | 'dental'
  | 'optical'
  | 'therapy'
  | 'emergency'
  | 'maternity'
  | 'other';

export interface MedicalAidMember {
  id: string;
  name: string;
  relation: 'self' | 'spouse' | 'child' | 'parent' | 'other';
  dateOfBirth?: string;
}

export interface MedicalAidPlan {
  id: string;
  planName: string;          // e.g. "Standard Plan"
  provider: string;          // e.g. "Namibia Health Mutual"
  monthlyContribution: number;
  members: MedicalAidMember[];
  // Annual benefit limits per category (0 = unlimited / not tracked)
  gpLimit: number;
  specialistLimit: number;
  hospitalLimit: number;
  pharmacyLimit: number;
  dentalLimit: number;
  opticalLimit: number;
  therapyLimit: number;
  active: boolean;
  notes?: string;
  createdAt: number;
}

export interface MedicalAidClaim {
  id: string;
  date: number;                        // epoch ms
  category: MedicalAidClaimCategory;
  provider: string;                    // e.g. "Dr. Smith", "Dis-Chem"
  description: string;
  totalBill: number;                   // Total amount billed
  medicalAidPaid: number;              // Amount the medical aid covered
  selfPaid: number;                    // Gap / co-payment paid out of pocket
  memberName: string;                  // Which family member
  claimStatus: 'pending' | 'approved' | 'rejected';
  notes?: string;
  createdAt: number;
}
// ── Medical Appointments ─────────────────────────────────────
export type MedicalAppointmentStatus = 'upcoming' | 'completed' | 'cancelled' | 'no-show';
export type MedicalAppointmentType =
  | 'gp' | 'specialist' | 'dentist' | 'optometrist' | 'physiotherapy'
  | 'psychology' | 'gynecology' | 'pathology' | 'radiology'
  | 'pharmacy_consult' | 'hospital_consult' | 'chronic_review' | 'aesthetic' | 'other';

export interface MedicalAppointment {
  id: string;
  memberName: string;
  type: MedicalAppointmentType;
  benefitPool: string;              // e.g. 'gp', 'specialist', 'dental'
  practitioner: string;
  practice: string;
  phone?: string;
  address?: string;
  date: number;                     // epoch ms — midnight of appointment day
  time: string;                     // 'HH:mm' 24-hour format, e.g. '14:30'
  durationMinutes: number;
  status: MedicalAppointmentStatus;
  notes?: string;
  reminderEnabled: boolean;
  reminderMinutesBefore: number;    // e.g. 60, 1440
  linkedClaimId?: string;
  createdAt: number;
}

// ── Shopping Lists ────────────────────────────────────────────

export interface ShoppingListItem {
  id: string;
  itemId?: string;         // optional ref to GroceryItem in item library
  itemName: string;
  categoryId?: string;
  quantity: number;
  unit: string;
  estimatedPrice: number;  // per unit
  notes?: string;
  checked: boolean;
}

export interface ShoppingList {
  id: string;
  name: string;            // e.g. "January Bulk Buy"
  month: number;           // 1–12
  year: number;
  items: ShoppingListItem[];
  notes?: string;
  createdAt: number;
  updatedAt: number;
}