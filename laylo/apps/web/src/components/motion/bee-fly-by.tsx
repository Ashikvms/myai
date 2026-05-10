'use client';

/**
 * BeeFlyBy — cross-cutting delight #2 (LAYOUT_REDESIGN_BRIEF §4).
 *
 * Once per day, a tiny bee flies left → right across the top of the viewport
 * on a sine-wave Y over 1.6s. localStorage gates "once per day".
 *
 * Mounted in (app)/layout.tsx — runs after the user lands inside the app shell.
 * useReducedMotion() shorts the whole effect.
 */
import * as React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { BeeStanding } from '@/components/illustrations/bee';

const STORAGE_KEY = 'beedo:beeFlyByDate';

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export function BeeFlyBy() {
  const reduce = useReducedMotion();
  const [shouldPlay, setShouldPlay] = React.useState(false);

  React.useEffect(() => {
    if (reduce) return;
    if (typeof window === 'undefined') return;
    try {
      const last = window.localStorage.getItem(STORAGE_KEY);
      if (last !== todayKey()) {
        window.localStorage.setItem(STORAGE_KEY, todayKey());
        setShouldPlay(true);
      }
    } catch {
      /* localStorage may be disabled — skip */
    }
  }, [reduce]);

  if (!shouldPlay || reduce) return null;

  return (
    <motion.div
      aria-hidden="true"
      initial={{ x: '-10vw', y: 24 }}
      animate={{
        x: '110vw',
        y: [24, 8, 32, 12, 24],
      }}
      transition={{ duration: 1.6, ease: 'linear', times: [0, 0.25, 0.5, 0.75, 1] }}
      onAnimationComplete={() => setShouldPlay(false)}
      className="pointer-events-none fixed top-0 left-0 z-[100]"
      style={{ willChange: 'transform' }}
    >
      <BeeStanding size={28} />
    </motion.div>
  );
}
