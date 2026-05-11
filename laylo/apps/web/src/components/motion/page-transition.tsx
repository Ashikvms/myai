'use client';

/**
 * PageTransition — LIVE_ANIMATION_PLAN.md §1.
 *
 * Faster, asymmetric route transitions:
 *   - mode="popLayout" so the incoming page mounts immediately over the
 *     outgoing one (perceived latency drops from ~400ms → ~180ms).
 *   - 180ms enter (ease-entry), 100ms exit (ease-exit).
 *   - 8px slide-up + 2px enter blur that resolves by frame 3 — reads as
 *     "fresh content arrived" rather than "content morphed".
 *
 * Reduced motion: render children directly, no animation.
 */
import * as React from 'react';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

const ENTER: { duration: number; ease: [number, number, number, number] } = {
  duration: 0.18,
  ease: [0.4, 0, 0.2, 1], // ease-entry — DESIGN_SYSTEM §6.1
};
const EXIT: { duration: number; ease: [number, number, number, number] } = {
  duration: 0.1,
  ease: [0.4, 0, 1, 1], // ease-exit — accelerate out
};

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reduce = useReducedMotion();

  if (reduce) return <>{children}</>;

  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 8, filter: 'blur(2px)' }}
        animate={{
          opacity: 1,
          y: 0,
          filter: 'blur(0px)',
          transition: ENTER,
        }}
        exit={{ opacity: 0, y: -4, transition: EXIT }}
        style={{ willChange: 'transform, opacity, filter' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
