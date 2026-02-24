// ==========================================
// BasketBuddy - Stores Management Page
// ==========================================

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit3, Trash2, Store as StoreIcon, Package, Tag } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import Modal from '../components/common/Modal';
import { STORE_COLORS } from '../config/constants';
import { cn, formatPrice } from '../utils/helpers';

const Stores: React.FC = () => {
  const { stores, prices, items, trips, addStore, updateStore, deleteStore } = useApp();
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', color: STORE_COLORS[0], icon: '🏪', isCustom: true });

  const openAdd = () => {
    setEditId(null);
    setForm({ name: '', color: STORE_COLORS[0], icon: '🏪', isCustom: true });
    setModalOpen(true);
  };

  const openEdit = (store: typeof stores[0]) => {
    setEditId(store.id);
    setForm({ name: store.name, color: store.color, icon: store.icon, isCustom: store.isCustom });
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    if (editId) {
      updateStore(editId, form);
    } else {
      addStore(form);
    }
    setModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this store? Prices associated with it will also be removed.')) {
      deleteStore(id);
    }
  };

  const storeIcons = ['🏪', '🛒', '🏬', '🏭', '🛍️', '🏢', '🏠', '💊', '🍷', '🥩', '🥬', '🧀', '❤️', '🔴', '🟡', '🟢', '🔵', '🟣', '⭐', '🌟'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Stores</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">
            Manage your Namibian grocery stores
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-500 text-white rounded-xl text-sm font-medium hover:bg-brand-600 transition-colors shadow-lg shadow-brand-500/20"
        >
          <Plus size={16} /> Add Store
        </button>
      </div>

      {/* Store Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {stores.map((store, index) => {
          const storePrices = prices.filter((p) => p.storeId === store.id);
          const storeTrips = trips.filter((t) => t.storeId === store.id);
          const completedTrips = storeTrips.filter((t) => t.status === 'completed');
          const totalSpent = completedTrips.reduce((s, t) => s + t.totalSpent, 0);
          const specials = storePrices.filter((p) => p.isOnSpecial && p.specialPrice);

          return (
            <motion.div
              key={store.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden hover:shadow-md transition-shadow group"
            >
              {/* Color Bar */}
              <div className="h-2" style={{ backgroundColor: store.color }} />

              <div className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                      style={{ backgroundColor: `${store.color}15` }}
                    >
                      {store.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800 dark:text-gray-200">{store.name}</h3>
                      {store.isCustom && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 rounded-full font-medium">
                          Custom
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEdit(store)}
                      className="p-1.5 text-gray-400 hover:text-brand-500 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      <Edit3 size={14} />
                    </button>
                    {store.isCustom && (
                      <button
                        onClick={() => handleDelete(store.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-2 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                    <Package size={14} className="mx-auto text-gray-400 mb-1" />
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{storePrices.length}</p>
                    <p className="text-[10px] text-gray-400">Prices</p>
                  </div>
                  <div className="text-center p-2 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                    <Tag size={14} className="mx-auto text-amber-400 mb-1" />
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{specials.length}</p>
                    <p className="text-[10px] text-gray-400">Specials</p>
                  </div>
                  <div className="text-center p-2 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                    <StoreIcon size={14} className="mx-auto text-green-400 mb-1" />
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{completedTrips.length}</p>
                    <p className="text-[10px] text-gray-400">Trips</p>
                  </div>
                </div>

                {totalSpent > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                    <p className="text-xs text-gray-400">Total spent</p>
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{formatPrice(totalSpent)}</p>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Add/Edit Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editId ? 'Edit Store' : 'Add New Store'}>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Store Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g., Pick n Pay"
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-800 dark:text-gray-200 outline-none focus:border-brand-500 transition-colors"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Icon</label>
            <div className="grid grid-cols-10 gap-2">
              {storeIcons.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setForm({ ...form, icon })}
                  className={cn(
                    'w-9 h-9 flex items-center justify-center rounded-lg text-lg transition-all',
                    form.icon === icon
                      ? 'bg-brand-100 dark:bg-brand-900/50 ring-2 ring-brand-500 scale-110'
                      : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
                  )}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Color</label>
            <div className="grid grid-cols-8 gap-2">
              {STORE_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setForm({ ...form, color })}
                  className={cn(
                    'w-9 h-9 rounded-lg transition-all',
                    form.color === color && 'ring-2 ring-offset-2 ring-gray-400 dark:ring-offset-gray-900 scale-110'
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="flex-1 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 bg-brand-500 text-white rounded-xl text-sm font-medium hover:bg-brand-600 transition-colors"
            >
              {editId ? 'Save Changes' : 'Add Store'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Stores;
