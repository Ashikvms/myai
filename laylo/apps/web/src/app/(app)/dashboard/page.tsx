'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckSquare,
  CreditCard,
  DollarSign,
  Calendar,
  Plus,
  Upload,
  Sparkles,
  AlertTriangle,
  Info,
  AlertCircle,
  Bell,
  FileText,
  Clock,
  Zap,
  TrendingUp,
  Shield,
  Check,
  Monitor,
  Smartphone,
  Loader2,
  Inbox,
  Sun,
  Moon,
} from 'lucide-react';
import { format } from 'date-fns';
import {
  ConnectedAccountsCard,
  RecentTransactionsCard,
} from '@/components/banking/dashboard-widgets';

// ─── Types ───────────────────────────────────────────────────────────
type ViewState = 'default' | 'dark' | 'mobile' | 'loading' | 'empty';

// ─── Demo Data ───────────────────────────────────────────────────────
const DEMO_TASKS = [
  {
    id: '1',
    title: 'Renew car insurance policy',
    priority: 'high' as const,
    category: 'Insurance',
    dueDate: '2026-03-17',
    completed: false,
  },
  {
    id: '2',
    title: 'Schedule annual dental checkup',
    priority: 'medium' as const,
    category: 'Health',
    dueDate: '2026-03-20',
    completed: false,
  },
  {
    id: '3',
    title: 'File quarterly tax documents',
    priority: 'high' as const,
    category: 'Finance',
    dueDate: '2026-03-15',
    completed: true,
  },
];

const DEMO_BILLS = [
  {
    id: '1',
    name: 'Electric Bill',
    amount: 142.5,
    dueDate: '2026-03-18',
    autopay: false,
  },
  {
    id: '2',
    name: 'Internet Service',
    amount: 79.99,
    dueDate: '2026-03-20',
    autopay: true,
  },
];

const DEMO_REMINDERS = [
  {
    id: '1',
    title: 'Pick up dry cleaning',
    time: 'Today, 5:00 PM',
    type: 'personal',
  },
  {
    id: '2',
    title: 'Call dentist for appointment',
    time: 'Tomorrow, 10:00 AM',
    type: 'health',
  },
  {
    id: '3',
    title: 'Submit expense report',
    time: 'Wed, 9:00 AM',
    type: 'work',
  },
];

const DEMO_DOCUMENTS = [
  {
    id: '1',
    name: 'Car Insurance Policy.pdf',
    category: 'Insurance',
    date: '2026-03-10',
  },
  {
    id: '2',
    name: 'Tax Return 2025.pdf',
    category: 'Finance',
    date: '2026-03-08',
  },
  {
    id: '3',
    name: 'Lease Agreement.pdf',
    category: 'Housing',
    date: '2026-03-01',
  },
];

const DEMO_INSIGHTS = [
  {
    id: '1',
    message: 'Gym membership renews in 3 days — still worth it?',
    type: 'warning' as const,
    icon: AlertTriangle,
    color: 'amber',
    badge: 'Review',
  },
  {
    id: '2',
    message: 'Monthly subscriptions total $78.47 — up 12% from last month',
    type: 'info' as const,
    icon: TrendingUp,
    color: 'blue',
    badge: 'Insight',
  },
  {
    id: '3',
    message: 'Your car insurance policy expires in 2 months',
    type: 'danger' as const,
    icon: Shield,
    color: 'rose',
    badge: 'Action Needed',
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

// ─── Skeleton Component ──────────────────────────────────────────────
function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded-lg ${className}`} />
  );
}

function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-white dark:bg-card-dark rounded-xl border border-gray-200/60 dark:border-gray-700/30 p-5 ${className}`}>
      <div className="flex items-center gap-3 mb-4">
        <Skeleton className="w-10 h-10 rounded-xl" />
        <div className="flex-1">
          <Skeleton className="h-3 w-20 mb-2" />
          <Skeleton className="h-6 w-12" />
        </div>
      </div>
    </div>
  );
}

// ─── Empty State Component ───────────────────────────────────────────
function EmptyState({ icon: Icon, title, subtitle }: { icon: React.ElementType; title: string; subtitle: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
        <Icon className="w-6 h-6 text-gray-400" />
      </div>
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{subtitle}</p>
    </div>
  );
}

// ─── Priority Badge ──────────────────────────────────────────────────
function PriorityBadge({ priority }: { priority: 'high' | 'medium' | 'low' }) {
  const styles = {
    high: 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400',
    medium: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400',
    low: 'bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400',
  };
  return (
    <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md ${styles[priority]}`}>
      {priority}
    </span>
  );
}

// ─── Category Badge ──────────────────────────────────────────────────
function CategoryBadge({ category }: { category: string }) {
  return (
    <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400">
      {category}
    </span>
  );
}

// ─── Greeting ────────────────────────────────────────────────────────
function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

// ─── Main Page ───────────────────────────────────────────────────────
export default function DashboardPage() {
  const [viewState, setViewState] = useState<ViewState>('default');
  const [taskChecked, setTaskChecked] = useState<Record<string, boolean>>({
    '3': true,
  });

  const isDark = viewState === 'dark';
  const isLoading = viewState === 'loading';
  const isEmpty = viewState === 'empty';
  const isMobile = viewState === 'mobile';

  // Toggle dark class on html when dark mode state changes
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

  const toggleTask = (id: string) => {
    setTaskChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toolbarButtons: { label: string; state: ViewState; icon: React.ElementType }[] = [
    { label: 'Default', state: 'default', icon: Monitor },
    { label: 'Dark Mode', state: 'dark', icon: Moon },
    { label: 'Mobile', state: 'mobile', icon: Smartphone },
    { label: 'Loading', state: 'loading', icon: Loader2 },
    { label: 'Empty', state: 'empty', icon: Inbox },
  ];

  const dashboardContent = (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="max-w-6xl mx-auto space-y-6"
    >
      {/* ── Greeting ─────────────────────────────────────────── */}
      <motion.div variants={itemVariants}>
        {isLoading ? (
          <div>
            <Skeleton className="h-9 w-64 mb-2" />
            <Skeleton className="h-5 w-80" />
          </div>
        ) : (
          <div>
            <h1 className="text-3xl font-bold">
              <span className="gradient-text">{getGreeting()}, Alex</span>
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Here&apos;s what needs your attention today
            </p>
          </div>
        )}
      </motion.div>

      {/* ── Stats Row ────────────────────────────────────────── */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            {[
              {
                label: 'Pending Tasks',
                value: isEmpty ? '0' : '5',
                icon: CheckSquare,
                gradient: 'from-blue-500 to-cyan-500',
                bgOverlay: 'from-blue-500/5 to-transparent',
              },
              {
                label: 'Bills Due Soon',
                value: isEmpty ? '0' : '2',
                icon: CreditCard,
                gradient: 'from-rose-500 to-pink-500',
                bgOverlay: 'from-rose-500/5 to-transparent',
              },
              {
                label: 'Monthly Subs',
                value: isEmpty ? '$0.00' : '$78.47',
                icon: DollarSign,
                gradient: 'from-purple-500 to-violet-500',
                bgOverlay: 'from-purple-500/5 to-transparent',
              },
              {
                label: 'Appointments',
                value: isEmpty ? '0' : '2',
                icon: Calendar,
                gradient: 'from-amber-500 to-orange-500',
                bgOverlay: 'from-amber-500/5 to-transparent',
              },
            ].map((stat) => (
              <motion.div
                key={stat.label}
                whileHover={{ y: -2, scale: 1.01 }}
                transition={{ duration: 0.2 }}
                className="relative overflow-hidden bg-white dark:bg-card-dark rounded-xl border border-gray-200/60 dark:border-gray-700/30 p-5"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${stat.bgOverlay} pointer-events-none`} />
                <div className="relative flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center flex-shrink-0`}>
                    <stat.icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{stat.label}</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">{stat.value}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </>
        )}
      </motion.div>

      {/* ── Quick Actions ────────────────────────────────────── */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Add Task', icon: Plus, gradient: 'from-blue-500 to-cyan-500' },
          { label: 'Add Bill', icon: CreditCard, gradient: 'from-rose-500 to-pink-500' },
          { label: 'Upload Doc', icon: Upload, gradient: 'from-emerald-500 to-teal-500' },
          { label: 'Ask AI', icon: Sparkles, gradient: 'from-primary-500 to-purple-500' },
        ].map((action) => (
          <motion.button
            key={action.label}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white dark:bg-card-dark border border-gray-200/60 dark:border-gray-700/30 hover:shadow-lg hover:shadow-gray-200/50 dark:hover:shadow-black/20 transition-shadow"
          >
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${action.gradient} flex items-center justify-center`}>
              <action.icon className="w-5 h-5 text-white" />
            </div>
            <span className="text-xs font-medium text-gray-600 dark:text-gray-300">{action.label}</span>
          </motion.button>
        ))}
      </motion.div>

      {/* ── Banking Widgets (live data) ──────────────────────── */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1">
          <ConnectedAccountsCard />
        </div>
        <div className="lg:col-span-2">
          <RecentTransactionsCard />
        </div>
      </motion.div>

      {/* ── AI Insights ──────────────────────────────────────── */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-primary-500" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">AI Insights</h2>
        </div>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : isEmpty ? (
          <div className="bg-white dark:bg-card-dark rounded-xl border border-gray-200/60 dark:border-gray-700/30">
            <EmptyState icon={Sparkles} title="No insights yet" subtitle="AI insights will appear as you add more data" />
          </div>
        ) : (
          <div className="space-y-3">
            {DEMO_INSIGHTS.map((insight, index) => {
              const colorMap: Record<string, { border: string; bg: string; badge: string; text: string }> = {
                amber: {
                  border: 'border-l-amber-500',
                  bg: 'bg-amber-50/50 dark:bg-amber-500/5',
                  badge: 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400',
                  text: 'text-amber-600 dark:text-amber-400',
                },
                blue: {
                  border: 'border-l-blue-500',
                  bg: 'bg-blue-50/50 dark:bg-blue-500/5',
                  badge: 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400',
                  text: 'text-blue-600 dark:text-blue-400',
                },
                rose: {
                  border: 'border-l-rose-500',
                  bg: 'bg-rose-50/50 dark:bg-rose-500/5',
                  badge: 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400',
                  text: 'text-rose-600 dark:text-rose-400',
                },
              };
              const colors = colorMap[insight.color]!;
              return (
                <motion.div
                  key={insight.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`flex items-start gap-3 p-4 rounded-xl border-l-4 ${colors.border} ${colors.bg} bg-white dark:bg-card-dark border border-gray-200/60 dark:border-gray-700/30`}
                >
                  <insight.icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${colors.text}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-snug">{insight.message}</p>
                    <span className={`inline-block text-[10px] font-semibold px-2.5 py-0.5 rounded-md mt-2 ${colors.badge}`}>
                      {insight.badge}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* ── Today's Tasks ──────────────────────────────────── */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center gap-2 mb-4">
          <CheckSquare className="w-5 h-5 text-blue-500" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Today&apos;s Tasks</h2>
          {!isEmpty && !isLoading && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400">
              {DEMO_TASKS.length}
            </span>
          )}
        </div>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white dark:bg-card-dark rounded-xl border border-gray-200/60 dark:border-gray-700/30 p-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-5 h-5 rounded" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-3/4 mb-2" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : isEmpty ? (
          <div className="bg-white dark:bg-card-dark rounded-xl border border-gray-200/60 dark:border-gray-700/30">
            <EmptyState icon={CheckSquare} title="No tasks yet" subtitle="Create your first task to get started" />
          </div>
        ) : (
          <div className="space-y-3">
            {DEMO_TASKS.map((task, index) => {
              const isChecked = taskChecked[task.id] || false;
              return (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.08 }}
                  whileHover={{ y: -2 }}
                  className={`bg-white dark:bg-card-dark rounded-xl border border-gray-200/60 dark:border-gray-700/30 p-4 transition-all ${
                    isChecked ? 'opacity-50' : 'hover:border-primary-200 dark:hover:border-primary-500/30'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => toggleTask(task.id)}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                        isChecked
                          ? 'bg-primary-500 border-primary-500'
                          : 'border-gray-300 dark:border-gray-600 hover:border-primary-400'
                      }`}
                    >
                      {isChecked && <Check className="w-3 h-3 text-white" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold text-gray-900 dark:text-white leading-snug ${isChecked ? 'line-through' : ''}`}>
                        {task.title}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-2.5">
                        <PriorityBadge priority={task.priority} />
                        <CategoryBadge category={task.category} />
                        <span className="flex items-center gap-1 text-[11px] font-medium text-gray-400">
                          <Clock className="w-3 h-3" />
                          {format(new Date(task.dueDate), 'MMM d')}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* ── Bills Due This Week ─────────────────────────────── */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center gap-2 mb-4">
          <CreditCard className="w-5 h-5 text-rose-500" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Due This Week</h2>
        </div>
        {isLoading ? (
          <div className="grid sm:grid-cols-2 gap-3">
            <SkeletonCard className="h-28" />
            <SkeletonCard className="h-28" />
          </div>
        ) : isEmpty ? (
          <div className="bg-white dark:bg-card-dark rounded-xl border border-gray-200/60 dark:border-gray-700/30">
            <EmptyState icon={CreditCard} title="No bills due" subtitle="You're all caught up!" />
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {DEMO_BILLS.map((bill, index) => (
              <motion.div
                key={bill.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08 }}
                whileHover={{ y: -2 }}
                className="bg-white dark:bg-card-dark rounded-xl border border-gray-200/60 dark:border-gray-700/30 p-5 hover:border-rose-200 dark:hover:border-rose-500/30 transition-colors"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                    <DollarSign className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{bill.name}</p>
                    <p className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3 h-3" />
                      Due {format(new Date(bill.dueDate), 'EEEE, MMM d')}
                    </p>
                  </div>
                </div>
                <div className="flex items-end justify-between">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    ${bill.amount.toFixed(2)}
                  </p>
                  {bill.autopay ? (
                    <span className="text-[10px] font-semibold px-2.5 py-1 rounded-lg bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      Autopay
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400">
                      Manual payment
                    </span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* ── Upcoming Reminders ──────────────────────────────── */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center gap-2 mb-4">
          <Bell className="w-5 h-5 text-primary-500" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Upcoming Reminders</h2>
        </div>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white dark:bg-card-dark rounded-xl border border-gray-200/60 dark:border-gray-700/30 p-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-10 h-10 rounded-xl" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-2/3 mb-2" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : isEmpty ? (
          <div className="bg-white dark:bg-card-dark rounded-xl border border-gray-200/60 dark:border-gray-700/30">
            <EmptyState icon={Bell} title="No reminders" subtitle="Set reminders so you never miss anything" />
          </div>
        ) : (
          <div className="space-y-3">
            {DEMO_REMINDERS.map((reminder, index) => {
              const typeConfig: Record<string, { bg: string; icon: string; gradient: string }> = {
                personal: {
                  bg: 'bg-cyan-50 dark:bg-cyan-500/10',
                  icon: 'text-cyan-500',
                  gradient: 'from-cyan-500 to-teal-500',
                },
                health: {
                  bg: 'bg-green-50 dark:bg-green-500/10',
                  icon: 'text-green-500',
                  gradient: 'from-green-500 to-emerald-500',
                },
                work: {
                  bg: 'bg-indigo-50 dark:bg-indigo-500/10',
                  icon: 'text-indigo-500',
                  gradient: 'from-indigo-500 to-violet-500',
                },
              };
              const config = typeConfig[reminder.type] || typeConfig.personal!;
              return (
                <motion.div
                  key={reminder.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.08 }}
                  whileHover={{ y: -2 }}
                  className="bg-white dark:bg-card-dark rounded-xl border border-gray-200/60 dark:border-gray-700/30 p-4 hover:border-primary-200 dark:hover:border-primary-500/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${config.gradient} flex items-center justify-center flex-shrink-0`}>
                      <Bell className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white leading-snug">
                        {reminder.title}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-1.5">
                        <span className="text-[11px] text-gray-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {reminder.time}
                        </span>
                        <span className={`text-[10px] font-semibold capitalize px-2 py-0.5 rounded-md ${config.bg} ${config.icon}`}>
                          {reminder.type}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* ── Recent Documents ────────────────────────────────── */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5 text-rose-500" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Documents</h2>
        </div>
        {isLoading ? (
          <div className="grid sm:grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white dark:bg-card-dark rounded-xl border border-gray-200/60 dark:border-gray-700/30 p-4">
                <Skeleton className="w-12 h-12 rounded-xl mb-3" />
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        ) : isEmpty ? (
          <div className="bg-white dark:bg-card-dark rounded-xl border border-gray-200/60 dark:border-gray-700/30">
            <EmptyState icon={FileText} title="No documents yet" subtitle="Upload documents to keep them organized" />
          </div>
        ) : (
          <div className="grid sm:grid-cols-3 gap-3">
            {DEMO_DOCUMENTS.map((doc, index) => {
              const docConfig: Record<string, { gradient: string }> = {
                Insurance: { gradient: 'from-purple-500 to-violet-500' },
                Finance: { gradient: 'from-blue-500 to-cyan-500' },
                Housing: { gradient: 'from-amber-500 to-orange-500' },
              };
              const config = docConfig[doc.category] || { gradient: 'from-rose-500 to-pink-500' };
              return (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.08 }}
                  whileHover={{ y: -2 }}
                  className="bg-white dark:bg-card-dark rounded-xl border border-gray-200/60 dark:border-gray-700/30 p-4 hover:border-primary-200 dark:hover:border-primary-500/30 transition-colors"
                >
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${config.gradient} flex items-center justify-center mb-3`}>
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white leading-snug">
                    {doc.name}
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    <CategoryBadge category={doc.category} />
                    <span className="text-[11px] text-gray-400">
                      {format(new Date(doc.date), 'MMM d')}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>
    </motion.div>
  );

  return (
    <>
      {/* ── State Toolbar ──────────────────────────────────── */}
      <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50">
        <div className="flex items-center gap-1 bg-gray-900 rounded-full px-2 py-1.5 shadow-xl shadow-black/20">
          {toolbarButtons.map((btn) => (
            <button
              key={btn.state}
              onClick={() => setViewState(btn.state)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                viewState === btn.state
                  ? 'bg-white text-gray-900'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <btn.icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{btn.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ────────────────────────────────────────── */}
      {isMobile ? (
        <div className="flex justify-center pt-14">
          <div className="w-[375px] min-h-[812px] border-[3px] border-gray-800 dark:border-gray-600 rounded-[2.5rem] overflow-hidden bg-surface-light dark:bg-surface-dark shadow-2xl shadow-black/30 relative">
            {/* Phone notch */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-36 h-7 bg-gray-800 dark:bg-gray-600 rounded-b-2xl z-10" />
            <div className="pt-10 px-4 pb-4 overflow-y-auto max-h-[812px]">
              {dashboardContent}
            </div>
            {/* Home indicator */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-gray-800 dark:bg-gray-600 rounded-full" />
          </div>
        </div>
      ) : (
        <div className="pt-10">
          {dashboardContent}
        </div>
      )}
    </>
  );
}
