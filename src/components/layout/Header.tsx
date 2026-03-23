// ==========================================
// BasketBuddy - Top Header Bar
// ==========================================

import React, { useState, useRef } from 'react';
import { Search, Bell, Moon, Sun, CloudUpload, Loader, CheckCircle, XCircle, Cloud, AlertCircle, Clock, Download, UploadCloud, RotateCcw, ShieldCheck } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';
import { cn, daysUntilRestock, formatPrice } from '../../utils/helpers';
import { CURRENCY } from '../../config/constants';
import { isFirebaseConfigured } from '../../config/firebase';
import { verifyCloudCounts, type CloudCounts } from '../../services/firestore';

interface HeaderProps {}

const Header: React.FC<HeaderProps> = () => {
  const { theme, toggleTheme, isDark } = useTheme();
  const { user } = useAuth();
  const { reminders, trips, items, prices, stores, transactions,
          savingsGoals, fuelFillups, financePlans, budgets,
          syncNow, mergeSync, syncStatus, lastSyncedAt } = useApp();
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{ cloud: CloudCounts; local: Record<string, number> } | null>(null);
  const importRef = useRef<HTMLInputElement>(null);

  const localCounts = {
    stores: stores.length, items: items.length, trips: trips.length,
    prices: prices.length, transactions: transactions.length, reminders: reminders.length,
  };

  const handleVerify = async () => {
    if (!user) return;
    setVerifying(true);
    setVerifyResult(null);
    const cloud = await verifyCloudCounts(user.uid);
    setVerifying(false);
    if (cloud) {
      setVerifyResult({
        cloud,
        local: {
          stores: stores.length,
          categories: 0,   // not tracked in UI
          items: items.length,
          prices: prices.length,
          trips: trips.length,
          budgets: budgets.length,
          reminders: reminders.length,
          transactions: transactions.length,
          financePlans: financePlans.length,
          savingsGoals: savingsGoals.length,
          fuelFillups: fuelFillups.length,
        },
      });
    }
  };

  const handleExport = () => {
    const data = localStorage.getItem('bb-app-data');
    if (!data) { alert('No data found in local storage.'); return; }
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `basketbuddy-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const hasPrePullBackup = !!localStorage.getItem('bb-pre-pull-backup');

  const handleRestorePrePull = () => {
    const backup = localStorage.getItem('bb-pre-pull-backup');
    if (!backup) { alert('No pre-sync backup found.'); return; }
    if (!confirm('This will restore the snapshot that was saved just before the last cloud pull overwrote your data. Continue?')) return;
    localStorage.setItem('bb-app-data', backup);
    localStorage.setItem('bb-pending-save', '1');
    localStorage.setItem('bb-last-local-modified', (Date.now()).toString());
    window.location.reload();
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        JSON.parse(text); // validate
        if (!confirm('This will replace ALL current app data with the imported file. Continue?')) return;
        localStorage.setItem('bb-app-data', text);
        localStorage.setItem('bb-pending-save', '1');
        localStorage.setItem('bb-last-local-modified', (Date.now()).toString());
        window.location.reload();
      } catch { alert('Invalid backup file — could not parse JSON.'); }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Calculate notifications
  const activeReminders = reminders.filter(
    (r) => r.enabled && daysUntilRestock(r.lastPurchased, r.frequency) <= 2
  );
  const plannedTrips = trips.filter((t) => t.status === 'planned');
  const totalNotifs = activeReminders.length + plannedTrips.length;

  // Quick stats — use billing period (25th cutoff: days 1-24 = prev month's period)
  const _now = new Date();
  const _billingPeriod = (() => {
    const d = _now.getDate(), m = _now.getMonth() + 1, y = _now.getFullYear();
    if (d <= 24) return m === 1 ? { month: 12, year: y - 1 } : { month: m - 1, year: y };
    return { month: m, year: y };
  })();
  const _periodStart = new Date(_billingPeriod.year, _billingPeriod.month - 1, 25, 0, 0, 0, 0).getTime();
  const _periodEnd   = new Date(_billingPeriod.year, _billingPeriod.month,     24, 23, 59, 59, 999).getTime();
  const _MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const periodLabel = `${_MONTHS[_billingPeriod.month - 1]} ${_billingPeriod.year}`;

  const grocerySpent = trips
    .filter((t) => t.status === 'completed' && t.date >= _periodStart && t.date <= _periodEnd)
    .reduce((s, t) => s + t.totalSpent, 0);
  const financeSpent = transactions
    .filter((t) => t.type !== 'income' && t.date >= _periodStart && t.date <= _periodEnd)
    .reduce((s, t) => s + t.amount, 0);
  const fuelSpent = fuelFillups
    .filter((f) => f.date >= _periodStart && f.date <= _periodEnd)
    .reduce((s, f) => s + f.totalCost, 0);
  const monthlySpent = grocerySpent + financeSpent + fuelSpent;

  return (
    <header className="h-14 bg-gray-950/80 backdrop-blur-xl border-b border-green-500/20 flex items-center px-4 gap-3 sticky top-0 z-30">

      {/* Search */}
      <div className="relative flex-1 max-w-md">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
        <input
          type="text"
          placeholder="Search items, stores, trips..."
          className={cn(
            'w-full pl-9 pr-10 py-2 rounded-xl text-sm',
            'bg-gray-800/60 border border-green-500/25',
            'focus:border-green-500/50 focus:bg-gray-800',
            'text-gray-200 placeholder-gray-600',
            'outline-none transition-all duration-200'
          )}
        />
        <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-gray-600 bg-gray-700/60 rounded">
          ⌘K
        </kbd>
      </div>

      {/* Quick Stat */}
      <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-gray-800/60 border border-green-500/20 rounded-xl">
        <span className="text-xs text-gray-500">{periodLabel}</span>
        <span className="text-sm font-semibold text-gray-200">
          {formatPrice(monthlySpent)}
        </span>
      </div>

      {/* Notifications */}
      <div className="relative">
        <button
          onClick={() => setNotifOpen(!notifOpen)}
          className="relative p-2.5 rounded-xl bg-gray-800/60 border border-green-500/20 text-gray-500 hover:text-green-400 hover:border-green-500/30 transition-all duration-150"
        >
          <Bell size={18} />
          {totalNotifs > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-bounce-subtle">
              {totalNotifs}
            </span>
          )}
        </button>

        {/* Notification Dropdown */}
        {notifOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
            <div className="fixed top-[3.75rem] left-2 right-2 sm:left-auto sm:right-4 sm:w-80 bg-gray-900 border border-green-500/25 rounded-2xl shadow-2xl z-50 overflow-hidden">
              <div className="p-4 border-b border-green-500/20">
                <h3 className="font-semibold text-gray-200">Notifications</h3>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {activeReminders.map((r) => (
                  <div key={r.id} className="px-4 py-3 border-b border-white/5 hover:bg-white/5">
                    <p className="text-sm text-gray-200">
                      🔔 Time to restock <strong>{r.itemName}</strong>
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {daysUntilRestock(r.lastPurchased, r.frequency) <= 0
                        ? 'Overdue!'
                        : `Due in ${daysUntilRestock(r.lastPurchased, r.frequency)} days`}
                    </p>
                  </div>
                ))}
                {plannedTrips.map((t) => (
                  <div key={t.id} className="px-4 py-3 border-b border-white/5 hover:bg-white/5">
                    <p className="text-sm text-gray-200">
                      🛒 Planned trip: <strong>{t.name}</strong>
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Budget: {formatPrice(t.budget)} · {t.items.length} items
                    </p>
                  </div>
                ))}
                {totalNotifs === 0 && (
                  <div className="p-8 text-center text-gray-400">
                    <p className="text-2xl mb-2">🎉</p>
                    <p className="text-sm">All caught up!</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Cloud Sync Button + Status Dropdown */}
      {isFirebaseConfigured && (
        <div className="relative">
          <button
            onClick={() => setSyncOpen(!syncOpen)}
            disabled={syncStatus === 'saving'}
            title="Cloud sync status"
            className={cn(
            'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200 border',
            syncStatus === 'saving' && 'bg-blue-500/10 border-blue-500/20 text-green-400 cursor-wait',
            syncStatus === 'saved'  && 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
            syncStatus === 'error'  && 'bg-rose-500/10 border-rose-500/20 text-rose-400',
            syncStatus === 'idle'   && 'bg-gray-800/60 border-green-500/20 text-gray-500 hover:text-green-400 hover:border-green-500/30',
            )}
          >
            {syncStatus === 'saving' && <Loader size={14} className="animate-spin" />}
            {syncStatus === 'saved'  && <CheckCircle size={14} />}
            {syncStatus === 'error'  && <XCircle size={14} />}
            {syncStatus === 'idle'   && <Cloud size={14} />}
            <span className="hidden sm:inline">
              {syncStatus === 'saving' ? 'Saving…' : syncStatus === 'saved' ? 'Saved' : syncStatus === 'error' ? 'Failed' : 'Cloud'}
            </span>
          </button>

          {syncOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setSyncOpen(false)} />
              <div className="fixed top-[3.75rem] right-2 sm:right-4 sm:w-72 bg-gray-900 border border-green-500/25 rounded-2xl shadow-2xl z-50 overflow-hidden">
                {/* Header */}
                <div className="p-4 border-b border-green-500/20 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Cloud size={15} className="text-green-400" />
                    <span className="font-semibold text-sm text-gray-200">Cloud Sync Status</span>
                  </div>
                  <span className={cn(
                    'text-[10px] px-2 py-0.5 rounded-full font-semibold',
                    syncStatus === 'saving' && 'bg-blue-500/15 text-green-400',
                    syncStatus === 'saved'  && 'bg-emerald-500/15 text-emerald-400',
                    syncStatus === 'error'  && 'bg-rose-500/15 text-rose-400',
                    syncStatus === 'idle'   && 'bg-gray-700/60 text-gray-500',
                  )}>
                    {syncStatus === 'saving' ? 'SAVING' : syncStatus === 'saved' ? 'SYNCED' : syncStatus === 'error' ? 'ERROR' : 'IDLE'}
                  </span>
                </div>

                {/* Last synced time */}
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <Clock size={12} />
                    <span>Last synced:</span>
                    <span className="font-medium text-gray-300">
                      {lastSyncedAt
                        ? new Date(lastSyncedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
                        : 'Never'}
                    </span>
                  </div>
                  {localStorage.getItem('bb-pending-save') === '1' && (
                    <div className="flex items-center gap-1.5 text-xs text-amber-400 mt-1.5">
                      <AlertCircle size={11} />
                      <span>Unsaved local changes — will upload automatically</span>
                    </div>
                  )}
                </div>

                {/* Record counts */}
                <div className="px-4 py-3 border-b border-green-500/20">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-2">Data on this device</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'Items',    count: items.length },
                      { label: 'Stores',   count: stores.length },
                      { label: 'Trips',    count: trips.length },
                      { label: 'Prices',   count: prices.length },
                      { label: 'Finance',  count: transactions.length },
                      { label: 'Reminders', count: reminders.length },
                    ].map(({ label, count }) => (
                      <div key={label} className="text-center bg-gray-800/60 border border-white/5 rounded-lg py-2">
                        <p className="text-sm font-bold text-gray-200">{count}</p>
                        <p className="text-[10px] text-gray-500">{label}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Verify results */}
                {verifyResult && (
                  <div className="px-4 py-3 border-b border-green-500/20">
                    <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-2">Cloud vs. Local verification</p>
                    <div className="space-y-1">
                      {([
                        ['stores',       'Stores'],
                        ['items',        'Items'],
                        ['prices',       'Prices'],
                        ['trips',        'Trips'],
                        ['transactions', 'Finance'],
                        ['reminders',    'Reminders'],
                        ['savingsGoals', 'Savings Goals'],
                        ['fuelFillups',  'Fuel Fill-ups'],
                      ] as [keyof CloudCounts, string][]).map(([key, label]) => {
                        const cloudVal = verifyResult.cloud[key];
                        const localVal = verifyResult.local[key] ?? (key in localCounts ? localCounts[key as keyof typeof localCounts] : 0);
                        const match = cloudVal === localVal;
                        return (
                          <div key={key} className="flex items-center justify-between text-xs">
                            <span className="text-gray-500">{label}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-gray-500">local: <span className="font-semibold text-gray-300">{localVal}</span></span>
                              <span className="text-gray-500">cloud: <span className="font-semibold text-gray-300">{cloudVal}</span></span>
                              {match
                                ? <CheckCircle size={11} className="text-emerald-400" />
                                : <AlertCircle size={11} className="text-amber-400" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {(() => {
                      const allMatch = Object.entries(verifyResult.cloud).every(([k, v]) => v === (verifyResult.local[k] ?? 0));
                      const cloudHasMore = Object.entries(verifyResult.cloud).some(([k, v]) => v > (verifyResult.local[k] ?? 0));
                      if (allMatch) return (
                        <p className="mt-2 text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                          <ShieldCheck size={12} /> All data confirmed in Firestore
                        </p>
                      );
                      if (cloudHasMore) return (
                        <p className="mt-2 text-[11px] text-amber-400 font-medium flex items-center gap-1">
                          <AlertCircle size={12} /> Cloud has records not in local — use Merge &amp; Sync
                        </p>
                      );
                      return (
                        <p className="mt-2 text-[11px] text-amber-400 font-medium flex items-center gap-1">
                          <AlertCircle size={12} /> Local has unsaved changes — click Force Sync
                        </p>
                      );
                    })()}
                  </div>
                )}

                {/* Actions */}
                <div className="p-3 space-y-2">
                  <div className="flex gap-2">
                    {verifyResult && Object.entries(verifyResult.cloud).some(([k, v]) => v > (verifyResult.local[k] ?? 0)) ? (
                      <button
                        onClick={() => { mergeSync(); setSyncOpen(false); }}
                        disabled={syncStatus === 'saving'}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-wait text-white rounded-xl text-xs font-medium transition-colors"
                      >
                        {syncStatus === 'saving' ? <Loader size={12} className="animate-spin" /> : <CloudUpload size={12} />}
                        {syncStatus === 'saving' ? 'Merging…' : 'Merge & Sync'}
                      </button>
                    ) : (
                      <button
                        onClick={() => { syncNow(); setSyncOpen(false); }}
                        disabled={syncStatus === 'saving'}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-wait text-white rounded-xl text-xs font-medium transition-colors"
                      >
                        {syncStatus === 'saving' ? <Loader size={12} className="animate-spin" /> : <CloudUpload size={12} />}
                        {syncStatus === 'saving' ? 'Saving…' : 'Force Sync'}
                      </button>
                    )}
                    <button
                      onClick={handleVerify}
                      disabled={verifying || !user}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-gray-300 rounded-xl text-xs font-medium transition-colors border border-green-500/20"
                    >
                      {verifying ? <Loader size={12} className="animate-spin" /> : <ShieldCheck size={12} />}
                      {verifying ? 'Checking…' : 'Verify'}
                    </button>
                  </div>

                  {/* Restore pre-pull backup — shown only when a backup snapshot exists */}
                  {hasPrePullBackup && (
                    <button
                      onClick={handleRestorePrePull}
                      className="w-full flex items-center justify-center gap-1.5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-medium transition-colors"
                    >
                      <RotateCcw size={12} />
                      Restore Pre-Sync Backup
                    </button>
                  )}

                  <div className="flex gap-2">
                    {/* Export current data as JSON file */}
                    <button
                      onClick={handleExport}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-xs font-medium transition-colors border border-green-500/20"
                    >
                      <Download size={12} />
                      Export Backup
                    </button>

                    {/* Import from a previously exported JSON file */}
                    <button
                      onClick={() => importRef.current?.click()}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-xs font-medium transition-colors border border-green-500/20"
                    >
                      <UploadCloud size={12} />
                      Import Backup
                    </button>
                    <input ref={importRef} type="file" accept=".json" onChange={handleImportFile} className="hidden" />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Theme Toggle */}
      <button
        onClick={toggleTheme}
        className="p-2.5 rounded-xl bg-gray-800/60 border border-green-500/20 text-gray-500 hover:text-amber-400 hover:border-amber-500/30 transition-all duration-150"
        title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {isDark ? <Sun size={17} /> : <Moon size={17} />}
      </button>
    </header>
  );
};

export default Header;
