// ==========================================
// BasketBuddy – Medical Appointments
// Smart scheduler synced to Requelle's shift roster & Keenan's flex schedule
// ==========================================

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarHeart, Plus, Clock, User, MapPin, Phone, Bell, BellOff,
  CheckCircle2, XCircle, Calendar, Edit2, Trash2, X, ChevronDown,
  ChevronLeft, ChevronRight, Info, AlertCircle, Stethoscope, Star,
  Activity, Eye, Zap, TrendingUp, RefreshCw, Award,
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import Modal from '../components/common/Modal';
import { formatPrice } from '../utils/helpers';
import type {
  MedicalAppointment, MedicalAppointmentType, MedicalAppointmentStatus,
} from '../types';
import { v4 as uuidv4 } from 'uuid';

// ─────────────────────────────────────────────────────────────────────────────
// REQUELLE SHIFT LOGIC
// Reference week 0 = Mon 2 March 2026 (7am–4pm)
// 4-week cycle: [7am–4pm] → [8am–5pm] → [7am–4pm] → [6am–3pm] → repeat
// ─────────────────────────────────────────────────────────────────────────────

const REQUELLE_SHIFT_REF = new Date(2026, 2, 2, 0, 0, 0, 0).getTime(); // Mon 2 Mar 2026

const SHIFT_PATTERNS = [
  { startHour: 7,  endHour: 16, label: '7am – 4pm',  color: 'amber'   }, // week 0 (Mar 2)
  { startHour: 8,  endHour: 17, label: '8am – 5pm',  color: 'rose'    }, // week 1 (Mar 9)
  { startHour: 7,  endHour: 16, label: '7am – 4pm',  color: 'amber'   }, // week 2 (Mar 16)
  { startHour: 6,  endHour: 15, label: '6am – 3pm',  color: 'emerald' }, // week 3 (Mar 23)
];

const REQUELLE_OFF_TUESDAY_N  = 2; // 2nd Tuesday of month = day off
const REQUELLE_HALF_FRIDAY_N  = 2; // 2nd Friday of month  = half-day (1pm–5pm)

function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const dow = d.getDay(); // 0=Sun
  d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
  d.setHours(0, 0, 0, 0);
  return d;
}

function getRequelleShift(date: Date) {
  const monday = getMondayOfWeek(date);
  const diff = monday.getTime() - REQUELLE_SHIFT_REF;
  const weeks = Math.round(diff / (7 * 864e5));
  const cycle = ((weeks % 4) + 4) % 4;
  return { cycle, ...SHIFT_PATTERNS[cycle] };
}

function getNthWeekday(year: number, month: number, jsWeekday: number, n: number): number {
  let count = 0;
  for (let d = 1; d <= 31; d++) {
    const dt = new Date(year, month, d);
    if (dt.getMonth() !== month) break;
    if (dt.getDay() === jsWeekday && ++count === n) return d;
  }
  return 1;
}

function formatTimeslot(h: number, m: number): string {
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function generateSlots(fromHour: number, toHour: number): string[] {
  const slots: string[] = [];
  for (let h = fromHour; h < toHour; h++) {
    slots.push(formatTimeslot(h, 0));
    slots.push(formatTimeslot(h, 30));
  }
  return slots;
}

interface DayAvailability {
  slots: string[];
  label: string;
  colorClass: string;
  isOff: boolean;
  isHalfDay: boolean;
  shiftCycle?: number;
}

function getRequelleAvailability(date: Date): DayAvailability {
  const dow = date.getDay();
  if (dow === 0 || dow === 6) return { slots: [], label: 'Weekend', colorClass: 'text-gray-400', isOff: false, isHalfDay: false };

  const y = date.getFullYear(), m = date.getMonth(), d = date.getDate();
  const offDay    = getNthWeekday(y, m, 2, REQUELLE_OFF_TUESDAY_N);
  const halfFriDay = getNthWeekday(y, m, 5, REQUELLE_HALF_FRIDAY_N);

  if (dow === 2 && d === offDay) {
    return { slots: generateSlots(8, 17), label: 'Day Off – fully available', colorClass: 'text-emerald-600', isOff: true, isHalfDay: false };
  }
  if (dow === 5 && d === halfFriDay) {
    return { slots: generateSlots(13, 17), label: 'Half day – from 1 pm', colorClass: 'text-amber-400', isOff: false, isHalfDay: true };
  }

  const shift = getRequelleShift(date);
  if (shift.endHour >= 17) {
    return { slots: [], label: `Shift ${shift.label} – no slots`, colorClass: 'text-rose-500', isOff: false, isHalfDay: false, shiftCycle: shift.cycle };
  }
  return {
    slots: generateSlots(shift.endHour, 17),
    label: `After shift (${shift.label})`,
    colorClass: 'text-violet-400',
    isOff: false, isHalfDay: false, shiftCycle: shift.cycle,
  };
}

function getKeenanSlots(): string[] { return generateSlots(8, 17); }

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const MEMBERS = ['Requelle', 'Keenan'];

interface ApptTypeMeta {
  value: MedicalAppointmentType;
  label: string;
  icon: string;
  pool: string;
  poolLabel: string;
  bg: string;
  text: string;
}

const APPT_TYPES: ApptTypeMeta[] = [
  { value: 'gp',               label: 'GP / General Practitioner',    icon: '🩺', pool: 'gp',        poolLabel: 'Professional Services',  bg: 'bg-blue-500/10',    text: 'text-blue-400'   },
  { value: 'specialist',       label: 'Specialist Consultation',      icon: '👨‍⚕️', pool: 'specialist', poolLabel: 'Professional Services',  bg: 'bg-violet-500/10',  text: 'text-violet-400'},
  { value: 'dentist',          label: 'Dental Check / Treatment',     icon: '🦷', pool: 'dental',    poolLabel: 'Dental',                 bg: 'bg-orange-500/10',  text: 'text-orange-400'},
  { value: 'optometrist',      label: 'Optometrist / Optical',        icon: '👁️', pool: 'optical',   poolLabel: 'Optical',                bg: 'bg-cyan-500/10',    text: 'text-cyan-400'   },
  { value: 'physiotherapy',    label: 'Physiotherapy',                icon: '🏃', pool: 'therapy',   poolLabel: 'Therapeutic',            bg: 'bg-violet-500/10',  text: 'text-violet-400'},
  { value: 'psychology',       label: 'Psychology / Counselling',     icon: '🧠', pool: 'therapy',   poolLabel: 'Therapeutic',            bg: 'bg-violet-500/10',  text: 'text-violet-400'},
  { value: 'gynecology',       label: 'Gynecology / Maternity',       icon: '🤱', pool: 'specialist', poolLabel: 'Professional Services', bg: 'bg-pink-500/10',    text: 'text-pink-400'   },
  { value: 'pathology',        label: 'Pathology / Blood Tests',      icon: '🔬', pool: 'gp',        poolLabel: 'Professional Services',  bg: 'bg-blue-500/10',    text: 'text-blue-400'   },
  { value: 'radiology',        label: 'Radiology / Imaging',          icon: '🩻', pool: 'hospital',  poolLabel: 'In/Out of Hospital',     bg: 'bg-red-500/10',     text: 'text-red-400'     },
  { value: 'pharmacy_consult', label: 'Pharmacy Consultation',        icon: '💊', pool: 'pharmacy',  poolLabel: 'Pharmacy / Chronic',     bg: 'bg-emerald-500/10', text: 'text-emerald-400'},
  { value: 'hospital_consult', label: 'Hospital Consultation',        icon: '🏥', pool: 'hospital',  poolLabel: 'Hospital',               bg: 'bg-red-500/10',     text: 'text-red-400'     },
  { value: 'chronic_review',   label: 'Chronic Medicine Review',      icon: '📋', pool: 'pharmacy',  poolLabel: 'Chronic Medicine',       bg: 'bg-teal-500/10',    text: 'text-teal-400'   },
  { value: 'aesthetic',        label: 'Aesthetic Health',             icon: '✨', pool: 'specialist', poolLabel: 'Professional Services',  bg: 'bg-fuchsia-500/10', text: 'text-fuchsia-400'},
  { value: 'other',            label: 'Other',                        icon: '📌', pool: 'other',     poolLabel: 'General',                bg: 'bg-gray-800/60',    text: 'text-gray-400'   },
];

const STATUS_META: Record<MedicalAppointmentStatus, { label: string; icon: string; bg: string; text: string }> = {
  upcoming:  { label: 'Upcoming',  icon: '📅', bg: 'bg-blue-500/10',    text: 'text-blue-400'    },
  completed: { label: 'Completed', icon: '✅', bg: 'bg-emerald-500/10', text: 'text-emerald-400'},
  cancelled: { label: 'Cancelled', icon: '🚫', bg: 'bg-gray-800/60',    text: 'text-gray-400'    },
  'no-show': { label: 'No-show',   icon: '❌', bg: 'bg-rose-500/10',    text: 'text-rose-400'    },
};

const DURATION_OPTIONS = [15, 30, 45, 60, 90];
const REMINDER_OPTIONS = [
  { value: 60,   label: '1 hour before'  },
  { value: 1440, label: '1 day before'   },
  { value: 2880, label: '2 days before'  },
  { value: 10080,label: '1 week before'  },
];

const FULL_MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAY_INITIALS = ['Mo','Tu','We','Th','Fr','Sa','Su'];

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function toDateKey(ts: number) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function localMidnight(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function parseDateInput(s: string): number {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d).getTime();
}

function toDateInputValue(ts: number): string {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDisplayDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDisplayDateTime(appt: MedicalAppointment): string {
  return `${formatDisplayDate(appt.date)} at ${appt.time}`;
}

function apptTypeMeta(type: MedicalAppointmentType): ApptTypeMeta {
  return APPT_TYPES.find((t) => t.value === type) ?? APPT_TYPES[APPT_TYPES.length - 1];
}

function isFuture(appt: MedicalAppointment): boolean {
  const [h, m] = appt.time.split(':').map(Number);
  const ts = appt.date + (h * 60 + m) * 60_000;
  return ts > Date.now();
}

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATION HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function scheduleNotification(appt: MedicalAppointment) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const [h, m] = appt.time.split(':').map(Number);
  const apptTs = appt.date + (h * 60 + m) * 60_000;
  const reminderTs = apptTs - appt.reminderMinutesBefore * 60_000;
  const delay = reminderTs - Date.now();
  if (delay <= 0 || delay > 24 * 60 * 60_000) return; // Only within 24 hours
  setTimeout(() => {
    const meta = apptTypeMeta(appt.type);
    new Notification('🏥 Appointment Reminder', {
      body: `${appt.memberName}: ${meta.label} with ${appt.practitioner} (${appt.practice}) at ${appt.time}`,
      icon: '/favicon.ico',
    });
  }, delay);
}

// ─────────────────────────────────────────────────────────────────────────────
// FORM TYPE
// ─────────────────────────────────────────────────────────────────────────────

interface ApptForm {
  memberName: string;
  type: MedicalAppointmentType;
  practitioner: string;
  practice: string;
  phone: string;
  address: string;
  dateStr: string;
  time: string;
  durationMinutes: number;
  status: MedicalAppointmentStatus;
  notes: string;
  reminderEnabled: boolean;
  reminderMinutesBefore: number;
}

const EMPTY_FORM: ApptForm = {
  memberName: 'Requelle', type: 'gp', practitioner: '', practice: '',
  phone: '', address: '', dateStr: toDateInputValue(Date.now() + 86_400_000),
  time: '14:00', durationMinutes: 30, status: 'upcoming',
  notes: '', reminderEnabled: true, reminderMinutesBefore: 1440,
};

// ─────────────────────────────────────────────────────────────────────────────
// MINI CALENDAR COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

interface MiniCalendarProps {
  selectedDateStr: string;
  onSelect: (dateStr: string) => void;
  memberName: string;
  appointmentDates: Set<string>;
}

const MiniCalendar: React.FC<MiniCalendarProps> = ({ selectedDateStr, onSelect, memberName, appointmentDates }) => {
  const selectedTs = parseDateInput(selectedDateStr);
  const selDate = new Date(selectedTs);

  const [viewYear, setViewYear] = useState(selDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(selDate.getMonth());

  const today = localMidnight(new Date());

  const firstDay = new Date(viewYear, viewMonth, 1);
  const lastDay  = new Date(viewYear, viewMonth + 1, 0);

  // JS getDay(): 0=Sun. We want Mon=0 in our grid
  const startOffset = (firstDay.getDay() + 6) % 7; // how many empty cells before day 1

  const cells: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) cells.push(d);

  function getAvailabilityDot(day: number): 'green' | 'amber' | 'red' | 'none' | 'keenan' {
    const dt = new Date(viewYear, viewMonth, day);
    const ts = localMidnight(dt);
    if (ts < today) return 'none';
    const dow = dt.getDay();
    if (dow === 0 || dow === 6) return 'none';
    if (memberName === 'Keenan') return 'keenan';
    const avail = getRequelleAvailability(dt);
    if (avail.isOff) return 'green';
    if (avail.isHalfDay) return 'amber';
    if (avail.slots.length > 0) return 'amber';
    return 'red';
  }

  const prev = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  };
  const next = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  };

  return (
    <div className="bg-gray-900/70 backdrop-blur-xl border border-gray-700/40 rounded-xl p-3 select-none">
      <div className="flex items-center justify-between mb-2">
        <button onClick={prev} className="p-1 rounded hover:bg-white/5">
          <ChevronLeft className="w-4 h-4 text-gray-500" />
        </button>
        <span className="text-sm font-semibold text-white">
          {FULL_MONTHS[viewMonth]} {viewYear}
        </span>
        <button onClick={next} className="p-1 rounded hover:bg-white/5">
          <ChevronRight className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {DAY_INITIALS.map((d) => (
          <div key={d} className="text-center text-xs text-gray-400 font-medium py-1">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, i) => {
          if (!day) return <div key={`e:${i}`} />;
          const ts = localMidnight(new Date(viewYear, viewMonth, day));
          const dateStr = toDateInputValue(ts);
          const isPast = ts < today;
          const isSelected = dateStr === selectedDateStr;
          const isToday = ts === today;
          const dot = getAvailabilityDot(day);
          const hasAppt = appointmentDates.has(dateStr);

          let dotColor = '';
          if (dot === 'green')   dotColor = 'bg-emerald-500';
          if (dot === 'amber')   dotColor = 'bg-amber-400';
          if (dot === 'red')     dotColor = 'bg-rose-500';
          if (dot === 'keenan')  dotColor = 'bg-blue-400';

          return (
            <button
              key={dateStr}
              disabled={isPast}
              onClick={() => onSelect(dateStr)}
              className={`
                relative flex flex-col items-center justify-center w-full aspect-square rounded-lg text-xs font-medium transition-all
                ${isPast ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer hover:bg-white/5'}
                ${isSelected ? 'bg-cyan-500/30 border border-cyan-500/50 text-cyan-200' : isToday ? 'ring-1 ring-cyan-500 text-cyan-400' : 'text-gray-200'}
              `}
            >
              {day}
              {!isPast && (
                <div className="flex gap-0.5 mt-px">
                  {dotColor && <span className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white/80' : dotColor}`} />}
                  {hasAppt && <span className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white/60' : 'bg-gray-400'}`} />}
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-400">
        {memberName === 'Requelle' ? (
          <>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />Day off / available</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />After shift / half-day</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />Shift ends at 5pm</span>
          </>
        ) : (
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />Keenan – flexible all day</span>
        )}
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-400 inline-block" />Has appointment</span>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// APPOINTMENT CARD
// ─────────────────────────────────────────────────────────────────────────────

interface ApptCardProps {
  appt: MedicalAppointment;
  onEdit: (a: MedicalAppointment) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: MedicalAppointmentStatus) => void;
  compact?: boolean;
}

const ApptCard: React.FC<ApptCardProps> = ({ appt, onEdit, onDelete, onStatusChange, compact }) => {
  const [expanded, setExpanded] = useState(false);
  const meta  = apptTypeMeta(appt.type);
  const smeta = STATUS_META[appt.status];
  const past  = !isFuture(appt);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className={`bg-gray-900/80 backdrop-blur-xl border border-cyan-500/15 rounded-2xl overflow-hidden transition-all hover:border-cyan-500/30 ${past ? 'opacity-60' : ''}`}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl mt-0.5">{meta.icon}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${smeta.bg} ${smeta.text}`}>{smeta.label}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${meta.bg} ${meta.text}`}>{meta.label}</span>
            </div>
            <p className="font-semibold text-white mt-1 text-sm">
              {appt.practitioner || 'TBD'} {appt.practice ? `• ${appt.practice}` : ''}
            </p>
            <div className="flex items-center gap-3 mt-1 text-xs text-gray-400 flex-wrap">
              <span className="flex items-center gap-1"><User className="w-3 h-3" />{appt.memberName}</span>
              <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDisplayDateTime(appt)}</span>
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{appt.durationMinutes} min</span>
              {appt.reminderEnabled && <span className="flex items-center gap-1 text-blue-500"><Bell className="w-3 h-3" />Reminder set</span>}
            </div>
          </div>
          <div className="flex gap-1 shrink-0">
            <button onClick={() => onEdit(appt)} className="p-1.5 rounded-lg hover:bg-cyan-500/10 text-gray-500 hover:text-cyan-400 transition-colors">
              <Edit2 className="w-4 h-4" />
            </button>
            <button onClick={() => setExpanded(!expanded)} className="p-1.5 rounded-lg hover:bg-white/5 text-gray-500 transition-colors">
              <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            key="details"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-gray-700/40"
          >
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {appt.phone && (
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                  <a href={`tel:${appt.phone}`} className="hover:text-blue-500">{appt.phone}</a>
                </div>
              )}
              {appt.address && (
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
                  <span>{appt.address}</span>
                </div>
              )}
              {appt.notes && (
                <div className="sm:col-span-2 text-sm text-gray-300 bg-gray-800/40 rounded-lg p-2">
                  {appt.notes}
                </div>
              )}
              {appt.reminderEnabled && (
                <div className="sm:col-span-2 flex items-center gap-2 text-xs text-violet-400">
                  <Bell className="w-3 h-3" />
                  Reminder: {REMINDER_OPTIONS.find(r => r.value === appt.reminderMinutesBefore)?.label ?? `${appt.reminderMinutesBefore} min before`}
                </div>
              )}
            </div>

            {appt.status === 'upcoming' && !past && (
              <div className="px-4 pb-4 flex gap-2 flex-wrap">
                <button
                  onClick={() => onStatusChange(appt.id, 'completed')}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 font-medium transition-colors"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />Mark Complete
                </button>
                <button
                  onClick={() => onStatusChange(appt.id, 'no-show')}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20 font-medium transition-colors"
                >
                  <XCircle className="w-3.5 h-3.5" />No-show
                </button>
                <button
                  onClick={() => onStatusChange(appt.id, 'cancelled')}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-gray-800/40 text-gray-400 hover:bg-gray-800/70 border border-gray-700/40 font-medium transition-colors"
                >
                  <X className="w-3.5 h-3.5" />Cancel
                </button>
                <button
                  onClick={() => onEdit(appt)}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 border border-cyan-500/20 font-medium transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />Reschedule
                </button>
                <button
                  onClick={() => onDelete(appt.id)}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 font-medium transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />Delete
                </button>
              </div>
            )}
            {(appt.status !== 'upcoming' || past) && (
              <div className="px-4 pb-4 flex gap-2">
                <button
                  onClick={() => onDelete(appt.id)}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 font-medium transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />Delete
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

const MedicalAppointments: React.FC = () => {
  const {
    medicalAppointments, addMedicalAppointment,
    updateMedicalAppointment, deleteMedicalAppointment,
    medicalAidPlans, medicalAidClaims,
  } = useApp();

  const [memberFilter, setMemberFilter] = useState<'All' | 'Requelle' | 'Keenan'>('All');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ApptForm>(EMPTY_FORM);
  const [showPast, setShowPast] = useState(false);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(
    'Notification' in window ? Notification.permission : 'denied'
  );

  // ── Notifications ─────────────────────────────────────────
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then((p) => setNotifPermission(p));
    }
  }, []);

  useEffect(() => {
    medicalAppointments.forEach((appt) => {
      if (appt.status === 'upcoming' && appt.reminderEnabled) {
        scheduleNotification(appt);
      }
    });
  }, [medicalAppointments]);

  // ── Active plan & benefit usage ───────────────────────────
  const activePlan = useMemo(
    () => medicalAidPlans.find((p) => p.active) ?? medicalAidPlans[0] ?? null,
    [medicalAidPlans]
  );

  const benefitUsage = useMemo(() => {
    const used: Record<string, number> = {};
    for (const c of medicalAidClaims) {
      used[c.category] = (used[c.category] ?? 0) + c.medicalAidPaid;
    }
    return used;
  }, [medicalAidClaims]);

  // Pool limit from active plan
  const getPoolRemaining = useCallback((pool: string): number | null => {
    if (!activePlan) return null;
    const mapping: Record<string, keyof typeof activePlan> = {
      gp:         'gpLimit',
      specialist: 'specialistLimit',
      dental:     'dentalLimit',
      optical:    'opticalLimit',
      therapy:    'therapyLimit',
      pharmacy:   'pharmacyLimit',
      hospital:   'hospitalLimit',
    };
    const key = mapping[pool];
    if (!key) return null;
    const limit = activePlan[key] as number;
    if (!limit) return null;
    // Sum claims in that pool
    const poolClaims = APPT_TYPES.filter((t) => t.pool === pool).map((t) => t.value as string);
    const usedAmt = Object.entries(benefitUsage)
      .filter(([k]) => poolClaims.includes(k) || k === pool)
      .reduce((sum, [, v]) => sum + v, 0);
    return Math.max(0, limit - usedAmt);
  }, [activePlan, benefitUsage]);

  // ── Filtered & sorted appointments ────────────────────────
  const filtered = useMemo(
    () => medicalAppointments.filter((a) =>
      memberFilter === 'All' || a.memberName === memberFilter
    ),
    [medicalAppointments, memberFilter]
  );

  const upcoming = useMemo(
    () => filtered.filter((a) => a.status === 'upcoming' && isFuture(a))
      .sort((a, b) => a.date - b.date || a.time.localeCompare(b.time)),
    [filtered]
  );

  const past = useMemo(
    () => filtered.filter((a) => a.status !== 'upcoming' || !isFuture(a))
      .sort((a, b) => b.date - a.date),
    [filtered]
  );

  const appointmentDateSet = useMemo(
    () => new Set(medicalAppointments.filter((a) => a.status === 'upcoming').map((a) => toDateInputValue(a.date))),
    [medicalAppointments]
  );

  // ── Available time slots ──────────────────────────────────
  const availableSlots = useMemo(() => {
    if (!form.dateStr) return [];
    const ts = parseDateInput(form.dateStr);
    const dt = new Date(ts);
    if (form.memberName === 'Keenan') return getKeenanSlots();
    return getRequelleAvailability(dt).slots;
  }, [form.dateStr, form.memberName]);

  const availabilityInfo = useMemo(() => {
    if (!form.dateStr || form.memberName !== 'Requelle') return null;
    const ts = parseDateInput(form.dateStr);
    return getRequelleAvailability(new Date(ts));
  }, [form.dateStr, form.memberName]);

  // ── Requelle's next week-off Tuesday ─────────────────────
  const nextOffDayInfo = useMemo(() => {
    const now = new Date();
    // Search up to 6 weeks ahead across month boundaries
    for (let offset = 1; offset < 45; offset++) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
      if (d.getDay() === 2) { // Tuesday
        const offDay = getNthWeekday(d.getFullYear(), d.getMonth(), 2, REQUELLE_OFF_TUESDAY_N);
        if (d.getDate() === offDay) return { date: formatDisplayDate(d.getTime()), slots: generateSlots(8, 17) };
      }
    }
    return null;
  }, []);

  const todayShift = useMemo(() => {
    const now = new Date();
    if (now.getDay() === 0 || now.getDay() === 6) return null;
    return getRequelleShift(now);
  }, []);

  // ── Form helpers ──────────────────────────────────────────
  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (appt: MedicalAppointment) => {
    setEditingId(appt.id);
    setForm({
      memberName: appt.memberName,
      type:       appt.type,
      practitioner: appt.practitioner,
      practice:   appt.practice,
      phone:      appt.phone ?? '',
      address:    appt.address ?? '',
      dateStr:    toDateInputValue(appt.date),
      time:       appt.time,
      durationMinutes: appt.durationMinutes,
      status:     appt.status,
      notes:      appt.notes ?? '',
      reminderEnabled: appt.reminderEnabled,
      reminderMinutesBefore: appt.reminderMinutesBefore,
    });
    setShowModal(true);
  };

  const handleSave = () => {
    if (!form.practitioner.trim()) { toast.error('Practitioner name required'); return; }
    if (!form.dateStr)           { toast.error('Date required'); return; }
    if (!form.time)              { toast.error('Time required'); return; }

    const meta = apptTypeMeta(form.type);
    const payload: Omit<MedicalAppointment, 'id' | 'createdAt'> = {
      memberName: form.memberName,
      type:       form.type,
      benefitPool: meta.pool,
      practitioner: form.practitioner.trim(),
      practice:   form.practice.trim(),
      phone:      form.phone.trim() || undefined,
      address:    form.address.trim() || undefined,
      date:       parseDateInput(form.dateStr),
      time:       form.time,
      durationMinutes: form.durationMinutes,
      status:     form.status,
      notes:      form.notes.trim() || undefined,
      reminderEnabled: form.reminderEnabled,
      reminderMinutesBefore: form.reminderMinutesBefore,
    };

    if (editingId) {
      updateMedicalAppointment(editingId, payload);
      toast.success('Appointment updated');
      if (payload.reminderEnabled && payload.status === 'upcoming') {
        scheduleNotification({ ...payload, id: editingId, createdAt: Date.now() });
      }
    } else {
      const id = uuidv4();
      addMedicalAppointment(payload);
      toast.success('Appointment booked!');
      if (payload.reminderEnabled && payload.status === 'upcoming') {
        scheduleNotification({ ...payload, id, createdAt: Date.now() });
      }
    }
    setShowModal(false);
  };

  const handleDelete = (id: string) => {
    if (!window.confirm('Delete this appointment?')) return;
    deleteMedicalAppointment(id);
    toast.success('Appointment removed');
  };

  const handleStatusChange = (id: string, status: MedicalAppointmentStatus) => {
    updateMedicalAppointment(id, { status });
    toast.success(`Marked as ${status}`);
  };

  const setF = (patch: Partial<ApptForm>) => setForm((f) => ({ ...f, ...patch }));

  // ─────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────

  const poolOpportunities = useMemo(() => {
    const pools = ['gp', 'specialist', 'dental', 'optical', 'therapy'];
    return pools.map((pool) => {
      const remaining = getPoolRemaining(pool);
      const apptType = APPT_TYPES.find((t) => t.pool === pool);
      return { pool, remaining, label: apptType?.poolLabel ?? pool, icon: apptType?.icon ?? '📋', bg: apptType?.bg ?? '', text: apptType?.text ?? '' };
    }).filter((p) => p.remaining !== null && p.remaining > 0);
  }, [getPoolRemaining]);

  return (
    <div className="space-y-5">
      {/* ── HERO HEADER ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-cyan-950/30 to-teal-950/20 border border-cyan-500/20 p-5 sm:p-6">
        <div className="absolute top-0 right-0 w-56 h-56 rounded-full bg-cyan-500/6 blur-3xl pointer-events-none" />
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />
        <div className="relative flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-teal-600/20 border border-cyan-500/30 flex items-center justify-center">
                <CalendarHeart className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white leading-tight">Medical Appointments</h1>
                <p className="text-xs text-gray-400">Smart scheduler — synced with shift roster &amp; benefit pools</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap mt-2">
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-full text-xs text-cyan-400">
                <Stethoscope className="w-3 h-3" />
                {upcoming.length} upcoming appointment{upcoming.length !== 1 ? 's' : ''}
              </div>
              {activePlan && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-800/50 border border-gray-700/40 rounded-full text-xs text-gray-400">
                  <Award className="w-3 h-3 text-teal-500" />{activePlan.planName}
                </div>
              )}
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-800/50 border border-gray-700/40 rounded-full text-xs text-gray-400">
                <Activity className="w-3 h-3 text-violet-400" />{past.length} past
              </div>
            </div>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-teal-600 hover:from-cyan-400 hover:to-teal-500 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-lg shadow-cyan-500/20 shrink-0"
          >
            <Plus className="w-4 h-4" /> Schedule
          </button>
        </div>

        {/* Member filter */}
        <div className="flex gap-2 mt-4">
          {(['All', 'Requelle', 'Keenan'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMemberFilter(m)}
              className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${memberFilter === m ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-300' : 'bg-gray-800/40 border border-gray-700/40 text-gray-400 hover:border-gray-600/60 hover:text-gray-300'}`}
            >
              {m === 'All' ? '👥 All' : m === 'Requelle' ? '👩 Requelle' : '👨 Keenan'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Notification permission banner ── */}
      {notifPermission === 'default' && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-3 flex items-center gap-3">
          <Bell className="w-5 h-5 text-amber-500 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-300">Enable notifications for appointment reminders</p>
          </div>
          <button
            onClick={() => Notification.requestPermission().then(setNotifPermission)}
            className="text-xs px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-300 rounded-lg font-medium transition-colors"
          >Enable</button>
        </div>
      )}

      {/* ── Benefit Opportunities ── */}
      {poolOpportunities.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            <h2 className="text-sm font-semibold text-gray-300">Benefit Opportunities — don't leave money unused</h2>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
            {poolOpportunities.map(({ pool, remaining, label, icon, bg, text }) => (
              <div
                key={pool}
                className="shrink-0 flex flex-col gap-1 p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 min-w-[160px] hover:border-emerald-500/40 transition-colors"
              >
                <span className="text-xl">{icon}</span>
                <span className={`text-xs font-semibold ${text}`}>{label}</span>
                <span className="text-sm font-bold text-white">{formatPrice(remaining!)} left</span>
                <button
                  onClick={() => { setF({ type: APPT_TYPES.find((t) => t.pool === pool)?.value ?? 'gp' }); openCreate(); }}
                  className="text-xs mt-1 px-2 py-1 rounded-lg bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 border border-cyan-500/20 transition-colors font-medium"
                >
                  Book now
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Requelle's schedule this week ── */}
      <div className="bg-gray-900/70 backdrop-blur-xl border border-gray-700/40 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-4 h-4 text-purple-500" />
          <h2 className="text-sm font-semibold text-white">Requelle's Schedule This Week</h2>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 7 }, (_, i) => {
            const monday = getMondayOfWeek(new Date());
            const day = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
            const isWeekend = day.getDay() === 0 || day.getDay() === 6;
            const avail = isWeekend ? null : getRequelleAvailability(day);
            const isToday = localMidnight(day) === localMidnight(new Date());
            const dayNames = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
            return (
              <div
                key={i}
                className={`rounded-xl p-2 text-center text-xs ${isToday ? 'ring-2 ring-cyan-500' : ''} ${isWeekend ? 'bg-gray-800/40' : avail?.isOff ? 'bg-emerald-500/10' : avail?.isHalfDay ? 'bg-amber-500/10' : avail?.slots.length ? 'bg-blue-500/10' : 'bg-rose-500/10'}`}
              >
                <div className="font-semibold text-gray-300">{dayNames[i]}</div>
                <div className="text-gray-400">{day.getDate()}</div>
                {!isWeekend && avail && (
                  <div className={`mt-1 text-xs leading-tight ${avail.colorClass}`}>
                    {avail.isOff     ? 'Off 🎉'     :
                     avail.isHalfDay ? '1pm+ 🌅'    :
                     avail.slots.length ? `${avail.slots[0]}+` : 'No slots'}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {todayShift && (
          <p className="mt-2 text-xs text-gray-400 flex items-center gap-1">
            <Info className="w-3 h-3" />
            Today: Week {todayShift.cycle + 1} shift ({todayShift.label}) · Available from {String(todayShift.endHour).padStart(2,'0')}:00
          </p>
        )}
        {nextOffDayInfo && (
          <p className="mt-1 text-xs text-emerald-600 flex items-center gap-1">
            <Star className="w-3 h-3" />
            Next day off: {nextOffDayInfo.date} — great time to book appointments!
          </p>
        )}
      </div>

      {/* ── Upcoming Appointments ── */}
      <div className="mb-6">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <CalendarHeart className="w-4 h-4 text-cyan-500" /> Upcoming ({upcoming.length})
        </h2>
        {upcoming.length === 0 ? (
          <div className="bg-gray-900/60 border border-dashed border-cyan-500/20 rounded-2xl p-8 text-center">
            <CalendarHeart className="w-10 h-10 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 text-sm mb-3">No upcoming appointments</p>
            <button onClick={openCreate} className="text-sm text-cyan-400 font-medium hover:underline">
              Schedule your first one →
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {upcoming.map((a) => (
                <ApptCard key={a.id} appt={a} onEdit={openEdit} onDelete={handleDelete} onStatusChange={handleStatusChange} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* ── Past Appointments ── */}
      {past.length > 0 && (
        <div className="mb-6">
          <button
            onClick={() => setShowPast(!showPast)}
            className="flex items-center gap-2 text-sm font-semibold text-gray-400 hover:text-gray-200 transition-colors"
          >
            <ChevronDown className={`w-4 h-4 transition-transform ${showPast ? 'rotate-180' : ''}`} />
            Past / Cancelled ({past.length})
          </button>
          <AnimatePresence>
            {showPast && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                {past.map((a) => (
                  <ApptCard key={a.id} appt={a} onEdit={openEdit} onDelete={handleDelete} onStatusChange={handleStatusChange} compact />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────
          BOOKING MODAL
         ───────────────────────────────────────────────────── */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingId ? 'Reschedule / Edit Appointment' : 'Book Appointment'}
        size="xl"
        footer={
          <div className="flex gap-3 justify-end">
            <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm rounded-xl border border-gray-700/60 text-gray-400 hover:bg-white/5 transition-colors">
              Cancel
            </button>
            <button onClick={handleSave} className="px-4 py-2 text-sm rounded-xl bg-gradient-to-r from-cyan-500 to-teal-600 hover:from-cyan-400 hover:to-teal-500 text-white font-semibold transition-all">
              {editingId ? 'Save Changes' : 'Book Appointment'}
            </button>
          </div>
        }
      >
        <div className="space-y-5">
          {/* Member + Type row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">Family Member</label>
              <div className="flex gap-2">
                {MEMBERS.map((m) => (
                  <button
                    key={m}
                    onClick={() => setF({ memberName: m })}
                    className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-all ${form.memberName === m ? 'bg-gradient-to-r from-cyan-500 to-teal-600 border-transparent text-white' : 'border-gray-700/60 text-gray-300 hover:border-cyan-500/40'}`}
                  >
                    {m === 'Requelle' ? '👩 Requelle' : '👨 Keenan'}
                  </button>
                ))}
              </div>
              {form.memberName === 'Keenan' && (
                <p className="mt-1.5 text-xs text-teal-400 flex items-center gap-1">
                  <Zap className="w-3 h-3" />Keenan works from home — flexible any time 8am–5pm
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">Appointment Type</label>
              <select
                value={form.type}
                onChange={(e) => setF({ type: e.target.value as MedicalAppointmentType })}
                className="w-full rounded-xl border border-gray-700/60 bg-gray-800/40 text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              >
                {APPT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
              </select>
              {(() => {
                const meta = apptTypeMeta(form.type);
                const remaining = getPoolRemaining(meta.pool);
                return remaining !== null && (
                  <p className={`mt-1 text-xs ${remaining > 0 ? 'text-emerald-600' : 'text-rose-500'} flex items-center gap-1`}>
                    <Info className="w-3 h-3" />
                    {meta.poolLabel}: {remaining > 0 ? `${formatPrice(remaining)} remaining` : 'Limit reached'}
                  </p>
                );
              })()}
            </div>
          </div>

          {/* Practitioner details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">Practitioner Name *</label>
              <input
                value={form.practitioner}
                onChange={(e) => setF({ practitioner: e.target.value })}
                placeholder="e.g. Dr. van der Merwe"
                className="w-full rounded-xl border border-gray-700/60 bg-gray-800/40 text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">Practice / Clinic</label>
              <input
                value={form.practice}
                onChange={(e) => setF({ practice: e.target.value })}
                placeholder="e.g. MediCross Windhoek"
                className="w-full rounded-xl border border-gray-700/60 bg-gray-800/40 text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">Phone</label>
              <input
                value={form.phone}
                onChange={(e) => setF({ phone: e.target.value })}
                placeholder="+264 61 XXX XXX"
                type="tel"
                className="w-full rounded-xl border border-gray-700/60 bg-gray-800/40 text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">Address</label>
              <input
                value={form.address}
                onChange={(e) => setF({ address: e.target.value })}
                placeholder="Street, suburb, Windhoek"
                className="w-full rounded-xl border border-gray-700/60 bg-gray-800/40 text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              />
            </div>
          </div>

          {/* Calendar + Time slots */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">Date</label>
              <MiniCalendar
                selectedDateStr={form.dateStr}
                onSelect={(s) => {
                  setF({ dateStr: s, time: '' }); // reset time when date changes
                }}
                memberName={form.memberName}
                appointmentDates={appointmentDateSet}
              />
              {availabilityInfo && (
                <p className={`mt-2 text-xs flex items-center gap-1 ${availabilityInfo.colorClass}`}>
                  <Info className="w-3 h-3 shrink-0" />{availabilityInfo.label}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">
                Time Slot {form.memberName === 'Requelle' && availableSlots.length === 0 && form.dateStr ? '— no slots this day' : ''}
              </label>
              {availableSlots.length > 0 ? (
                <div className="grid grid-cols-3 gap-1.5 max-h-56 overflow-y-auto">
                  {availableSlots.map((slot) => (
                    <button
                      key={slot}
                      onClick={() => setF({ time: slot })}
                      className={`py-2 rounded-xl text-xs font-semibold border transition-all ${form.time === slot ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300' : 'border-gray-700/60 text-gray-300 hover:border-cyan-500/30 hover:bg-cyan-500/8'}`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              ) : form.memberName === 'Keenan' ? (
                <div className="grid grid-cols-3 gap-1.5 max-h-56 overflow-y-auto">
                  {getKeenanSlots().map((slot) => (
                    <button
                      key={slot}
                      onClick={() => setF({ time: slot })}
                      className={`py-2 rounded-xl text-xs font-semibold border transition-all ${form.time === slot ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300' : 'border-gray-700/60 text-gray-300 hover:border-cyan-500/30 hover:bg-cyan-500/8'}`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="bg-amber-500/10 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
                    <AlertCircle className="w-4 h-4 inline mr-1" />
                    Requelle's shift ends at 5 pm on this day — no standard clinic slots. Check a different date or select a day off / half-day.
                  </div>
                  {/* Allow manual time entry anyway */}
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Or enter time manually:</label>
                    <input
                      type="time"
                      value={form.time}
                      onChange={(e) => setF({ time: e.target.value })}
                      className="w-full rounded-xl border border-gray-700/60 bg-gray-800/40 text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                    />
                  </div>
                </div>
              )}

              {/* If a slot is selected or manually entered, show it */}
              {form.time && (
                <div className="mt-2 text-xs text-emerald-600 flex items-center gap-1">
                  <Clock className="w-3 h-3" />Selected: {form.time} — {form.durationMinutes} min appointment
                </div>
              )}

              {/* Duration */}
              <div className="mt-3">
                <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">Duration</label>
                <div className="flex gap-1.5 flex-wrap">
                  {DURATION_OPTIONS.map((d) => (
                    <button
                      key={d}
                      onClick={() => setF({ durationMinutes: d })}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${form.durationMinutes === d ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300' : 'border-gray-700/60 text-gray-400 hover:border-gray-500/60'}`}
                    >
                      {d}m
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Status (only when editing) */}
          {editingId && (
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">Status</label>
              <div className="flex gap-2 flex-wrap">
                {(['upcoming', 'completed', 'cancelled', 'no-show'] as MedicalAppointmentStatus[]).map((s) => {
                  const sm = STATUS_META[s];
                  return (
                    <button
                      key={s}
                      onClick={() => setF({ status: s })}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${form.status === s ? `${sm.bg} ${sm.text} border-transparent` : 'border-gray-700/50 text-gray-400 hover:border-gray-600/70'}`}
                    >
                      {sm.icon} {sm.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setF({ notes: e.target.value })}
              rows={2}
              placeholder="Reason for visit, bring documents, etc."
              className="w-full rounded-xl border border-gray-700/60 bg-gray-800/40 text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 resize-none"
            />
          </div>

          {/* Reminder */}
          <div className="bg-blue-500/8 border border-blue-500/20 rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <label className="flex items-center gap-2 cursor-pointer" onClick={() => setF({ reminderEnabled: !form.reminderEnabled })}>
                {form.reminderEnabled ? <Bell className="w-4 h-4 text-blue-500" /> : <BellOff className="w-4 h-4 text-gray-400" />}
                <span className="text-sm font-semibold text-white">Appointment Reminder</span>
              </label>
              <button
                onClick={() => setF({ reminderEnabled: !form.reminderEnabled })}
                className={`relative w-10 h-5 rounded-full transition-colors ${form.reminderEnabled ? 'bg-cyan-500' : 'bg-gray-600'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${form.reminderEnabled ? 'translate-x-5' : ''}`} />
              </button>
            </div>
            {form.reminderEnabled && (
              <div className="flex gap-2 flex-wrap">
                {REMINDER_OPTIONS.map((r) => (
                  <button
                    key={r.value}
                    onClick={() => setF({ reminderMinutesBefore: r.value })}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${form.reminderMinutesBefore === r.value ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300' : 'border-gray-700/50 text-gray-400 hover:bg-cyan-500/10'}`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            )}
            {notifPermission === 'denied' && (
              <p className="mt-2 text-xs text-rose-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />Browser notifications are blocked. Enable them in browser settings.
              </p>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default MedicalAppointments;
