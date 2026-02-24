// ==========================================
// BasketBuddy - Analytics Dashboard
// ==========================================

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3, TrendingUp, TrendingDown, Calendar, ChevronLeft, ChevronRight,
  DollarSign, ShoppingCart, Package, Store as StoreIcon
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend, Area, AreaChart,
} from 'recharts';
import { useApp } from '../contexts/AppContext';
import { useTheme } from '../contexts/ThemeContext';
import { formatPrice, cn } from '../utils/helpers';

const Analytics: React.FC = () => {
  const { trips, categories, stores, items, prices } = useApp();
  const { isDark } = useTheme();
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());

  const completedTrips = trips.filter((t) => t.status === 'completed');

  // ── Monthly Spending ───────────────────────────────────────
  const monthlyData = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => ({
      month: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i],
      spent: 0,
      trips: 0,
    }));

    completedTrips.forEach((trip) => {
      const d = new Date(trip.date);
      if (d.getFullYear() === viewYear) {
        months[d.getMonth()].spent += trip.totalSpent;
        months[d.getMonth()].trips += 1;
      }
    });

    return months;
  }, [completedTrips, viewYear]);

  const totalYearSpent = monthlyData.reduce((s, m) => s + m.spent, 0);
  const totalYearTrips = monthlyData.reduce((s, m) => s + m.trips, 0);
  const avgMonthly = totalYearSpent / Math.max(1, monthlyData.filter((m) => m.spent > 0).length);

  // ── Category Breakdown ─────────────────────────────────────
  const categoryData = useMemo(() => {
    const map = new Map<string, number>();
    completedTrips
      .filter((t) => new Date(t.date).getFullYear() === viewYear)
      .forEach((trip) => {
        trip.items.forEach((item) => {
          const prev = map.get(item.categoryId) || 0;
          map.set(item.categoryId, prev + (item.actualPrice || item.estimatedPrice) * item.quantity);
        });
      });

    return Array.from(map.entries())
      .map(([catId, amount]) => {
        const cat = categories.find((c) => c.id === catId);
        return { name: cat?.name || catId, value: amount, color: cat?.color || '#999', icon: cat?.icon || '📦' };
      })
      .sort((a, b) => b.value - a.value);
  }, [completedTrips, categories, viewYear]);

  // ── Store Breakdown ────────────────────────────────────────
  const storeData = useMemo(() => {
    const map = new Map<string, { spent: number; trips: number }>();
    completedTrips
      .filter((t) => new Date(t.date).getFullYear() === viewYear)
      .forEach((trip) => {
        const prev = map.get(trip.storeId) || { spent: 0, trips: 0 };
        map.set(trip.storeId, { spent: prev.spent + trip.totalSpent, trips: prev.trips + 1 });
      });

    return Array.from(map.entries())
      .map(([storeId, data]) => {
        const store = stores.find((s) => s.id === storeId);
        return { name: store?.name || storeId, color: store?.color || '#999', ...data };
      })
      .sort((a, b) => b.spent - a.spent);
  }, [completedTrips, stores, viewYear]);

  // ── Spending Trend (last 6 months) ─────────────────────────
  const trendData = useMemo(() => {
    const data: { month: string; amount: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthTrips = completedTrips.filter((t) => {
        const td = new Date(t.date);
        return td.getMonth() === d.getMonth() && td.getFullYear() === d.getFullYear();
      });
      data.push({
        month: d.toLocaleDateString('en-NA', { month: 'short' }),
        amount: monthTrips.reduce((s, t) => s + t.totalSpent, 0),
      });
    }
    return data;
  }, [completedTrips]);

  const tooltipStyle = {
    contentStyle: {
      backgroundColor: isDark ? '#1f2937' : '#ffffff',
      border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
      borderRadius: '12px',
      fontSize: '12px',
    },
    labelStyle: { color: isDark ? '#9ca3af' : '#6b7280' },
  };

  const gridColor = isDark ? '#374151' : '#f3f4f6';
  const textColor = isDark ? '#9ca3af' : '#6b7280';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="text-brand-500" size={24} /> Analytics
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">
            Insights into your grocery spending patterns
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setViewYear(viewYear - 1)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800">
            <ChevronLeft size={18} className="text-gray-600 dark:text-gray-400" />
          </button>
          <span className="text-lg font-bold text-gray-800 dark:text-gray-200 min-w-[60px] text-center">{viewYear}</span>
          <button onClick={() => setViewYear(viewYear + 1)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800">
            <ChevronRight size={18} className="text-gray-600 dark:text-gray-400" />
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
          <DollarSign size={18} className="text-green-500 mb-2" />
          <p className="text-sm text-gray-500">Total Spent</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatPrice(totalYearSpent)}</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
          <Calendar size={18} className="text-blue-500 mb-2" />
          <p className="text-sm text-gray-500">Avg Monthly</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatPrice(avgMonthly)}</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
          <ShoppingCart size={18} className="text-purple-500 mb-2" />
          <p className="text-sm text-gray-500">Total Trips</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalYearTrips}</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
          <Package size={18} className="text-amber-500 mb-2" />
          <p className="text-sm text-gray-500">Items Tracked</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{items.length}</p>
        </motion.div>
      </div>

      {completedTrips.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-12 text-center">
          <BarChart3 className="mx-auto text-gray-300 dark:text-gray-700 mb-3" size={48} />
          <p className="text-gray-500 font-medium mb-1">No data yet</p>
          <p className="text-gray-400 text-sm">Complete some shopping trips to see analytics</p>
        </div>
      ) : (
        <>
          {/* Monthly Spending Bar Chart */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
            <h2 className="font-semibold text-gray-800 dark:text-gray-200 mb-4">Monthly Spending</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="month" tick={{ fill: textColor, fontSize: 12 }} />
                <YAxis tick={{ fill: textColor, fontSize: 12 }} tickFormatter={(v) => `N$${v}`} />
                <Tooltip
                  {...tooltipStyle}
                  formatter={(value: number) => [formatPrice(value), 'Spent']}
                />
                <Bar dataKey="spent" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category Pie */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
              <h2 className="font-semibold text-gray-800 dark:text-gray-200 mb-4">Spending by Category</h2>
              {categoryData.length > 0 ? (
                <div className="flex flex-col items-center">
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        {...tooltipStyle}
                        formatter={(value: number) => [formatPrice(value), 'Spent']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2 mt-2">
                    {categoryData.slice(0, 8).map((cat) => (
                      <div key={cat.name} className="flex items-center gap-2 text-xs">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                        <span className="text-gray-600 dark:text-gray-400">{cat.icon} {cat.name}</span>
                        <span className="ml-auto font-medium text-gray-800 dark:text-gray-200">{formatPrice(cat.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-gray-400 text-sm text-center py-8">No category data</p>
              )}
            </div>

            {/* Store Breakdown */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
              <h2 className="font-semibold text-gray-800 dark:text-gray-200 mb-4">Spending by Store</h2>
              {storeData.length > 0 ? (
                <div className="space-y-4">
                  {storeData.map((store) => {
                    const pct = totalYearSpent > 0 ? Math.round((store.spent / totalYearSpent) * 100) : 0;
                    return (
                      <div key={store.name} className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: store.color }} />
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{store.name}</span>
                            <span className="text-xs text-gray-400">{store.trips} trips</span>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{formatPrice(store.spent)}</span>
                            <span className="text-xs text-gray-400 ml-2">{pct}%</span>
                          </div>
                        </div>
                        <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.6 }}
                            className="h-full rounded-full"
                            style={{ backgroundColor: store.color }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-gray-400 text-sm text-center py-8">No store data</p>
              )}
            </div>
          </div>

          {/* Spending Trend */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
            <h2 className="font-semibold text-gray-800 dark:text-gray-200 mb-4">6-Month Trend</h2>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="month" tick={{ fill: textColor, fontSize: 12 }} />
                <YAxis tick={{ fill: textColor, fontSize: 12 }} tickFormatter={(v) => `N$${v}`} />
                <Tooltip
                  {...tooltipStyle}
                  formatter={(value: number) => [formatPrice(value), 'Spent']}
                />
                <Area type="monotone" dataKey="amount" stroke="#3b82f6" strokeWidth={2} fill="url(#colorAmount)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
};

export default Analytics;
