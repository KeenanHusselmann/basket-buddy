// ==========================================
// BasketBuddy – Medical Aid (RMA Esteem Care 2026)
// Immersive Health Hub — full glassmorphism redesign
// ==========================================

import React, { useState, useMemo, useCallback } from 'react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HeartPulse, Plus, Pencil, Trash2, Settings, ChevronLeft, ChevronRight,
  ShieldCheck, TrendingUp, AlertTriangle, UserPlus, X, CheckCircle2,
  Clock, XCircle, Receipt, BarChart3, Info, Stethoscope, Pill, Eye,
  Zap, Activity, Building2, Brain, Wallet, Users,
  Shield, Sparkles,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell,
} from 'recharts';
import { useApp } from '../contexts/AppContext';
import Modal from '../components/common/Modal';
import { formatPrice } from '../utils/helpers';
import { CURRENCY } from '../config/constants';
import type {
  MedicalAidPlan, MedicalAidClaim, MedicalAidClaimCategory, MedicalAidMember,
} from '../types';
import { v4 as uuidv4 } from 'uuid';


// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const CLAIM_CATEGORIES: {
  value: MedicalAidClaimCategory;
  label: string;
  icon: string;
  color: string;
  pool: string;
}[] = [
  { value: 'gp',         label: 'GP Visit',         icon: '\U0001FA7A', color: '#3b82f6', pool: 'professional' },
  { value: 'specialist', label: 'Specialist',        icon: '\U0001F468\u200D\u2695\uFE0F', color: '#8b5cf6', pool: 'professional' },
  { value: 'hospital',   label: 'Hospital',          icon: '\U0001F3E5', color: '#ef4444', pool: 'hospital'     },
  { value: 'pharmacy',   label: 'Pharmacy / Meds',   icon: '\U0001F48A', color: '#10b981', pool: 'pharmacy'     },
  { value: 'dental',     label: 'Dental',            icon: '\U0001F9B7', color: '#f97316', pool: 'dental'       },
  { value: 'optical',    label: 'Optical',           icon: '\U0001F453', color: '#06b6d4', pool: 'optical'      },
  { value: 'therapy',    label: 'Therapy / Physio',  icon: '\U0001F9D8', color: '#a855f7', pool: 'therapy'      },
  { value: 'emergency',  label: 'Emergency',         icon: '\U0001F691', color: '#dc2626', pool: 'hospital'     },
  { value: 'maternity',  label: 'Maternity',         icon: '\U0001F931', color: '#ec4899', pool: 'hospital'     },
  { value: 'other',      label: 'Other',             icon: '\U0001F4CB', color: '#6b7280', pool: 'hospital'     },
];

function catMeta(cat: MedicalAidClaimCategory) {
  return CLAIM_CATEGORIES.find((c) => c.value === cat) ?? CLAIM_CATEGORIES[CLAIM_CATEGORIES.length - 1];
}

const STATUS_CONFIG = {
  pending:  { label: 'Pending',  Icon: Clock,        cls: 'text-amber-400',  bg: 'bg-amber-500/10',   border: 'border-amber-500/20'   },
  approved: { label: 'Approved', Icon: CheckCircle2, cls: 'text-emerald-400',bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  rejected: { label: 'Rejected', Icon: XCircle,      cls: 'text-rose-400',   bg: 'bg-rose-500/10',    border: 'border-rose-500/20'    },
};

// ─────────────────────────────────────────────────────────────────────────────
// RMA ESTEEM CARE 2026 — DEFAULTS
// ─────────────────────────────────────────────────────────────────────────────
const RMA_DEFAULTS: Omit<MedicalAidPlan, 'id' | 'createdAt'> = {
  planName:            'Esteem Care',
  provider:            'Renaissance Health Medical Aid (RMA)',
  monthlyContribution: 4000,
  members: [
    { id: uuidv4(), name: 'Requelle Husselmann', relation: 'self'   },
    { id: uuidv4(), name: 'Keenan Husselmann',   relation: 'spouse' },
  ],
  gpLimit:         19200,
  specialistLimit: 0,
  hospitalLimit:   1680000,
  pharmacyLimit:   12800,
  dentalLimit:     13000,
  opticalLimit:    5000,
  therapyLimit:    5900,
  active: true,
  notes: 'OAL: N$1,760,000/family | N$1,160,000 per beneficiary. ' +
         'Private ward: N$18,900/family. MRI/CT/PET: N$34,700/family. ' +
         'Mental Health: N$36,800/family. Oncology: N$420,000/family. ' +
         'Preventative Benefits: N$10,500/family. Benefit Builder: N$530/family.',
};

// ─────────────────────────────────────────────────────────────────────────────
// BENEFIT POOL DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────────
interface BenefitPoolDef {
  key:        string;
  label:      string;
  sublabel:   string;
  icon:       React.ReactNode;
  color:      string;
  limitField: keyof MedicalAidPlan | null;
  categories: MedicalAidClaimCategory[];
  section:    'daytoday' | 'hospital';
  perBenef?:  string;
}

const BENEFIT_POOLS: BenefitPoolDef[] = [
  {
    key: 'professional', label: 'Professional Services', color: '#3b82f6',
    sublabel: 'GP visits, specialist, psychiatry, radiology, pathology',
    icon: <Stethoscope size={14} />, limitField: 'gpLimit',
    categories: ['gp', 'specialist'], section: 'daytoday', perBenef: 'N$9,700/beneficiary',
  },
  {
    key: 'pharmacy', label: 'Medication', color: '#10b981',
    sublabel: 'Acute & chronic medication \u2014 preferred and non-preferred',
    icon: <Pill size={14} />, limitField: 'pharmacyLimit',
    categories: ['pharmacy'], section: 'daytoday', perBenef: 'N$6,500/beneficiary',
  },
  {
    key: 'dental', label: 'Dentistry', color: '#f97316',
    sublabel: 'Fillings, extractions, crowns, dentures, implants, orthodontics',
    icon: <span className="text-sm leading-none">\U0001F9B7</span>, limitField: 'dentalLimit',
    categories: ['dental'], section: 'daytoday', perBenef: 'N$6,900/beneficiary',
  },
  {
    key: 'optical', label: 'Optical', color: '#06b6d4',
    sublabel: 'Eye tests, lenses/contacts, frames (biennial)',
    icon: <Eye size={14} />, limitField: 'opticalLimit',
    categories: ['optical'], section: 'daytoday', perBenef: 'N$2,600/beneficiary',
  },
  {
    key: 'therapy', label: 'Paramedical Services', color: '#a855f7',
    sublabel: 'Physio, speech, OT, biokinetics, chiro, dietician, podiatry',
    icon: <Activity size={14} />, limitField: 'therapyLimit',
    categories: ['therapy'], section: 'daytoday', perBenef: 'N$3,900/beneficiary',
  },
  {
    key: 'hospital', label: 'Hospital (OAL)', color: '#ef4444',
    sublabel: 'Private/state admissions, surgery, emergency, trauma, ICU',
    icon: <Building2 size={14} />, limitField: 'hospitalLimit',
    categories: ['hospital', 'emergency', 'other'], section: 'hospital',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const emptyClaim = (): Omit<MedicalAidClaim, 'id' | 'createdAt'> => ({
  date: Date.now(), category: 'gp', provider: '', description: '',
  totalBill: 0, medicalAidPaid: 0, selfPaid: 0, memberName: '',
  claimStatus: 'pending', notes: '',
});

function poolBarColor(used: number, limit: number): string {
  if (!limit) return '#3b82f6';
  const p = used / limit;
  if (p > 1)     return '#ef4444';
  if (p >= 0.85) return '#f97316';
  return '#22c55e';
}

// SVG Utilization Ring
function UtilRing({ pct, size = 120 }: { pct: number; size?: number }) {
  const r = (size - 16) / 2;
  const circ = 2 * Math.PI * r;
  const clamped = Math.min(pct, 100);
  const dash = (clamped / 100) * circ;
  const color = pct >= 85 ? '#22c55e' : pct >= 50 ? '#06b6d4' : '#f97316';

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="rotate-[-90deg]">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1f2937" strokeWidth={10} />
      <motion.circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={10}
        strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: circ - dash }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
        strokeLinecap="round"
        style={{ filter: `drop-shadow(0 0 6px ${color}80)` }}
      />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────
const MedicalAid: React.FC = () => {
  const {
    medicalAidPlans, medicalAidClaims,
    addMedicalAidPlan, updateMedicalAidPlan,
    addMedicalAidClaim, updateMedicalAidClaim, deleteMedicalAidClaim,
  } = useApp();

  const now = new Date();
  const [viewYear, setViewYear]     = useState(now.getFullYear());
  const [planModal, setPlanModal]   = useState(false);
  const [claimModal, setClaimModal] = useState(false);
  const [editClaim, setEditClaim]   = useState<MedicalAidClaim | null>(null);
  const [activeTab, setActiveTab]   = useState<'overview' | 'claims' | 'analytics'>('overview');

  const [planForm, setPlanForm]   = useState<Omit<MedicalAidPlan, 'id' | 'createdAt'>>(RMA_DEFAULTS);
  const [claimForm, setClaimForm] = useState<Omit<MedicalAidClaim, 'id' | 'createdAt'>>(emptyClaim());
  const [memberInput, setMemberInput] = useState<{ name: string; relation: MedicalAidMember['relation'] }>({ name: '', relation: 'self' });

  const [filterCat,    setFilterCat]    = useState<MedicalAidClaimCategory | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [filterMember, setFilterMember] = useState('all');

  // \u2500\u2500 Derived \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  const plan = useMemo(() => medicalAidPlans.find((p) => p.active) ?? null, [medicalAidPlans]);

  const yearClaims = useMemo(
    () => medicalAidClaims.filter((c) => new Date(c.date).getFullYear() === viewYear),
    [medicalAidClaims, viewYear],
  );
  const approvedClaims = useMemo(
    () => yearClaims.filter((c) => c.claimStatus === 'approved'),
    [yearClaims],
  );

  const totalContribs   = (plan?.monthlyContribution ?? 0) * 12;
  const totalMABenefits = approvedClaims.reduce((s, c) => s + c.medicalAidPaid, 0);
  const totalOutPocket  = yearClaims.reduce((s, c) => s + c.selfPaid, 0);
  const totalBilled     = yearClaims.reduce((s, c) => s + c.totalBill, 0);
  const utilizationPct  = totalContribs > 0 ? (totalMABenefits / totalContribs) * 100 : 0;

  const poolStats = useMemo(() => BENEFIT_POOLS.map((pool) => {
    const used  = approvedClaims
      .filter((c) => pool.categories.includes(c.category))
      .reduce((s, c) => s + c.medicalAidPaid, 0);
    const limit = pool.limitField ? ((plan?.[pool.limitField] as number) ?? 0) : 0;
    return { ...pool, used, limit, pct: limit > 0 ? (used / limit) * 100 : 0 };
  }), [approvedClaims, plan]);

  const monthlyData = useMemo(() => MONTH_NAMES.map((month, i) => {
    const mc = yearClaims.filter((c) => new Date(c.date).getMonth() === i);
    return {
      month,
      maPaid:   mc.filter((c) => c.claimStatus === 'approved').reduce((s, c) => s + c.medicalAidPaid, 0),
      selfPaid: mc.reduce((s, c) => s + c.selfPaid, 0),
      contrib:  plan?.monthlyContribution ?? 0,
    };
  }), [yearClaims, plan]);

  const filteredClaims = useMemo(() => [...yearClaims]
    .filter((c) => filterCat    === 'all' || c.category    === filterCat)
    .filter((c) => filterStatus === 'all' || c.claimStatus === filterStatus)
    .filter((c) => filterMember === 'all' || c.memberName  === filterMember)
    .sort((a, b) => b.date - a.date),
    [yearClaims, filterCat, filterStatus, filterMember],
  );

  const memberStats = useMemo(() => (plan?.members ?? []).map((m) => {
    const mc = approvedClaims.filter((c) => c.memberName === m.name);
    return { ...m, claimed: mc.reduce((s, c) => s + c.medicalAidPaid, 0), count: mc.length };
  }).sort((a, b) => b.claimed - a.claimed), [approvedClaims, plan]);

  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    approvedClaims.forEach((c) => {
      const meta = catMeta(c.category);
      map.set(meta.label, (map.get(meta.label) ?? 0) + c.medicalAidPaid);
    });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value, color: CLAIM_CATEGORIES.find((c) => c.label === name)?.color ?? '#6b7280' }))
      .sort((a, b) => b.value - a.value);
  }, [approvedClaims]);

  // \u2500\u2500 Handlers \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  const openPlanModal = useCallback(() => {
    setPlanForm(plan ? { ...plan } : { ...RMA_DEFAULTS });
    setPlanModal(true);
  }, [plan]);

  const savePlan = useCallback(() => {
    if (!planForm.planName.trim() || !planForm.provider.trim()) {
      toast.error('Plan name and provider are required');
      return;
    }
    if (plan) { updateMedicalAidPlan(plan.id, planForm); toast.success('Plan updated'); }
    else       { addMedicalAidPlan(planForm);             toast.success('Plan activated!'); }
    setPlanModal(false);
  }, [planForm, plan, addMedicalAidPlan, updateMedicalAidPlan]);

  const addMember = useCallback(() => {
    if (!memberInput.name.trim()) return;
    const m: MedicalAidMember = { id: uuidv4(), name: memberInput.name.trim(), relation: memberInput.relation };
    setPlanForm((f) => ({ ...f, members: [...f.members, m] }));
    setMemberInput({ name: '', relation: 'self' });
  }, [memberInput]);

  const removeMember = useCallback((id: string) => {
    setPlanForm((f) => ({ ...f, members: f.members.filter((m) => m.id !== id) }));
  }, []);

  const openAddClaim = useCallback(() => {
    setEditClaim(null);
    setClaimForm({ ...emptyClaim(), date: Date.now(), memberName: plan?.members[0]?.name ?? '' });
    setClaimModal(true);
  }, [plan]);

  const openEditClaim = useCallback((claim: MedicalAidClaim) => {
    setEditClaim(claim);
    const { id: _id, createdAt: _ca, ...rest } = claim;
    setClaimForm(rest);
    setClaimModal(true);
  }, []);

  const saveClaim = useCallback(() => {
    if (!claimForm.provider.trim() || !claimForm.description.trim()) {
      toast.error('Provider and description are required');
      return;
    }
    if (editClaim) { updateMedicalAidClaim(editClaim.id, claimForm); toast.success('Claim updated'); }
    else           { addMedicalAidClaim(claimForm);                   toast.success('Claim recorded'); }
    setClaimModal(false);
  }, [claimForm, editClaim, addMedicalAidClaim, updateMedicalAidClaim]);

  const deleteClaim = useCallback((id: string, desc: string) => {
    if (!confirm(`Delete "${desc}"?`)) return;
    deleteMedicalAidClaim(id);
    toast.success('Claim removed');
  }, [deleteMedicalAidClaim]);

  const setClaimField = useCallback(<K extends keyof typeof claimForm>(key: K, value: typeof claimForm[K]) => {
    setClaimForm((f) => {
      const u = { ...f, [key]: value };
      if (key === 'totalBill' || key === 'medicalAidPaid') {
        const bill = key === 'totalBill'      ? (value as number) : f.totalBill;
        const paid = key === 'medicalAidPaid' ? (value as number) : f.medicalAidPaid;
        u.selfPaid = Math.max(0, bill - paid);
      }
      return u;
    });
  }, []);

  // \u2500\u2500 No plan empty state \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  if (!plan && medicalAidPlans.length === 0) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-cyan-500/5 blur-3xl" />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative text-center max-w-md w-full"
        >
          <div className="relative inline-block mb-6">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-cyan-500/20 to-teal-600/20 border border-cyan-500/30 flex items-center justify-center mx-auto">
              <HeartPulse size={40} className="text-cyan-400" />
            </div>
            <motion.div
              className="absolute -inset-2 rounded-3xl border border-cyan-500/20"
              animate={{ scale: [1, 1.08, 1], opacity: [0.4, 0.1, 0.4] }}
              transition={{ duration: 2.5, repeat: Infinity }}
            />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Activate Your Medical Aid Plan</h2>
          <p className="text-gray-400 text-sm mb-1 max-w-sm mx-auto">
            Your <span className="text-cyan-400 font-medium">Renaissance Health Esteem Care 2026</span> benefits
            have been pre-loaded with Requelle &amp; Keenan as members.
          </p>
          <p className="text-xs text-gray-500 mb-6">Monthly contribution: <span className="text-gray-300 font-semibold">N$4,000</span></p>
          <button onClick={openPlanModal}
            className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-cyan-500 to-teal-600 text-white rounded-2xl font-semibold hover:from-cyan-400 hover:to-teal-500 transition-all shadow-lg shadow-cyan-500/25">
            <Settings size={17} /> Review &amp; Activate Plan
          </button>
        </motion.div>

        <PlanModal open={planModal} form={planForm} setForm={setPlanForm}
          memberInput={memberInput} setMemberInput={setMemberInput}
          onAddMember={addMember} onRemoveMember={removeMember}
          onSave={savePlan} onClose={() => setPlanModal(false)} />
      </div>
    );
  }

  // \u2500\u2500 Full page \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  return (
    <div className="space-y-5">

      {/* HERO BANNER */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-cyan-950/40 to-teal-950/30 border border-cyan-500/20 p-5 sm:p-6"
      >
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-cyan-500/8 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-teal-500/6 blur-3xl pointer-events-none" />
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />

        <div className="relative flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20">
                <Shield size={11} className="text-cyan-400" />
                <span className="text-xs font-medium text-cyan-400">Active Plan</span>
              </div>
              <span className="text-xs text-gray-500">{viewYear}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white leading-tight">{plan?.planName}</h1>
            <p className="text-sm text-gray-400 mt-0.5">{plan?.provider}</p>
            <div className="flex flex-wrap items-center gap-3 mt-3">
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <Users size={12} className="text-cyan-500" />
                <span>{plan?.members.length ?? 0} member{(plan?.members.length ?? 0) !== 1 ? 's' : ''}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <Wallet size={12} className="text-teal-500" />
                <span>{formatPrice(plan?.monthlyContribution ?? 0)}/mo \u00b7 {formatPrice(totalContribs)}/yr</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <Receipt size={12} className="text-violet-400" />
                <span>{yearClaims.length} claims this year</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-3">
              {plan?.members.map((m) => (
                <span key={m.id}
                  className="px-2.5 py-0.5 rounded-full text-xs bg-gray-800/60 border border-gray-700/50 text-gray-300">
                  {m.name.split(' ')[0]}
                  <span className="text-gray-500 ml-1 capitalize">({m.relation})</span>
                </span>
              ))}
            </div>
          </div>

          <div className="flex flex-col items-center gap-2 shrink-0">
            <div className="relative">
              <UtilRing pct={utilizationPct} size={110} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-bold text-white tabular-nums">{utilizationPct.toFixed(0)}%</span>
                <span className="text-xs text-gray-400 mt-0.5">used</span>
              </div>
            </div>
            <span className="text-xs text-gray-500">Benefits utilised</span>
          </div>

          <div className="flex sm:flex-col items-center gap-2 shrink-0">
            <div className="flex items-center gap-1 bg-black/30 border border-white/10 rounded-xl px-2 py-1">
              <button onClick={() => setViewYear((y) => y - 1)} className="text-gray-400 hover:text-white p-0.5 transition-colors">
                <ChevronLeft size={14} />
              </button>
              <span className="text-sm font-semibold text-white w-10 text-center">{viewYear}</span>
              <button onClick={() => setViewYear((y) => y + 1)} disabled={viewYear >= now.getFullYear()}
                className="text-gray-400 hover:text-white p-0.5 transition-colors disabled:opacity-30">
                <ChevronRight size={14} />
              </button>
            </div>
            <button onClick={openPlanModal}
              className="flex items-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 rounded-xl text-xs font-medium transition-colors">
              <Settings size={13} /> Plan
            </button>
            <button onClick={openAddClaim}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-cyan-500 to-teal-600 hover:from-cyan-400 hover:to-teal-500 text-white rounded-xl text-xs font-semibold transition-all shadow-lg shadow-cyan-500/20">
              <Plus size={13} /> Add Claim
            </button>
          </div>
        </div>
      </motion.div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: 'Contributions',
            value: formatPrice(totalContribs),
            sub: `${formatPrice(plan?.monthlyContribution ?? 0)} \u00d7 12 months`,
            Icon: Receipt,
            color: 'text-violet-400',
            glow: 'from-violet-500/5',
            border: 'border-violet-500/20',
          },
          {
            label: 'Benefits Used',
            value: formatPrice(totalMABenefits),
            sub: `${approvedClaims.length} approved claim${approvedClaims.length !== 1 ? 's' : ''}`,
            Icon: ShieldCheck,
            color: 'text-emerald-400',
            glow: 'from-emerald-500/5',
            border: 'border-emerald-500/20',
          },
          {
            label: 'Utilisation',
            value: `${utilizationPct.toFixed(1)}%`,
            sub: utilizationPct >= 80 ? '\U0001F525 Excellent value' : utilizationPct >= 50 ? '\U0001F44D Good' : '\u26A0\uFE0F Room to use',
            Icon: TrendingUp,
            color: utilizationPct >= 80 ? 'text-emerald-400' : utilizationPct >= 50 ? 'text-cyan-400' : 'text-amber-400',
            glow: 'from-cyan-500/5',
            border: 'border-cyan-500/20',
          },
          {
            label: 'Out-of-Pocket',
            value: formatPrice(totalOutPocket),
            sub: `Total billed: ${formatPrice(totalBilled)}`,
            Icon: AlertTriangle,
            color: totalOutPocket > 0 ? 'text-amber-400' : 'text-gray-400',
            glow: 'from-amber-500/5',
            border: 'border-amber-500/20',
          },
        ].map(({ label, value, sub, Icon, color, glow, border }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className={`relative overflow-hidden bg-gradient-to-br ${glow} to-transparent bg-gray-900/70 backdrop-blur-xl rounded-2xl border ${border} p-4`}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className={`p-1.5 rounded-lg bg-gray-800/60 ${color}`}>
                <Icon size={13} />
              </div>
              <span className="text-xs text-gray-500 uppercase tracking-wide font-medium">{label}</span>
            </div>
            <p className={`text-xl font-bold tabular-nums ${color}`}>{value}</p>
            <p className="text-xs text-gray-500 mt-1">{sub}</p>
          </motion.div>
        ))}
      </div>

      {/* TAB BAR */}
      <div className="flex gap-1 bg-gray-800/40 rounded-xl p-1 w-fit border border-gray-700/40">
        {([
          { id: 'overview',  label: 'Benefits',              Icon: Shield    },
          { id: 'claims',    label: `Claims (${yearClaims.length})`, Icon: Receipt   },
          { id: 'analytics', label: 'Analytics',             Icon: BarChart3 },
        ] as const).map(({ id, label, Icon }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === id
                ? 'bg-gray-900/80 text-cyan-400 shadow-sm border border-cyan-500/20'
                : 'text-gray-500 hover:text-gray-300'
            }`}>
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="space-y-5">
          <section>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-cyan-400 shrink-0" />
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Day-to-Day Benefits</h2>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {poolStats.filter((p) => p.section === 'daytoday').map((pool, i) => (
                <motion.div key={pool.key} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }}>
                  <PoolCard pool={pool} />
                </motion.div>
              ))}
            </div>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-rose-400 shrink-0" />
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Hospital &amp; OAL Benefits</h2>
            </div>
            <div className="space-y-3">
              {poolStats.filter((p) => p.section === 'hospital').map((pool) => (
                <PoolCard key={pool.key} pool={pool} />
              ))}
              <div className="bg-gray-900/40 rounded-2xl border border-gray-700/40 p-4">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                  <Info size={11} className="text-cyan-500" />
                  Notable Sub-limits (per family) \u2014 part of OAL
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    ['Private Ward',          'N$18,900'],
                    ['MRI / CT / PET',        'N$34,700'],
                    ['Mental Health',         'N$36,800'],
                    ['Normal Delivery',       'N$22,300'],
                    ['Caesarean Section',     'N$33,440'],
                    ['Internal Prosthesis',   'N$61,000'],
                    ['Reconstructive Surgery','N$13,400'],
                    ['Cataract Surgery',      'N$36,800'],
                    ['Maxillofacial Surgery', 'N$39,400'],
                    ['Oncology Treatment',    'N$420,000'],
                    ['International Rescue',  'N$10,000,000'],
                  ].map(([label, amt]) => (
                    <div key={label} className="bg-gray-800/40 rounded-xl border border-gray-700/30 px-3 py-2.5 hover:border-gray-600/50 transition-colors group">
                      <p className="text-xs text-gray-500 leading-tight">{label}</p>
                      <p className="text-sm font-bold text-gray-200 mt-0.5 group-hover:text-white transition-colors">{amt}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-gradient-to-br from-blue-500/5 to-transparent border border-blue-500/20 rounded-2xl p-4">
              <p className="text-xs font-bold text-blue-400 mb-2 flex items-center gap-1.5">
                <Zap size={12} /> Preventative \u2014 N$10,500/family
              </p>
              <ul className="text-xs text-gray-400 space-y-1">
                {['Blood sugar, cholesterol, BMI & BP (1/yr)', 'Dental exam (1/yr) \u00b7 Pap smear (females 20+)', 'Mammogram (females 40+) \u00b7 Prostate PSA (males 50+)', 'Flu vaccine \u00b7 Baby immunisations (0\u201312 yrs)', 'HPV vaccine (females 9\u201330 yrs, 3 injections)'].map((s) => (
                  <li key={s} className="flex items-start gap-1.5"><span className="text-blue-400/60 mt-0.5 shrink-0">\u203a</span>{s}</li>
                ))}
              </ul>
            </div>
            <div className="bg-gradient-to-br from-pink-500/5 to-transparent border border-pink-500/20 rounded-2xl p-4">
              <p className="text-xs font-bold text-pink-400 mb-2">\U0001F931 Maternity Benefits</p>
              <ul className="text-xs text-gray-400 space-y-1">
                {[['Normal delivery', 'N$22,300'], ['Caesarean section', 'N$33,440'], ['Antenatal', 'Professional Services pool'], ['Neonatal care', 'Part of OAL']].map(([k, v]) => (
                  <li key={k} className="flex justify-between gap-2">
                    <span>{k}</span><span className="text-gray-300 font-medium shrink-0">{v}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-gradient-to-br from-violet-500/5 to-transparent border border-violet-500/20 rounded-2xl p-4">
              <p className="text-xs font-bold text-violet-400 mb-2 flex items-center gap-1.5">
                <Brain size={12} /> Benefit Builder \u2014 N$530/family
              </p>
              <p className="text-xs text-gray-400">
                Covers medication levies, co-payments &amp; tariff shortfalls automatically.
                80% of unused balance rolls to Benefit Wallet annually. Wallet balances roll over year-to-year.
              </p>
            </div>
          </div>

          {memberStats.length > 0 && (
            <div className="bg-gray-900/70 backdrop-blur-xl rounded-2xl border border-violet-500/20 p-5">
              <div className="flex items-center gap-2 mb-3">
                <Users size={14} className="text-cyan-500" />
                <h2 className="text-sm font-semibold text-gray-200">Member Claims Summary \u2014 {viewYear}</h2>
              </div>
              <div className="space-y-2">
                {memberStats.map((m, i) => {
                  const pct = totalMABenefits > 0 ? (m.claimed / totalMABenefits) * 100 : 0;
                  const initials = m.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
                  const colors = ['bg-cyan-500/20 text-cyan-400', 'bg-teal-500/20 text-teal-400', 'bg-violet-500/20 text-violet-400'];
                  return (
                    <div key={m.id} className="flex items-center gap-3 p-3 bg-gray-800/30 rounded-xl hover:bg-gray-800/50 transition-colors">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${colors[i % colors.length]}`}>
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-medium text-gray-200 truncate">{m.name}</p>
                          <span className="text-sm font-bold text-emerald-400 tabular-nums shrink-0 ml-2">{formatPrice(m.claimed)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-gray-700/60 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.8, delay: i * 0.1 }}
                              className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-teal-500"
                            />
                          </div>
                          <span className="text-xs text-gray-500 shrink-0">{m.count} claim{m.count !== 1 ? 's' : ''}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* CLAIMS TAB */}
      {activeTab === 'claims' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 p-3 bg-gray-900/50 rounded-xl border border-gray-700/40">
            <select value={filterCat}
              onChange={(e) => setFilterCat(e.target.value as typeof filterCat)}
              className="px-3 py-1.5 bg-gray-800/60 border border-gray-700/60 rounded-xl text-xs text-gray-300 outline-none focus:border-cyan-500/50">
              <option value="all">All Categories</option>
              {CLAIM_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
            </select>
            <select value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
              className="px-3 py-1.5 bg-gray-800/60 border border-gray-700/60 rounded-xl text-xs text-gray-300 outline-none focus:border-cyan-500/50">
              <option value="all">All Statuses</option>
              <option value="approved">\u2705 Approved</option>
              <option value="pending">\u23F3 Pending</option>
              <option value="rejected">\u274C Rejected</option>
            </select>
            {(plan?.members.length ?? 0) > 0 && (
              <select value={filterMember}
                onChange={(e) => setFilterMember(e.target.value)}
                className="px-3 py-1.5 bg-gray-800/60 border border-gray-700/60 rounded-xl text-xs text-gray-300 outline-none focus:border-cyan-500/50">
                <option value="all">All Members</option>
                {plan!.members.map((m) => <option key={m.id} value={m.name}>{m.name}</option>)}
              </select>
            )}
            <span className="ml-auto text-xs text-gray-500">{filteredClaims.length} record{filteredClaims.length !== 1 ? 's' : ''}</span>
          </div>

          {filteredClaims.length === 0 ? (
            <div className="bg-gray-900/70 backdrop-blur-xl rounded-2xl border border-gray-700/40 p-12 text-center">
              <HeartPulse size={36} className="mx-auto text-gray-600 mb-3" />
              <p className="text-gray-500 text-sm">No claims for {viewYear}.</p>
              <button onClick={openAddClaim}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-teal-600 text-white rounded-xl text-sm font-medium hover:from-cyan-400 hover:to-teal-500 transition-all">
                <Plus size={14} /> Add First Claim
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence>
                {filteredClaims.map((claim, i) => {
                  const meta  = catMeta(claim.category);
                  const scfg  = STATUS_CONFIG[claim.claimStatus];
                  const SIcon = scfg.Icon;
                  const initials = claim.memberName
                    ? claim.memberName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
                    : '?';
                  return (
                    <motion.div
                      key={claim.id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ delay: i * 0.03 }}
                      className="relative flex items-start gap-0 bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-700/40 overflow-hidden hover:border-gray-600/60 transition-colors group"
                    >
                      <div className="w-1 self-stretch shrink-0 rounded-l-2xl" style={{ backgroundColor: meta.color + '80' }} />
                      <div className="flex items-start gap-3 p-3 sm:p-4 flex-1 min-w-0">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 text-lg"
                          style={{ backgroundColor: meta.color + '18' }}>
                          {meta.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5 mb-1">
                            <span className="font-semibold text-gray-100 text-sm">{claim.description}</span>
                            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${scfg.bg} ${scfg.cls}`}>
                              <SIcon size={10} /> {scfg.label}
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800/60 text-gray-400">{meta.label}</span>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-500">
                            <span>{claim.provider}</span>
                            {claim.memberName && (
                              <span className="flex items-center gap-1">
                                <span className="w-4 h-4 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-[9px] font-bold">{initials[0]}</span>
                                {claim.memberName}
                              </span>
                            )}
                            <span>{new Date(claim.date).toLocaleDateString('en-NA', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                          </div>
                          {claim.notes && <p className="text-xs text-gray-500 mt-1 italic">{claim.notes}</p>}
                        </div>
                        <div className="text-right shrink-0 ml-2">
                          <p className="text-xs text-gray-500">Billed</p>
                          <p className="text-sm font-semibold text-gray-300 tabular-nums">{formatPrice(claim.totalBill)}</p>
                          <p className="text-xs text-gray-500 mt-1">MA Paid</p>
                          <p className="text-sm font-bold text-emerald-400 tabular-nums">{formatPrice(claim.medicalAidPaid)}</p>
                          {claim.selfPaid > 0 && (
                            <>
                              <p className="text-xs text-gray-500 mt-1">Self</p>
                              <p className="text-sm font-semibold text-amber-400 tabular-nums">{formatPrice(claim.selfPaid)}</p>
                            </>
                          )}
                        </div>
                        <div className="flex flex-col gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity ml-1">
                          <button onClick={() => openEditClaim(claim)}
                            className="p-1.5 text-gray-500 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-colors"
                            aria-label="Edit claim">
                            <Pencil size={13} />
                          </button>
                          <button onClick={() => deleteClaim(claim.id, claim.description)}
                            className="p-1.5 text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                            aria-label="Delete claim">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}

      {/* ANALYTICS TAB */}
      {activeTab === 'analytics' && (
        <div className="space-y-5">
          <div className="bg-gray-900/70 backdrop-blur-xl rounded-2xl border border-gray-700/40 p-5">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 size={15} className="text-cyan-500" />
              <h2 className="text-sm font-semibold text-gray-200">Monthly Overview \u2014 {viewYear}</h2>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={monthlyData} barGap={2} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => `${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} width={36} />
                <Tooltip
                  formatter={(val: number, name: string) => [
                    formatPrice(val),
                    name === 'contrib' ? 'Contribution' : name === 'maPaid' ? 'MA Paid' : 'Self-Paid',
                  ]}
                  contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 10, fontSize: 12 }}
                  labelStyle={{ color: '#9ca3af', fontWeight: 600 }}
                />
                <Bar dataKey="contrib"  fill="#6366f1" fillOpacity={0.5} radius={[3,3,0,0]} maxBarSize={14} />
                <Bar dataKey="maPaid"   fill="#22c55e" radius={[3,3,0,0]} maxBarSize={14} />
                <Bar dataKey="selfPaid" fill="#f97316" radius={[3,3,0,0]} maxBarSize={14} />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap items-center justify-center gap-5 mt-3 text-xs text-gray-500">
              <span className="flex items-center gap-1.5"><span className="w-3 h-1.5 rounded bg-violet-400/60 inline-block" />Contribution</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-1.5 rounded bg-green-500 inline-block" />MA Paid</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-1.5 rounded bg-orange-400 inline-block" />Self-Paid</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-gray-900/70 backdrop-blur-xl rounded-2xl border border-gray-700/40 p-5">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles size={14} className="text-teal-500" />
                <h2 className="text-sm font-semibold text-gray-200">Claims by Category</h2>
              </div>
              {categoryBreakdown.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-sm">No approved claims yet</div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={categoryBreakdown} dataKey="value" cx="50%" cy="50%"
                        innerRadius={55} outerRadius={80} paddingAngle={2}>
                        {categoryBreakdown.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} fillOpacity={0.85} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(val: number) => [formatPrice(val), 'MA Paid']}
                        contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 10, fontSize: 12 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-1.5 mt-2">
                    {categoryBreakdown.slice(0, 6).map((c) => (
                      <div key={c.name} className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-2 text-gray-400">
                          <span className="w-2.5 h-2.5 rounded-sm inline-block shrink-0" style={{ backgroundColor: c.color }} />
                          {c.name}
                        </span>
                        <span className="font-medium text-gray-300 tabular-nums">{formatPrice(c.value)}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="bg-gray-900/70 backdrop-blur-xl rounded-2xl border border-gray-700/40 p-5">
              <div className="flex items-center gap-2 mb-4">
                <Activity size={14} className="text-violet-500" />
                <h2 className="text-sm font-semibold text-gray-200">Benefit Pool Utilisation</h2>
              </div>
              <div className="space-y-3">
                {poolStats.filter((p) => p.limit > 0).map((pool) => {
                  const pct = Math.min(pool.pct, 100);
                  const barColor = poolBarColor(pool.used, pool.limit);
                  return (
                    <div key={pool.key}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-400">{pool.label}</span>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-gray-500">{formatPrice(pool.used)}</span>
                          <span className="text-gray-600">/</span>
                          <span className="text-gray-400">{formatPrice(pool.limit)}</span>
                          <span className="font-bold" style={{ color: barColor }}>{pct.toFixed(0)}%</span>
                        </div>
                      </div>
                      <div className="h-2 bg-gray-800/60 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8, ease: 'easeOut' }}
                          className="h-full rounded-full"
                          style={{ backgroundColor: barColor, boxShadow: `0 0 6px ${barColor}60` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total Claims', value: yearClaims.length, color: 'text-cyan-400' },
              { label: 'Approved',     value: approvedClaims.length, color: 'text-emerald-400' },
              { label: 'Pending',      value: yearClaims.filter((c) => c.claimStatus === 'pending').length, color: 'text-amber-400' },
              { label: 'Rejected',     value: yearClaims.filter((c) => c.claimStatus === 'rejected').length, color: 'text-rose-400' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-gray-900/50 border border-gray-700/40 rounded-xl p-4 text-center">
                <p className={`text-3xl font-bold tabular-nums ${color}`}>{value}</p>
                <p className="text-xs text-gray-500 mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODALS */}
      <PlanModal open={planModal} form={planForm} setForm={setPlanForm}
        memberInput={memberInput} setMemberInput={setMemberInput}
        onAddMember={addMember} onRemoveMember={removeMember}
        onSave={savePlan} onClose={() => setPlanModal(false)} />

      <ClaimModal open={claimModal} form={claimForm} plan={plan}
        editClaim={editClaim} setField={setClaimField}
        onSave={saveClaim} onClose={() => setClaimModal(false)} />
    </div>
  );
};

// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
// POOL CARD
// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
interface PoolCardProps {
  pool: BenefitPoolDef & { used: number; limit: number; pct: number };
}
const PoolCard: React.FC<PoolCardProps> = ({ pool }) => {
  const pct       = Math.min(pool.pct, 100);
  const over      = pool.limit > 0 && pool.used > pool.limit;
  const bc        = poolBarColor(pool.used, pool.limit);
  const remaining = pool.limit > 0 ? pool.limit - pool.used : 0;

  return (
    <div
      className="relative overflow-hidden bg-gray-900/70 backdrop-blur-xl rounded-2xl border border-gray-700/40 p-4 hover:border-gray-600/60 transition-all group"
      style={{ boxShadow: `inset 0 0 40px ${pool.color}06` }}
    >
      <div className="absolute top-0 inset-x-0 h-px opacity-60"
        style={{ background: `linear-gradient(90deg, transparent, ${pool.color}60, transparent)` }} />

      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${pool.color}18`, color: pool.color }}>
            {pool.icon}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-100">{pool.label}</p>
            <p className="text-xs text-gray-500 leading-snug max-w-xs mt-0.5">{pool.sublabel}</p>
          </div>
        </div>
        <div className="text-right shrink-0 ml-3">
          <p className={`text-lg font-bold tabular-nums ${over ? 'text-rose-400' : 'text-white'}`}>
            {formatPrice(pool.used)}
          </p>
          {pool.limit > 0 && (
            <p className="text-xs text-gray-500">of {formatPrice(pool.limit)}</p>
          )}
        </div>
      </div>

      {pool.limit > 0 ? (
        <>
          <div className="relative h-2.5 bg-gray-800/60 rounded-full overflow-hidden mb-2">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
              className="h-full rounded-full"
              style={{ backgroundColor: bc, boxShadow: `0 0 8px ${bc}70` }}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-medium ${over ? 'text-rose-400' : pct >= 85 ? 'text-amber-400' : 'text-gray-500'}`}>
              {over
                ? `\u26A0\uFE0F Over by ${formatPrice(pool.used - pool.limit)}`
                : pct >= 85
                ? `\U0001F536 ${formatPrice(remaining)} left`
                : `${formatPrice(remaining)} remaining`}
            </span>
            <span className="text-xs font-bold" style={{ color: bc }}>{pct.toFixed(0)}%</span>
          </div>
          {pool.perBenef && (
            <p className="text-xs text-gray-600 mt-1.5 flex items-center gap-1">
              <Info size={9} className="text-gray-600" /> Per beneficiary: {pool.perBenef}
            </p>
          )}
        </>
      ) : (
        <p className="text-xs text-gray-500 italic mt-1">Falls under Overall Annual Limit (OAL)</p>
      )}
    </div>
  );
};

// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
// PLAN MODAL
// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
interface PlanModalProps {
  open: boolean;
  form: Omit<MedicalAidPlan, 'id' | 'createdAt'>;
  setForm: React.Dispatch<React.SetStateAction<Omit<MedicalAidPlan, 'id' | 'createdAt'>>>;
  memberInput: { name: string; relation: MedicalAidMember['relation'] };
  setMemberInput: React.Dispatch<React.SetStateAction<{ name: string; relation: MedicalAidMember['relation'] }>>;
  onAddMember: () => void;
  onRemoveMember: (id: string) => void;
  onSave: () => void;
  onClose: () => void;
}
const PlanModal: React.FC<PlanModalProps> = ({
  open, form, setForm, memberInput, setMemberInput, onAddMember, onRemoveMember, onSave, onClose,
}) => {
  const f = <K extends keyof typeof form>(key: K, val: typeof form[K]) =>
    setForm((p) => ({ ...p, [key]: val }));

  return (
    <Modal isOpen={open} onClose={onClose} title="Medical Aid Plan Setup"
      footer={
        <div className="flex gap-3">
          <button type="button" onClick={onClose}
            className="flex-1 py-2.5 border border-gray-700/60 rounded-xl text-sm text-gray-400 hover:bg-white/5 transition-colors">
            Cancel
          </button>
          <button onClick={onSave}
            className="flex-1 py-2.5 bg-gradient-to-r from-cyan-500 to-teal-600 text-white rounded-xl text-sm font-semibold hover:from-cyan-400 hover:to-teal-500 transition-all">
            Save Plan
          </button>
        </div>
      }>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Provider *</label>
            <input type="text" value={form.provider} onChange={(e) => f('provider', e.target.value)}
              placeholder="Renaissance Health (RMA)"
              className="w-full px-3 py-2 bg-gray-800/40 border border-gray-700/60 rounded-xl text-sm outline-none focus:border-cyan-500/50" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Plan Name *</label>
            <input type="text" value={form.planName} onChange={(e) => f('planName', e.target.value)}
              placeholder="Esteem Care"
              className="w-full px-3 py-2 bg-gray-800/40 border border-gray-700/60 rounded-xl text-sm outline-none focus:border-cyan-500/50" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Monthly Contribution (N$) *</label>
          <input type="number" min="0" step="0.01" value={form.monthlyContribution || ''}
            onChange={(e) => f('monthlyContribution', parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 bg-gray-800/40 border border-gray-700/60 rounded-xl text-sm outline-none focus:border-cyan-500/50" />
        </div>

        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
            Annual Benefit Limits (N$) \u2014 0 = OAL / unlimited
          </p>
          <div className="grid grid-cols-2 gap-3">
            {([
              ['gpLimit',         '\U0001FA7A Professional Services (GP + Specialist)',  'N$19,200 family / N$9,700 per beneficiary'],
              ['hospitalLimit',   '\U0001F3E5 Overall Annual Limit (Hospital / OAL)',    'N$1,680,000 family / N$1,103,000 per beneficiary'],
              ['pharmacyLimit',   '\U0001F48A Pharmacy / Medication',                   'N$12,800 family / N$6,500 per beneficiary'],
              ['dentalLimit',     '\U0001F9B7 Dentistry',                               'N$13,000 family / N$6,900 per beneficiary'],
              ['opticalLimit',    '\U0001F453 Optical',                                 'N$5,000 family / N$2,600 per beneficiary'],
              ['therapyLimit',    '\U0001F9D8 Paramedical (Physio, OT, Speech, etc.)',  'N$5,900 family / N$3,900 per beneficiary'],
            ] as [keyof typeof form, string, string][]).map(([key, label, hint]) => (
              <div key={key}>
                <label className="block text-xs text-gray-400 mb-0.5">{label}</label>
                <p className="text-xs text-gray-600 mb-1">{hint}</p>
                <input type="number" min="0" step="0.01"
                  value={(form[key] as number) || ''}
                  onChange={(e) => f(key, parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-gray-800/40 border border-gray-700/60 rounded-xl text-sm outline-none focus:border-cyan-500/50" />
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-600 mt-2 flex items-start gap-1">
            <Info size={10} className="shrink-0 mt-0.5" />
            GP and Specialist draw from the same Professional Services pool.
          </p>
        </div>

        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Family Members</p>
          {form.members.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {form.members.map((m) => (
                <span key={m.id}
                  className="flex items-center gap-1 px-2.5 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-full text-xs text-cyan-300">
                  {m.name} <span className="opacity-60 capitalize">({m.relation})</span>
                  <button onClick={() => onRemoveMember(m.id)} className="ml-1 text-gray-400 hover:text-rose-400 transition-colors">
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input type="text" placeholder="Member name" value={memberInput.name}
              onChange={(e) => setMemberInput((i) => ({ ...i, name: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && onAddMember()}
              className="flex-1 px-3 py-2 bg-gray-800/40 border border-gray-700/60 rounded-xl text-sm outline-none focus:border-cyan-500/50" />
            <select value={memberInput.relation}
              onChange={(e) => setMemberInput((i) => ({ ...i, relation: e.target.value as MedicalAidMember['relation'] }))}
              className="px-3 py-2 bg-gray-800/40 border border-gray-700/60 rounded-xl text-xs outline-none focus:border-cyan-500/50">
              <option value="self">Principal</option>
              <option value="spouse">Spouse</option>
              <option value="child">Child</option>
              <option value="parent">Parent</option>
              <option value="other">Other</option>
            </select>
            <button onClick={onAddMember}
              className="px-3 bg-gradient-to-r from-cyan-500 to-teal-600 text-white rounded-xl hover:from-cyan-400 hover:to-teal-500 transition-all"
              aria-label="Add member">
              <UserPlus size={15} />
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Notes</label>
          <textarea rows={2} value={form.notes ?? ''} onChange={(e) => f('notes', e.target.value)}
            placeholder="Policy number, renewal date, fund rules reference\u2026"
            className="w-full px-3 py-2 bg-gray-800/40 border border-gray-700/60 rounded-xl text-sm outline-none focus:border-cyan-500/50 resize-none" />
        </div>
      </div>
    </Modal>
  );
};

// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
// CLAIM MODAL
// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
interface ClaimModalProps {
  open: boolean;
  form: Omit<MedicalAidClaim, 'id' | 'createdAt'>;
  plan: MedicalAidPlan | null;
  editClaim: MedicalAidClaim | null;
  setField: <K extends keyof Omit<MedicalAidClaim, 'id' | 'createdAt'>>(
    key: K, value: Omit<MedicalAidClaim, 'id' | 'createdAt'>[K]
  ) => void;
  onSave: () => void;
  onClose: () => void;
}
const ClaimModal: React.FC<ClaimModalProps> = ({ open, form, plan, editClaim, setField, onSave, onClose }) => {
  const cat  = CLAIM_CATEGORIES.find((c) => c.value === form.category);
  const pool = BENEFIT_POOLS.find((p) => p.key === cat?.pool);

  return (
    <Modal isOpen={open} onClose={onClose}
      title={editClaim ? 'Edit Claim' : 'Record Medical Aid Claim'}
      footer={
        <div className="flex gap-3">
          <button type="button" onClick={onClose}
            className="flex-1 py-2.5 border border-gray-700/60 rounded-xl text-sm text-gray-400 hover:bg-white/5 transition-colors">
            Cancel
          </button>
          <button onClick={onSave}
            className="flex-1 py-2.5 bg-gradient-to-r from-cyan-500 to-teal-600 text-white rounded-xl text-sm font-semibold hover:from-cyan-400 hover:to-teal-500 transition-all">
            {editClaim ? 'Save Changes' : 'Record Claim'}
          </button>
        </div>
      }>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Date *</label>
            <input type="date"
              value={new Date(form.date).toISOString().split('T')[0]}
              onChange={(e) => setField('date', new Date(e.target.value).getTime())}
              className="w-full px-3 py-2 bg-gray-800/40 border border-gray-700/60 rounded-xl text-sm outline-none focus:border-cyan-500/50" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Category *</label>
            <select value={form.category}
              onChange={(e) => setField('category', e.target.value as MedicalAidClaimCategory)}
              className="w-full px-3 py-2 bg-gray-800/40 border border-gray-700/60 rounded-xl text-sm outline-none focus:border-cyan-500/50">
              {CLAIM_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
            </select>
          </div>
        </div>

        {pool && (
          <div className="flex items-center gap-2 px-3 py-2 bg-cyan-500/5 border border-cyan-500/20 rounded-xl">
            <Info size={12} className="text-cyan-500 shrink-0" />
            <span className="text-xs text-cyan-300">
              Counts against <strong>{pool.label}</strong>
              {pool.limitField
                ? ` \u2014 family limit: ${formatPrice((plan?.[pool.limitField] as number) ?? 0)}/yr`
                : ' (Overall Annual Limit)'}
            </span>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Provider *</label>
          <input type="text" placeholder="e.g. Dr. Smith, Dis-Chem, MediClinic Windhoek"
            value={form.provider} onChange={(e) => setField('provider', e.target.value)}
            className="w-full px-3 py-2 bg-gray-800/40 border border-gray-700/60 rounded-xl text-sm outline-none focus:border-cyan-500/50" />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Description *</label>
          <input type="text" placeholder="e.g. GP Consultation, Antibiotic prescription, Root canal"
            value={form.description} onChange={(e) => setField('description', e.target.value)}
            className="w-full px-3 py-2 bg-gray-800/40 border border-gray-700/60 rounded-xl text-sm outline-none focus:border-cyan-500/50" />
        </div>

        <div className="grid grid-cols-3 gap-3">
          {([
            ['totalBill',       'Total Bill',       'border-gray-700/60'],
            ['medicalAidPaid',  'MA Paid',          'border-emerald-500/30'],
            ['selfPaid',        'Self-Paid (auto)', 'border-amber-500/30'],
          ] as const).map(([key, label, borderCls]) => (
            <div key={key}>
              <label className="block text-xs font-medium text-gray-400 mb-1">{label} (N$)</label>
              <input type="number" min="0" step="0.01"
                value={(form[key] as number) || ''}
                onChange={(e) => setField(key, parseFloat(e.target.value) || 0)}
                className={`w-full px-3 py-2 bg-gray-800/40 border rounded-xl text-sm outline-none focus:border-cyan-500/50 ${borderCls}`} />
            </div>
          ))}
        </div>
        {form.selfPaid > 0 && (
          <p className="text-xs text-amber-400 -mt-2 flex items-center gap-1">
            <AlertTriangle size={11} /> You are paying {formatPrice(form.selfPaid)} out-of-pocket.
          </p>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Member</label>
            {(plan?.members.length ?? 0) > 0 ? (
              <select value={form.memberName} onChange={(e) => setField('memberName', e.target.value)}
                className="w-full px-3 py-2 bg-gray-800/40 border border-gray-700/60 rounded-xl text-sm outline-none focus:border-cyan-500/50">
                <option value="">Select member\u2026</option>
                {plan!.members.map((m) => <option key={m.id} value={m.name}>{m.name}</option>)}
              </select>
            ) : (
              <input type="text" placeholder="Member name" value={form.memberName}
                onChange={(e) => setField('memberName', e.target.value)}
                className="w-full px-3 py-2 bg-gray-800/40 border border-gray-700/60 rounded-xl text-sm outline-none focus:border-cyan-500/50" />
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Status</label>
            <select value={form.claimStatus}
              onChange={(e) => setField('claimStatus', e.target.value as MedicalAidClaim['claimStatus'])}
              className="w-full px-3 py-2 bg-gray-800/40 border border-gray-700/60 rounded-xl text-sm outline-none focus:border-cyan-500/50">
              <option value="pending">\u23F3 Pending</option>
              <option value="approved">\u2705 Approved</option>
              <option value="rejected">\u274C Rejected</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Notes</label>
          <textarea rows={2} value={form.notes ?? ''} onChange={(e) => setField('notes', e.target.value)}
            placeholder="Auth code, reference number, remarks\u2026"
            className="w-full px-3 py-2 bg-gray-800/40 border border-gray-700/60 rounded-xl text-sm outline-none focus:border-cyan-500/50 resize-none" />
        </div>
      </div>
    </Modal>
  );
};

export default MedicalAid;
