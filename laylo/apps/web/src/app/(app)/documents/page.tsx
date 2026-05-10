'use client';

/**
 * Documents page — REDESIGN_BRIEF.md §2.4 + §9.2.
 * - CRITICAL theme bug fixed: useState(()=>{...MutationObserver}) replaced
 *   with `useTheme()` from next-themes.
 * - Per-doc AskAi chip ("Summarise" / "When does this expire?").
 */
import { useState, useMemo } from 'react';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  FileText,
  X,
  Grid3X3,
  List,
  AlertTriangle,
  Upload,
  Calendar,
  Clock,
  Trash2,
  Eye,
} from 'lucide-react';
import { format, addDays, addMonths, differenceInDays } from 'date-fns';
import { AskAiChip } from '@/components/ai/ask-ai';
import { BeeStanding, BeeMagnifying } from '@/components/illustrations/bee';

// ─── Types ───────────────────────────────────────────────────────────────────
type DocCategory = 'Insurance' | 'Lease' | 'Car' | 'Tax' | 'Medical' | 'Warranty' | 'Identity' | 'Other';
type ViewMode = 'grid' | 'list';

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
  // ─── Theme bug fix per REDESIGN_BRIEF.md §2.4 ─────────────────────────
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  // (isDark currently unused at the layout level — tokens handle theme,
  // but kept here for any future dark-only branches without the buggy MutationObserver.)
  void isDark;

  const [documents, setDocuments] = useState<Document[]>(INITIAL_DOCUMENTS);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
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

  const expiringDocs = useMemo(() => {
    return documents.filter((d) => getExpiryStatus(d) === 'expiring');
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
    <div className="max-w-[960px] mx-auto">
      {/* Header */}
      <header className="mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-[8px] bg-[var(--color-surface-2)] flex items-center justify-center">
              <FileText className="w-5 h-5 text-[var(--color-accent)]" strokeWidth={1.75} />
            </div>
            <h1 className="text-[32px] leading-[40px] font-bold text-[var(--color-text)]">Documents</h1>
          </div>
          <p className="text-[15px] leading-[22px] text-[var(--color-text-muted)] ml-[52px]">
            {documents.length} document{documents.length !== 1 ? 's' : ''} stored
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface)] p-1">
            <button
              onClick={() => setViewMode('grid')}
              aria-label="Grid view"
              aria-pressed={viewMode === 'grid'}
              className={`p-2 rounded-[8px] transition-all ${
                viewMode === 'grid'
                  ? 'bg-[var(--color-surface-2)] text-[var(--color-text)]'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
              }`}
            >
              <Grid3X3 className="w-4 h-4" strokeWidth={1.75} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              aria-label="List view"
              aria-pressed={viewMode === 'list'}
              className={`p-2 rounded-[8px] transition-all ${
                viewMode === 'list'
                  ? 'bg-[var(--color-surface-2)] text-[var(--color-text)]'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
              }`}
            >
              <List className="w-4 h-4" strokeWidth={1.75} />
            </button>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 px-4 h-10 rounded-[16px] bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[15px] font-medium text-[var(--color-text-on-accent)] transition-colors"
          >
            <Upload className="w-4 h-4" strokeWidth={1.75} />
            Upload Document
          </button>
        </div>
      </header>

      {/* Category Filter Chips */}
      <div className="mb-6 overflow-x-auto">
        <div className="flex items-center gap-2 min-w-max">
          {(['All', ...ALL_CATEGORIES] as (DocCategory | 'All')[]).map((cat) => {
            const isActive = activeCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`relative px-4 py-2 rounded-[8px] text-[13px] leading-[18px] font-medium transition-colors ${
                  isActive
                    ? 'text-[var(--color-text-on-accent)]'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="docs-active-cat"
                    className="absolute inset-0 bg-[var(--color-accent)] rounded-[8px]"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{cat}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Expiring Soon Alert */}
      {expiringDocs.length > 0 && activeCategory === 'All' && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-[var(--color-warning)]" strokeWidth={1.75} />
            <h2 className="text-[13px] leading-[18px] font-semibold text-[var(--color-warning)]">
              Expiring Soon
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {expiringDocs.map((doc, index) => {
              const daysLeft = getDaysUntilExpiry(doc);
              return (
                <motion.div
                  key={doc.id}
                  initial={reduce ? false : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.04 }}
                  className="rounded-[16px] border border-[var(--color-warning)]/40 bg-[var(--color-surface)] p-6"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-[8px] bg-[var(--color-surface-2)] flex items-center justify-center">
                      <FileText className="w-5 h-5 text-[var(--color-warning)]" strokeWidth={1.75} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[16px] leading-[22px] font-semibold text-[var(--color-text)] truncate">{doc.title}</h3>
                      <p className="text-[13px] leading-[18px] text-[var(--color-warning)]">
                        {daysLeft !== null && daysLeft >= 0 ? `Expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}` : 'Expired'}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty */}
      {filteredDocs.length === 0 && (
        <div className="rounded-[16px] bg-[var(--color-surface)] border border-[var(--color-border)] p-12 flex flex-col items-center text-center">
          {activeCategory === 'All' ? <BeeStanding size={96} /> : <BeeMagnifying size={96} />}
          <h3 className="mt-4 text-[16px] leading-[22px] font-semibold text-[var(--color-text)]">
            {activeCategory === 'All' ? 'Your vault is empty. Drop a document in.' : `No ${activeCategory} documents`}
          </h3>
          <p className="mt-2 max-w-md text-[15px] leading-[22px] text-[var(--color-text-muted)]">
            {activeCategory === 'All'
              ? 'Upload your important papers and Laylo will keep them tidy.'
              : `You don't have any ${activeCategory.toLowerCase()} documents yet.`}
          </p>
          <div className="mt-6 flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-2 px-4 h-10 rounded-[16px] bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[15px] font-medium text-[var(--color-text-on-accent)] transition-colors"
            >
              <Upload className="w-4 h-4" strokeWidth={1.75} />
              Upload Document
            </button>
            <AskAiChip prompt="Help me organise my documents" label="Ask Laylo to add something" />
          </div>
        </div>
      )}

      {/* Grid View */}
      {filteredDocs.length > 0 && viewMode === 'grid' && (
        <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredDocs.map((doc, index) => {
              const expiryStatus = getExpiryStatus(doc);
              const daysLeft = getDaysUntilExpiry(doc);
              return (
                <motion.div
                  key={doc.id}
                  layout
                  initial={reduce ? false : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
                  transition={{ duration: 0.2, delay: index * 0.04 }}
                  whileHover={reduce ? undefined : { y: -2 }}
                  className="group relative rounded-[16px] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 hover:shadow-pop transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-10 h-10 rounded-[8px] bg-[var(--color-surface-2)] flex items-center justify-center">
                      <FileText className="w-5 h-5 text-[var(--color-accent)]" strokeWidth={1.75} />
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
                  <h3 className="text-[16px] leading-[22px] font-semibold text-[var(--color-text)] mb-2">{doc.title}</h3>
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <span className="text-[11px] leading-[14px] font-semibold uppercase tracking-wider px-2 py-1 rounded-[8px] bg-[var(--color-surface-2)] text-[var(--color-text-muted)]">
                      {doc.category}
                    </span>
                    <span className="text-[13px] leading-[18px] font-medium px-2 py-1 rounded-[8px] bg-[var(--color-surface-2)] text-[var(--color-text-muted)]">
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
                            : expiryStatus === 'expiring'
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
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}

      {/* List View */}
      {filteredDocs.length > 0 && viewMode === 'list' && (
        <motion.div layout className="space-y-3">
          <AnimatePresence mode="popLayout">
            {filteredDocs.map((doc, index) => {
              const expiryStatus = getExpiryStatus(doc);
              const daysLeft = getDaysUntilExpiry(doc);
              return (
                <motion.div
                  key={doc.id}
                  layout
                  initial={reduce ? false : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -40, transition: { duration: 0.15 } }}
                  transition={{ duration: 0.2, delay: index * 0.04 }}
                  whileHover={reduce ? undefined : { y: -2 }}
                  className="group relative rounded-[16px] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 hover:shadow-pop transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-[8px] bg-[var(--color-surface-2)] flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-[var(--color-accent)]" strokeWidth={1.75} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[16px] leading-[22px] font-semibold text-[var(--color-text)] truncate">{doc.title}</h3>
                      {doc.notes && (
                        <p className="text-[13px] leading-[18px] text-[var(--color-text-subtle)] truncate mt-0.5">{doc.notes}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="hidden sm:inline-flex text-[11px] leading-[14px] font-semibold uppercase tracking-wider px-2 py-1 rounded-[8px] bg-[var(--color-surface-2)] text-[var(--color-text-muted)]">
                        {doc.category}
                      </span>
                      <span className="hidden md:inline-flex text-[13px] leading-[18px] text-[var(--color-text-muted)]">
                        {format(new Date(doc.issueDate), 'MMM d, yyyy')}
                      </span>
                      {doc.expirationDate && (
                        <span
                          className={`hidden lg:inline-flex text-[13px] leading-[18px] ${
                            expiryStatus === 'expiring'
                              ? 'text-[var(--color-warning)]'
                              : expiryStatus === 'expired'
                              ? 'text-[var(--color-danger)]'
                              : 'text-[var(--color-text-subtle)]'
                          }`}
                        >
                          {expiryStatus === 'expired' ? 'Expired' : `Exp: ${format(new Date(doc.expirationDate), 'MMM yyyy')}`}
                          {daysLeft !== null && daysLeft >= 0 && daysLeft <= 60 && ` (${daysLeft}d)`}
                        </span>
                      )}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <AskAiChip
                          prompt={doc.expirationDate ? 'When does this expire?' : 'Summarise'}
                          context={doc.title}
                          iconOnly
                          label="Ask"
                        />
                        <button
                          onClick={() => deleteDocument(doc.id)}
                          aria-label="Delete"
                          className="p-1.5 rounded-[8px] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-subtle)] hover:text-[var(--color-danger)] transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
                        </button>
                      </div>
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
                  <button
                    onClick={addDocument}
                    disabled={!newTitle.trim()}
                    className="flex items-center gap-2 px-4 h-10 rounded-[16px] bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[15px] font-medium text-[var(--color-text-on-accent)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Upload className="w-4 h-4" strokeWidth={1.75} />
                    Upload
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
