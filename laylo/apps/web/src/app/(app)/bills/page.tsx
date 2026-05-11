'use client';

/**
 * Bills + Subscriptions — Origami Card with Hive Header (LAYOUT_REDESIGN_BRIEF §2.2).
 *
 * Bills tab: Hive Header (hex pip per bill) + 2-col Origami Card grid.
 *   On Mark-Paid: gold sweep (kept) → origami fold (rotateX 90deg from top) →
 *   card docks into the visible "Paid this month" expander at the bottom.
 *
 * Subs tab: Story Strip — horizontally scrollable tiles + vertical compact list.
 */
import { useState, useMemo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  CreditCard,
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
  CheckCircle2,
} from 'lucide-react';
import { format, addDays, differenceInDays } from 'date-fns';
import { AskAiChip } from '@/components/ai/ask-ai';
import { BeeStanding } from '@/components/illustrations/bee';
import { MotionButton } from '@/components/motion/motion-button';
import { HiveHeader, type HivePip } from '@/components/layout/hive-header';
import { HexFrame } from '@/components/layout/hex-frame';
import { HoneycombPattern } from '@/components/illustrations/honeycomb-pattern';
import { useMilestoneTracker } from '@/components/celebrations/milestone-toast';
import { AmbientBees } from '@/components/motion/ambient-bees';

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
  paid?: boolean;
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

// ─── Category Icons ───────────────────────────────────────────────────
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
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  return `Due in ${days} days`;
}

// ─── Origami Bill Card ───────────────────────────────────────────────
function BillCard({
  bill,
  onDelete,
  onPay,
  paying,
}: {
  bill: Bill;
  onDelete: (id: string) => void;
  onPay: (id: string) => void;
  paying: boolean;
}) {
  const reduce = useReducedMotion();
  const [expanded, setExpanded] = useState(false);
  const Icon = getCategoryIcon(bill.category);
  const daysUntil = getDaysUntil(bill.dueDate);
  const isDueSoon = daysUntil <= 3 && daysUntil >= 0;
  const isOverdue = daysUntil < 0;

  // Origami fold state — when paying, card folds top-down off the page.
  const foldAnim = paying && !reduce
    ? { rotateX: 90, opacity: 0 }
    : { rotateX: 0, opacity: 1 };

  return (
    <motion.div
      layout
      animate={foldAnim}
      transition={
        paying
          ? { duration: 0.38, ease: [0.4, 0, 0.6, 0.2], delay: 0.3 }
          : { duration: 0.2 }
      }
      style={{
        transformOrigin: 'top center',
        transformStyle: 'preserve-3d',
        perspective: 1000,
      }}
      className="relative"
    >
      <motion.div
        whileHover={reduce ? undefined : { y: -2, rotate: 1.5, scale: 1.01 }}
        transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
        onClick={() => setExpanded(!expanded)}
        className={`group relative rounded-[16px] bg-[var(--color-surface)] border cursor-pointer transition-shadow hover:shadow-pop overflow-hidden ${
          isOverdue
            ? 'border-[var(--color-danger)]'
            : isDueSoon
            ? 'border-[var(--color-accent)]'
            : 'border-[var(--color-border)]'
        }`}
      >
        {/* Gold sweep on Mark-Paid + floating coin (KEPT per brief §5) */}
        {paying && !reduce && (
          <>
            <motion.div
              aria-hidden="true"
              initial={{ x: '-110%', opacity: 0 }}
              animate={{ x: '110%', opacity: [0, 0.7, 0] }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  'linear-gradient(90deg, transparent 0%, rgba(255,215,0,0.45) 50%, transparent 100%)',
              }}
            />
            <motion.span
              aria-hidden="true"
              initial={{ y: 0, opacity: 0, scale: 0.8 }}
              animate={{ y: -32, opacity: [0, 1, 1, 0], scale: 1 }}
              transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
              className="pointer-events-none absolute right-6 top-6 text-[18px] z-10"
            >
              🪙
            </motion.span>
          </>
        )}
        <div className="p-5">
          <div className="flex items-start gap-4">
            <HexFrame size={40} className="flex-shrink-0">
              <Icon className="w-5 h-5 text-[var(--color-accent)]" strokeWidth={1.75} />
            </HexFrame>
            <div className="flex-1 min-w-0">
              <h3 className="text-[16px] leading-[22px] font-semibold text-[var(--color-text)] truncate">
                {bill.name}
              </h3>
              <p className="text-[13px] leading-[18px] text-[var(--color-text-muted)] mt-0.5">
                {bill.category} · {bill.frequency}
              </p>
              <div className="flex items-end justify-between mt-3">
                <p className="text-[22px] leading-[28px] font-semibold tabular-nums text-[var(--color-text)]">
                  ${bill.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <span
                  className={`text-[11px] leading-[14px] font-medium px-2 py-1 rounded-[8px] flex items-center gap-1 ${
                    isOverdue
                      ? 'bg-[var(--color-danger)]/10 text-[var(--color-danger)]'
                      : isDueSoon
                      ? 'bg-[var(--color-accent-soft)] text-[var(--color-accent-dim)]'
                      : 'bg-[var(--color-surface-2)] text-[var(--color-text-muted)]'
                  }`}
                >
                  <Calendar className="w-3 h-3" strokeWidth={1.75} />
                  {getDueDateLabel(bill.dueDate)}
                </span>
              </div>
              {bill.autopay && (
                <span className="inline-flex items-center gap-1 mt-2 text-[11px] leading-[14px] font-medium text-[var(--color-success)]">
                  <Zap className="w-3 h-3" strokeWidth={1.75} />
                  Autopay
                </span>
              )}
            </div>
            <motion.div
              animate={{ rotate: expanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="flex-shrink-0"
            >
              <ChevronDown className="w-4 h-4 text-[var(--color-text-subtle)]" strokeWidth={1.75} />
            </motion.div>
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
                  <div className="flex flex-wrap items-center gap-2">
                    <AskAiChip prompt="Why did this go up?" context={`Bill: ${bill.name}, $${bill.amount}`} />
                    <MotionButton
                      onClick={(e) => {
                        e.stopPropagation();
                        onPay(bill.id);
                      }}
                      className="flex items-center gap-1.5 text-[13px] leading-[18px] font-medium text-[var(--color-text-on-accent)] bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] px-3 py-1.5 rounded-[8px] transition-colors"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={1.75} />
                      Mark paid
                    </MotionButton>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(bill.id);
                      }}
                      className="ml-auto flex items-center gap-1.5 text-[13px] leading-[18px] font-medium text-[var(--color-danger)] px-2 py-1 rounded-[8px] hover:bg-[var(--color-surface-hover)] transition-colors"
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
    </motion.div>
  );
}

// ─── Subscription Story Strip Tile ──────────────────────────────────
function SubscriptionTile({ sub }: { sub: Subscription }) {
  const reduce = useReducedMotion();
  const Icon = getCategoryIcon(sub.category);
  const daysUntil = getDaysUntil(sub.renewalDate);
  // Renewal countdown ring — assume 30-day cycle for visual; clockwise drain.
  const cyclePct = Math.max(0, Math.min(1, daysUntil / 30));
  const circumference = 2 * Math.PI * 38;
  const dashOffset = circumference * (1 - cyclePct);

  return (
    <motion.div
      whileHover={reduce ? undefined : { y: -2, scale: 1.02 }}
      transition={{ duration: 0.2 }}
      className="relative flex-shrink-0 w-[200px] h-[160px] rounded-[16px] bg-[var(--color-surface)] border border-[var(--color-border)] p-4 hover:shadow-pop transition-shadow snap-start"
    >
      <svg
        aria-hidden="true"
        className="absolute top-3 right-3 -rotate-90"
        width={48}
        height={48}
        viewBox="0 0 80 80"
      >
        <circle
          cx={40}
          cy={40}
          r={38}
          stroke="var(--color-border)"
          strokeWidth={3}
          fill="none"
        />
        <circle
          cx={40}
          cy={40}
          r={38}
          stroke="var(--color-accent)"
          strokeWidth={3}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
        />
      </svg>
      <div className="flex items-center gap-2 mb-3">
        <HexFrame size={32}>
          <Icon className="w-4 h-4 text-[var(--color-accent)]" strokeWidth={1.75} />
        </HexFrame>
      </div>
      <h3 className="text-[18px] leading-[22px] font-semibold text-[var(--color-text)] truncate">
        {sub.name}
      </h3>
      <p className="text-[13px] leading-[18px] text-[var(--color-text-muted)] mt-1">
        ${sub.amount.toFixed(2)}/{sub.frequency.toLowerCase().slice(0, 2)}
      </p>
      <p className="text-[11px] leading-[14px] font-medium text-[var(--color-accent-dim)] mt-2 absolute bottom-4 left-4">
        Renews in {daysUntil}d
      </p>
    </motion.div>
  );
}

function SubscriptionRow({ sub, onDelete }: { sub: Subscription; onDelete: (id: string) => void }) {
  const Icon = getCategoryIcon(sub.category);
  const daysUntil = getDaysUntil(sub.renewalDate);
  return (
    <div className="group flex items-center gap-4 p-4 rounded-[16px] bg-[var(--color-surface)] border border-[var(--color-border)] hover:shadow-pop transition-shadow">
      <HexFrame size={36} className="flex-shrink-0">
        <Icon className="w-4 h-4 text-[var(--color-accent)]" strokeWidth={1.75} />
      </HexFrame>
      <div className="flex-1 min-w-0">
        <p className="text-[15px] leading-[22px] font-semibold text-[var(--color-text)]">{sub.name}</p>
        <p className="text-[13px] leading-[18px] text-[var(--color-text-muted)]">
          {sub.category} · renews in {daysUntil}d
        </p>
      </div>
      <p className="text-[16px] leading-[22px] font-semibold tabular-nums text-[var(--color-text)]">
        ${sub.amount.toFixed(2)}
      </p>
      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
        <AskAiChip prompt="Worth keeping?" context={`Sub: ${sub.name}`} iconOnly label="Ask" />
        <button
          onClick={() => onDelete(sub.id)}
          aria-label="Delete"
          className="p-1.5 rounded-[8px] text-[var(--color-text-subtle)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-danger)] transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
        </button>
      </div>
    </div>
  );
}

// ─── Add Bill / Sub Modals (unchanged shape) ──────────────────────────
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
                <MotionButton
                  onClick={handleSubmit}
                  disabled={!name || !amount}
                  className="px-4 h-10 rounded-[16px] bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[15px] font-medium text-[var(--color-text-on-accent)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add it to the hive
                </MotionButton>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

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
                <MotionButton
                  onClick={handleSubmit}
                  disabled={!name || !amount}
                  className="px-4 h-10 rounded-[16px] bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[15px] font-medium text-[var(--color-text-on-accent)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add it to the hive
                </MotionButton>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
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
  const [paidExpanded, setPaidExpanded] = useState(true);
  // Bill currently mid-pay-animation. Used for the gold sweep + coin float + fold.
  const [payingBillId, setPayingBillId] = useState<string | null>(null);

  const activeBills = useMemo(() => bills.filter((b) => !b.paid), [bills]);
  const paidBills = useMemo(() => bills.filter((b) => b.paid), [bills]);

  const monthlyBillsTotal = useMemo(
    () => bills.reduce((sum, b) => sum + b.amount, 0),
    [bills],
  );
  const monthlySubsTotal = useMemo(
    () => subs.reduce((sum, s) => sum + s.amount, 0),
    [subs],
  );

  // Hive Header pips — one per active bill.
  const hivePips: HivePip[] = useMemo(
    () =>
      activeBills.map((b) => {
        const days = getDaysUntil(b.dueDate);
        const status = days < 0 ? 'overdue' : days <= 3 ? 'due' : 'due';
        return {
          id: b.id,
          status,
          label: `${b.name} · ${getDueDateLabel(b.dueDate)}`,
        } satisfies HivePip;
      }),
    [activeBills],
  );

  const allPaid = activeBills.length === 0 && bills.length > 0;

  // Milestone — fired when 3+ bills paid this session.
  useMilestoneTracker(
    'bills_paid',
    3,
    paidBills.length,
    `${paidBills.length} bills paid this month. Look at you go.`,
  );

  const deleteBill = (id: string) => setBills((prev) => prev.filter((b) => b.id !== id));
  const deleteSub = (id: string) => setSubs((prev) => prev.filter((s) => s.id !== id));
  const addBill = (bill: Bill) => setBills((prev) => [...prev, bill]);
  const addSub = (sub: Subscription) => setSubs((prev) => [...prev, sub]);
  const payBill = (id: string) => {
    setPayingBillId(id);
    // 700ms after the fold finishes, mark the bill paid + dock it.
    window.setTimeout(() => {
      setBills((prev) =>
        prev.map((b) => (b.id === id ? { ...b, paid: true } : b)),
      );
      setPayingBillId(null);
    }, 800);
  };

  return (
    <div className="relative max-w-[1024px] mx-auto">
      {/* Hive theme — subtle honeycomb wash behind the bills page */}
      <HoneycombPattern opacity={0.04} />
      <header className="relative mb-6 overflow-hidden">
        {/* Ambient bees over the hero band only — bills feel alive */}
        <AmbientBees count={2} speed="slow" />
        <div className="relative flex items-center gap-3">
          <HexFrame size={40}>
            <CreditCard className="w-5 h-5 text-[var(--color-accent)]" strokeWidth={1.75} />
          </HexFrame>
          <div>
            <h1 className="text-[32px] leading-[40px] font-bold text-[var(--color-text)]">Bills &amp; Subs</h1>
            <p className="text-[15px] leading-[22px] text-[var(--color-text-muted)] mt-1 tabular-nums">
              ${(monthlyBillsTotal + monthlySubsTotal).toLocaleString('en-US', { minimumFractionDigits: 2 })} / month — {bills.length} bills, {subs.length} subs
            </p>
          </div>
        </div>
      </header>

      {/* Hive Header — answers "how much is left this month?" visually */}
      {activeTab === 'bills' && hivePips.length > 0 && (
        <HiveHeader pips={hivePips} allPaid={allPaid} />
      )}
      {/* Page-level gold wash on all-paid */}
      {allPaid && !reduce && (
        <motion.div
          aria-hidden="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.4, 0] }}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
          className="pointer-events-none fixed inset-0 z-[60]"
          style={{
            background:
              'radial-gradient(circle at 50% 30%, rgba(255,215,0,0.35) 0%, rgba(255,215,0,0) 60%)',
          }}
        />
      )}

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
                {tab === 'bills' ? `Bills (${activeBills.length})` : `Subscriptions (${subs.length})`}
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
              <MotionButton
                onClick={() => setShowAddBill(true)}
                className="flex items-center gap-2 px-4 h-10 rounded-[16px] bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[15px] font-medium text-[var(--color-text-on-accent)] transition-colors"
              >
                <Plus className="w-4 h-4" strokeWidth={1.75} />
                Add Bill
              </MotionButton>
            </div>
            {activeBills.length === 0 && paidBills.length === 0 ? (
              <EmptyHive
                title="Nothing buzzing here yet — add your first bill"
                description="Track your recurring bills to see what's due, what's paid, and what to plan for."
                primary={{ label: 'Add Your First Bill', onClick: () => setShowAddBill(true) }}
              />
            ) : (
              <>
                {/* Origami 2-col grid */}
                <motion.div layout className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <AnimatePresence>
                    {activeBills.map((bill) => (
                      <BillCard
                        key={bill.id}
                        bill={bill}
                        onDelete={deleteBill}
                        onPay={payBill}
                        paying={payingBillId === bill.id}
                      />
                    ))}
                  </AnimatePresence>
                </motion.div>
                {activeBills.length === 0 && paidBills.length > 0 && (
                  <div className="rounded-[16px] bg-[var(--color-surface)] border border-[var(--color-border)] p-12 flex flex-col items-center text-center mt-4">
                    <BeeStanding size={72} />
                    <h3 className="mt-3 text-[16px] leading-[22px] font-semibold text-[var(--color-text)]">
                      All caught up. The hive is humming.
                    </h3>
                  </div>
                )}

                {/* Paid this month — VISIBLE, collapsed by default per design risk-flag */}
                {paidBills.length > 0 && (
                  <div className="mt-6 rounded-[16px] bg-[var(--color-surface-2)] border border-[var(--color-border)]">
                    <button
                      onClick={() => setPaidExpanded(!paidExpanded)}
                      className="w-full flex items-center justify-between px-5 py-3 text-left"
                    >
                      <span className="text-[13px] leading-[18px] font-semibold text-[var(--color-text)] flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-[var(--color-accent)]" strokeWidth={1.75} />
                        Paid this month ({paidBills.length})
                      </span>
                      <motion.div
                        animate={{ rotate: paidExpanded ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronDown className="w-4 h-4 text-[var(--color-text-muted)]" strokeWidth={1.75} />
                      </motion.div>
                    </button>
                    <AnimatePresence>
                      {paidExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.22 }}
                          className="overflow-hidden"
                        >
                          <ul className="px-5 pb-3 space-y-2">
                            {paidBills.map((b) => {
                              const Icon = getCategoryIcon(b.category);
                              return (
                                <li
                                  key={b.id}
                                  className="flex items-center gap-3 text-[13px] leading-[18px] text-[var(--color-text-muted)]"
                                >
                                  <Icon className="w-3.5 h-3.5 text-[var(--color-accent-dim)]" strokeWidth={1.75} />
                                  <span className="flex-1">{b.name}</span>
                                  <span className="tabular-nums">${b.amount.toFixed(2)}</span>
                                </li>
                              );
                            })}
                          </ul>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </>
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
              <MotionButton
                onClick={() => setShowAddSub(true)}
                className="flex items-center gap-2 px-4 h-10 rounded-[16px] bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[15px] font-medium text-[var(--color-text-on-accent)] transition-colors"
              >
                <Plus className="w-4 h-4" strokeWidth={1.75} />
                Add Subscription
              </MotionButton>
            </div>
            {subs.length === 0 ? (
              <EmptyHive
                title="No subs swarming yet"
                description="Track streaming, software, and memberships in one place."
                primary={{ label: 'Add Your First Subscription', onClick: () => setShowAddSub(true) }}
              />
            ) : (
              <>
                {/* Story Strip — horizontally scrollable tiles */}
                <div className="mb-2">
                  <p className="text-[11px] leading-[14px] font-semibold uppercase tracking-wider text-[var(--color-text-subtle)] mb-3">
                    On the roster
                  </p>
                  <div className="flex gap-3 overflow-x-auto pb-3 -mx-4 px-4 snap-x snap-mandatory">
                    {subs.map((sub) => (
                      <SubscriptionTile key={sub.id} sub={sub} />
                    ))}
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-[11px] leading-[14px] font-semibold uppercase tracking-wider text-[var(--color-text-subtle)] mb-3">
                    Compact list
                  </p>
                  <ul className="space-y-2">
                    {subs.map((sub) => (
                      <li key={sub.id}>
                        <SubscriptionRow sub={sub} onDelete={deleteSub} />
                      </li>
                    ))}
                  </ul>
                </div>
              </>
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
        <MotionButton
          onClick={primary.onClick}
          className="px-4 h-10 rounded-[16px] bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[15px] font-medium text-[var(--color-text-on-accent)] transition-colors"
        >
          {primary.label}
        </MotionButton>
        <AskAiChip prompt="Help me add my first bill" label="Ask BillBee to add something" />
      </div>
    </div>
  );
}

// AlertCircle stays in-scope but is no longer used in the redesigned layout.
void AlertCircle;
void RefreshCw;
