// ==========================================
// BasketBuddy - Constants & Default Data
// ==========================================

import { Store, Category, GroceryItem } from '../types';

export const CURRENCY = 'N$';
export const CURRENCY_CODE = 'NAD';
export const APP_NAME = 'BasketBuddy';

// ── Default Namibian Stores ──────────────────────────────────
export const DEFAULT_STORES: Store[] = [
  { id: 'checkers', name: 'Checkers', color: '#E31937', icon: '🏪', isCustom: false, createdAt: Date.now() },
  { id: 'woermann', name: 'Woermann', color: '#1B5E20', icon: '🛒', isCustom: false, createdAt: Date.now() },
  { id: 'food-lovers', name: 'Food Lovers', color: '#FF6F00', icon: '❤️', isCustom: false, createdAt: Date.now() },
  { id: 'metro-hyper', name: 'Metro Hyper', color: '#0D47A1', icon: '🏬', isCustom: false, createdAt: Date.now() },
  { id: 'metro-liquor', name: 'Metro Liquor', color: '#4A148C', icon: '🍷', isCustom: false, createdAt: Date.now() },
  { id: 'model', name: 'Model', color: '#BF360C', icon: '🏪', isCustom: false, createdAt: Date.now() },
  { id: 'pep', name: 'Pep', color: '#F57F17', icon: '🟡', isCustom: false, createdAt: Date.now() },
  { id: 'dischem', name: 'Dis-Chem', color: '#00695C', icon: '💊', isCustom: false, createdAt: Date.now() },
  { id: 'spar', name: 'Spar', color: '#D32F2F', icon: '🔴', isCustom: false, createdAt: Date.now() },
];

// ── Default Categories ──────────────────────────────────────
export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'fruits', name: 'Fruits', icon: '🍎', color: '#f97316', isCustom: false },
  { id: 'vegetables', name: 'Vegetables', icon: '🥬', color: '#4CAF50', isCustom: false },
  { id: 'meat-poultry', name: 'Meat & Poultry', icon: '🥩', color: '#E53935', isCustom: false },
  { id: 'dairy', name: 'Dairy', icon: '🧀', color: '#FDD835', isCustom: false },
  { id: 'bakery', name: 'Bakery', icon: '🍞', color: '#8D6E63', isCustom: false },
  { id: 'beverages', name: 'Beverages', icon: '🥤', color: '#03A9F4', isCustom: false },
  { id: 'snacks', name: 'Snacks', icon: '🍿', color: '#FF9800', isCustom: false },
  { id: 'toiletries', name: 'Toiletries', icon: '🧴', color: '#9C27B0', isCustom: false },
  { id: 'cleaning', name: 'Cleaning', icon: '🧹', color: '#00BCD4', isCustom: false },
  { id: 'baby', name: 'Baby', icon: '👶', color: '#F48FB1', isCustom: false },
  { id: 'pet', name: 'Pet', icon: '🐾', color: '#795548', isCustom: false },
  { id: 'alcohol', name: 'Alcohol', icon: '🍺', color: '#FF5722', isCustom: false },
  { id: 'frozen', name: 'Frozen', icon: '🧊', color: '#4FC3F7', isCustom: false },
  { id: 'canned', name: 'Canned Goods', icon: '🥫', color: '#EF6C00', isCustom: false },
  { id: 'spices', name: 'Spices', icon: '🧂', color: '#D84315', isCustom: false },
  { id: 'condiments', name: 'Condiments', icon: '🫙', color: '#A0522D', isCustom: false },
  { id: 'grains-pasta', name: 'Grains & Pasta', icon: '🍝', color: '#FFA726', isCustom: false },
];

const T = Date.now();
// ── Default Items ────────────────────────────────────────────
export const DEFAULT_ITEMS: GroceryItem[] = [
  // Fruits
  { id: 'di-apples',      name: 'Apples',           categoryId: 'fruits',       unit: 'kg',    createdAt: T },
  { id: 'di-bananas',     name: 'Bananas',           categoryId: 'fruits',       unit: 'bunch', createdAt: T },
  { id: 'di-oranges',     name: 'Oranges',           categoryId: 'fruits',       unit: 'kg',    createdAt: T },
  { id: 'di-grapes',      name: 'Grapes',            categoryId: 'fruits',       unit: 'kg',    createdAt: T },
  // Vegetables
  { id: 'di-tomatoes',    name: 'Tomatoes',          categoryId: 'vegetables',   unit: 'kg',    createdAt: T },
  { id: 'di-onions',      name: 'Onions',            categoryId: 'vegetables',   unit: 'kg',    createdAt: T },
  { id: 'di-potatoes',    name: 'Potatoes',          categoryId: 'vegetables',   unit: 'kg',    createdAt: T },
  { id: 'di-spinach',     name: 'Spinach',           categoryId: 'vegetables',   unit: 'bunch', createdAt: T },
  // Meat & Poultry
  { id: 'di-chicken-brs', name: 'Chicken Breasts',   categoryId: 'meat-poultry', unit: 'kg',    createdAt: T },
  { id: 'di-mince',       name: 'Beef Mince',        categoryId: 'meat-poultry', unit: 'kg',    createdAt: T },
  { id: 'di-livers',      name: 'Chicken Livers',    categoryId: 'meat-poultry', unit: 'kg',    createdAt: T },
  // Dairy
  { id: 'di-milk',        name: 'Full Cream Milk',   categoryId: 'dairy',        unit: 'litre', brand: 'Parmalat', createdAt: T },
  { id: 'di-eggs',        name: 'Eggs',              categoryId: 'dairy',        unit: 'dozen', createdAt: T },
  { id: 'di-butter',      name: 'Butter',            categoryId: 'dairy',        unit: 'brick', brand: 'Lurpak',   createdAt: T },
  { id: 'di-yoghurt',     name: 'Yoghurt',           categoryId: 'dairy',        unit: 'each',  createdAt: T },
  // Bakery
  { id: 'di-bread',       name: 'White Bread',       categoryId: 'bakery',       unit: 'loaf',  createdAt: T },
  { id: 'di-brown-bread', name: 'Brown Bread',       categoryId: 'bakery',       unit: 'loaf',  createdAt: T },
  // Beverages
  { id: 'di-coke2l',      name: 'Coca-Cola',         categoryId: 'beverages',    unit: 'each',  brand: 'Coca-Cola', notes: '2L', createdAt: T },
  { id: 'di-juice',       name: 'Orange Juice',      categoryId: 'beverages',    unit: 'litre', createdAt: T },
  { id: 'di-water',       name: 'Still Water',       categoryId: 'beverages',    unit: 'each',  notes: '500ml', createdAt: T },
  // Grains & Pasta
  { id: 'di-rice',        name: 'Long Grain Rice',   categoryId: 'grains-pasta', unit: 'kg',    createdAt: T },
  { id: 'di-pasta',       name: 'Spaghetti',         categoryId: 'grains-pasta', unit: 'pack',  createdAt: T },
  { id: 'di-maize-meal',  name: 'Maize Meal',        categoryId: 'grains-pasta', unit: 'kg',    brand: 'Tafel', createdAt: T },
  // Canned Goods
  { id: 'di-baked-beans', name: 'Baked Beans',       categoryId: 'canned',       unit: 'tin',   brand: 'Koo',  createdAt: T },
  { id: 'di-tuna',        name: 'Tuna Chunks',       categoryId: 'canned',       unit: 'tin',   brand: 'Lucky Star', createdAt: T },
  // Spices
  { id: 'di-braai-salt',  name: 'Braai Salt',        categoryId: 'spices',       unit: 'each',  brand: 'Aromat', createdAt: T },
  // Condiments
  { id: 'di-sunflower-oil', name: 'Sunflower Oil',   categoryId: 'condiments',   unit: 'litre', createdAt: T },
  // Cleaning
  { id: 'di-dishwash',    name: 'Dishwashing Liquid',categoryId: 'cleaning',     unit: 'each',  brand: 'Sunlight', createdAt: T },
  { id: 'di-toilet-paper',name: 'Toilet Paper',      categoryId: 'toiletries',   unit: '6-pack', brand: 'Twinsaver', createdAt: T },
  // Snacks
  { id: 'di-chips',       name: 'Potato Chips',      categoryId: 'snacks',       unit: 'each',  brand: 'Lays', createdAt: T },
];

// ── Unit Options ─────────────────────────────────────────────
export const UNITS = [
  'each', 'kg', 'g', '100g', 'litre', 'ml', '500ml',
  'pack', '6-pack', '12-pack', 'box', 'bag', 'tin',
  'bottle', 'roll', 'dozen', 'bunch', 'tray', 'loaf', 'brick',
];

// ── Store Colors for Custom Stores ──────────────────────────
export const STORE_COLORS = [
  '#E53935', '#D81B60', '#8E24AA', '#5E35B1',
  '#3949AB', '#1E88E5', '#039BE5', '#00ACC1',
  '#00897B', '#43A047', '#7CB342', '#C0CA33',
  '#FDD835', '#FFB300', '#FB8C00', '#F4511E',
];

// ── Nav Items ────────────────────────────────────────────────
export const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard',     path: '/',          icon: 'LayoutDashboard', group: 'main' },
  { id: 'trips',        label: 'Shopping',      path: '/trips',          icon: 'ShoppingCart',    group: 'main' },
  { id: 'shopping-list', label: 'Shopping Lists', path: '/shopping-list',  icon: 'ClipboardList',   group: 'main' },
  { id: 'finance',   label: 'Finance',       path: '/finance',   icon: 'PiggyBank',       group: 'main' },
  { id: 'analytics', label: 'Analytics',     path: '/analytics', icon: 'BarChart3',       group: 'main' },
  { id: 'budget',    label: 'Budget Planner',path: '/budget',    icon: 'Wallet',          group: 'more' },
  { id: 'fuel',      label: 'Fuel & Transport', path: '/fuel',   icon: 'Fuel',            group: 'more' },
  { id: 'medical',   label: 'Medical',       path: '/medical',   icon: 'HeartPulse',      group: 'more' },
  { id: 'items',     label: 'Item Library',  path: '/items',     icon: 'Package',         group: 'more' },
  { id: 'stores',    label: 'Stores',        path: '/stores',    icon: 'Store',           group: 'more' },
];

export const BOTTOM_NAV_ITEMS = NAV_ITEMS.filter((i) => i.group === 'main');
export const MORE_NAV_ITEMS   = NAV_ITEMS.filter((i) => i.group === 'more');

// ── Personal Finance Categories ──────────────────────────────
export const FINANCE_INCOME_CATEGORIES = [
  { id: 'salary',       label: 'Salary',              icon: '💰' },
  { id: 'freelance',    label: 'Freelance / Contract', icon: '💼' },
  { id: 'rental',       label: 'Rental Income',        icon: '🏠' },
  { id: 'investment',   label: 'Investment Returns',   icon: '📈' },
  { id: 'business',     label: 'Business Income',      icon: '🏢' },
  { id: 'other-income', label: 'Other Income',         icon: '🎁' },
];

export const FINANCE_FIXED_CATEGORIES = [
  { id: 'rent',         label: 'Rent / Mortgage',  icon: '🏠' },
  { id: 'car-payment',  label: 'Car Payment',      icon: '🚗' },
  { id: 'insurance',    label: 'Insurance',        icon: '🛡️' },
  { id: 'internet',     label: 'Internet',         icon: '📶' },
  { id: 'phone',        label: 'Phone Contract',   icon: '📱' },
  { id: 'medical-aid',  label: 'Medical Aid',      icon: '💊' },
  { id: 'school',       label: 'School / Fees',    icon: '🎓' },
  { id: 'loan',         label: 'Loan Repayment',   icon: '🏦' },
  { id: 'subscriptions',label: 'Subscriptions',    icon: '📺' },
  { id: 'banking-fees', label: 'Banking Fees',     icon: '💳' },
  { id: 'savings',      label: 'Savings',          icon: '🐷' },
  { id: 'other-fixed',  label: 'Other Fixed',      icon: '📌' },
];

export const FINANCE_VARIABLE_CATEGORIES = [
  { id: 'groceries',    label: 'Groceries',        icon: '🛒' },
  { id: 'fuel',         label: 'Fuel',             icon: '⛽' },
  { id: 'utilities',    label: 'Utilities',        icon: '💡' },
  { id: 'dining-out',   label: 'Dining Out',       icon: '🍽️' },
  { id: 'entertainment',label: 'Entertainment',    icon: '🎬' },
  { id: 'clothing',     label: 'Clothing',         icon: '👗' },
  { id: 'pharmacy',     label: 'Pharmacy / Health',icon: '💊' },
  { id: 'transport',    label: 'Transport',        icon: '🚌' },
  { id: 'personal-care',label: 'Personal Care',    icon: '💇' },
  { id: 'education',    label: 'Education',        icon: '📚' },
  { id: 'savings',      label: 'Savings',          icon: '🏦' },
  { id: 'quick-loans',  label: 'Quick Loans',      icon: '💸' },
  { id: 'accounts',     label: 'Accounts',         icon: '🏧' },
  { id: 'airtime',      label: 'Airtime',          icon: '📱' },
  { id: 'banking',      label: 'Banking',          icon: '🏛️' },
  { id: 'emergency',    label: 'Emergency',        icon: '🚨' },
  { id: 'services',     label: 'Services',         icon: '🔧' },
  { id: 'electronics',  label: 'Electronics',      icon: '💻' },
  { id: 'miscellaneous',label: 'Miscellaneous',    icon: '📦' },
];
