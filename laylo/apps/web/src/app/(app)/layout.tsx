'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useThemeTransition } from '@/lib/use-theme-transition';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  LayoutDashboard,
  CheckSquare,
  Wallet,
  Vault,
  Settings,
  Search,
  Sun,
  Moon,
  Menu,
  ChevronLeft,
  Bell,
  LogOut,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

// 5-item nav per REDESIGN_BRIEF.md §3.1
const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Money', href: '/money', icon: Wallet },
  { label: 'Tasks', href: '/tasks', icon: CheckSquare },
  { label: 'Vault', href: '/vault', icon: Vault },
  { label: 'Settings', href: '/settings', icon: Settings },
];

// Sub-routes that should highlight a hub item
const HUB_MATCHERS: Record<string, RegExp> = {
  '/money': /^\/(bills|transactions|settings\/banks)/,
  '/vault': /^\/(documents|reminders|appointments)/,
};

function isNavActive(itemHref: string, pathname: string): boolean {
  if (pathname === itemHref) return true;
  if (pathname.startsWith(itemHref + '/')) return true;
  const matcher = HUB_MATCHERS[itemHref];
  if (matcher && matcher.test(pathname)) return true;
  return false;
}

function ThemeToggle() {
  const { isDark, mounted, toggleTheme } = useThemeTransition();
  if (!mounted) return <div className="w-9 h-9" />;
  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-[8px] hover:bg-[var(--color-surface-hover)] transition-colors"
      aria-label="Toggle theme"
    >
      {isDark ? (
        <Sun className="w-5 h-5 text-[var(--color-text-muted)]" strokeWidth={1.75} />
      ) : (
        <Moon className="w-5 h-5 text-[var(--color-text-muted)]" strokeWidth={1.75} />
      )}
    </button>
  );
}

function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, isLoading, isAuthenticated, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const initials = user?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center">
        <div className="w-10 h-10 rounded-[16px] bg-[var(--color-accent)] flex items-center justify-center animate-pulse">
          <Sparkles className="w-5 h-5 text-[var(--color-text-on-accent)]" strokeWidth={1.75} />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // AuthProvider handles redirect
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex">
      {/* Desktop Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: sidebarOpen ? 240 : 72 }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        className="hidden lg:flex flex-col fixed top-0 left-0 h-screen z-40 bg-[var(--color-surface)] border-r border-[var(--color-border)]"
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-[16px] bg-[var(--color-accent)] flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-[var(--color-text-on-accent)]" strokeWidth={1.75} />
            </div>
            <AnimatePresence>
              {sidebarOpen && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  className="font-semibold text-[var(--color-text)] whitespace-nowrap overflow-hidden text-[16px]"
                >
                  Laylo
                </motion.span>
              )}
            </AnimatePresence>
          </Link>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-[8px] hover:bg-[var(--color-surface-hover)] transition-colors"
            aria-label="Toggle sidebar"
          >
            <motion.div animate={{ rotate: sidebarOpen ? 0 : 180 }} transition={{ duration: 0.3 }}>
              <ChevronLeft className="w-4 h-4 text-[var(--color-text-muted)]" strokeWidth={1.75} />
            </motion.div>
          </button>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = isNavActive(item.href, pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-[8px] transition-all group relative text-[13px] font-medium ${
                  isActive
                    ? 'text-[var(--color-text)] bg-[var(--color-surface-hover)]'
                    : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[4px] h-6 bg-[var(--color-accent)] rounded-r-full"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <item.icon className="w-5 h-5 flex-shrink-0" strokeWidth={1.75} />
                <AnimatePresence>
                  {sidebarOpen && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      className="whitespace-nowrap overflow-hidden"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="p-3 border-t border-[var(--color-border)]">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-[var(--color-surface-2)] flex items-center justify-center flex-shrink-0">
              <span className="text-[11px] font-semibold text-[var(--color-text-muted)]">{initials}</span>
            </div>
            <AnimatePresence>
              {sidebarOpen && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  className="flex-1 overflow-hidden"
                >
                  <p className="text-[13px] font-medium text-[var(--color-text)] whitespace-nowrap truncate">{user?.name}</p>
                  <p className="text-[11px] text-[var(--color-text-subtle)] whitespace-nowrap truncate">{user?.email}</p>
                </motion.div>
              )}
            </AnimatePresence>
            {sidebarOpen && (
              <button
                onClick={logout}
                className="p-1.5 rounded-[8px] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-colors"
                title="Sign out"
                aria-label="Sign out"
              >
                <LogOut className="w-4 h-4" strokeWidth={1.75} />
              </button>
            )}
          </div>
        </div>
      </motion.aside>

      {/* Main content area */}
      <div
        className="flex-1 flex flex-col min-h-screen transition-all duration-300"
        style={{ marginLeft: typeof window !== 'undefined' && window.innerWidth >= 1024 ? (sidebarOpen ? 240 : 72) : 0 }}
      >
        {/* Top bar */}
        <header className="sticky top-0 z-30 h-16 bg-[var(--color-surface)] border-b border-[var(--color-border)] flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-[8px] hover:bg-[var(--color-surface-hover)] transition-colors"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5 text-[var(--color-text-muted)]" strokeWidth={1.75} />
            </button>
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-subtle)]" strokeWidth={1.75} />
              <input
                type="text"
                placeholder="Search anything..."
                className="w-64 pl-10 pr-4 py-2 text-[13px] bg-[var(--color-surface-2)] border-0 rounded-[8px] text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              className="p-2 rounded-[8px] hover:bg-[var(--color-surface-hover)] transition-colors relative"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5 text-[var(--color-text-muted)]" strokeWidth={1.75} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[var(--color-accent)] rounded-full" />
            </button>
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="w-8 h-8 rounded-full bg-[var(--color-surface-2)] flex items-center justify-center ml-1"
                aria-label="User menu"
              >
                <span className="text-[11px] font-semibold text-[var(--color-text-muted)]">{initials}</span>
              </button>
              <AnimatePresence>
                {userMenuOpen && (
                  <>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 z-40"
                      onClick={() => setUserMenuOpen(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.96, y: -5 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.96, y: -5 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-12 w-56 z-50 bg-[var(--color-surface)] rounded-[16px] border border-[var(--color-border-strong)] shadow-md p-2"
                    >
                      <div className="px-3 py-2 border-b border-[var(--color-border)] mb-1">
                        <p className="text-[13px] font-medium text-[var(--color-text)] truncate">{user?.name}</p>
                        <p className="text-[11px] text-[var(--color-text-subtle)] truncate">{user?.email}</p>
                      </div>
                      <Link
                        href="/settings"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-[13px] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)] rounded-[8px] transition-colors"
                      >
                        <Settings className="w-4 h-4" strokeWidth={1.75} />
                        Settings
                      </Link>
                      <button
                        onClick={() => { setUserMenuOpen(false); logout(); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-[var(--color-danger)] hover:bg-[var(--color-surface-hover)] rounded-[8px] transition-colors"
                      >
                        <LogOut className="w-4 h-4" strokeWidth={1.75} />
                        Sign out
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-8 pb-24 lg:pb-8">
          {children}
        </main>
      </div>

      {/* Mobile bottom tabs */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--color-surface)] border-t border-[var(--color-border)] px-2 pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around h-16">
          {NAV_ITEMS.map((item) => {
            const isActive = isNavActive(item.href, pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-[8px] transition-colors ${
                  isActive ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                }`}
              >
                <item.icon className="w-5 h-5" strokeWidth={1.75} />
                <span className="text-[11px] font-semibold uppercase tracking-wider">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Mobile slide-out menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 bg-[var(--color-overlay)] z-40"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', stiffness: 400, damping: 35 }}
              className="lg:hidden fixed top-0 left-0 w-[280px] h-full z-50 bg-[var(--color-surface)] border-r border-[var(--color-border)] p-4"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-9 h-9 rounded-[16px] bg-[var(--color-accent)] flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-[var(--color-text-on-accent)]" strokeWidth={1.75} />
                </div>
                <span className="font-semibold text-[var(--color-text)]">Laylo</span>
              </div>
              <nav className="space-y-1">
                {NAV_ITEMS.map((item) => {
                  const isActive = isNavActive(item.href, pathname);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-[8px] transition-colors text-[13px] font-medium ${
                        isActive
                          ? 'bg-[var(--color-surface-hover)] text-[var(--color-text)]'
                          : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]'
                      }`}
                    >
                      <item.icon className="w-5 h-5" strokeWidth={1.75} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
