'use client';

/**
 * MilestoneToast — cross-cutting delight #3 (LAYOUT_REDESIGN_BRIEF §4).
 *
 * Imperative toast with `useMilestoneTracker(metric, threshold)` hook.
 * Fires once per session per (metric, threshold) tuple — uses sessionStorage
 * to avoid spamming the user.
 */
import * as React from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { BeeStanding } from '@/components/illustrations/bee';

interface MilestoneState {
  open: boolean;
  message: string;
}

const STATE = {
  ref: null as null | React.MutableRefObject<MilestoneState>,
  setState: null as null | React.Dispatch<React.SetStateAction<MilestoneState>>,
};

function flagKey(metric: string, threshold: number) {
  return `beedo:milestone:${metric}:${threshold}`;
}

/**
 * Hook: when `value >= threshold` and the (metric, threshold) tuple hasn't
 * fired this session, fire a toast.
 */
export function useMilestoneTracker(
  metric: string,
  threshold: number,
  value: number,
  message: string,
) {
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    if (value < threshold) return;
    if (!STATE.setState) return;
    try {
      const key = flagKey(metric, threshold);
      if (window.sessionStorage.getItem(key)) return;
      window.sessionStorage.setItem(key, '1');
    } catch {
      // sessionStorage may be disabled — still fire once per mount
    }
    STATE.setState({ open: true, message });
    const t = window.setTimeout(() => {
      STATE.setState?.({ open: false, message });
    }, 5000);
    return () => window.clearTimeout(t);
  }, [metric, threshold, value, message]);
}

export function MilestoneToastHost() {
  const reduce = useReducedMotion();
  const [state, setState] = React.useState<MilestoneState>({ open: false, message: '' });

  React.useEffect(() => {
    STATE.setState = setState;
    return () => {
      STATE.setState = null;
    };
  }, []);

  return (
    <AnimatePresence>
      {state.open && (
        <motion.div
          initial={reduce ? { opacity: 0 } : { opacity: 0, x: 24, y: -8 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, x: 24 }}
          transition={{ duration: 0.32, ease: [0.4, 0, 0.2, 1] }}
          className="fixed top-20 right-6 z-[80] pointer-events-none"
          role="status"
          aria-live="polite"
        >
          <div className="pointer-events-auto flex items-center gap-3 rounded-[16px] bg-[var(--color-surface)] border border-[var(--color-accent)] shadow-glow px-4 py-3 max-w-[320px]">
            <BeeStanding size={28} />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] leading-[14px] font-semibold uppercase tracking-wider text-[var(--color-accent-dim)]">
                Milestone unlocked
              </p>
              <p className="text-[13px] leading-[18px] font-medium text-[var(--color-text)]">
                {state.message}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
