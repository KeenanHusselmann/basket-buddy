// ==========================================
// BasketBuddy - Stores Management Page
// ==========================================

import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Edit3, Trash2, Store as StoreIcon, Package, Tag,
  MapPin, Phone, Globe, Clock, StickyNote, CreditCard,
  ChevronDown, ChevronUp, ExternalLink,
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import Modal from '../components/common/Modal';
import { STORE_COLORS } from '../config/constants';
import { cn, formatPrice } from '../utils/helpers';

const Stores: React.FC = () => {
  const { stores, prices, items, trips, addStore, updateStore, deleteStore } = useApp();
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [expandedStore, setExpandedStore] = useState<string | null>(null);

  const emptyForm = () => ({
    name: '', color: STORE_COLORS[0], icon: '🏪', isCustom: true,
    address: '', phone: '', website: '', openingHours: '', notes: '', loyaltyCard: '',
  });

  const [form, setForm] = useState(emptyForm());

  const openAdd = () => {
    setEditId(null);
    setForm(emptyForm());
    setModalOpen(true);
  };

  const openEdit = (store: typeof stores[0]) => {
    setEditId(store.id);
    setForm({
      name: store.name,
      color: store.color,
      icon: store.icon,
      isCustom: store.isCustom,
      address: store.address ?? '',
      phone: store.phone ?? '',
      website: store.website ?? '',
      openingHours: store.openingHours ?? '',
      notes: store.notes ?? '',
      loyaltyCard: store.loyaltyCard ?? '',
    });
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    const details = {
      address:      form.address.trim()      || undefined,
      phone:        form.phone.trim()        || undefined,
      website:      form.website.trim()      || undefined,
      openingHours: form.openingHours.trim() || undefined,
      notes:        form.notes.trim()        || undefined,
      loyaltyCard:  form.loyaltyCard.trim()  || undefined,
    };
    if (editId) {
      updateStore(editId, { ...form, ...details });
      toast.success(`"${form.name.trim()}" updated`);
    } else {
      addStore({ ...form, ...details });
      toast.success(`"${form.name.trim()}" added`);
    }
    setModalOpen(false);
  };

  const handleDelete = (id: string) => {
    const store = stores.find((s) => s.id === id);
    if (confirm('Delete this store? Prices associated with it will also be removed.')) {
      deleteStore(id);
      toast.success(`"${store?.name}" deleted`);
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
          const hasDetails = !!(store.address || store.phone || store.website || store.openingHours || store.notes || store.loyaltyCard);
          const isExpanded = expandedStore === store.id;

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

                {/* Stats */}
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

                {/* Details toggle */}
                {hasDetails && (
                  <button
                    onClick={() => setExpandedStore(isExpanded ? null : store.id)}
                    className="mt-3 w-full flex items-center justify-between text-xs text-gray-400 hover:text-brand-500 transition-colors pt-3 border-t border-gray-100 dark:border-gray-800"
                  >
                    <span className="font-medium">Shopping Details</span>
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                )}

                {/* No details yet — prompt */}
                {!hasDetails && (
                  <button
                    onClick={() => openEdit(store)}
                    className="mt-3 w-full text-xs text-gray-300 dark:text-gray-600 hover:text-brand-400 transition-colors pt-3 border-t border-gray-100 dark:border-gray-800 text-left flex items-center gap-1.5"
                  >
                    <Plus size={11} /> Add shopping details
                  </button>
                )}

                {/* Expanded details */}
                <AnimatePresence>
                  {isExpanded && hasDetails && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-3 space-y-2">
                        {store.address && (
                          <div className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400">
                            <MapPin size={12} className="flex-shrink-0 mt-0.5 text-brand-400" />
                            <span>{store.address}</span>
                          </div>
                        )}
                        {store.phone && (
                          <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                            <Phone size={12} className="flex-shrink-0 text-green-400" />
                            <a href={`tel:${store.phone}`} className="hover:text-brand-500 transition-colors">{store.phone}</a>
                          </div>
                        )}
                        {store.openingHours && (
                          <div className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400">
                            <Clock size={12} className="flex-shrink-0 mt-0.5 text-amber-400" />
                            <span className="whitespace-pre-line">{store.openingHours}</span>
                          </div>
                        )}
                        {store.website && (
                          <div className="flex items-center gap-2 text-xs">
                            <Globe size={12} className="flex-shrink-0 text-blue-400" />
                            <a
                              href={store.website.startsWith('http') ? store.website : `https://${store.website}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-brand-500 hover:text-brand-600 transition-colors flex items-center gap-1 truncate"
                            >
                              {store.website.replace(/^https?:\/\//, '')}
                              <ExternalLink size={10} />
                            </a>
                          </div>
                        )}
                        {store.loyaltyCard && (
                          <div className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400">
                            <CreditCard size={12} className="flex-shrink-0 mt-0.5 text-purple-400" />
                            <span>{store.loyaltyCard}</span>
                          </div>
                        )}
                        {store.notes && (
                          <div className="flex items-start gap-2 text-xs text-gray-500 dark:text-gray-500 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2">
                            <StickyNote size={12} className="flex-shrink-0 mt-0.5 text-gray-400" />
                            <span className="italic">{store.notes}</span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Add/Edit Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editId ? 'Edit Store' : 'Add New Store'}
        footer={
          <div className="flex gap-3">
            <button type="button" form="store-form" onClick={() => setModalOpen(false)} className="flex-1 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Cancel</button>
            <button type="submit" form="store-form" className="flex-1 py-2.5 bg-brand-500 text-white rounded-xl text-sm font-medium hover:bg-brand-600 transition-colors">{editId ? 'Save Changes' : 'Add Store'}</button>
          </div>
        }
      >
        <form id="store-form" onSubmit={handleSubmit} className="space-y-5">
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

          {/* Shopping Details */}
          <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Shopping Details{' '}
              <span className="text-xs text-gray-400 font-normal">(optional)</span>
            </p>
            <div className="space-y-3">
              {/* Address */}
              <div className="flex items-start gap-2">
                <MapPin size={15} className="flex-shrink-0 mt-2.5 text-brand-400" />
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="Store address"
                  className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-800 dark:text-gray-200 outline-none focus:border-brand-500 transition-colors"
                />
              </div>
              {/* Phone */}
              <div className="flex items-start gap-2">
                <Phone size={15} className="flex-shrink-0 mt-2.5 text-green-400" />
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="Phone number"
                  className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-800 dark:text-gray-200 outline-none focus:border-brand-500 transition-colors"
                />
              </div>
              {/* Website */}
              <div className="flex items-start gap-2">
                <Globe size={15} className="flex-shrink-0 mt-2.5 text-blue-400" />
                <input
                  type="text"
                  value={form.website}
                  onChange={(e) => setForm({ ...form, website: e.target.value })}
                  placeholder="Website (e.g. www.store.co.za)"
                  className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-800 dark:text-gray-200 outline-none focus:border-brand-500 transition-colors"
                />
              </div>
              {/* Opening Hours */}
              <div className="flex items-start gap-2">
                <Clock size={15} className="flex-shrink-0 mt-2.5 text-amber-400" />
                <textarea
                  value={form.openingHours}
                  onChange={(e) => setForm({ ...form, openingHours: e.target.value })}
                  placeholder="Opening hours (e.g. Mon–Fri 8am–8pm)"
                  rows={2}
                  className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-800 dark:text-gray-200 outline-none focus:border-brand-500 transition-colors resize-none"
                />
              </div>
              {/* Loyalty Card */}
              <div className="flex items-start gap-2">
                <CreditCard size={15} className="flex-shrink-0 mt-2.5 text-purple-400" />
                <input
                  type="text"
                  value={form.loyaltyCard}
                  onChange={(e) => setForm({ ...form, loyaltyCard: e.target.value })}
                  placeholder="Loyalty card / rewards info"
                  className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-800 dark:text-gray-200 outline-none focus:border-brand-500 transition-colors"
                />
              </div>
              {/* Notes */}
              <div className="flex items-start gap-2">
                <StickyNote size={15} className="flex-shrink-0 mt-2.5 text-gray-400" />
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Notes or tips about this store"
                  rows={2}
                  className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-800 dark:text-gray-200 outline-none focus:border-brand-500 transition-colors resize-none"
                />
              </div>
            </div>
          </div>

        </form>
      </Modal>
    </div>
  );
};

export default Stores;
