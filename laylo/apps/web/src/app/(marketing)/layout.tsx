'use client';

/**
 * Marketing layout — REDESIGN_BRIEF.md §2.10.
 * - "Life Admin AI" → "Beedo".
 * - Indigo→purple gradients → flat gold.
 */
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, X, Sun, Moon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useThemeTransition } from '@/lib/use-theme-transition';
import { BeeStanding } from '@/components/illustrations/bee';

function ThemeToggleButton() {
  const { isDark, mounted, toggleTheme } = useThemeTransition();
  if (!mounted) return <div className="w-9 h-9" />;
  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-[8px] hover:bg-[var(--color-surface-hover)] transition-colors text-[var(--color-text-muted)]"
      aria-label="Toggle theme"
    >
      {isDark ? <Sun className="w-5 h-5" strokeWidth={1.75} /> : <Moon className="w-5 h-5" strokeWidth={1.75} />}
    </button>
  );
}

function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navLinks = [
    { label: 'Features', href: '#features' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'FAQ', href: '#faq' },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-[var(--color-bg)]/80 backdrop-blur-xl border-b border-[var(--color-border)]'
          : 'bg-transparent'
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-[16px] bg-[var(--color-accent)]">
              <BeeStanding size={28} className="on-accent" />
            </div>
            <span className="text-[16px] leading-[22px] font-bold text-[var(--color-text)]">Beedo</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-[13px] font-medium text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <ThemeToggleButton />
            <Link
              href="/login"
              className="text-[13px] font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors px-4 py-2"
            >
              Welcome back
            </Link>
            <Link
              href="#pricing"
              className="inline-flex items-center justify-center rounded-[16px] bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] px-5 h-10 text-[15px] font-semibold text-[var(--color-text-on-accent)] transition-colors"
            >
              Join the hive
            </Link>
          </div>

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden flex items-center justify-center h-10 w-10 rounded-[8px] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] transition-colors"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" strokeWidth={1.75} /> : <Menu className="h-5 w-5" strokeWidth={1.75} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden overflow-hidden bg-[var(--color-bg)]/95 backdrop-blur-xl border-b border-[var(--color-border)]"
          >
            <div className="px-4 py-4 space-y-3">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="block text-[15px] font-medium text-[var(--color-text-muted)] hover:text-[var(--color-accent)] py-2"
                >
                  {link.label}
                </a>
              ))}
              <hr className="border-[var(--color-border)]" />
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="block text-[15px] font-medium text-[var(--color-text-muted)] py-2"
              >
                Welcome back
              </Link>
              <Link
                href="#pricing"
                onClick={() => setMobileOpen(false)}
                className="block w-full text-center rounded-[16px] bg-[var(--color-accent)] px-5 py-2.5 text-[15px] font-semibold text-[var(--color-text-on-accent)]"
              >
                Join the hive
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t border-[var(--color-border)] bg-[var(--color-bg)]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[var(--color-accent)]">
              <BeeStanding size={22} className="on-accent" />
            </div>
            <span className="text-[13px] font-bold text-[var(--color-text)]">Beedo</span>
          </div>

          <div className="flex items-center gap-6 text-[13px] text-[var(--color-text-muted)]">
            <a href="#features" className="hover:text-[var(--color-accent)] transition-colors">Features</a>
            <a href="#pricing" className="hover:text-[var(--color-accent)] transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-[var(--color-accent)] transition-colors">FAQ</a>
            <Link href="/login" className="hover:text-[var(--color-accent)] transition-colors">Welcome back</Link>
          </div>

          <p className="text-[13px] text-[var(--color-text-subtle)]">
            &copy; {new Date().getFullYear()} Beedo. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <Header />
      <main>{children}</main>
      <Footer />
    </div>
  );
}
