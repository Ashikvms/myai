'use client';

/**
 * AmbientBees — LIVE_ANIMATION_PLAN.md §3 (workhorse primitive).
 *
 * Generalised, reusable version of the marketing `<FlyingBees>`. Renders
 * `count` mini bees (default 3) on lazy infinite x/y/rotate loops scoped
 * to the nearest `relative` parent (or the viewport when bounds="viewport").
 *
 * Each bee gets a deterministic unique path derived from its index so the
 * scene reads as alive, never as repeating.
 *
 * Performance contract (per plan §4):
 *  - GPU-only transforms (translate + rotate) + opacity.
 *  - Decorative container: pointer-events-none + aria-hidden.
 *  - `will-change: transform` only on the animated <motion.div>s.
 *  - Pauses (animate jumps to a held frame) when tab hidden.
 *  - useReducedMotion → renders 3 static bees at fixed positions, no motion.
 *
 * Usage:
 *   <div className="relative overflow-hidden">
 *     ...content
 *     <AmbientBees count={2} speed="slow" />
 *   </div>
 */
import * as React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useTabVisible } from './tab-visibility-gate';

export type AmbientBeesSpeed = 'slow' | 'medium' | 'fast';
export type AmbientBeesBounds = 'parent' | 'viewport';

interface AmbientBeesProps {
  /** 1 – 3 bees recommended (perf budget per plan §4). Default 3. */
  count?: 1 | 2 | 3;
  /** 'slow' = 14–18s loops · 'medium' = 11–14s · 'fast' = 8–11s. */
  speed?: AmbientBeesSpeed;
  /** Confine bees to the parent (default) or float them across the viewport. */
  bounds?: AmbientBeesBounds;
  /** Override base bee size (px). Default 24. */
  size?: number;
  className?: string;
}

// Inline mini-bee silhouette — copied from the marketing FlyingBees so this
// primitive stays drop-in usable on any (app) route without imports across
// route boundaries. Designs sourced from BeeStanding/BeeLogoMark; this is a
// smaller derivative silhouette per the brief, NOT a redesign.
function MiniBee({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Wings */}
      <ellipse cx="9" cy="11" rx="6" ry="3.5" fill="#FFFFFF" fillOpacity="0.55" />
      <ellipse cx="22" cy="10" rx="6" ry="3.5" fill="#FFFFFF" fillOpacity="0.55" />
      {/* Body — adapts to theme via --bee-body */}
      <ellipse cx="16" cy="18" rx="9" ry="6" fill="var(--bee-body)" />
      {/* Stripes — adapts to theme via --bee-detail */}
      <rect x="11" y="13" width="2" height="10" rx="1" fill="var(--bee-detail)" />
      <rect x="19" y="13" width="2" height="10" rx="1" fill="var(--bee-detail)" />
      {/* Eye */}
      <circle cx="9" cy="17" r="1" fill="var(--bee-detail)" />
    </svg>
  );
}

interface BeePath {
  /** Anchor styles (top/bottom/left/right percentages) */
  anchor: React.CSSProperties;
  /** Per-frame x deltas in px */
  x: number[];
  /** Per-frame y deltas in px */
  y: number[];
  /** Per-frame rotation in deg */
  rotate: number[];
  /** Loop duration (s) */
  duration: number;
  /** Animation start delay (s) */
  delay: number;
  /** Bee size in px */
  size: number;
  /** Static fallback position (for reduced motion) */
  staticStyle: React.CSSProperties;
}

const SPEED_MAP: Record<AmbientBeesSpeed, [number, number, number]> = {
  slow: [16, 18, 14],
  medium: [12, 14, 11],
  fast: [10, 11, 9],
};

function buildPaths(count: number, speed: AmbientBeesSpeed, baseSize: number): BeePath[] {
  const durations = SPEED_MAP[speed];
  // 3 hand-tuned anchor points so multiple bees never collide visually.
  const allPaths: BeePath[] = [
    {
      anchor: { top: '10%', left: '8%' },
      x: [0, 80, 160, 80, 0],
      y: [0, 24, 0, -24, 0],
      rotate: [-6, 4, 8, 4, -6],
      duration: durations[0]!,
      delay: 0,
      size: baseSize + 4,
      staticStyle: { top: '10%', left: '8%' },
    },
    {
      anchor: { top: '22%', right: '10%' },
      x: [0, -50, -90, -50, 0],
      y: [0, 30, 0, -30, 0],
      rotate: [6, -2, -8, -2, 6],
      duration: durations[1]!,
      delay: 1.2,
      size: baseSize - 2,
      staticStyle: { top: '22%', right: '10%' },
    },
    {
      anchor: { bottom: '14%', left: '38%' },
      x: [0, 50, 0, -50, 0],
      y: [0, -20, -40, -20, 0],
      rotate: [0, 10, 0, -10, 0],
      duration: durations[2]!,
      delay: 2.4,
      size: baseSize - 4,
      staticStyle: { bottom: '14%', left: '38%' },
    },
  ];
  return allPaths.slice(0, count);
}

export function AmbientBees({
  count = 3,
  speed = 'slow',
  bounds = 'parent',
  size = 24,
  className,
}: AmbientBeesProps) {
  const reduce = useReducedMotion();
  const visible = useTabVisible();

  const paths = React.useMemo(
    () => buildPaths(count, speed, size),
    [count, speed, size],
  );

  const wrapperPos = bounds === 'viewport' ? 'fixed' : 'absolute';

  // Reduced-motion: render static bees at fixed positions per plan §4.
  if (reduce) {
    return (
      <div
        aria-hidden="true"
        className={[
          `pointer-events-none ${wrapperPos} inset-0 overflow-hidden`,
          className ?? '',
        ].join(' ')}
      >
        {paths.map((p, i) => (
          <div key={i} className="absolute" style={p.staticStyle}>
            <MiniBee size={p.size} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      aria-hidden="true"
      className={[
        `pointer-events-none ${wrapperPos} inset-0 overflow-hidden`,
        className ?? '',
      ].join(' ')}
    >
      {paths.map((p, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{ ...p.anchor, willChange: 'transform' }}
          animate={
            visible
              ? { x: p.x, y: p.y, rotate: p.rotate }
              : { x: p.x[0] ?? 0, y: p.y[0] ?? 0, rotate: p.rotate[0] ?? 0 }
          }
          transition={
            visible
              ? {
                  duration: p.duration,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: p.delay,
                }
              : { duration: 0 }
          }
        >
          <MiniBee size={p.size} />
        </motion.div>
      ))}
    </div>
  );
}
