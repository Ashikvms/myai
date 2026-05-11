'use client';

/**
 * FallIntoPlace — staggered "settle" entrance orchestrator.
 *
 * Headline rewrite (post-feedback): when the user lands on a page (especially
 * the dashboard after login), we want every element to *fall into its place*
 * — not slide, not pop. Settle. With weight.
 *
 * Mental model:
 *   The parent <FallIntoPlace> is a stage. Each <FallIntoPlace.Item> is an
 *   actor with a cue (delay) and an entrance side (from). They all share the
 *   same physics — a soft spring with mass — so the page reads as one
 *   choreography rather than N independent animations.
 *
 * Spring contract (locked):
 *   { type: 'spring', stiffness: 240, damping: 28, mass: 0.8 }
 *   — gentle settling with subtle weight, no overshoot jitter.
 *
 * Per-item entrance:
 *   - `from='top'`    → starts 48px above resting position
 *   - `from='bottom'` → starts 48px below
 *   - `from='left'`   → starts 48px to the left
 *   - `from='right'`  → starts 48px to the right
 *   - opacity: 0 → 1 in lockstep with the offset
 *
 * Reduce motion: items render statically, no offset, no stagger.
 *
 * Usage:
 *   <FallIntoPlace>
 *     <FallIntoPlace.Item from="top" delay={0}>
 *       <Hero />
 *     </FallIntoPlace.Item>
 *     <FallIntoPlace.Item from="bottom" delay={0.5}>
 *       <Footer />
 *     </FallIntoPlace.Item>
 *   </FallIntoPlace>
 *
 * Items can live anywhere in the React tree under the parent — the parent
 * only carries reduce-motion context, it does NOT enforce DOM nesting.
 */
import * as React from 'react';
import { motion, useReducedMotion, type Transition } from 'framer-motion';

const SETTLE_SPRING: Transition = {
  type: 'spring',
  stiffness: 240,
  damping: 28,
  mass: 0.8,
};

const OFFSET_PX = 48;

type FromDirection = 'top' | 'bottom' | 'left' | 'right';

interface FallContext {
  reduce: boolean;
}

const FallCtx = React.createContext<FallContext>({ reduce: false });

function offsetFor(from: FromDirection): { x: number; y: number } {
  switch (from) {
    case 'top':
      return { x: 0, y: -OFFSET_PX };
    case 'bottom':
      return { x: 0, y: OFFSET_PX };
    case 'left':
      return { x: -OFFSET_PX, y: 0 };
    case 'right':
      return { x: OFFSET_PX, y: 0 };
  }
}

interface FallIntoPlaceRootProps {
  children: React.ReactNode;
  className?: string;
}

function FallIntoPlaceRoot({ children, className }: FallIntoPlaceRootProps) {
  const reduce = useReducedMotion() ?? false;
  return (
    <FallCtx.Provider value={{ reduce }}>
      <div className={className}>{children}</div>
    </FallCtx.Provider>
  );
}

interface ItemProps {
  children: React.ReactNode;
  /** Direction the item enters FROM (i.e. where it starts). Default: 'top'. */
  from?: FromDirection;
  /** Delay in seconds before this item begins settling. Default: 0. */
  delay?: number;
  /** Optional className passed through to the wrapper div. */
  className?: string;
  /** Optional inline style — useful when the parent layout uses grid. */
  style?: React.CSSProperties;
}

function Item({ children, from = 'top', delay = 0, className, style }: ItemProps) {
  const { reduce } = React.useContext(FallCtx);

  if (reduce) {
    return (
      <div className={className} style={style}>
        {children}
      </div>
    );
  }

  const { x, y } = offsetFor(from);

  return (
    <motion.div
      initial={{ opacity: 0, x, y }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ ...SETTLE_SPRING, delay }}
      style={{ ...style, willChange: 'transform, opacity' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export const FallIntoPlace = Object.assign(FallIntoPlaceRoot, { Item });

// Re-exports for callers who want to compose their own transitions with the
// same physics (e.g. the dashboard's "first login of session" choreography).
export const FALL_SETTLE_SPRING = SETTLE_SPRING;
