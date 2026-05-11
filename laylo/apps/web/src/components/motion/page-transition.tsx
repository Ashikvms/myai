'use client';

/**
 * PageTransition — gentle fade + tiny scale, with a single corner-bee.
 *
 * Headline rewrite (post-feedback): the previous directional-slide felt
 * jittery — a 18px lateral jerk on every nav. We replaced it entirely.
 *
 * What this version does:
 *   1. Drop the directional slide entirely. New page enters via FADE +
 *      subtle scale (0.97 → 1). No x/y offset.
 *   2. Soften the spring: { stiffness: 220, damping: 28 } — a settling
 *      feel, not a snap.
 *   3. mode="wait" instead of "popLayout" so we never get the dual-render
 *      shift. To compensate for the perceived slowness, exit is short
 *      (80ms ease-out).
 *   4. Bee fly-through is reworked: instead of streaking across the whole
 *      viewport, a single small bee enters from the upper-right corner,
 *      decelerates, settles for 200ms ("delivered the page"), then fades.
 *      Total ~600ms. Behind content.
 *
 * Reduce-motion: render children straight, no animation, no bee.
 *
 * Performance:
 *   - GPU-only transforms + opacity.
 *   - One bee per nav, auto-cleans on completion.
 */
import * as React from 'react';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion, type Transition } from 'framer-motion';

// Gentle settling spring — no overshoot, no jitter.
const SETTLE: Transition = { type: 'spring', stiffness: 220, damping: 28 };
// Short exit so mode="wait" doesn't feel slow.
const EXIT: Transition = { duration: 0.08, ease: [0.4, 0, 1, 1] };

// Inline mini-bee silhouette for the corner accent.
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

/**
 * CornerDeliveryBee — the bee "delivers" the new page.
 *
 * Storyboard (600ms total):
 *   0 → 320ms   Enter from upper-right (offscreen +80px / -40px) and
 *               decelerate toward the resting position near the corner.
 *   320 → 520ms Settle in place (no movement, just sitting).
 *   520 → 600ms Fade out (opacity → 0).
 *
 * Lives top-right of the viewport, behind content (z-0). Auto-unmounts.
 */
function CornerDeliveryBee({ onDone }: { onDone: () => void }) {
  return (
    <motion.div
      aria-hidden="true"
      initial={{ x: 80, y: -40, opacity: 0 }}
      animate={{
        x: [80, 0, 0, 0],
        y: [-40, 0, 0, 0],
        opacity: [0, 1, 1, 0],
      }}
      transition={{
        duration: 0.6,
        times: [0, 0.55, 0.85, 1],
        ease: [0.16, 0.84, 0.24, 1], // decelerating arrival; hold + fade ride out the same curve
      }}
      onAnimationComplete={onDone}
      className="pointer-events-none fixed right-6 top-20 z-0"
      style={{ willChange: 'transform, opacity' }}
    >
      <MiniBee size={22} />
    </motion.div>
  );
}

/**
 * <PageTransition> — drop-in for the (app)/layout.tsx wrapper.
 *
 * On every pathname change:
 *   - Old page exits via fade-out in 80ms.
 *   - New page enters via fade + tiny scale via the SETTLE spring.
 *   - A single corner-bee delivers the page from the upper-right.
 *
 * The first paint (no previous pathname) skips the bee — there's nothing
 * to "deliver from".
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reduce = useReducedMotion();
  const prevRef = React.useRef<string | null>(null);

  // Bee delivery is one-shot per transition. Keyed by pathname.
  const [beeKey, setBeeKey] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (reduce) return;
    // Skip first mount — there was no previous page to be "delivered from".
    if (prevRef.current === null) {
      prevRef.current = pathname;
      return;
    }
    if (prevRef.current === pathname) return;
    setBeeKey(pathname);
    prevRef.current = pathname;
  }, [pathname, reduce]);

  if (reduce) return <>{children}</>;

  return (
    <>
      {/* Corner-delivery bee — fixed to viewport, behind content. */}
      <AnimatePresence>
        {beeKey && (
          <CornerDeliveryBee
            key={beeKey}
            onDone={() => setBeeKey(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={pathname}
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1, transition: SETTLE }}
          exit={{ opacity: 0, transition: EXIT }}
          style={{ willChange: 'transform, opacity' }}
          className="relative"
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </>
  );
}
