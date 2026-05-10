'use client';

/**
 * SparkleBurst — Group B (B3).
 *
 * Tiny gold particle explosion + floating "+1" used to celebrate task complete.
 * EARNED feedback only — never on hover, never on every click.
 *
 * Hand-rolled with Framer Motion (no new deps). 6 particles emanating in a
 * radial pattern, each scaling from 0 → 1 → 0 while translating outward and
 * fading. The "+1" floats up 24px and fades over the same window.
 *
 * Lifecycle: mount = play, ~700ms duration, then onDone() so the parent
 * can unmount and free the DOM.
 *
 * Reduced motion: render nothing (functional state still updates instantly).
 */
import * as React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface SparkleBurstProps {
  /** Optional callback when the animation finishes (~700ms) */
  onDone?: () => void;
  /** Show a "+1" text floating up alongside the particles */
  showPlusOne?: boolean;
  /** Override the floating label (e.g. "+1", "Done!", or a tiny coin) */
  label?: string;
  /** Particle count — keep small (5–8). Default 6. */
  count?: number;
  /** Override particle radius in px. Default 36. */
  radius?: number;
  className?: string;
}

const GOLD = 'var(--color-accent)';

export function SparkleBurst({
  onDone,
  showPlusOne = true,
  label = '+1',
  count = 6,
  radius = 36,
  className,
}: SparkleBurstProps) {
  const reduce = useReducedMotion();

  React.useEffect(() => {
    if (reduce) {
      onDone?.();
      return;
    }
    const t = setTimeout(() => onDone?.(), 720);
    return () => clearTimeout(t);
  }, [onDone, reduce]);

  if (reduce) return null;

  // Evenly distributed particles around a circle.
  const particles = Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2;
    return {
      id: i,
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
    };
  });

  return (
    <div
      aria-hidden="true"
      className={[
        'pointer-events-none absolute inset-0 z-10 flex items-center justify-center',
        className ?? '',
      ].join(' ')}
    >
      {particles.map((p) => (
        <motion.span
          key={p.id}
          initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
          animate={{
            x: p.x,
            y: p.y,
            scale: [0, 1, 0.6, 0],
            opacity: [1, 1, 0.8, 0],
          }}
          transition={{ duration: 0.65, ease: [0.4, 0, 0.2, 1] }}
          className="absolute h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: GOLD, boxShadow: '0 0 6px rgba(255,215,0,0.6)' }}
        />
      ))}
      {showPlusOne && (
        <motion.span
          initial={{ y: 0, opacity: 0, scale: 0.7 }}
          animate={{ y: -24, opacity: [0, 1, 1, 0], scale: 1 }}
          transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
          className="absolute text-[13px] leading-[18px] font-semibold tabular-nums"
          style={{ color: GOLD }}
        >
          {label}
        </motion.span>
      )}
    </div>
  );
}
