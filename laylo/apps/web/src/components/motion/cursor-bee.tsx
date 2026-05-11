'use client';

/**
 * CursorBee — landing-page-only delight.
 *
 * A tiny bee lazily follows the cursor with significant lag — Pokémon trail
 * vibes. Smoothing via Framer Motion `useMotionValue` + `useSpring`. ONLY
 * mounted on the marketing landing page (per brief — too much on app
 * surfaces).
 *
 * Reduced motion → renders nothing.
 * Hidden on touch devices (no useful pointer position).
 */
import * as React from 'react';
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from 'framer-motion';

function MiniBee({ size = 22 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <ellipse cx="9" cy="11" rx="6" ry="3.5" fill="#FFFFFF" fillOpacity="0.55" />
      <ellipse cx="22" cy="10" rx="6" ry="3.5" fill="#FFFFFF" fillOpacity="0.55" />
      <ellipse cx="16" cy="18" rx="9" ry="6" fill="var(--bee-body)" />
      <rect x="11" y="13" width="2" height="10" rx="1" fill="var(--bee-detail)" />
      <rect x="19" y="13" width="2" height="10" rx="1" fill="var(--bee-detail)" />
      <circle cx="9" cy="17" r="1" fill="var(--bee-detail)" />
    </svg>
  );
}

export function CursorBee() {
  const reduce = useReducedMotion();
  const [enabled, setEnabled] = React.useState(false);
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);

  // Heavy lag — bee feels like it's chasing you.
  const sx = useSpring(x, { stiffness: 60, damping: 18, mass: 1 });
  const sy = useSpring(y, { stiffness: 60, damping: 18, mass: 1 });

  React.useEffect(() => {
    if (reduce) return;
    if (typeof window === 'undefined') return;
    // Touch-only / coarse-pointer devices → no chasing bee.
    const fine = window.matchMedia?.('(pointer: fine)').matches;
    if (!fine) return;
    setEnabled(true);

    const onMove = (e: PointerEvent) => {
      // Offset slightly so the bee doesn't sit dead-on the cursor.
      x.set(e.clientX + 14);
      y.set(e.clientY + 14);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [reduce, x, y]);

  if (reduce || !enabled) return null;

  return (
    <motion.div
      aria-hidden="true"
      style={{
        x: sx,
        y: sy,
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 60,
        pointerEvents: 'none',
        willChange: 'transform',
      }}
    >
      <MiniBee size={20} />
    </motion.div>
  );
}

export default CursorBee;
