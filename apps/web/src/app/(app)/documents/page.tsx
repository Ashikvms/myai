'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Plus,
  X,
  Grid3X3,
  List,
  AlertTriangle,
  Upload,
  Calendar,
  Clock,
  Inbox,
  Trash2,
  Eye,
  Shield,
  Car,
  Receipt,
  Heart,
  BadgeCheck,
  Zap,
  ChevronDown,
} from 'lucide-react';
import { format, addDays, addMonths, differenceInDays } from 'date-fns';

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

// ─── Category Config ─────────────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<DocCategory, {
  gradient: string;
  bg: string;
  darkBg: string;
  text: string;
  darkText: string;
  icon: React.ElementType;
}> = {
  Insurance: {
    gradient: 'from-purple-500 to-purple-600',
    bg: 'bg-purple-50',
    darkBg: 'bg-purple-900/30',
    text: 'text-purple-700',
    darkText: 'text-purple-400',
    icon: Shield,
  },
  Lease: {
    gradient: 'from-blue-500 to-blue-600',
    bg: 'bg-blue-50',
    darkBg: 'bg-blue-900/30',
    text: 'text-blue-700',
    darkText: 'text-blue-400',
    icon: FileText,
  },
  Car: {
    gradient: 'from-amber-500 to-amber-600',
    bg: 'bg-amber-50',
    darkBg: 'bg-amber-900/30',
    text: 'text-amber-700',
    darkText: 'text-amber-400',
    icon: Car,
  },
  Tax: {
    gradient: 'from-green-500 to-green-600',
    bg: 'bg-green-50',
    darkBg: 'bg-green-900/30',
    text: 'text-green-700',
    darkText: 'text-green-400',
    icon: Receipt,
  },
  Medical: {
    gradient: 'from-red-500 to-red-600',
    bg: 'bg-red-50',
    darkBg: 'bg-red-900/30',
    text: 'text-red-700',
    darkText: 'text-red-400',
    icon: Heart,
  },
  Warranty: {
    gradient: 'from-teal-500 to-teal-600',
    bg: 'bg-teal-50',
    darkBg: 'bg-teal-900/30',
    text: 'text-teal-700',
    darkText: 'text-teal-400',
    icon: BadgeCheck,
  },
  Identity: {
    gradient: 'from-indigo-500 to-indigo-600',
    bg: 'bg-indigo-50',
    darkBg: 'bg-indigo-900/30',
    text: 'text-indigo-700',
    darkText: 'text-indigo-400',
    icon: BadgeCheck,
  },
  Other: {
    gradient: 'from-gray-500 to-gray-600',
    bg: 'bg-gray-50',
    darkBg: 'bg-gray-900/30',
    text: 'text-gray-700',
    darkText: 'text-gray-400',
    icon: FileText,
  },
};

const ALL_CATEGORIES: DocCategory[] = ['Insurance', 'Lease', 'Car', 'Tax', 'Medical', 'Warranty', 'Identity', 'Other'];

// ─── Demo Data ───────────────────────────────────────────────────────────────

const today = new Date();

const INITIAL_DOCUMENTS: Document[] = [
  {
    id: 'd1',
    title: 'Passport',
    category: 'Identity',
    fileType: 'PDF',
    issueDate: format(addMonths(today, -54), 'yyyy-MM-dd'),
    expirationDate: format(addMonths(today, 6), 'yyyy-MM-dd'),
    notes: 'US Passport — keep in fireproof safe',
  },
  {
    id: 'd2',
    title: 'Car Insurance Policy',
    category: 'Insurance',
    fileType: 'PDF',
    issueDate: format(addMonths(today, -10), 'yyyy-MM-dd'),
    expirationDate: format(addMonths(today, 2), 'yyyy-MM-dd'),
    notes: 'Progressive — Honda Civic 2021',
  },
  {
    id: 'd3',
    title: 'Apartment Lease Agreement',
    category: 'Lease',
    fileType: 'PDF',
    issueDate: format(addMonths(today, -4), 'yyyy-MM-dd'),
    expirationDate: format(addMonths(today, 8), 'yyyy-MM-dd'),
    notes: 'Apartment 4B — 12 month lease',
  },
  {
    id: 'd4',
    title: 'W-2 Form 2025',
    category: 'Tax',
    fileType: 'PDF',
    issueDate: format(addMonths(today, -2), 'yyyy-MM-dd'),
    notes: 'From employer — filed with accountant',
  },
  {
    id: 'd5',
    title: 'Health Insurance Card',
    category: 'Medical',
    fileType: 'Image',
    issueDate: format(addMonths(today, -6), 'yyyy-MM-dd'),
    expirationDate: format(addMonths(today, 6), 'yyyy-MM-dd'),
    notes: 'Blue Cross Blue Shield — PPO plan',
  },
  {
    id: 'd6',
    title: 'Lab Results — Annual Checkup',
    category: 'Medical',
    fileType: 'PDF',
    issueDate: format(addDays(today, -14), 'yyyy-MM-dd'),
    notes: 'Complete blood panel — all normal',
  },
  {
    id: 'd7',
    title: 'Electricity Bill — March',
    category: 'Other',
    fileType: 'PDF',
    issueDate: format(addDays(today, -3), 'yyyy-MM-dd'),
    notes: '$142.50 — due in 30 days',
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

// ─── Component ───────────────────────────────────────────────────────────────

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>(INITIAL_DOCUMENTS);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [activeCategory, setActiveCategory] = useState<DocCategory | 'All'>('All');
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // New document form state
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<DocCategory>('Other');
  const [newFileType, setNewFileType] = useState('PDF');
  const [newNotes, setNewNotes] = useState('');
  const [newIssueDate, setNewIssueDate] = useState(format(today, 'yyyy-MM-dd'));
  const [newExpirationDate, setNewExpirationDate] = useState('');

  // Dark mode detection
  const [dark, setDark] = useState(false);
  useState(() => {
    if (typeof window !== 'undefined') {
      const isDark = document.documentElement.classList.contains('dark') ||
        window.matchMedia('(prefers-color-scheme: dark)').matches;
      setDark(isDark);
      const observer = new MutationObserver(() => {
        setDark(document.documentElement.classList.contains('dark'));
      });
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    }
  });

  // Filtered documents
  const filteredDocs = useMemo(() => {
    if (activeCategory === 'All') return documents;
    return documents.filter((d) => d.category === activeCategory);
  }, [documents, activeCategory]);

  // Expiring soon docs
  const expiringDocs = useMemo(() => {
    return documents.filter((d) => getExpiryStatus(d) === 'expiring');
  }, [documents]);

  // Styles
  const pageBg = dark ? 'bg-[#0F0F0F]' : 'bg-[#FAFAFA]';
  const cardBg = dark ? 'bg-[#1A1A1A]' : 'bg-white';
  const cardBorder = dark ? 'border-white/5' : 'border-gray-100';
  const textPrimary = dark ? 'text-white' : 'text-gray-900';
  const textSecondary = dark ? 'text-gray-400' : 'text-gray-500';
  const textMuted = dark ? 'text-gray-500' : 'text-gray-400';
  const inputStyle = dark
    ? 'bg-white/5 border-white/10 text-white placeholder-gray-500 focus:border-indigo-500'
    : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-indigo-500';

  // Handlers
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

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className={`min-h-screen ${pageBg} transition-colors duration-300`}>
      <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-8 pb-12">
        {/* ── Header ──────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-lg shadow-indigo-500/25">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <h1 className={`text-3xl font-bold ${textPrimary}`}>Documents</h1>
              </div>
              <p className={`text-sm ${textSecondary} ml-[52px]`}>
                {documents.length} document{documents.length !== 1 ? 's' : ''} stored
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* View Toggle */}
              <div className={`flex items-center rounded-xl border ${cardBorder} ${cardBg} p-1`}>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition-all ${
                    viewMode === 'grid'
                      ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/25'
                      : dark
                      ? 'text-gray-400 hover:text-white'
                      : 'text-gray-400 hover:text-gray-900'
                  }`}
                >
                  <Grid3X3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-all ${
                    viewMode === 'list'
                      ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/25'
                      : dark
                      ? 'text-gray-400 hover:text-white'
                      : 'text-gray-400 hover:text-gray-900'
                  }`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
              {/* Upload Button */}
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => setModalOpen(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 text-white text-sm font-semibold shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-shadow"
              >
                <Upload className="w-4 h-4" />
                Upload Document
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* ── Category Filter Chips ───────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="mb-6 overflow-x-auto scrollbar-hide"
        >
          <div className="flex items-center gap-2 min-w-max">
            {(['All', ...ALL_CATEGORIES] as (DocCategory | 'All')[]).map((cat) => {
              const isActive = activeCategory === cat;
              return (
                <motion.button
                  key={cat}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/25'
                      : dark
                      ? 'text-gray-400 hover:text-white hover:bg-white/5'
                      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  {cat}
                </motion.button>
              );
            })}
          </div>
        </motion.div>

        {/* ── Expiring Soon Alert ─────────────────────────────────────── */}
        {expiringDocs.length > 0 && activeCategory === 'All' && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="mb-8"
          >
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <h2 className={`text-sm font-semibold ${dark ? 'text-amber-400' : 'text-amber-600'}`}>
                Expiring Soon
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {expiringDocs.map((doc, index) => {
                const config = CATEGORY_CONFIG[doc.category];
                const daysLeft = getDaysUntilExpiry(doc);
                return (
                  <motion.div
                    key={doc.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: index * 0.06 }}
                    className={`rounded-2xl border-2 ${
                      dark ? 'border-amber-500/30 bg-amber-900/10' : 'border-amber-300 bg-amber-50/50'
                    } p-4`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl bg-gradient-to-br ${config.gradient}`}>
                        <config.icon className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className={`text-sm font-semibold truncate ${textPrimary}`}>{doc.title}</h3>
                        <p className={`text-xs ${dark ? 'text-amber-400' : 'text-amber-600'}`}>
                          {daysLeft !== null && daysLeft >= 0
                            ? `Expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`
                            : 'Expired'}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ── Loading State ───────────────────────────────────────────── */}
        {loading && (
          <div className={`grid gap-4 ${viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className={`rounded-2xl border ${cardBorder} ${cardBg} p-5 animate-pulse`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl ${dark ? 'bg-white/10' : 'bg-gray-200'}`} />
                  <div className="flex-1 space-y-2">
                    <div className={`h-4 rounded-lg w-2/3 ${dark ? 'bg-white/10' : 'bg-gray-200'}`} />
                    <div className={`h-3 rounded-lg w-1/2 ${dark ? 'bg-white/5' : 'bg-gray-100'}`} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Empty State ─────────────────────────────────────────────── */}
        {!loading && filteredDocs.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className={`rounded-2xl border ${cardBorder} ${cardBg} p-12 text-center`}
          >
            <div className={`inline-flex p-4 rounded-2xl mb-4 ${dark ? 'bg-white/5' : 'bg-gray-50'}`}>
              <Inbox className={`w-10 h-10 ${textMuted}`} />
            </div>
            <h3 className={`text-lg font-semibold mb-2 ${textPrimary}`}>
              {activeCategory === 'All' ? 'No documents yet' : `No ${activeCategory} documents`}
            </h3>
            <p className={`text-sm mb-6 ${textSecondary}`}>
              {activeCategory === 'All'
                ? 'Upload your first document to get started.'
                : `You don\u2019t have any ${activeCategory.toLowerCase()} documents.`}
            </p>
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 text-white text-sm font-semibold shadow-lg shadow-indigo-500/25"
            >
              <Upload className="w-4 h-4" />
              Upload Document
            </motion.button>
          </motion.div>
        )}

        {/* ── Grid View ───────────────────────────────────────────────── */}
        {!loading && filteredDocs.length > 0 && viewMode === 'grid' && (
          <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence mode="popLayout">
              {filteredDocs.map((doc, index) => {
                const config = CATEGORY_CONFIG[doc.category];
                const expiryStatus = getExpiryStatus(doc);
                const daysLeft = getDaysUntilExpiry(doc);
                return (
                  <motion.div
                    key={doc.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                    transition={{ duration: 0.35, delay: index * 0.06 }}
                    className={`group rounded-2xl border ${cardBorder} ${cardBg} p-5 transition-all hover:shadow-lg ${
                      dark ? 'hover:border-white/10' : 'hover:border-gray-200 hover:shadow-gray-200/50'
                    }`}
                  >
                    {/* File Icon */}
                    <div className="flex items-start justify-between mb-4">
                      <div className={`p-3 rounded-xl bg-gradient-to-br ${config.gradient} shadow-lg`}>
                        <config.icon className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          className={`p-1.5 rounded-lg transition-colors ${
                            dark ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-gray-100 text-gray-400'
                          }`}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteDocument(doc.id)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            dark ? 'hover:bg-red-900/30 text-gray-400 hover:text-red-400' : 'hover:bg-red-50 text-gray-400 hover:text-red-500'
                          }`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Title */}
                    <h3 className={`text-base font-semibold mb-2 ${textPrimary}`}>{doc.title}</h3>

                    {/* Category Badge */}
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${
                          dark ? `${config.darkBg} ${config.darkText}` : `${config.bg} ${config.text}`
                        }`}
                      >
                        {doc.category}
                      </span>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${
                          dark ? 'bg-white/5 text-gray-400' : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {doc.fileType}
                      </span>
                    </div>

                    {/* Dates */}
                    <div className="space-y-1">
                      <p className={`text-xs flex items-center gap-1.5 ${textSecondary}`}>
                        <Calendar className="w-3 h-3" />
                        Issued {format(new Date(doc.issueDate), 'MMM d, yyyy')}
                      </p>
                      {doc.expirationDate && (
                        <p
                          className={`text-xs flex items-center gap-1.5 ${
                            expiryStatus === 'expired'
                              ? dark ? 'text-red-400' : 'text-red-500'
                              : expiryStatus === 'expiring'
                              ? dark ? 'text-amber-400' : 'text-amber-600'
                              : textSecondary
                          }`}
                        >
                          <Clock className="w-3 h-3" />
                          {expiryStatus === 'expired'
                            ? 'Expired'
                            : `Expires ${format(new Date(doc.expirationDate), 'MMM d, yyyy')}`}
                          {daysLeft !== null && daysLeft >= 0 && daysLeft <= 60 && (
                            <span className="font-medium">({daysLeft}d)</span>
                          )}
                        </p>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}

        {/* ── List View ───────────────────────────────────────────────── */}
        {!loading && filteredDocs.length > 0 && viewMode === 'list' && (
          <motion.div layout className="space-y-3">
            <AnimatePresence mode="popLayout">
              {filteredDocs.map((doc, index) => {
                const config = CATEGORY_CONFIG[doc.category];
                const expiryStatus = getExpiryStatus(doc);
                const daysLeft = getDaysUntilExpiry(doc);
                return (
                  <motion.div
                    key={doc.id}
                    layout
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -40, transition: { duration: 0.2 } }}
                    transition={{ duration: 0.35, delay: index * 0.05 }}
                    className={`group rounded-2xl border ${cardBorder} ${cardBg} p-4 transition-all hover:shadow-lg ${
                      dark ? 'hover:border-white/10' : 'hover:border-gray-200 hover:shadow-gray-200/50'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-2.5 rounded-xl bg-gradient-to-br ${config.gradient} flex-shrink-0`}>
                        <config.icon className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className={`text-sm font-semibold truncate ${textPrimary}`}>{doc.title}</h3>
                        {doc.notes && (
                          <p className={`text-xs truncate mt-0.5 ${textMuted}`}>{doc.notes}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span
                          className={`hidden sm:inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${
                            dark ? `${config.darkBg} ${config.darkText}` : `${config.bg} ${config.text}`
                          }`}
                        >
                          {doc.category}
                        </span>
                        <span className={`hidden md:inline-flex text-xs ${textSecondary}`}>
                          {format(new Date(doc.issueDate), 'MMM d, yyyy')}
                        </span>
                        {doc.expirationDate && (
                          <span
                            className={`hidden lg:inline-flex text-xs ${
                              expiryStatus === 'expiring'
                                ? dark ? 'text-amber-400' : 'text-amber-600'
                                : expiryStatus === 'expired'
                                ? dark ? 'text-red-400' : 'text-red-500'
                                : textMuted
                            }`}
                          >
                            {expiryStatus === 'expired' ? 'Expired' : `Exp: ${format(new Date(doc.expirationDate), 'MMM yyyy')}`}
                            {daysLeft !== null && daysLeft >= 0 && daysLeft <= 60 && ` (${daysLeft}d)`}
                          </span>
                        )}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => deleteDocument(doc.id)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              dark ? 'hover:bg-red-900/30 text-gray-400 hover:text-red-400' : 'hover:bg-red-50 text-gray-400 hover:text-red-500'
                            }`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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
      </div>

      {/* ── Upload Document Modal ──────────────────────────────────────── */}
      <AnimatePresence>
        {modalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setModalOpen(false)}
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="fixed z-50 inset-x-4 top-[5%] sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-lg"
            >
              <div className={`rounded-2xl ${cardBg} border ${cardBorder} shadow-2xl overflow-hidden flex flex-col max-h-[90vh]`}>
                {/* Modal Header */}
                <div className={`flex items-center justify-between px-6 py-4 border-b ${cardBorder}`}>
                  <h2 className={`text-lg font-semibold ${textPrimary}`}>Upload Document</h2>
                  <button
                    onClick={() => setModalOpen(false)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      dark ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
                    }`}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                  {/* Title */}
                  <div>
                    <label className={`block text-sm font-medium mb-1.5 ${textPrimary}`}>
                      Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="Document title"
                      className={`w-full px-4 py-2.5 rounded-xl border text-sm transition-colors outline-none ${inputStyle}`}
                    />
                  </div>

                  {/* Category + File Type */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-sm font-medium mb-1.5 ${textPrimary}`}>Category</label>
                      <select
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value as DocCategory)}
                        className={`w-full px-4 py-2.5 rounded-xl border text-sm transition-colors outline-none appearance-none cursor-pointer ${inputStyle}`}
                      >
                        {ALL_CATEGORIES.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-1.5 ${textPrimary}`}>File Type</label>
                      <select
                        value={newFileType}
                        onChange={(e) => setNewFileType(e.target.value)}
                        className={`w-full px-4 py-2.5 rounded-xl border text-sm transition-colors outline-none appearance-none cursor-pointer ${inputStyle}`}
                      >
                        {['PDF', 'Image', 'Word', 'Spreadsheet', 'Other'].map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Issue Date + Expiration Date */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-sm font-medium mb-1.5 ${textPrimary}`}>Issue Date</label>
                      <input
                        type="date"
                        value={newIssueDate}
                        onChange={(e) => setNewIssueDate(e.target.value)}
                        className={`w-full px-4 py-2.5 rounded-xl border text-sm transition-colors outline-none ${inputStyle}`}
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-1.5 ${textPrimary}`}>Expiration Date</label>
                      <input
                        type="date"
                        value={newExpirationDate}
                        onChange={(e) => setNewExpirationDate(e.target.value)}
                        className={`w-full px-4 py-2.5 rounded-xl border text-sm transition-colors outline-none ${inputStyle}`}
                      />
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className={`block text-sm font-medium mb-1.5 ${textPrimary}`}>Notes</label>
                    <textarea
                      value={newNotes}
                      onChange={(e) => setNewNotes(e.target.value)}
                      placeholder="Additional notes..."
                      rows={3}
                      className={`w-full px-4 py-2.5 rounded-xl border text-sm transition-colors outline-none resize-none ${inputStyle}`}
                    />
                  </div>
                </div>

                {/* Modal Footer */}
                <div className={`flex items-center justify-end gap-3 px-6 py-4 border-t ${cardBorder}`}>
                  <button
                    onClick={() => { resetForm(); setModalOpen(false); }}
                    className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      dark ? 'text-gray-400 hover:text-white hover:bg-white/10' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    Cancel
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={addDocument}
                    disabled={!newTitle.trim()}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 text-white text-sm font-semibold shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-shadow disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <span className="flex items-center gap-2">
                      <Upload className="w-4 h-4" />
                      Upload
                    </span>
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
