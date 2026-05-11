'use client';

/**
 * PulseDot — LIVE_ANIMATION_PLAN.md §3 (#3).
 *
 * Subtle gold pulse halo, intended to sit *behind* an icon (header bell,
 * overdue reminder bell, etc.). Animates `scale` + `opacity` only — no
 * layout impact.
 *
 * Pauses when the tab is hidden via useTabVisible(). Reduced motion: render
 * a static halo at low opacity (or nothing if you prefer — keep the dot
 * visible so urgency is still legible without motion).
 */
import * as React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useTabVisible } from './tab-visibility-gate';

interface PulseDotProps {
  size?: number;
  color?: string;
  /** Loop interval in ms — full pulse cycle. Default 2000. */
  interval?: number;
  className?: string;
}

export function PulseDot({
  size = 10,
  color = 'var(--color-accent)',
  interval = 2000,
  className,
}: PulseDotProps) {
  const reduce = useReducedMotion();
  const visible = useTabVisible();

  const halo: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: '999px',
    background: color,
    willChange: 'transform, opacity',
  };

  if (reduce) {
    return (
      <span
        aria-hidden="true"
        className={['inline-block', className ?? ''].join(' ')}
        style={{ ...halo, opacity: 0.6 }}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={['relative inline-block', className ?? ''].join(' ')}
      style={{ width: size, height: size }}
    >
      {/* Solid dot */}
      <span className="absolute inset-0 rounded-full" style={{ background: color }} />
      {/* Pulse halo */}
      <motion.span
        className="absolute inset-0 rounded-full"
        style={halo}
        animate={visible ? { scale: [1, 2.2, 1], opacity: [0.55, 0, 0.55] } : { scale: 1, opacity: 0.55 }}
        transition={
          visible
            ? { duration: interval / 1000, repeat: Infinity, ease: 'easeOut' }
            : { duration: 0 }
        }
      />
    </span>
  );
}
