'use client';

/**
 * PageTransition — Group B (B7).
 *
 * Wraps app-route children in <AnimatePresence mode="wait"> so route changes
 * get a tasteful 200ms fade + tiny slide. The pathname is the AnimatePresence
 * key, so navigating triggers exit/enter cleanly.
 *
 * Reduced motion: render children instantly, no animation.
 */
import * as React from 'react';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reduce = useReducedMotion();

  if (reduce) return <>{children}</>;

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
