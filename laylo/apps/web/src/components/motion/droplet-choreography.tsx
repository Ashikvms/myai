'use client';

/**
 * DropletChoreography — Phase C3.
 *
 * The 1.8s opening number for the auth surfaces (login + signup).
 *
 * Storyboard (LAYOUT_REDESIGN_BRIEF.md §3):
 *   t = 0–400ms    Golden teardrop falls from above with gravity easing,
 *                  scaleY stretches as it accelerates.
 *   t = 400ms      Impact at 1/3-from-top, dead-centre. Droplet absorbs
 *                  (scale → 0.6, opacity → 0).
 *   t = 400–700ms  Three concentric gold ripples expand and fade,
 *                  staggered 80ms each.
 *   t = 600–1200ms Form elements cascade outward from impact —
 *                  logo above, email left, password right, submit below,
 *                  footer last. Springs (stiffness 350, damping 22).
 *   t = 1200ms+    Idle. Bee breathes; focus rings glow gold.
 *
 * Trigger policy: ONCE per session via `sessionStorage` key
 *   `beedo:authDropletPlayed` (shared across login + signup).
 *
 * Reduce-motion fallback (`useReducedMotion()`):
 *   Skip droplet + ripples entirely. All slots render instantly with
 *   `initial={false}` — no offset, no fade, no animation.
 *
 * Usage — uses named slots so the consumer assembles their own form:
 *
 *   <DropletChoreography variant="login">
 *     <DropletChoreography.Logo>...</DropletChoreography.Logo>
 *     <DropletChoreography.Subtitle>...</DropletChoreography.Subtitle>
 *     <DropletChoreography.EmailField>...</DropletChoreography.EmailField>
 *     <DropletChoreography.PasswordField>...</DropletChoreography.PasswordField>
 *     <DropletChoreography.Submit>...</DropletChoreography.Submit>
 *     <DropletChoreography.Footer>...</DropletChoreography.Footer>
 *   </DropletChoreography>
 *
 * Slot order in the DOM is the slot's *rendered* order (e.g. Submit will sit
 * after Password). The choreography drives only the entrance offsets +
 * delays; layout is the consumer's job.
 */
import * as React from 'react';
import {
  motion,
  useReducedMotion,
  type Transition,
} from 'framer-motion';

const SESSION_KEY = 'beedo:authDropletPlayed';

// Cubic-bezier "gravity" curve from the brief — accelerating fall.
const GRAVITY: [number, number, number, number] = [0.55, 0.05, 0.68, 0.53];

// Spring config for the form cascade (brief §3 contract).
const CASCADE_SPRING: Transition = {
  type: 'spring',
  stiffness: 350,
  damping: 22,
};

/**
 * Per-slot delay table — relative to choreography mount (t=0).
 * Form cascade lives in the t=600–1200ms window per the storyboard.
 * Numbers are seconds for Framer Motion.
 */
const DELAYS = {
  logo: 0.6, // bee + wordmark
  subtitle: 0.68,
  email: 0.78,
  password: 0.86,
  submit: 0.96,
  divider: 1.08,
  google: 1.12,
  footer: 1.28,
} as const;

type SlotName = keyof typeof DELAYS;

interface ChoreographyContext {
  /** True when the full droplet animation should play. */
  play: boolean;
  /** True when the user has reduce-motion on (overrides play). */
  reduce: boolean;
}

const Ctx = React.createContext<ChoreographyContext>({
  play: false,
  reduce: false,
});

// ─────────────────────────────────────────────────────────────────────────
// Droplet SVG — inline teardrop, 32×40 (32×48 viewBox per brief).
// Gold gradient fill; pointed top, rounded bottom.
// ─────────────────────────────────────────────────────────────────────────
function Droplet({ width = 32, height = 40 }: { width?: number; height?: number }) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 32 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M16 2 C 16 2, 4 22, 4 32 a 12 12 0 0 0 24 0 C 28 22, 16 2, 16 2 z"
        fill="var(--color-accent)"
        stroke="var(--color-accent-hover)"
        strokeWidth="1"
      />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Falling droplet + impact ripples (single overlay element).
// ─────────────────────────────────────────────────────────────────────────
interface DropletOverlayProps {
  /** Number of ripples — login = 3, signup = 4 (brief §3 signup variant). */
  ripples: number;
  /** Scale multiplier on the droplet — signup uses 1.2 (brief §3). */
  dropletScale: number;
  onComplete: () => void;
}

function DropletOverlay({ ripples, dropletScale, onComplete }: DropletOverlayProps) {
  // Impact lives at 1/3 from the top of the viewport, centred horizontally.
  // Using percentages keeps it responsive without measuring layout.
  const impactTop = '33%';
  const impactLeft = '50%';

  // Trigger ripples after the droplet lands.
  const [showRipples, setShowRipples] = React.useState(false);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[60] overflow-hidden"
    >
      {/* The fall — 0 → 400ms */}
      <motion.div
        className="absolute"
        style={{
          left: impactLeft,
          top: 0,
          x: '-50%',
        }}
        initial={{ y: -64, opacity: 1, scaleY: 1, scale: dropletScale }}
        animate={{
          y: ['0vh', '33vh', '33vh'],
          scaleY: [1, 1.1, 0.6],
          opacity: [1, 1, 0],
          scale: [dropletScale, dropletScale, dropletScale * 0.6],
        }}
        transition={{
          duration: 0.46,
          times: [0, 0.87, 1],
          ease: [GRAVITY, GRAVITY, [0.4, 0, 1, 1]],
        }}
        onAnimationComplete={() => {
          setShowRipples(true);
        }}
      >
        <Droplet />
      </motion.div>

      {/* Ripples — 400 → 700ms, each ~300ms with 80ms stagger */}
      {showRipples && (
        <svg
          className="absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          {Array.from({ length: ripples }).map((_, i) => {
            const baseRadius = 80 + i * 40; // 80, 120, 160, 200
            const baseOpacity = 0.6 - i * 0.1; // 0.6, 0.5, 0.4, 0.3
            return (
              <motion.circle
                key={i}
                cx={impactLeft}
                cy={impactTop}
                r={0}
                stroke="var(--color-accent)"
                strokeWidth={1.5}
                fill="none"
                initial={{ r: 0, opacity: baseOpacity }}
                animate={{ r: baseRadius, opacity: 0 }}
                transition={{
                  duration: 0.3,
                  delay: i * 0.08,
                  ease: 'easeOut',
                }}
                onAnimationComplete={
                  i === ripples - 1 ? onComplete : undefined
                }
              />
            );
          })}
        </svg>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Per-slot wrapper. Resolves its own delay/initial offset from the slot
// name, gates everything off context (`play` / `reduce`).
// ─────────────────────────────────────────────────────────────────────────

function slotInitial(slot: SlotName) {
  switch (slot) {
    case 'logo':
      return { y: -24, opacity: 0 };
    case 'subtitle':
      return { y: -16, opacity: 0 };
    case 'email':
      return { x: -32, opacity: 0 };
    case 'password':
      return { x: 32, opacity: 0 };
    case 'submit':
      return { y: 24, opacity: 0, scale: 0.96 };
    case 'divider':
      return { opacity: 0 };
    case 'google':
      return { y: 16, opacity: 0 };
    case 'footer':
      return { opacity: 0 };
  }
}

function slotResting(slot: SlotName) {
  switch (slot) {
    case 'logo':
    case 'subtitle':
    case 'submit':
      return { y: 0, opacity: 1, scale: 1 };
    case 'email':
    case 'password':
      return { x: 0, opacity: 1 };
    case 'divider':
    case 'google':
    case 'footer':
      return { y: 0, opacity: 1 };
  }
}

interface SlotProps {
  slot: SlotName;
  children: React.ReactNode;
  className?: string;
}

function Slot({ slot, children, className }: SlotProps) {
  const { play, reduce } = React.useContext(Ctx);

  // Reduce-motion or "already played" → render statically, no offset.
  if (!play || reduce) {
    return <div className={className}>{children}</div>;
  }

  // Tween-only slots (no spring): divider + footer.
  const isTween = slot === 'divider' || slot === 'footer';

  const transition: Transition = isTween
    ? { duration: 0.22, delay: DELAYS[slot], ease: [0.4, 0, 0.2, 1] }
    : { ...CASCADE_SPRING, delay: DELAYS[slot] };

  return (
    <motion.div
      className={className}
      initial={slotInitial(slot)}
      animate={slotResting(slot)}
      transition={transition}
    >
      {children}
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Public component.
// ─────────────────────────────────────────────────────────────────────────

interface DropletChoreographyProps {
  children: React.ReactNode;
  /** "login" → 3 ripples + droplet scale 1. "signup" → 4 ripples + droplet scale 1.2. */
  variant?: 'login' | 'signup';
}

function DropletChoreographyRoot({
  children,
  variant = 'login',
}: DropletChoreographyProps) {
  const reduce = useReducedMotion() ?? false;
  const [play, setPlay] = React.useState(false);
  const [overlayDone, setOverlayDone] = React.useState(false);

  // Gate on session flag — "once per session" across login + signup.
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    if (reduce) {
      // Reduce-motion: never play, but mark the flag so the next visit
      // (if motion preference flips back) still skips re-playing in-session.
      try {
        window.sessionStorage.setItem(SESSION_KEY, '1');
      } catch {
        // sessionStorage may be unavailable (Safari private mode etc.) —
        // fail-soft: just skip the animation.
      }
      return;
    }
    let already = '1';
    try {
      already = window.sessionStorage.getItem(SESSION_KEY) ?? '0';
    } catch {
      already = '1'; // can't read storage → assume played (safe default)
    }
    if (already !== '1') {
      setPlay(true);
      try {
        window.sessionStorage.setItem(SESSION_KEY, '1');
      } catch {
        /* fail-soft */
      }
    }
  }, [reduce]);

  // When the droplet+ripple overlay finishes, drop the overlay from the DOM.
  const handleOverlayComplete = React.useCallback(() => {
    setOverlayDone(true);
  }, []);

  const ripples = variant === 'signup' ? 4 : 3;
  const dropletScale = variant === 'signup' ? 1.2 : 1;

  return (
    <Ctx.Provider value={{ play, reduce }}>
      {play && !reduce && !overlayDone && (
        <DropletOverlay
          ripples={ripples}
          dropletScale={dropletScale}
          onComplete={handleOverlayComplete}
        />
      )}
      {children}
    </Ctx.Provider>
  );
}

// Named slots — keep the API ergonomic at the call site.
type SlotComponent = (props: { children: React.ReactNode; className?: string }) => React.JSX.Element;

const Logo: SlotComponent = ({ children, className }) => (
  <Slot slot="logo" className={className}>{children}</Slot>
);
const Subtitle: SlotComponent = ({ children, className }) => (
  <Slot slot="subtitle" className={className}>{children}</Slot>
);
const EmailField: SlotComponent = ({ children, className }) => (
  <Slot slot="email" className={className}>{children}</Slot>
);
const PasswordField: SlotComponent = ({ children, className }) => (
  <Slot slot="password" className={className}>{children}</Slot>
);
const Submit: SlotComponent = ({ children, className }) => (
  <Slot slot="submit" className={className}>{children}</Slot>
);
const Divider: SlotComponent = ({ children, className }) => (
  <Slot slot="divider" className={className}>{children}</Slot>
);
const Google: SlotComponent = ({ children, className }) => (
  <Slot slot="google" className={className}>{children}</Slot>
);
const Footer: SlotComponent = ({ children, className }) => (
  <Slot slot="footer" className={className}>{children}</Slot>
);

export const DropletChoreography = Object.assign(DropletChoreographyRoot, {
  Logo,
  Subtitle,
  EmailField,
  PasswordField,
  Submit,
  Divider,
  Google,
  Footer,
});

// Re-export for tests / debugging.
export const __DROPLET_SESSION_KEY__ = SESSION_KEY;
