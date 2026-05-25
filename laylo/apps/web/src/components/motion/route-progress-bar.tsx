'use client';

/**
 * RouteProgressBar — LIVE_ANIMATION_PLAN.md §1 + §3.
 *
 * 2px gold line at top of viewport. Transform: scaleX only — GPU-only.
 * Mounted globally in (app) layout. Fires whenever the pathname changes;
 * Next App Router doesn't expose loading state directly so we drive a
 * deterministic ~600ms fill that absorbs server-data wait visually.
 *
 * Reduced motion: don't render at all.
 */
import * as React from 'react';
import { usePathname } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';

export function RouteProgressBar() {
  const pathname = usePathname();
  const reduce = useReducedMotion();
  const [phase, setPhase] = React.useState<'idle' | 'fill' | 'fade'>('idle');
  const prev = React.useRef<string | null>(null);
  const fillTimer = React.useRef<number | null>(null);
  const fadeTimer = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (reduce) return;
    // Skip the first render so we don't flash on initial mount.
    if (prev.current === null) {
      prev.current = pathname;
      return;
    }
    if (prev.current === pathname) return;
    prev.current = pathname;

    // Trigger: clear timers, restart from idle so the bar fully resets
    // (scaleX 0 → 1) on every navigation.
    if (fillTimer.current) window.clearTimeout(fillTimer.current);
    if (fadeTimer.current) window.clearTimeout(fadeTimer.current);
    setPhase('idle');
    // Next tick → fill so the keyframes restart cleanly.
    fillTimer.current = window.setTimeout(() => setPhase('fill'), 16);
    fadeTimer.current = window.setTimeout(() => setPhase('fade'), 600);
  }, [pathname, reduce]);

  React.useEffect(() => {
    return () => {
      if (fillTimer.current) window.clearTimeout(fillTimer.current);
      if (fadeTimer.current) window.clearTimeout(fadeTimer.current);
    };
  }, []);

  if (reduce) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed top-0 left-0 right-0 z-[200] h-[2px]"
    >
      <motion.div
        className="h-full origin-left rounded-r-full"
        style={{
          background: 'var(--color-accent)',
          boxShadow: '0 0 6px rgba(248,231,28,0.55)',
          willChange: 'transform, opacity',
        }}
        animate={
          phase === 'fill'
            ? { scaleX: [0.05, 0.7, 0.95], opacity: 0.85 }
            : phase === 'fade'
              ? { scaleX: 1, opacity: 0 }
              : { scaleX: 0, opacity: 0 }
        }
        transition={
          phase === 'fill'
            ? { duration: 0.55, ease: [0.4, 0, 0.2, 1] }
            : phase === 'fade'
              ? { duration: 0.18, ease: [0.4, 0, 1, 1] }
              : { duration: 0 }
        }
      />
    </div>
  );
}
