'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCard,
  DollarSign,
  AlertCircle,
  Calendar,
  Zap,
  Plus,
  X,
  ChevronDown,
  ChevronUp,
  Trash2,
  Monitor,
  Moon,
  Smartphone,
  Loader2,
  Inbox,
  RefreshCw,
  FileText,
} from 'lucide-react';
import { format, addDays, differenceInDays } from 'date-fns';

// ─── Types ───────────────────────────────────────────────────────────
type ViewState = 'default' | 'dark' | 'mobile' | 'loading' | 'empty';
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

// ─── Category Colors ─────────────────────────────────────────────────
const CATEGORY_COLORS: Record<string, { gradient: string; bg: string; text: string; border: string }> = {
  Housing: {
    gradient: 'from-blue-500 to-blue-600',
    bg: 'bg-blue-50 dark:bg-blue-500/10',
    text: 'text-blue-700 dark:text-blue-400',
    border: 'border-blue-200 dark:border-blue-500/20',
  },
  Utilities: {
    gradient: 'from-cyan-500 to-cyan-600',
    bg: 'bg-cyan-50 dark:bg-cyan-500/10',
    text: 'text-cyan-700 dark:text-cyan-400',
    border: 'border-cyan-200 dark:border-cyan-500/20',
  },
  Insurance: {
    gradient: 'from-purple-500 to-purple-600',
    bg: 'bg-purple-50 dark:bg-purple-500/10',
    text: 'text-purple-700 dark:text-purple-400',
    border: 'border-purple-200 dark:border-purple-500/20',
  },
  Transportation: {
    gradient: 'from-amber-500 to-amber-600',
    bg: 'bg-amber-50 dark:bg-amber-500/10',
    text: 'text-amber-700 dark:text-amber-400',
    border: 'border-amber-200 dark:border-amber-500/20',
  },
  Entertainment: {
    gradient: 'from-pink-500 to-pink-600',
    bg: 'bg-pink-50 dark:bg-pink-500/10',
    text: 'text-pink-700 dark:text-pink-400',
    border: 'border-pink-200 dark:border-pink-500/20',
  },
  Health: {
    gradient: 'from-green-500 to-green-600',
    bg: 'bg-green-50 dark:bg-green-500/10',
    text: 'text-green-700 dark:text-green-400',
    border: 'border-green-200 dark:border-green-500/20',
  },
  Tech: {
    gradient: 'from-indigo-500 to-indigo-600',
    bg: 'bg-indigo-50 dark:bg-indigo-500/10',
    text: 'text-indigo-700 dark:text-indigo-400',
    border: 'border-indigo-200 dark:border-indigo-500/20',
  },
  Work: {
    gradient: 'from-orange-500 to-orange-600',
    bg: 'bg-orange-50 dark:bg-orange-500/10',
    text: 'text-orange-700 dark:text-orange-400',
    border: 'border-orange-200 dark:border-orange-500/20',
  },
  Education: {
    gradient: 'from-teal-500 to-teal-600',
    bg: 'bg-teal-50 dark:bg-teal-500/10',
    text: 'text-teal-700 dark:text-teal-400',
    border: 'border-teal-200 dark:border-teal-500/20',
  },
  Other: {
    gradient: 'from-gray-500 to-gray-600',
    bg: 'bg-gray-50 dark:bg-gray-500/10',
    text: 'text-gray-700 dark:text-gray-400',
    border: 'border-gray-200 dark:border-gray-500/20',
  },
};

// ─── Category Icons ──────────────────────────────────────────────────
function getCategoryIcon(category: string) {
  switch (category) {
    case 'Housing': return DollarSign;
    case 'Utilities': return Zap;
    case 'Insurance': return FileText;
    case 'Transportation': return CreditCard;
    case 'Entertainment': return RefreshCw;
    case 'Health': return Plus;
    case 'Tech': return Monitor;
    case 'Work': return FileText;
    case 'Education': return FileText;
    default: return CreditCard;
  }
}

// ─── Demo Data ───────────────────────────────────────────────────────
const today = new Date();

const INITIAL_BILLS: Bill[] = [
  {
    id: 'b1',
    name: 'Rent',
    category: 'Housing',
    amount: 2200,
    frequency: 'Monthly',
    dueDate: format(addDays(today, 5), 'yyyy-MM-dd'),
    autopay: true,
    notes: 'Apartment 4B',
  },
  {
    id: 'b2',
    name: 'Internet',
    category: 'Utilities',
    amount: 79.99,
    frequency: 'Monthly',
    dueDate: format(addDays(today, 12), 'yyyy-MM-dd'),
    autopay: true,
    notes: 'Fiber 500Mbps',
  },
  {
    id: 'b3',
    name: 'Car Insurance',
    category: 'Insurance',
    amount: 185,
    frequency: 'Monthly',
    dueDate: format(addDays(today, 8), 'yyyy-MM-dd'),
    autopay: false,
    notes: 'Progressive — Honda Civic',
  },
  {
    id: 'b4',
    name: 'Electricity',
    category: 'Utilities',
    amount: 142.5,
    frequency: 'Monthly',
    dueDate: format(addDays(today, 1), 'yyyy-MM-dd'),
    autopay: false,
    notes: 'Variable — check bill',
  },
  {
    id: 'b5',
    name: 'Phone Plan',
    category: 'Utilities',
    amount: 55,
    frequency: 'Monthly',
    dueDate: format(addDays(today, 18), 'yyyy-MM-dd'),
    autopay: true,
    notes: 'T-Mobile Essentials',
  },
];

const INITIAL_SUBS: Subscription[] = [
  {
    id: 's1',
    name: 'Netflix',
    category: 'Entertainment',
    amount: 15.99,
    frequency: 'Monthly',
    renewalDate: format(addDays(today, 14), 'yyyy-MM-dd'),
    autopay: true,
  },
  {
    id: 's2',
    name: 'Spotify',
    category: 'Entertainment',
    amount: 10.99,
    frequency: 'Monthly',
    renewalDate: format(addDays(today, 7), 'yyyy-MM-dd'),
    autopay: true,
  },
  {
    id: 's3',
    name: 'Gym Membership',
    category: 'Health',
    amount: 49.99,
    frequency: 'Monthly',
    renewalDate: format(addDays(today, 3), 'yyyy-MM-dd'),
    autopay: true,
    notes: 'LA Fitness',
  },
  {
    id: 's4',
    name: 'iCloud Storage',
    category: 'Tech',
    amount: 2.99,
    frequency: 'Monthly',
    renewalDate: format(addDays(today, 20), 'yyyy-MM-dd'),
    autopay: true,
    notes: '200GB',
  },
  {
    id: 's5',
    name: 'ChatGPT Plus',
    category: 'Tech',
    amount: 20,
    frequency: 'Monthly',
    renewalDate: format(addDays(today, 11), 'yyyy-MM-dd'),
    autopay: true,
  },
  {
    id: 's6',
    name: 'Adobe Creative Cloud',
    category: 'Work',
    amount: 54.99,
    frequency: 'Monthly',
    renewalDate: format(addDays(today, 22), 'yyyy-MM-dd'),
    autopay: true,
    notes: 'Consider downgrading',
  },
];

// ─── Animation Variants ──────────────────────────────────────────────
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.07, duration: 0.45, ease: [0.4, 0, 0.2, 1] },
  }),
  exit: { opacity: 0, y: -16, transition: { duration: 0.25 } },
};

// ─── Skeleton Component ──────────────────────────────────────────────
function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded-lg ${className}`} />
  );
}

function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-white dark:bg-[#1A1A1A] rounded-xl border border-gray-200/60 dark:border-gray-700/30 p-5 ${className}`}>
      <div className="flex items-center gap-3 mb-4">
        <Skeleton className="w-10 h-10 rounded-xl" />
        <div className="flex-1">
          <Skeleton className="h-3 w-24 mb-2" />
          <Skeleton className="h-6 w-16" />
        </div>
        <Skeleton className="h-8 w-20 rounded-lg" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-5 w-16 rounded-md" />
        <Skeleton className="h-5 w-24 rounded-md" />
        <Skeleton className="h-5 w-16 rounded-md" />
      </div>
    </div>
  );
}

// ─── Empty State Component ───────────────────────────────────────────
function EmptyState({
  icon: Icon,
  title,
  subtitle,
  actionLabel,
  onAction,
}: {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-gray-400" />
      </div>
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 max-w-xs">{subtitle}</p>
      {actionLabel && onAction && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onAction}
          className="mt-4 px-4 py-2 rounded-xl bg-gradient-to-r from-[#6366F1] to-purple-500 text-white text-sm font-medium shadow-lg shadow-indigo-500/25"
        >
          {actionLabel}
        </motion.button>
      )}
    </div>
  );
}

// ─── Days Until Helper ───────────────────────────────────────────────
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
  const [expanded, setExpanded] = useState(false);
  const colors = CATEGORY_COLORS[bill.category] ?? CATEGORY_COLORS['Other']!;
  const Icon = getCategoryIcon(bill.category);
  const daysUntil = getDaysUntil(bill.dueDate);
  const isDueSoon = daysUntil <= 3;

  return (
    <motion.div
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      layout
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      onClick={() => setExpanded(!expanded)}
      className={`relative overflow-hidden bg-white dark:bg-[#1A1A1A] rounded-xl border cursor-pointer transition-all ${
        isDueSoon
          ? 'border-rose-300 dark:border-rose-500/40 shadow-lg shadow-rose-500/10 dark:shadow-rose-500/5'
          : 'border-gray-200/60 dark:border-gray-700/30'
      }`}
    >
      {isDueSoon && (
        <div className="absolute inset-0 bg-gradient-to-r from-rose-500/5 to-transparent pointer-events-none" />
      )}
      <div className="relative p-5">
        <div className="flex items-center gap-4">
          {/* Icon */}
          <div
            className={`w-11 h-11 rounded-xl bg-gradient-to-br ${colors.gradient} flex items-center justify-center flex-shrink-0 shadow-lg`}
          >
            <Icon className="w-5 h-5 text-white" />
          </div>
          {/* Name + Category */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                {bill.name}
              </h3>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${colors.bg} ${colors.text}`}
              >
                {bill.category}
              </span>
            </div>
            {/* Badges row */}
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                {bill.frequency}
              </span>
              <span
                className={`text-[10px] font-medium px-2 py-0.5 rounded-md flex items-center gap-1 ${
                  isDueSoon
                    ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                }`}
              >
                <Calendar className="w-3 h-3" />
                {getDueDateLabel(bill.dueDate)}
              </span>
              {bill.autopay ? (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  Autopay
                </span>
              ) : (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  Manual
                </span>
              )}
            </div>
          </div>
          {/* Amount */}
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              ${bill.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <motion.div
              animate={{ rotate: expanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </motion.div>
          </div>
        </div>
        {/* Expanded section */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="pt-4 mt-4 border-t border-gray-100 dark:border-gray-800">
                {bill.notes && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                    <span className="font-medium text-gray-600 dark:text-gray-300">Notes:</span>{' '}
                    {bill.notes}
                  </p>
                )}
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
                  Next due: {format(new Date(bill.dueDate), 'EEEE, MMMM d, yyyy')}
                </p>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(bill.id);
                  }}
                  className="flex items-center gap-1.5 text-xs font-medium text-rose-500 hover:text-rose-600 dark:text-rose-400 px-3 py-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete bill
                </motion.button>
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
  const [expanded, setExpanded] = useState(false);
  const colors = CATEGORY_COLORS[sub.category] ?? CATEGORY_COLORS['Other']!;
  const Icon = getCategoryIcon(sub.category);
  const daysUntil = getDaysUntil(sub.renewalDate);
  const isRenewingSoon = daysUntil <= 3;

  return (
    <motion.div
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      layout
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      onClick={() => setExpanded(!expanded)}
      className={`relative overflow-hidden bg-white dark:bg-[#1A1A1A] rounded-xl border cursor-pointer transition-all ${
        isRenewingSoon
          ? 'border-rose-300 dark:border-rose-500/40 shadow-lg shadow-rose-500/10 dark:shadow-rose-500/5'
          : 'border-gray-200/60 dark:border-gray-700/30'
      }`}
    >
      {isRenewingSoon && (
        <div className="absolute inset-0 bg-gradient-to-r from-rose-500/5 to-transparent pointer-events-none" />
      )}
      <div className="relative p-5">
        <div className="flex items-center gap-4">
          <div
            className={`w-11 h-11 rounded-xl bg-gradient-to-br ${colors.gradient} flex items-center justify-center flex-shrink-0 shadow-lg`}
          >
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                {sub.name}
              </h3>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${colors.bg} ${colors.text}`}
              >
                {sub.category}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                {sub.frequency}
              </span>
              <span
                className={`text-[10px] font-medium px-2 py-0.5 rounded-md flex items-center gap-1 ${
                  isRenewingSoon
                    ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                }`}
              >
                <RefreshCw className="w-3 h-3" />
                {getRenewalLabel(sub.renewalDate)}
              </span>
              {sub.autopay && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  Autopay
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              ${sub.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <motion.div
              animate={{ rotate: expanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </motion.div>
          </div>
        </div>
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="pt-4 mt-4 border-t border-gray-100 dark:border-gray-800">
                {sub.notes && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                    <span className="font-medium text-gray-600 dark:text-gray-300">Notes:</span>{' '}
                    {sub.notes}
                  </p>
                )}
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
                  Next renewal: {format(new Date(sub.renewalDate), 'EEEE, MMMM d, yyyy')}
                </p>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(sub.id);
                  }}
                  className="flex items-center gap-1.5 text-xs font-medium text-rose-500 hover:text-rose-600 dark:text-rose-400 px-3 py-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete subscription
                </motion.button>
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
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.25 }}
            className="relative w-full max-w-md max-h-[90vh] overflow-y-auto bg-white dark:bg-[#1A1A1A] rounded-2xl border border-gray-200/60 dark:border-gray-700/30 shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Add Bill</h3>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            {/* Form */}
            <div className="p-5 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                  Bill Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Electric Bill"
                  className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6366F1]/30 focus:border-[#6366F1]"
                />
              </div>
              {/* Category */}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as BillCategory)}
                  className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#6366F1]/30 focus:border-[#6366F1] appearance-none"
                >
                  {billCategories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              {/* Amount + Frequency */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                    Amount ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6366F1]/30 focus:border-[#6366F1]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                    Frequency
                  </label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value as Frequency)}
                    className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#6366F1]/30 focus:border-[#6366F1] appearance-none"
                  >
                    {frequencies.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {/* Due Date */}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                  Next Due Date
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#6366F1]/30 focus:border-[#6366F1]"
                />
              </div>
              {/* Autopay */}
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  Autopay
                </label>
                <button
                  onClick={() => setAutopay(!autopay)}
                  className={`relative w-10 h-5.5 rounded-full transition-colors ${
                    autopay ? 'bg-[#6366F1]' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <motion.div
                    animate={{ x: autopay ? 18 : 2 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-0.5 w-4.5 h-4.5 rounded-full bg-white shadow-sm"
                    style={{ width: 18, height: 18 }}
                  />
                </button>
              </div>
              {/* Notes */}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                  Notes (optional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any additional details..."
                  className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6366F1]/30 focus:border-[#6366F1]"
                />
              </div>
            </div>
            {/* Footer */}
            <div className="p-5 border-t border-gray-100 dark:border-gray-800">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSubmit}
                disabled={!name || !amount}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#6366F1] to-purple-500 text-white text-sm font-semibold shadow-lg shadow-indigo-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
              >
                Add Bill
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
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
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.25 }}
            className="relative w-full max-w-md max-h-[90vh] overflow-y-auto bg-white dark:bg-[#1A1A1A] rounded-2xl border border-gray-200/60 dark:border-gray-700/30 shadow-2xl"
          >
            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Add Subscription
              </h3>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                  Subscription Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Netflix"
                  className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6366F1]/30 focus:border-[#6366F1]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as SubCategory)}
                  className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#6366F1]/30 focus:border-[#6366F1] appearance-none"
                >
                  {subCategories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                    Amount ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6366F1]/30 focus:border-[#6366F1]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                    Frequency
                  </label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value as Frequency)}
                    className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#6366F1]/30 focus:border-[#6366F1] appearance-none"
                  >
                    {frequencies.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                  Next Renewal Date
                </label>
                <input
                  type="date"
                  value={renewalDate}
                  onChange={(e) => setRenewalDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#6366F1]/30 focus:border-[#6366F1]"
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  Autopay
                </label>
                <button
                  onClick={() => setAutopay(!autopay)}
                  className={`relative w-10 h-5.5 rounded-full transition-colors ${
                    autopay ? 'bg-[#6366F1]' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <motion.div
                    animate={{ x: autopay ? 18 : 2 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-0.5 w-4.5 h-4.5 rounded-full bg-white shadow-sm"
                    style={{ width: 18, height: 18 }}
                  />
                </button>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                  Notes (optional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any additional details..."
                  className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6366F1]/30 focus:border-[#6366F1]"
                />
              </div>
            </div>
            <div className="p-5 border-t border-gray-100 dark:border-gray-800">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSubmit}
                disabled={!name || !amount}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#6366F1] to-purple-500 text-white text-sm font-semibold shadow-lg shadow-indigo-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
              >
                Add Subscription
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────
export default function BillsPage() {
  const [viewState, setViewState] = useState<ViewState>('default');
  const [activeTab, setActiveTab] = useState<ActiveTab>('bills');
  const [bills, setBills] = useState<Bill[]>(INITIAL_BILLS);
  const [subs, setSubs] = useState<Subscription[]>(INITIAL_SUBS);
  const [showAddBill, setShowAddBill] = useState(false);
  const [showAddSub, setShowAddSub] = useState(false);

  const isDark = viewState === 'dark';
  const isLoading = viewState === 'loading';
  const isEmpty = viewState === 'empty';
  const isMobile = viewState === 'mobile';

  useEffect(() => {
    const html = document.documentElement;
    if (isDark) {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
    return () => {
      html.classList.remove('dark');
    };
  }, [isDark]);

  const monthlyBillsTotal = bills.reduce((sum, b) => sum + b.amount, 0);
  const monthlySubsTotal = subs.reduce((sum, s) => sum + s.amount, 0);
  const combinedMonthly = monthlyBillsTotal + monthlySubsTotal;

  const dueThisWeekCount =
    bills.filter((b) => getDaysUntil(b.dueDate) <= 7 && getDaysUntil(b.dueDate) >= 0).length +
    subs.filter((s) => getDaysUntil(s.renewalDate) <= 7 && getDaysUntil(s.renewalDate) >= 0).length;

  const deleteBill = (id: string) => setBills((prev) => prev.filter((b) => b.id !== id));
  const deleteSub = (id: string) => setSubs((prev) => prev.filter((s) => s.id !== id));
  const addBill = (bill: Bill) => setBills((prev) => [...prev, bill]);
  const addSub = (sub: Subscription) => setSubs((prev) => [...prev, sub]);

  const toolbarButtons: { label: string; state: ViewState; icon: React.ElementType }[] = [
    { label: 'Default', state: 'default', icon: Monitor },
    { label: 'Dark Mode', state: 'dark', icon: Moon },
    { label: 'Mobile', state: 'mobile', icon: Smartphone },
    { label: 'Loading', state: 'loading', icon: Loader2 },
    { label: 'Empty', state: 'empty', icon: Inbox },
  ];

  const pageContent = (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="max-w-6xl mx-auto space-y-6"
    >
      {/* ── Header ─────────────────────────────────────────── */}
      <motion.div variants={itemVariants}>
        {isLoading ? (
          <div>
            <Skeleton className="h-9 w-72 mb-2" />
            <Skeleton className="h-5 w-56" />
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#6366F1] to-purple-500 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Bills & Subscriptions
                </h1>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">
                  {isEmpty
                    ? 'Track your recurring payments'
                    : `$${combinedMonthly.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} combined monthly spend`}
                </p>
              </div>
            </div>
          </div>
        )}
      </motion.div>

      {/* ── Summary Cards ──────────────────────────────────── */}
      <motion.div variants={itemVariants} className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-3'} gap-4`}>
        {isLoading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            {[
              {
                label: 'Monthly Bills',
                value: isEmpty
                  ? '$0.00'
                  : `$${monthlyBillsTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                icon: DollarSign,
                gradient: 'from-blue-500 to-cyan-500',
                bgOverlay: 'from-blue-500/5 to-transparent',
              },
              {
                label: 'Monthly Subscriptions',
                value: isEmpty
                  ? '$0.00'
                  : `$${monthlySubsTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                icon: RefreshCw,
                gradient: 'from-purple-500 to-violet-500',
                bgOverlay: 'from-purple-500/5 to-transparent',
              },
              {
                label: 'Due This Week',
                value: isEmpty ? '0' : `${dueThisWeekCount} items`,
                icon: AlertCircle,
                gradient: 'from-rose-500 to-pink-500',
                bgOverlay: 'from-rose-500/5 to-transparent',
              },
            ].map((stat) => (
              <motion.div
                key={stat.label}
                whileHover={{ y: -2, scale: 1.01 }}
                transition={{ duration: 0.2 }}
                className="relative overflow-hidden bg-white dark:bg-[#1A1A1A] rounded-xl border border-gray-200/60 dark:border-gray-700/30 p-5"
              >
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${stat.bgOverlay} pointer-events-none`}
                />
                <div className="relative flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center flex-shrink-0`}
                  >
                    <stat.icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      {stat.label}
                    </p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">
                      {stat.value}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </>
        )}
      </motion.div>

      {/* ── Tab Toggle ─────────────────────────────────────── */}
      <motion.div variants={itemVariants} className="flex justify-center">
        <div className="inline-flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1 gap-1">
          {(['bills', 'subscriptions'] as ActiveTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`relative px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'text-white'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {activeTab === tab && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-gradient-to-r from-[#6366F1] to-purple-500 rounded-lg"
                  transition={{ duration: 0.25, type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10 capitalize">
                {tab === 'bills' ? `Bills (${isEmpty ? 0 : bills.length})` : `Subscriptions (${isEmpty ? 0 : subs.length})`}
              </span>
            </button>
          ))}
        </div>
      </motion.div>

      {/* ── Content ────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {activeTab === 'bills' ? (
          <motion.div
            key="bills"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.25 }}
          >
            {/* Add button */}
            <div className="flex justify-end mb-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowAddBill(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#6366F1] to-purple-500 text-white text-sm font-medium shadow-lg shadow-indigo-500/25"
              >
                <Plus className="w-4 h-4" />
                Add Bill
              </motion.button>
            </div>

            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : isEmpty || bills.length === 0 ? (
              <div className="bg-white dark:bg-[#1A1A1A] rounded-xl border border-gray-200/60 dark:border-gray-700/30">
                <EmptyState
                  icon={CreditCard}
                  title="No bills yet"
                  subtitle="Add your recurring bills to keep track of due dates and payments"
                  actionLabel="Add Your First Bill"
                  onAction={() => setShowAddBill(true)}
                />
              </div>
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
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
          >
            <div className="flex justify-end mb-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowAddSub(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#6366F1] to-purple-500 text-white text-sm font-medium shadow-lg shadow-indigo-500/25"
              >
                <Plus className="w-4 h-4" />
                Add Subscription
              </motion.button>
            </div>

            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : isEmpty || subs.length === 0 ? (
              <div className="bg-white dark:bg-[#1A1A1A] rounded-xl border border-gray-200/60 dark:border-gray-700/30">
                <EmptyState
                  icon={RefreshCw}
                  title="No subscriptions yet"
                  subtitle="Track your streaming, software, and membership subscriptions"
                  actionLabel="Add Your First Subscription"
                  onAction={() => setShowAddSub(true)}
                />
              </div>
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
    </motion.div>
  );

  return (
    <div className={`min-h-screen bg-[#FAFAFA] dark:bg-[#0F0F0F] transition-colors ${isDark ? 'dark' : ''}`}>
      {/* ── State Toolbar ──────────────────────────────────── */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
        <div className="flex items-center gap-1 bg-white/80 dark:bg-[#1A1A1A]/80 backdrop-blur-xl rounded-2xl border border-gray-200/60 dark:border-gray-700/30 p-1.5 shadow-lg shadow-gray-200/50 dark:shadow-black/20">
          {toolbarButtons.map((btn) => (
            <button
              key={btn.state}
              onClick={() => setViewState(btn.state)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                viewState === btn.state
                  ? 'bg-gradient-to-r from-[#6366F1] to-purple-500 text-white shadow-lg shadow-indigo-500/25'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <btn.icon className={`w-3.5 h-3.5 ${viewState === 'loading' && btn.state === 'loading' ? 'animate-spin' : ''}`} />
              <span className={isMobile ? 'hidden sm:inline' : ''}>{btn.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Page Content ───────────────────────────────────── */}
      <div
        className={`${isMobile ? 'max-w-sm mx-auto' : ''} px-4 sm:px-6 lg:px-8 pt-20 pb-12`}
      >
        {pageContent}
      </div>

      {/* ── Modals ─────────────────────────────────────────── */}
      <AddBillModal open={showAddBill} onClose={() => setShowAddBill(false)} onAdd={addBill} />
      <AddSubModal open={showAddSub} onClose={() => setShowAddSub(false)} onAdd={addSub} />
    </div>
  );
}
