'use client';

/**
 * PageTransition — directional spring slide + bee fly-through.
 *
 * Headline rewrite: tabs feel ALIVE.
 *   - Track previous + current pathname; derive direction from NAV_ORDER
 *     (sibling tabs = horizontal slide; sub-route = vertical slide).
 *   - Spring physics ({ stiffness: 380, damping: 32 }) → organic, not mechanical.
 *   - Subtle scale-in: incoming page enters at 0.985 → 1 (depth, not theatre).
 *   - Bee fly-through: a single MiniBee briefly streaks across the viewport
 *     in the same direction as the incoming page (under content, fades at edges).
 *   - mode="popLayout" preserved.
 *   - useReducedMotion() → renders children straight, no animation.
 *
 * Performance contract:
 *   - Max 1 fly-through per transition.
 *   - GPU-only transforms + opacity.
 *   - Bee auto-cleans on animation complete; no intervals.
 */
import * as React from 'react';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

// Order matches AppLayout NAV_ITEMS (Dashboard → Money → Tasks → Vault → Settings).
const NAV_ORDER: string[] = [
  '/dashboard',
  '/money',
  '/tasks',
  '/vault',
  '/settings',
];

// Sub-routes that nest under a hub. When entering one of these from the hub
// (or vice-versa), the transition reads as vertical (drill-down / drill-up).
const SUB_ROUTES: Record<string, string> = {
  '/bills': '/money',
  '/transactions': '/money',
  '/settings/banks': '/settings',
  '/documents': '/vault',
  '/reminders': '/vault',
  '/appointments': '/vault',
};

function rootOf(pathname: string): string {
  // Match longest known nav root.
  for (const sub of Object.keys(SUB_ROUTES)) {
    if (pathname === sub || pathname.startsWith(sub + '/')) return sub;
  }
  for (const root of NAV_ORDER) {
    if (pathname === root || pathname.startsWith(root + '/')) return root;
  }
  return pathname;
}

type Direction = 'left' | 'right' | 'up' | 'down' | 'none';

function deriveDirection(prev: string | null, next: string): Direction {
  if (!prev || prev === next) return 'none';
  const prevRoot = rootOf(prev);
  const nextRoot = rootOf(next);
  // Drill-down: hub → sub of same hub.
  if (SUB_ROUTES[nextRoot] && SUB_ROUTES[nextRoot] === prevRoot) return 'up';
  // Drill-up: sub → its hub.
  if (SUB_ROUTES[prevRoot] && SUB_ROUTES[prevRoot] === nextRoot) return 'down';
  // Sibling tabs in NAV_ORDER → horizontal.
  const prevIdx = NAV_ORDER.indexOf(prevRoot);
  const nextIdx = NAV_ORDER.indexOf(nextRoot);
  if (prevIdx >= 0 && nextIdx >= 0 && prevIdx !== nextIdx) {
    return nextIdx > prevIdx ? 'right' : 'left';
  }
  return 'none';
}

const SPRING = { type: 'spring' as const, stiffness: 380, damping: 32 };
const SLIDE_PX = 18; // Subtle — feels organic, not aggressive.

function offsetFor(dir: Direction): { x: number; y: number } {
  switch (dir) {
    case 'right':
      return { x: SLIDE_PX, y: 0 }; // incoming from right
    case 'left':
      return { x: -SLIDE_PX, y: 0 }; // incoming from left
    case 'up':
      return { x: 0, y: SLIDE_PX }; // drilling into a sub — slides up from below
    case 'down':
      return { x: 0, y: -SLIDE_PX }; // surfacing back to hub — slides down from above
    default:
      return { x: 0, y: 0 };
  }
}

// Inline mini-bee silhouette for the fly-through accent.
// Same shape used elsewhere — kept inline so the transition has zero cross-file deps.
function MiniBee({ size = 20 }: { size?: number }) {
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

/**
 * BeeFlyThrough — one tiny bee streaks in the direction of the incoming page.
 * Lives behind content (z-0 inside the parent stacking context),
 * fixed-positioned to the viewport. Auto-unmounts on completion.
 */
function BeeFlyThrough({
  direction,
  onDone,
}: {
  direction: Direction;
  onDone: () => void;
}) {
  // Choose a sensible y-band so the bee doesn't run through the user's centre of attention.
  // Top quarter for horizontal moves; biased y for vertical moves.
  const yBand = React.useMemo(() => {
    if (direction === 'left' || direction === 'right') {
      // 18–28% from top — peripheral but visible.
      return `${20 + Math.floor(Math.random() * 8)}%`;
    }
    return '50%';
  }, [direction]);

  // Compute start/end based on direction (translate via x/y vw values).
  const { from, to, sineY } = React.useMemo(() => {
    switch (direction) {
      case 'right':
        return {
          from: { x: '-12vw', y: 0 },
          to: { x: '112vw', y: 0 },
          sineY: [0, -8, 6, -4, 0],
        };
      case 'left':
        return {
          from: { x: '112vw', y: 0 },
          to: { x: '-12vw', y: 0 },
          sineY: [0, 6, -8, 4, 0],
        };
      case 'up':
        return {
          from: { x: '50vw', y: '105vh' },
          to: { x: '50vw', y: '-10vh' },
          sineY: undefined as unknown as number[],
        };
      case 'down':
        return {
          from: { x: '50vw', y: '-10vh' },
          to: { x: '50vw', y: '105vh' },
          sineY: undefined as unknown as number[],
        };
      default:
        return {
          from: { x: 0, y: 0 },
          to: { x: 0, y: 0 },
          sineY: undefined as unknown as number[],
        };
    }
  }, [direction]);

  const isHorizontal = direction === 'left' || direction === 'right';

  return (
    <motion.div
      aria-hidden="true"
      initial={{ ...from, opacity: 0 }}
      animate={
        isHorizontal
          ? {
              x: to.x,
              y: sineY,
              opacity: [0, 0.7, 0.7, 0],
            }
          : { x: to.x, y: to.y, opacity: [0, 0.6, 0.6, 0] }
      }
      transition={{
        duration: 0.6,
        ease: [0.4, 0, 0.2, 1],
        times: isHorizontal ? [0, 0.18, 0.82, 1] : [0, 0.2, 0.8, 1],
      }}
      onAnimationComplete={onDone}
      className="pointer-events-none fixed left-0 z-0"
      style={{
        top: yBand,
        willChange: 'transform, opacity',
      }}
    >
      <MiniBee size={22} />
    </motion.div>
  );
}

/**
 * <PageTransition> — drop-in for the (app)/layout.tsx wrapper.
 * Tracks the previous pathname via a ref so the FIRST transition after
 * navigation can derive a direction; on the first paint, no direction
 * (no fly-through, no slide — just the content).
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reduce = useReducedMotion();
  const prevRef = React.useRef<string | null>(null);

  // Track direction for the CURRENT pathname mount.
  const direction = React.useMemo<Direction>(() => {
    return deriveDirection(prevRef.current, pathname);
  }, [pathname]);

  // Bee fly-through is one-shot per transition. Keyed by pathname so each
  // navigation triggers exactly one render.
  const [flyKey, setFlyKey] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (reduce) return;
    if (direction === 'none') return;
    setFlyKey(pathname);
  }, [pathname, direction, reduce]);

  React.useEffect(() => {
    prevRef.current = pathname;
  }, [pathname]);

  if (reduce) return <>{children}</>;

  const off = offsetFor(direction);

  return (
    <>
      {/* Bee fly-through — fixed to viewport, behind content. */}
      <AnimatePresence>
        {flyKey && direction !== 'none' && (
          <BeeFlyThrough
            key={flyKey}
            direction={direction}
            onDone={() => setFlyKey(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={pathname}
          initial={{
            opacity: 0,
            x: off.x,
            y: off.y,
            scale: 0.985,
          }}
          animate={{
            opacity: 1,
            x: 0,
            y: 0,
            scale: 1,
            transition: SPRING,
          }}
          exit={{
            opacity: 0,
            x: -off.x * 0.4,
            y: -off.y * 0.4,
            scale: 0.99,
            transition: { duration: 0.12, ease: [0.4, 0, 1, 1] },
          }}
          style={{ willChange: 'transform, opacity' }}
          className="relative"
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </>
  );
}
