'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Sparkles, Menu, X, Sun, Moon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useThemeTransition } from '@/lib/use-theme-transition';

function ThemeToggleButton() {
  const { isDark, mounted, toggleTheme } = useThemeTransition();
  if (!mounted) return <div className="w-9 h-9" />;
  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500 dark:text-gray-400"
      aria-label="Toggle theme"
    >
      {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
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
          ? 'bg-white/80 dark:bg-surface-dark/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-800/50 shadow-sm'
          : 'bg-transparent'
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-purple-500 shadow-md shadow-primary-500/25 group-hover:shadow-lg group-hover:shadow-primary-500/30 transition-shadow">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900 dark:text-white">
              Life Admin <span className="gradient-text">AI</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-primary-500 dark:hover:text-primary-400 transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Desktop actions */}
          <div className="hidden md:flex items-center gap-3">
            <ThemeToggleButton />
            <Link
              href="/login"
              className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-primary-500 dark:hover:text-primary-400 transition-colors px-4 py-2"
            >
              Sign In
            </Link>
            <Link
              href="#pricing"
              className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-primary-500 to-purple-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-primary-500/25 hover:shadow-lg hover:shadow-primary-500/30 hover:brightness-110 transition-all"
            >
              Get Started
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden flex items-center justify-center h-10 w-10 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden overflow-hidden bg-white/95 dark:bg-surface-dark/95 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-800/50"
          >
            <div className="px-4 py-4 space-y-3">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="block text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-primary-500 py-2"
                >
                  {link.label}
                </a>
              ))}
              <hr className="border-gray-200 dark:border-gray-700" />
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="block text-sm font-medium text-gray-600 dark:text-gray-300 py-2"
              >
                Sign In
              </Link>
              <Link
                href="#pricing"
                onClick={() => setMobileOpen(false)}
                className="block w-full text-center rounded-xl bg-gradient-to-r from-primary-500 to-purple-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md"
              >
                Get Started
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
    <footer className="border-t border-gray-200/50 dark:border-gray-800/50 bg-white dark:bg-surface-dark">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary-500 to-purple-500">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-bold text-gray-900 dark:text-white">
              Life Admin AI
            </span>
          </div>

          {/* Links */}
          <div className="flex items-center gap-6 text-sm text-gray-500 dark:text-gray-400">
            <a href="#features" className="hover:text-primary-500 transition-colors">Features</a>
            <a href="#pricing" className="hover:text-primary-500 transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-primary-500 transition-colors">FAQ</a>
            <Link href="/login" className="hover:text-primary-500 transition-colors">Sign In</Link>
          </div>

          {/* Copyright */}
          <p className="text-sm text-gray-400 dark:text-gray-500">
            &copy; 2024 Life Admin AI. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-surface-light dark:bg-surface-dark">
      <Header />
      <main>{children}</main>
      <Footer />
    </div>
  );
}
