'use client';

/**
 * IdleBob — LIVE_ANIMATION_PLAN.md §3 (#7).
 *
 * Wraps any child in a gentle infinite y-bob (sine). Pure transform.
 * Used post-droplet on the auth surfaces and around small mascots that
 * should "breathe" while idle.
 *
 * Reduced motion or hidden tab → renders children statically.
 */
import * as React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useTabVisible } from './tab-visibility-gate';

interface IdleBobProps {
  children: React.ReactNode;
  /** Px amplitude of the bob. Default 2. */
  amplitude?: number;
  /** Cycle length in seconds. Default 3. */
  duration?: number;
  /** Delay before the bob starts (s). Default 0. */
  delay?: number;
  className?: string;
}

export function IdleBob({
  children,
  amplitude = 2,
  duration = 3,
  delay = 0,
  className,
}: IdleBobProps) {
  const reduce = useReducedMotion();
  const visible = useTabVisible();

  if (reduce) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      style={{ willChange: 'transform' }}
      animate={visible ? { y: [0, -amplitude, 0, amplitude, 0] } : { y: 0 }}
      transition={
        visible
          ? { duration, repeat: Infinity, ease: 'easeInOut', delay }
          : { duration: 0 }
      }
    >
      {children}
    </motion.div>
  );
}
