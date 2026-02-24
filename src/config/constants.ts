// ==========================================
// BasketBuddy - Constants & Default Data
// ==========================================

import { Store, Category } from '../types';

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
  { id: 'spices', name: 'Spices & Condiments', icon: '🧂', color: '#D84315', isCustom: false },
  { id: 'grains-pasta', name: 'Grains & Pasta', icon: '🍝', color: '#FFA726', isCustom: false },
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
  { id: 'dashboard', label: 'Dashboard', path: '/', icon: 'LayoutDashboard' },
  { id: 'trips', label: 'Shopping Trips', path: '/trips', icon: 'ShoppingCart' },
  { id: 'items', label: 'Items & Prices', path: '/items', icon: 'Package' },
  { id: 'stores', label: 'Stores', path: '/stores', icon: 'Store' },
  { id: 'compare', label: 'Price Compare', path: '/compare', icon: 'ArrowLeftRight' },
  { id: 'optimizer', label: 'Smart Cart', path: '/optimizer', icon: 'Sparkles' },
  { id: 'budget', label: 'Budget Planner', path: '/budget', icon: 'Wallet' },
  { id: 'analytics', label: 'Analytics', path: '/analytics', icon: 'BarChart3' },
];
