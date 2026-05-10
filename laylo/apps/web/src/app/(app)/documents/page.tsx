'use client';

/**
 * Documents — Honeycomb Tile Grid (compact) with Category Hexes
 * (LAYOUT_REDESIGN_BRIEF §2.7).
 *
 * - Top: 8 category hexes (one per category), each filling with
 *   --color-accent-soft when active. Counts displayed inside.
 * - Below: 3-col grid of "file folder" doc cards — 4px gold tab on top,
 *   pulsing on expiring docs.
 * - Grid/list toggle removed.
 */
import { useState, useMemo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  FileText,
  X,
  Upload,
  Calendar,
  Clock,
  Trash2,
  Eye,
  Shield,
  Home,
  Car,
  Calculator,
  Stethoscope,
  Wrench,
  Contact as IdCard,
  MoreHorizontal,
} from 'lucide-react';
import { format, addDays, addMonths, differenceInDays } from 'date-fns';
import { AskAiChip } from '@/components/ai/ask-ai';
import { BeeStanding, BeeMagnifying } from '@/components/illustrations/bee';
import { MotionButton } from '@/components/motion/motion-button';

const HEX_CLIP = 'polygon(25% 5%, 75% 5%, 100% 50%, 75% 95%, 25% 95%, 0% 50%)';

// ─── Types ───────────────────────────────────────────────────────────────────
type DocCategory = 'Insurance' | 'Lease' | 'Car' | 'Tax' | 'Medical' | 'Warranty' | 'Identity' | 'Other';

interface Document {
  id: string;
  title: string;
  category: DocCategory;
  fileType: string;
  issueDate: string;
  expirationDate?: string;
  notes?: string;
}

const ALL_CATEGORIES: DocCategory[] = ['Insurance', 'Lease', 'Car', 'Tax', 'Medical', 'Warranty', 'Identity', 'Other'];

const CATEGORY_ICONS: Record<DocCategory, React.ElementType> = {
  Insurance: Shield,
  Lease: Home,
  Car: Car,
  Tax: Calculator,
  Medical: Stethoscope,
  Warranty: Wrench,
  Identity: IdCard,
  Other: MoreHorizontal,
};

// ─── Demo Data ───────────────────────────────────────────────────────────────
const today = new Date();

const INITIAL_DOCUMENTS: Document[] = [
  { id: 'd1', title: 'Passport', category: 'Identity', fileType: 'PDF', issueDate: format(addMonths(today, -54), 'yyyy-MM-dd'), expirationDate: format(addMonths(today, 6), 'yyyy-MM-dd'), notes: 'US Passport — keep in fireproof safe' },
  { id: 'd2', title: 'Car Insurance Policy', category: 'Insurance', fileType: 'PDF', issueDate: format(addMonths(today, -10), 'yyyy-MM-dd'), expirationDate: format(addMonths(today, 2), 'yyyy-MM-dd'), notes: 'Progressive — Honda Civic 2021' },
  { id: 'd3', title: 'Apartment Lease Agreement', category: 'Lease', fileType: 'PDF', issueDate: format(addMonths(today, -4), 'yyyy-MM-dd'), expirationDate: format(addMonths(today, 8), 'yyyy-MM-dd'), notes: 'Apartment 4B — 12 month lease' },
  { id: 'd4', title: 'W-2 Form 2025', category: 'Tax', fileType: 'PDF', issueDate: format(addMonths(today, -2), 'yyyy-MM-dd'), notes: 'From employer — filed with accountant' },
  { id: 'd5', title: 'Health Insurance Card', category: 'Medical', fileType: 'Image', issueDate: format(addMonths(today, -6), 'yyyy-MM-dd'), expirationDate: format(addMonths(today, 6), 'yyyy-MM-dd'), notes: 'Blue Cross Blue Shield — PPO plan' },
  { id: 'd6', title: 'Lab Results — Annual Checkup', category: 'Medical', fileType: 'PDF', issueDate: format(addDays(today, -14), 'yyyy-MM-dd'), notes: 'Complete blood panel — all normal' },
  { id: 'd7', title: 'Electricity Bill — March', category: 'Other', fileType: 'PDF', issueDate: format(addDays(today, -3), 'yyyy-MM-dd'), notes: '$142.50 — due in 30 days' },
];

function getExpiryStatus(doc: Document): 'expired' | 'expiring' | 'safe' | 'none' {
  if (!doc.expirationDate) return 'none';
  const days = differenceInDays(new Date(doc.expirationDate), today);
  if (days < 0) return 'expired';
  if (days <= 60) return 'expiring';
  return 'safe';
}

function getDaysUntilExpiry(doc: Document): number | null {
  if (!doc.expirationDate) return null;
  return differenceInDays(new Date(doc.expirationDate), today);
}

const inputClass =
  'w-full px-3 py-2.5 rounded-[8px] bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[15px] leading-[22px] text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] focus:outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/25';

export default function DocumentsPage() {
  const reduce = useReducedMotion();

  const [documents, setDocuments] = useState<Document[]>(INITIAL_DOCUMENTS);
  const [activeCategory, setActiveCategory] = useState<DocCategory | 'All'>('All');
  const [modalOpen, setModalOpen] = useState(false);

  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<DocCategory>('Other');
  const [newFileType, setNewFileType] = useState('PDF');
  const [newNotes, setNewNotes] = useState('');
  const [newIssueDate, setNewIssueDate] = useState(format(today, 'yyyy-MM-dd'));
  const [newExpirationDate, setNewExpirationDate] = useState('');

  const filteredDocs = useMemo(() => {
    if (activeCategory === 'All') return documents;
    return documents.filter((d) => d.category === activeCategory);
  }, [documents, activeCategory]);

  // Per-category count for the hex bar.
  const categoryCounts: Record<DocCategory, number> = useMemo(() => {
    const counts = ALL_CATEGORIES.reduce(
      (acc, c) => ({ ...acc, [c]: 0 }),
      {} as Record<DocCategory, number>,
    );
    documents.forEach((d) => {
      counts[d.category] = (counts[d.category] ?? 0) + 1;
    });
    return counts;
  }, [documents]);

  const addDocument = () => {
    if (!newTitle.trim()) return;
    const doc: Document = {
      id: Date.now().toString(),
      title: newTitle.trim(),
      category: newCategory,
      fileType: newFileType,
      issueDate: newIssueDate,
      expirationDate: newExpirationDate || undefined,
      notes: newNotes.trim() || undefined,
    };
    setDocuments((prev) => [...prev, doc]);
    resetForm();
    setModalOpen(false);
  };

  const deleteDocument = (id: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  };

  const resetForm = () => {
    setNewTitle('');
    setNewCategory('Other');
    setNewFileType('PDF');
    setNewNotes('');
    setNewIssueDate(format(today, 'yyyy-MM-dd'));
    setNewExpirationDate('');
  };

  return (
    <div className="max-w-[1024px] mx-auto">
      {/* Header */}
      <header className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-[8px] bg-[var(--color-surface-2)] flex items-center justify-center">
              <FileText className="w-5 h-5 text-[var(--color-accent)]" strokeWidth={1.75} />
            </div>
            <h1 className="text-[32px] leading-[40px] font-bold text-[var(--color-text)]">Documents</h1>
          </div>
          <p className="text-[15px] leading-[22px] text-[var(--color-text-muted)] ml-[52px]">
            {documents.length} document{documents.length !== 1 ? 's' : ''} in your hive
          </p>
        </div>
        <MotionButton
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 h-10 rounded-[16px] bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[15px] font-medium text-[var(--color-text-on-accent)] transition-colors"
        >
          <Upload className="w-4 h-4" strokeWidth={1.75} />
          Upload
        </MotionButton>
      </header>

      {/* Category hex bar */}
      <div className="mb-8 overflow-x-auto">
        <div className="flex items-end gap-2 sm:gap-3 min-w-max pb-2">
          <CategoryHex
            label="All"
            count={documents.length}
            active={activeCategory === 'All'}
            onClick={() => setActiveCategory('All')}
            icon={FileText}
          />
          {ALL_CATEGORIES.map((cat) => (
            <CategoryHex
              key={cat}
              label={cat}
              count={categoryCounts[cat]}
              active={activeCategory === cat}
              onClick={() => setActiveCategory(cat)}
              icon={CATEGORY_ICONS[cat]}
            />
          ))}
        </div>
      </div>

      {/* Empty */}
      {filteredDocs.length === 0 && (
        <div className="rounded-[16px] bg-[var(--color-surface)] border border-[var(--color-border)] p-12 flex flex-col items-center text-center">
          {activeCategory === 'All' ? <BeeStanding size={96} /> : <BeeMagnifying size={96} />}
          <h3 className="mt-4 text-[16px] leading-[22px] font-semibold text-[var(--color-text)]">
            {activeCategory === 'All' ? 'Your vault is empty. Drop a document in.' : `No ${activeCategory} documents`}
          </h3>
          <p className="mt-2 max-w-md text-[15px] leading-[22px] text-[var(--color-text-muted)]">
            {activeCategory === 'All'
              ? 'Upload your important papers and BillBee will keep them tidy.'
              : `You don't have any ${activeCategory.toLowerCase()} documents yet.`}
          </p>
          <div className="mt-6 flex flex-col sm:flex-row items-center gap-3">
            <MotionButton
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-2 px-4 h-10 rounded-[16px] bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[15px] font-medium text-[var(--color-text-on-accent)] transition-colors"
            >
              <Upload className="w-4 h-4" strokeWidth={1.75} />
              Upload Document
            </MotionButton>
            <AskAiChip prompt="Help me organise my documents" label="Ask BillBee to add something" />
          </div>
        </div>
      )}

      {/* File-folder grid */}
      {filteredDocs.length > 0 && (
        <motion.div
          layout
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          <AnimatePresence mode="popLayout">
            {filteredDocs.map((doc, index) => {
              const expiryStatus = getExpiryStatus(doc);
              const daysLeft = getDaysUntilExpiry(doc);
              const Icon = CATEGORY_ICONS[doc.category];
              const isExpiring = expiryStatus === 'expiring';
              return (
                <motion.div
                  key={doc.id}
                  layout
                  initial={reduce ? false : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
                  transition={{ duration: 0.2, delay: index * 0.04 }}
                  whileHover={reduce ? undefined : { y: -2, rotate: 1.5, scale: 1.01 }}
                  className="group relative pt-1.5"
                >
                  {/* 4px gold "filing tab" on top */}
                  <motion.div
                    aria-hidden="true"
                    animate={
                      isExpiring && !reduce
                        ? { opacity: [0.6, 1, 0.6] }
                        : { opacity: 1 }
                    }
                    transition={
                      isExpiring
                        ? { duration: 1.5, repeat: Infinity, ease: 'easeInOut' }
                        : undefined
                    }
                    className="absolute left-4 right-4 top-0 h-1 rounded-t-[4px]"
                    style={{
                      background: isExpiring
                        ? 'var(--color-warning)'
                        : 'var(--color-accent)',
                    }}
                  />
                  <div className="rounded-[16px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 hover:shadow-pop transition-all">
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-10 h-10 rounded-[8px] bg-[var(--color-surface-2)] flex items-center justify-center">
                        <Icon className="w-5 h-5 text-[var(--color-accent)]" strokeWidth={1.75} />
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          aria-label="View"
                          className="p-1.5 rounded-[8px] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-subtle)] hover:text-[var(--color-text)] transition-colors"
                        >
                          <Eye className="w-4 h-4" strokeWidth={1.75} />
                        </button>
                        <button
                          onClick={() => deleteDocument(doc.id)}
                          aria-label="Delete"
                          className="p-1.5 rounded-[8px] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-subtle)] hover:text-[var(--color-danger)] transition-colors"
                        >
                          <Trash2 className="w-4 h-4" strokeWidth={1.75} />
                        </button>
                      </div>
                    </div>
                    <h3 className="text-[16px] leading-[22px] font-semibold text-[var(--color-text)]">
                      {doc.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-2 mb-3 flex-wrap">
                      <span className="text-[11px] leading-[14px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-[8px] bg-[var(--color-surface-2)] text-[var(--color-text-muted)]">
                        {doc.category}
                      </span>
                      <span className="text-[11px] leading-[14px] font-medium text-[var(--color-text-subtle)]">
                        {doc.fileType}
                      </span>
                    </div>
                    <div className="space-y-1 mb-3">
                      <p className="text-[13px] leading-[18px] text-[var(--color-text-muted)] flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" strokeWidth={1.75} />
                        Issued {format(new Date(doc.issueDate), 'MMM d, yyyy')}
                      </p>
                      {doc.expirationDate && (
                        <p
                          className={`text-[13px] leading-[18px] flex items-center gap-1.5 ${
                            expiryStatus === 'expired'
                              ? 'text-[var(--color-danger)]'
                              : isExpiring
                              ? 'text-[var(--color-warning)]'
                              : 'text-[var(--color-text-muted)]'
                          }`}
                        >
                          <Clock className="w-3.5 h-3.5" strokeWidth={1.75} />
                          {expiryStatus === 'expired'
                            ? 'Expired'
                            : `Expires ${format(new Date(doc.expirationDate), 'MMM d, yyyy')}`}
                          {daysLeft !== null && daysLeft >= 0 && daysLeft <= 60 && (
                            <span className="font-medium">({daysLeft}d)</span>
                          )}
                        </p>
                      )}
                    </div>
                    <div className="pt-3 border-t border-[var(--color-border)]">
                      <AskAiChip
                        prompt={doc.expirationDate ? 'When does this expire?' : 'Summarise'}
                        context={`Document: ${doc.title}`}
                        label={doc.expirationDate ? 'When does this expire?' : 'Summarise'}
                      />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Upload Document Modal */}
      <AnimatePresence>
        {modalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduce ? 0 : 0.15 }}
              onClick={() => setModalOpen(false)}
              className="fixed inset-0 z-50 bg-[var(--color-overlay)] backdrop-blur-sm"
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
                  <h2 className="text-[22px] leading-[28px] font-semibold text-[var(--color-text)]">Upload Document</h2>
                  <button
                    onClick={() => setModalOpen(false)}
                    className="p-1 rounded-[8px] text-[var(--color-text-subtle)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)] transition-colors"
                    aria-label="Close"
                  >
                    <X className="w-4 h-4" strokeWidth={1.75} />
                  </button>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-[13px] leading-[18px] font-medium text-[var(--color-text-muted)] mb-1.5">
                      Title <span className="text-[var(--color-danger)]">*</span>
                    </label>
                    <input
                      type="text"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="Document title"
                      className={inputClass}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[13px] leading-[18px] font-medium text-[var(--color-text-muted)] mb-1.5">Category</label>
                      <select
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value as DocCategory)}
                        className={inputClass}
                      >
                        {ALL_CATEGORIES.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[13px] leading-[18px] font-medium text-[var(--color-text-muted)] mb-1.5">File Type</label>
                      <select
                        value={newFileType}
                        onChange={(e) => setNewFileType(e.target.value)}
                        className={inputClass}
                      >
                        {['PDF', 'Image', 'Word', 'Spreadsheet', 'Other'].map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[13px] leading-[18px] font-medium text-[var(--color-text-muted)] mb-1.5">Issue Date</label>
                      <input
                        type="date"
                        value={newIssueDate}
                        onChange={(e) => setNewIssueDate(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block text-[13px] leading-[18px] font-medium text-[var(--color-text-muted)] mb-1.5">Expiration Date</label>
                      <input
                        type="date"
                        value={newExpirationDate}
                        onChange={(e) => setNewExpirationDate(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[13px] leading-[18px] font-medium text-[var(--color-text-muted)] mb-1.5">Notes</label>
                    <textarea
                      value={newNotes}
                      onChange={(e) => setNewNotes(e.target.value)}
                      placeholder="Additional notes…"
                      rows={3}
                      className={`${inputClass} resize-none`}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[var(--color-border)]">
                  <button
                    onClick={() => { resetForm(); setModalOpen(false); }}
                    className="px-4 h-10 rounded-[16px] text-[15px] font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)] transition-colors"
                  >
                    Cancel
                  </button>
                  <MotionButton
                    onClick={addDocument}
                    disabled={!newTitle.trim()}
                    className="flex items-center gap-2 px-4 h-10 rounded-[16px] bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[15px] font-medium text-[var(--color-text-on-accent)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Upload className="w-4 h-4" strokeWidth={1.75} />
                    Upload
                  </MotionButton>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Category Hex ────────────────────────────────────────────────────
function CategoryHex({
  label,
  count,
  active,
  onClick,
  icon: Icon,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
}) {
  const reduce = useReducedMotion();
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="relative flex flex-col items-center group focus:outline-none"
    >
      <motion.div
        animate={
          reduce
            ? undefined
            : active
            ? { scale: 1.08 }
            : { scale: 0.92, opacity: 0.7 }
        }
        transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
        className="relative w-[72px] h-[72px]"
      >
        {/* outer hex */}
        <div
          aria-hidden="true"
          className="absolute inset-0 transition-colors"
          style={{
            clipPath: HEX_CLIP,
            WebkitClipPath: HEX_CLIP,
            background: active
              ? 'var(--color-accent)'
              : 'var(--color-border)',
          }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-[1.5px]"
          style={{
            clipPath: HEX_CLIP,
            WebkitClipPath: HEX_CLIP,
            background: active
              ? 'var(--color-accent-soft)'
              : 'var(--color-surface)',
          }}
        />
        <div className="relative z-10 w-full h-full flex flex-col items-center justify-center">
          <Icon
            className={`w-5 h-5 ${
              active ? 'text-[var(--color-accent-dim)]' : 'text-[var(--color-text-muted)]'
            }`}
            strokeWidth={1.75}
          />
          <span
            className={`text-[11px] leading-[14px] font-semibold tabular-nums mt-0.5 ${
              active ? 'text-[var(--color-accent-dim)]' : 'text-[var(--color-text-muted)]'
            }`}
          >
            {count}
          </span>
        </div>
      </motion.div>
      <span
        className={`mt-1 text-[11px] leading-[14px] font-medium uppercase tracking-wider ${
          active ? 'text-[var(--color-text)]' : 'text-[var(--color-text-subtle)]'
        }`}
      >
        {label}
      </span>
    </button>
  );
}
