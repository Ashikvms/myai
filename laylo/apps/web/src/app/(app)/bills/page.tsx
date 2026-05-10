'use client';

/**
 * Bills + Subscriptions — REDESIGN_BRIEF.md §2.2 + §3.1.
 * - viewState toolbar removed.
 * - DOM-class theme toggle removed; theme handled by next-themes globally.
 * - CATEGORY_COLORS gradient table replaced with a flat semantic palette
 *   (single Lucide icon in gold, neutral surface).
 * - Per-card AskAi chip on hover.
 */
import { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  CreditCard,
  DollarSign,
  AlertCircle,
  Calendar,
  Zap,
  Plus,
  X,
  ChevronDown,
  Trash2,
  RefreshCw,
  FileText,
  Home,
  Heart,
  Briefcase,
  Monitor,
  GraduationCap,
  Tv,
} from 'lucide-react';
import { format, addDays, differenceInDays } from 'date-fns';
import { AskAiChip } from '@/components/ai/ask-ai';
import { BeeStanding } from '@/components/illustrations/bee';

// ─── Types ───────────────────────────────────────────────────────────
type ActiveTab = 'bills' | 'subscriptions';
type BillCategory = 'Housing' | 'Utilities' | 'Insurance' | 'Transportation' | 'Other';
type SubCategory = 'Entertainment' | 'Health' | 'Tech' | 'Work' | 'Education' | 'Other';
type Frequency = 'Weekly' | 'Biweekly' | 'Monthly' | 'Quarterly' | 'Annually';

interface Bill {
  id: string;
  name: string;
  category: BillCategory;
  amount: number;
  frequency: Frequency;
  dueDate: string;
  autopay: boolean;
  notes?: string;
}

interface Subscription {
  id: string;
  name: string;
  category: SubCategory;
  amount: number;
  frequency: Frequency;
  renewalDate: string;
  autopay: boolean;
  notes?: string;
}

// ─── Category Icons (single icon, gold accent — no per-category gradient) ───
function getCategoryIcon(category: string): React.ElementType {
  switch (category) {
    case 'Housing': return Home;
    case 'Utilities': return Zap;
    case 'Insurance': return FileText;
    case 'Transportation': return CreditCard;
    case 'Entertainment': return Tv;
    case 'Health': return Heart;
    case 'Tech': return Monitor;
    case 'Work': return Briefcase;
    case 'Education': return GraduationCap;
    default: return CreditCard;
  }
}

// ─── Demo Data ───────────────────────────────────────────────────────
const today = new Date();

const INITIAL_BILLS: Bill[] = [
  { id: 'b1', name: 'Rent', category: 'Housing', amount: 2200, frequency: 'Monthly', dueDate: format(addDays(today, 5), 'yyyy-MM-dd'), autopay: true, notes: 'Apartment 4B' },
  { id: 'b2', name: 'Internet', category: 'Utilities', amount: 79.99, frequency: 'Monthly', dueDate: format(addDays(today, 12), 'yyyy-MM-dd'), autopay: true, notes: 'Fiber 500Mbps' },
  { id: 'b3', name: 'Car Insurance', category: 'Insurance', amount: 185, frequency: 'Monthly', dueDate: format(addDays(today, 8), 'yyyy-MM-dd'), autopay: false, notes: 'Progressive — Honda Civic' },
  { id: 'b4', name: 'Electricity', category: 'Utilities', amount: 142.5, frequency: 'Monthly', dueDate: format(addDays(today, 1), 'yyyy-MM-dd'), autopay: false, notes: 'Variable — check bill' },
  { id: 'b5', name: 'Phone Plan', category: 'Utilities', amount: 55, frequency: 'Monthly', dueDate: format(addDays(today, 18), 'yyyy-MM-dd'), autopay: true, notes: 'T-Mobile Essentials' },
];

const INITIAL_SUBS: Subscription[] = [
  { id: 's1', name: 'Netflix', category: 'Entertainment', amount: 15.99, frequency: 'Monthly', renewalDate: format(addDays(today, 14), 'yyyy-MM-dd'), autopay: true },
  { id: 's2', name: 'Spotify', category: 'Entertainment', amount: 10.99, frequency: 'Monthly', renewalDate: format(addDays(today, 7), 'yyyy-MM-dd'), autopay: true },
  { id: 's3', name: 'Gym Membership', category: 'Health', amount: 49.99, frequency: 'Monthly', renewalDate: format(addDays(today, 3), 'yyyy-MM-dd'), autopay: true, notes: 'LA Fitness' },
  { id: 's4', name: 'iCloud Storage', category: 'Tech', amount: 2.99, frequency: 'Monthly', renewalDate: format(addDays(today, 20), 'yyyy-MM-dd'), autopay: true, notes: '200GB' },
  { id: 's5', name: 'ChatGPT Plus', category: 'Tech', amount: 20, frequency: 'Monthly', renewalDate: format(addDays(today, 11), 'yyyy-MM-dd'), autopay: true },
  { id: 's6', name: 'Adobe Creative Cloud', category: 'Work', amount: 54.99, frequency: 'Monthly', renewalDate: format(addDays(today, 22), 'yyyy-MM-dd'), autopay: true, notes: 'Consider downgrading' },
];

// ─── Helpers ─────────────────────────────────────────────────────────
function getDaysUntil(dateStr: string): number {
  return differenceInDays(new Date(dateStr), today);
}
function getDueDateLabel(dateStr: string): string {
  const days = getDaysUntil(dateStr);
  if (days <= 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  return `Due in ${days} days`;
}
function getRenewalLabel(dateStr: string): string {
  const days = getDaysUntil(dateStr);
  if (days <= 0) return 'Renews today';
  if (days === 1) return 'Renews tomorrow';
  return `Renews in ${days} days`;
}

// ─── Bill Card ───────────────────────────────────────────────────────
function BillCard({
  bill,
  index,
  onDelete,
}: {
  bill: Bill;
  index: number;
  onDelete: (id: string) => void;
}) {
  const reduce = useReducedMotion();
  const [expanded, setExpanded] = useState(false);
  const Icon = getCategoryIcon(bill.category);
  const daysUntil = getDaysUntil(bill.dueDate);
  const isDueSoon = daysUntil <= 3;

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ delay: index * 0.04, duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
      whileHover={reduce ? undefined : { y: -2 }}
      onClick={() => setExpanded(!expanded)}
      className={`group relative rounded-[16px] bg-[var(--color-surface)] border cursor-pointer transition-all hover:shadow-pop ${
        isDueSoon ? 'border-[var(--color-accent)]' : 'border-[var(--color-border)]'
      }`}
    >
      <div className="p-6">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-[8px] bg-[var(--color-surface-2)] flex items-center justify-center flex-shrink-0">
            <Icon className="w-5 h-5 text-[var(--color-accent)]" strokeWidth={1.75} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-[16px] leading-[22px] font-semibold text-[var(--color-text)] truncate">
                {bill.name}
              </h3>
              <span className="text-[11px] leading-[14px] font-semibold uppercase tracking-wider px-2 py-1 rounded-[8px] bg-[var(--color-surface-2)] text-[var(--color-text-muted)]">
                {bill.category}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="text-[13px] leading-[18px] font-medium px-2 py-1 rounded-[8px] bg-[var(--color-surface-2)] text-[var(--color-text-muted)]">
                {bill.frequency}
              </span>
              <span className="text-[13px] leading-[18px] font-medium px-2 py-1 rounded-[8px] bg-[var(--color-surface-2)] text-[var(--color-text-muted)] flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" strokeWidth={1.75} />
                {getDueDateLabel(bill.dueDate)}
              </span>
              {bill.autopay ? (
                <span className="text-[13px] leading-[18px] font-medium px-2 py-1 rounded-[8px] bg-[var(--color-surface-2)] text-[var(--color-success)] flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5" strokeWidth={1.75} />
                  Autopay
                </span>
              ) : (
                <span className="text-[13px] leading-[18px] font-medium px-2 py-1 rounded-[8px] bg-[var(--color-surface-2)] text-[var(--color-warning)]">
                  Manual
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            <p className="text-[22px] leading-[28px] font-semibold tabular-nums text-[var(--color-text)]">
              ${bill.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown className="w-4 h-4 text-[var(--color-text-subtle)]" strokeWidth={1.75} />
            </motion.div>
          </div>
          <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <AskAiChip prompt="Why did this go up?" context={`Bill: ${bill.name}, $${bill.amount}`} iconOnly label="Ask Laylo" />
          </div>
        </div>
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="overflow-hidden"
            >
              <div className="pt-4 mt-4 border-t border-[var(--color-border)]">
                {bill.notes && (
                  <p className="text-[13px] leading-[18px] text-[var(--color-text-muted)] mb-3">
                    <span className="font-medium text-[var(--color-text)]">Notes:</span> {bill.notes}
                  </p>
                )}
                <p className="text-[13px] leading-[18px] text-[var(--color-text-subtle)] mb-4">
                  Next due: {format(new Date(bill.dueDate), 'EEEE, MMMM d, yyyy')}
                </p>
                <div className="flex items-center gap-3">
                  <AskAiChip prompt="Why did this go up?" context={`Bill: ${bill.name}, $${bill.amount}`} />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(bill.id);
                    }}
                    className="flex items-center gap-1.5 text-[13px] leading-[18px] font-medium text-[var(--color-danger)] px-2 py-1 rounded-[8px] hover:bg-[var(--color-surface-hover)] transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
                    Delete
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ─── Subscription Card ───────────────────────────────────────────────
function SubscriptionCard({
  sub,
  index,
  onDelete,
}: {
  sub: Subscription;
  index: number;
  onDelete: (id: string) => void;
}) {
  const reduce = useReducedMotion();
  const [expanded, setExpanded] = useState(false);
  const Icon = getCategoryIcon(sub.category);
  const daysUntil = getDaysUntil(sub.renewalDate);
  const isRenewingSoon = daysUntil <= 3;

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ delay: index * 0.04, duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
      whileHover={reduce ? undefined : { y: -2 }}
      onClick={() => setExpanded(!expanded)}
      className={`group relative rounded-[16px] bg-[var(--color-surface)] border cursor-pointer transition-all hover:shadow-pop ${
        isRenewingSoon ? 'border-[var(--color-accent)]' : 'border-[var(--color-border)]'
      }`}
    >
      <div className="p-6">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-[8px] bg-[var(--color-surface-2)] flex items-center justify-center flex-shrink-0">
            <Icon className="w-5 h-5 text-[var(--color-accent)]" strokeWidth={1.75} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-[16px] leading-[22px] font-semibold text-[var(--color-text)] truncate">{sub.name}</h3>
              <span className="text-[11px] leading-[14px] font-semibold uppercase tracking-wider px-2 py-1 rounded-[8px] bg-[var(--color-surface-2)] text-[var(--color-text-muted)]">
                {sub.category}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="text-[13px] leading-[18px] font-medium px-2 py-1 rounded-[8px] bg-[var(--color-surface-2)] text-[var(--color-text-muted)]">
                {sub.frequency}
              </span>
              <span className="text-[13px] leading-[18px] font-medium px-2 py-1 rounded-[8px] bg-[var(--color-surface-2)] text-[var(--color-text-muted)] flex items-center gap-1">
                <RefreshCw className="w-3.5 h-3.5" strokeWidth={1.75} />
                {getRenewalLabel(sub.renewalDate)}
              </span>
              {sub.autopay && (
                <span className="text-[13px] leading-[18px] font-medium px-2 py-1 rounded-[8px] bg-[var(--color-surface-2)] text-[var(--color-success)] flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5" strokeWidth={1.75} />
                  Autopay
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            <p className="text-[22px] leading-[28px] font-semibold tabular-nums text-[var(--color-text)]">
              ${sub.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown className="w-4 h-4 text-[var(--color-text-subtle)]" strokeWidth={1.75} />
            </motion.div>
          </div>
          <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <AskAiChip prompt="Worth keeping?" context={`Subscription: ${sub.name}, $${sub.amount}/${sub.frequency}`} iconOnly label="Ask Laylo" />
          </div>
        </div>
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="overflow-hidden"
            >
              <div className="pt-4 mt-4 border-t border-[var(--color-border)]">
                {sub.notes && (
                  <p className="text-[13px] leading-[18px] text-[var(--color-text-muted)] mb-3">
                    <span className="font-medium text-[var(--color-text)]">Notes:</span> {sub.notes}
                  </p>
                )}
                <p className="text-[13px] leading-[18px] text-[var(--color-text-subtle)] mb-4">
                  Next renewal: {format(new Date(sub.renewalDate), 'EEEE, MMMM d, yyyy')}
                </p>
                <div className="flex items-center gap-3">
                  <AskAiChip prompt="Worth keeping?" context={`Subscription: ${sub.name}`} />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(sub.id);
                    }}
                    className="flex items-center gap-1.5 text-[13px] leading-[18px] font-medium text-[var(--color-danger)] px-2 py-1 rounded-[8px] hover:bg-[var(--color-surface-hover)] transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
                    Delete
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ─── Add Bill Modal ──────────────────────────────────────────────────
function AddBillModal({
  open,
  onClose,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (bill: Bill) => void;
}) {
  const reduce = useReducedMotion();
  const [name, setName] = useState('');
  const [category, setCategory] = useState<BillCategory>('Utilities');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState<Frequency>('Monthly');
  const [dueDate, setDueDate] = useState(format(addDays(today, 7), 'yyyy-MM-dd'));
  const [autopay, setAutopay] = useState(false);
  const [notes, setNotes] = useState('');

  const handleSubmit = () => {
    if (!name || !amount) return;
    onAdd({
      id: `b-${Date.now()}`,
      name,
      category,
      amount: parseFloat(amount),
      frequency,
      dueDate,
      autopay,
      notes: notes || undefined,
    });
    setName('');
    setAmount('');
    setNotes('');
    onClose();
  };

  const billCategories: BillCategory[] = ['Housing', 'Utilities', 'Insurance', 'Transportation', 'Other'];
  const frequencies: Frequency[] = ['Weekly', 'Biweekly', 'Monthly', 'Quarterly', 'Annually'];

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.15 }}
            className="fixed inset-0 z-50 bg-[var(--color-overlay)] backdrop-blur-sm"
            onClick={onClose}
          />
          <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pointer-events-none">
            <motion.div
              initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: reduce ? 0 : 0.22, ease: [0.4, 0, 0.2, 1] }}
              className="relative mt-[8vh] w-full max-w-[640px] max-h-[85vh] overflow-y-auto bg-[var(--color-surface)] rounded-[16px] border border-[var(--color-border-strong)] shadow-lg pointer-events-auto"
              role="dialog"
              aria-modal="true"
            >
              <div className="flex items-center justify-between p-6 border-b border-[var(--color-border)]">
                <h3 className="text-[22px] leading-[28px] font-semibold text-[var(--color-text)]">Add Bill</h3>
                <button
                  onClick={onClose}
                  className="p-1 rounded-[8px] text-[var(--color-text-subtle)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)] transition-colors"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" strokeWidth={1.75} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <Field label="Bill Name">
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Electric Bill" className={inputClass} />
                </Field>
                <Field label="Category">
                  <select value={category} onChange={(e) => setCategory(e.target.value as BillCategory)} className={inputClass}>
                    {billCategories.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Amount ($)">
                    <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className={inputClass} />
                  </Field>
                  <Field label="Frequency">
                    <select value={frequency} onChange={(e) => setFrequency(e.target.value as Frequency)} className={inputClass}>
                      {frequencies.map((f) => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </Field>
                </div>
                <Field label="Next Due Date">
                  <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputClass} />
                </Field>
                <div className="flex items-center justify-between">
                  <label className="text-[13px] leading-[18px] font-medium text-[var(--color-text-muted)]">Autopay</label>
                  <button
                    type="button"
                    onClick={() => setAutopay(!autopay)}
                    aria-pressed={autopay}
                    className={`relative w-11 h-6 rounded-full transition-colors ${
                      autopay ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-surface-2)]'
                    }`}
                  >
                    <motion.div
                      animate={{ x: autopay ? 22 : 2 }}
                      transition={{ duration: 0.15 }}
                      className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm"
                    />
                  </button>
                </div>
                <Field label="Notes (optional)">
                  <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any additional details…" className={inputClass} />
                </Field>
              </div>
              <div className="p-6 border-t border-[var(--color-border)] flex justify-end gap-3">
                <button onClick={onClose} className="px-4 h-10 rounded-[16px] text-[15px] font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] transition-colors">
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!name || !amount}
                  className="px-4 h-10 rounded-[16px] bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[15px] font-medium text-[var(--color-text-on-accent)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add Bill
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Add Subscription Modal ──────────────────────────────────────────
function AddSubModal({
  open,
  onClose,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (sub: Subscription) => void;
}) {
  const reduce = useReducedMotion();
  const [name, setName] = useState('');
  const [category, setCategory] = useState<SubCategory>('Entertainment');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState<Frequency>('Monthly');
  const [renewalDate, setRenewalDate] = useState(format(addDays(today, 30), 'yyyy-MM-dd'));
  const [autopay, setAutopay] = useState(true);
  const [notes, setNotes] = useState('');

  const handleSubmit = () => {
    if (!name || !amount) return;
    onAdd({
      id: `s-${Date.now()}`,
      name,
      category,
      amount: parseFloat(amount),
      frequency,
      renewalDate,
      autopay,
      notes: notes || undefined,
    });
    setName('');
    setAmount('');
    setNotes('');
    onClose();
  };

  const subCategories: SubCategory[] = ['Entertainment', 'Health', 'Tech', 'Work', 'Education', 'Other'];
  const frequencies: Frequency[] = ['Weekly', 'Biweekly', 'Monthly', 'Quarterly', 'Annually'];

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.15 }}
            className="fixed inset-0 z-50 bg-[var(--color-overlay)] backdrop-blur-sm"
            onClick={onClose}
          />
          <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pointer-events-none">
            <motion.div
              initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: reduce ? 0 : 0.22, ease: [0.4, 0, 0.2, 1] }}
              className="relative mt-[8vh] w-full max-w-[640px] max-h-[85vh] overflow-y-auto bg-[var(--color-surface)] rounded-[16px] border border-[var(--color-border-strong)] shadow-lg pointer-events-auto"
              role="dialog"
              aria-modal="true"
            >
              <div className="flex items-center justify-between p-6 border-b border-[var(--color-border)]">
                <h3 className="text-[22px] leading-[28px] font-semibold text-[var(--color-text)]">Add Subscription</h3>
                <button onClick={onClose} className="p-1 rounded-[8px] text-[var(--color-text-subtle)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)] transition-colors" aria-label="Close">
                  <X className="w-4 h-4" strokeWidth={1.75} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <Field label="Subscription Name">
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Netflix" className={inputClass} />
                </Field>
                <Field label="Category">
                  <select value={category} onChange={(e) => setCategory(e.target.value as SubCategory)} className={inputClass}>
                    {subCategories.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Amount ($)">
                    <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className={inputClass} />
                  </Field>
                  <Field label="Frequency">
                    <select value={frequency} onChange={(e) => setFrequency(e.target.value as Frequency)} className={inputClass}>
                      {frequencies.map((f) => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </Field>
                </div>
                <Field label="Next Renewal Date">
                  <input type="date" value={renewalDate} onChange={(e) => setRenewalDate(e.target.value)} className={inputClass} />
                </Field>
                <div className="flex items-center justify-between">
                  <label className="text-[13px] leading-[18px] font-medium text-[var(--color-text-muted)]">Autopay</label>
                  <button
                    type="button"
                    onClick={() => setAutopay(!autopay)}
                    aria-pressed={autopay}
                    className={`relative w-11 h-6 rounded-full transition-colors ${
                      autopay ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-surface-2)]'
                    }`}
                  >
                    <motion.div
                      animate={{ x: autopay ? 22 : 2 }}
                      transition={{ duration: 0.15 }}
                      className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm"
                    />
                  </button>
                </div>
                <Field label="Notes (optional)">
                  <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any additional details…" className={inputClass} />
                </Field>
              </div>
              <div className="p-6 border-t border-[var(--color-border)] flex justify-end gap-3">
                <button onClick={onClose} className="px-4 h-10 rounded-[16px] text-[15px] font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] transition-colors">
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!name || !amount}
                  className="px-4 h-10 rounded-[16px] bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[15px] font-medium text-[var(--color-text-on-accent)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add Subscription
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

const inputClass =
  'w-full px-3 py-2.5 rounded-[8px] bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[15px] leading-[22px] text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] focus:outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/25';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[13px] leading-[18px] font-medium text-[var(--color-text-muted)] mb-1.5">{label}</label>
      {children}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────
export default function BillsPage() {
  const reduce = useReducedMotion();
  const [activeTab, setActiveTab] = useState<ActiveTab>('bills');
  const [bills, setBills] = useState<Bill[]>(INITIAL_BILLS);
  const [subs, setSubs] = useState<Subscription[]>(INITIAL_SUBS);
  const [showAddBill, setShowAddBill] = useState(false);
  const [showAddSub, setShowAddSub] = useState(false);

  const monthlyBillsTotal = bills.reduce((sum, b) => sum + b.amount, 0);
  const monthlySubsTotal = subs.reduce((sum, s) => sum + s.amount, 0);
  const dueThisWeekCount =
    bills.filter((b) => getDaysUntil(b.dueDate) <= 7 && getDaysUntil(b.dueDate) >= 0).length +
    subs.filter((s) => getDaysUntil(s.renewalDate) <= 7 && getDaysUntil(s.renewalDate) >= 0).length;

  const deleteBill = (id: string) => setBills((prev) => prev.filter((b) => b.id !== id));
  const deleteSub = (id: string) => setSubs((prev) => prev.filter((s) => s.id !== id));
  const addBill = (bill: Bill) => setBills((prev) => [...prev, bill]);
  const addSub = (sub: Subscription) => setSubs((prev) => [...prev, sub]);

  return (
    <div className="max-w-[960px] mx-auto">
      <header className="mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[8px] bg-[var(--color-surface-2)] flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-[var(--color-accent)]" strokeWidth={1.75} />
          </div>
          <div>
            <h1 className="text-[32px] leading-[40px] font-bold text-[var(--color-text)]">Money</h1>
            <p className="text-[15px] leading-[22px] text-[var(--color-text-muted)] mt-1">
              ${(monthlyBillsTotal + monthlySubsTotal).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} combined monthly spend
            </p>
          </div>
        </div>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        {[
          { label: 'Monthly Bills', value: `$${monthlyBillsTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, icon: DollarSign },
          { label: 'Monthly Subs', value: `$${monthlySubsTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, icon: RefreshCw },
          { label: 'Due This Week', value: `${dueThisWeekCount} items`, icon: AlertCircle, accent: true },
        ].map((stat) => (
          <div key={stat.label} className="rounded-[16px] bg-[var(--color-surface)] border border-[var(--color-border)] p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[8px] bg-[var(--color-surface-2)] flex items-center justify-center flex-shrink-0">
                <stat.icon className="w-5 h-5 text-[var(--color-text-muted)]" strokeWidth={1.75} />
              </div>
              <div>
                <p className="text-[11px] leading-[14px] font-semibold uppercase tracking-wider text-[var(--color-text-subtle)]">{stat.label}</p>
                <p className={`text-[22px] leading-[28px] font-semibold mt-1 tabular-nums ${stat.accent ? 'text-[var(--color-accent)]' : 'text-[var(--color-text)]'}`}>{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tab Toggle */}
      <div className="flex justify-center mb-6">
        <div className="inline-flex bg-[var(--color-surface-2)] rounded-[16px] p-1 gap-1">
          {(['bills', 'subscriptions'] as ActiveTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`relative px-5 py-2 rounded-[16px] text-[13px] leading-[18px] font-medium transition-colors ${
                activeTab === tab ? 'text-[var(--color-text-on-accent)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
              }`}
            >
              {activeTab === tab && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-[var(--color-accent)] rounded-[16px]"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10 capitalize">
                {tab === 'bills' ? `Bills (${bills.length})` : `Subscriptions (${subs.length})`}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'bills' ? (
          <motion.div
            key="bills"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <div className="flex justify-end mb-4">
              <button
                onClick={() => setShowAddBill(true)}
                className="flex items-center gap-2 px-4 h-10 rounded-[16px] bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[15px] font-medium text-[var(--color-text-on-accent)] transition-colors"
              >
                <Plus className="w-4 h-4" strokeWidth={1.75} />
                Add Bill
              </button>
            </div>
            {bills.length === 0 ? (
              <EmptyHive
                title="Nothing buzzing here yet — add your first bill"
                description="Track your recurring bills to see what's due, what's paid, and what to plan for."
                primary={{ label: 'Add Your First Bill', onClick: () => setShowAddBill(true) }}
              />
            ) : (
              <div className="space-y-3">
                <AnimatePresence>
                  {bills.map((bill, i) => (
                    <BillCard key={bill.id} bill={bill} index={i} onDelete={deleteBill} />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="subscriptions"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <div className="flex justify-end mb-4">
              <button
                onClick={() => setShowAddSub(true)}
                className="flex items-center gap-2 px-4 h-10 rounded-[16px] bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[15px] font-medium text-[var(--color-text-on-accent)] transition-colors"
              >
                <Plus className="w-4 h-4" strokeWidth={1.75} />
                Add Subscription
              </button>
            </div>
            {subs.length === 0 ? (
              <EmptyHive
                title="No subs swarming yet"
                description="Track streaming, software, and memberships in one place."
                primary={{ label: 'Add Your First Subscription', onClick: () => setShowAddSub(true) }}
              />
            ) : (
              <div className="space-y-3">
                <AnimatePresence>
                  {subs.map((sub, i) => (
                    <SubscriptionCard key={sub.id} sub={sub} index={i} onDelete={deleteSub} />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AddBillModal open={showAddBill} onClose={() => setShowAddBill(false)} onAdd={addBill} />
      <AddSubModal open={showAddSub} onClose={() => setShowAddSub(false)} onAdd={addSub} />
    </div>
  );
}

function EmptyHive({
  title,
  description,
  primary,
}: {
  title: string;
  description: string;
  primary: { label: string; onClick: () => void };
}) {
  return (
    <div className="rounded-[16px] bg-[var(--color-surface)] border border-[var(--color-border)] p-12 flex flex-col items-center text-center">
      <BeeStanding size={96} />
      <h3 className="mt-4 text-[16px] leading-[22px] font-semibold text-[var(--color-text)]">{title}</h3>
      <p className="mt-2 max-w-md text-[15px] leading-[22px] text-[var(--color-text-muted)]">{description}</p>
      <div className="mt-6 flex flex-col sm:flex-row items-center gap-3">
        <button
          onClick={primary.onClick}
          className="px-4 h-10 rounded-[16px] bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[15px] font-medium text-[var(--color-text-on-accent)] transition-colors"
        >
          {primary.label}
        </button>
        <AskAiChip prompt="Help me add my first bill" label="Ask Laylo to add something" />
      </div>
    </div>
  );
}
