// ==========================================
// BasketBuddy – Medical Hub
// Unified page: Medical Aid (overview + claims) + Appointments
// ==========================================

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HeartPulse, CalendarHeart } from 'lucide-react';
import MedicalAid from './MedicalAid';
import MedicalAppointments from './MedicalAppointments';

const TABS = [
  { id: 'medical',      label: 'Medical Aid',   Icon: HeartPulse,    color: 'from-cyan-500 to-teal-600'   },
  { id: 'appointments', label: 'Appointments',  Icon: CalendarHeart, color: 'from-cyan-500 to-teal-600'   },
] as const;
type TabId = (typeof TABS)[number]['id'];

const Medical: React.FC = () => {
  const [tab, setTab] = useState<TabId>('medical');

  return (
    <div className="space-y-5">
      {/* Tab pill bar */}
      <div className="flex items-center gap-1 bg-gray-900/60 backdrop-blur-xl border border-cyan-500/15 rounded-2xl p-1.5 w-fit">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={[
              'relative flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium transition-all duration-200',
              tab === id
                ? 'bg-gradient-to-r from-cyan-500 to-teal-600 text-white shadow-lg shadow-cyan-500/25'
                : 'text-gray-400 hover:text-gray-200 hover:bg-white/5',
            ].join(' ')}
          >
            <Icon size={15} />
            {label}
            {tab === id && (
              <motion.span
                layoutId="medical-tab-indicator"
                className="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-600 -z-10"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.35 }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {tab === 'medical' && (
          <motion.div key="medical" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.2 }}>
            <MedicalAid />
          </motion.div>
        )}
        {tab === 'appointments' && (
          <motion.div key="appointments" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.2 }}>
            <MedicalAppointments />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Medical;
