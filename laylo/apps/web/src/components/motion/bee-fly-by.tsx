'use client';

/**
 * BeeFlyBy — cross-cutting delight #2 (LAYOUT_REDESIGN_BRIEF §4).
 *
 * Two modes:
 *
 *  - mode="once-per-day" (default) — original behaviour. A single bee flies
 *    left → right across the top of the viewport on a sine-wave Y over 1.6s.
 *    localStorage gates "once per day". Used in (app)/layout.tsx as a
 *    cross-app surprise.
 *
 *  - mode="loop" — auth-screen ambient mode. The bee loops forever on a
 *    configurable trajectory + duration; multiple instances at different
 *    delays read as "the hive is alive" behind the form. No localStorage.
 *
 * useReducedMotion() shorts the whole effect in both modes.
 */
import * as React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { BeeFlying } from '@/components/illustrations/bee-flying';

const STORAGE_KEY = 'billbee:beeFlyByDate';

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export type BeeFlyByProps = {
  /** "once-per-day" (default) preserves the original gated behaviour.
   *  "loop" runs continuously — pass delay + trajectory for ambient backgrounds. */
  mode?: 'once-per-day' | 'loop';
  /** Bee size in px. Default 28. */
  size?: number;
  /** Start delay in seconds. Default 0. */
  delay?: number;
  /** Loop duration in seconds (loop mode only). Default 8. */
  duration?: number;
  /** Start X in viewport units (e.g. "-10vw"). Default "-10vw". */
  fromX?: string;
  /** End X in viewport units (e.g. "110vw"). Default "110vw". */
  toX?: string;
  /** Sine-wave Y keyframes in px (5 values to match `times`). Default [24, 8, 32, 12, 24]. */
  y?: [number, number, number, number, number];
  /** Vertical anchor on the viewport — Tailwind class fragment.
   *  Examples: "top-0", "top-1/4", "top-1/2", "top-3/4", "bottom-12".
   *  Default "top-0". */
  anchor?: string;
};

export function BeeFlyBy({
  mode = 'once-per-day',
  size = 28,
  delay = 0,
  duration,
  fromX = '-10vw',
  toX = '110vw',
  y = [24, 8, 32, 12, 24],
  anchor = 'top-0',
}: BeeFlyByProps = {}) {
  const reduce = useReducedMotion();
  const [shouldPlay, setShouldPlay] = React.useState(mode === 'loop');

  React.useEffect(() => {
    if (mode !== 'once-per-day') return;
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
  }, [reduce, mode]);

  if (reduce) return null;
  if (mode === 'once-per-day' && !shouldPlay) return null;

  const isLoop = mode === 'loop';
  // Original 1.6s feels right for the one-shot dart; ambient loops want a
  // slower, less attention-grabbing traversal.
  const dur = duration ?? (isLoop ? 8 : 1.6);

  return (
    <motion.div
      aria-hidden="true"
      initial={{ x: fromX, y: y[0] }}
      animate={{
        x: toX,
        y: [...y],
      }}
      transition={
        isLoop
          ? {
              duration: dur,
              ease: 'linear',
              times: [0, 0.25, 0.5, 0.75, 1],
              repeat: Infinity,
              repeatDelay: 0,
              delay,
            }
          : { duration: dur, ease: 'linear', times: [0, 0.25, 0.5, 0.75, 1], delay }
      }
      onAnimationComplete={isLoop ? undefined : () => setShouldPlay(false)}
      className={`pointer-events-none fixed ${anchor} left-0 z-[100]`}
      style={{ willChange: 'transform' }}
    >
      <BeeFlying size={size} />
    </motion.div>
  );
}
