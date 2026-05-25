'use client';

/**
 * InboxZeroOverlay — Group D (D3).
 *
 * Full-screen celebratory overlay shown ONCE when the user marks the last
 * task complete (i.e. the tasks list transitions from N>0 → 0). The parent
 * controls visibility via the `open` prop. Auto-dismisses after 2.4s, OR
 * when the user clicks anywhere on the backdrop.
 *
 * Composition:
 *  - Translucent black backdrop (fade in)
 *  - Centred sleeping bee at large size
 *  - "Inbox zero unlocked!" headline
 *  - 30 confetti particles (gold + black) falling from the top with varying
 *    sizes / speeds / rotations. Hand-rolled via Framer Motion — no deps.
 *
 * Reduced motion: skip the confetti + scale, keep the static overlay so the
 * user still gets the moment of recognition.
 */
import * as React from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { BeeSleeping } from '@/components/illustrations/bee';

interface InboxZeroOverlayProps {
  open: boolean;
  onClose: () => void;
  /** Auto-dismiss after this many ms. Default 2400. */
  autoDismissMs?: number;
}

const CONFETTI_COUNT = 30;
const COLORS = ['#F8E71C', '#FAED4A', '#0A0A0A', '#FFFFFF'];

interface Particle {
  id: number;
  left: number;          // 0–100 vw
  delay: number;         // s
  duration: number;      // s
  rotateEnd: number;     // deg
  size: number;          // px
  color: string;
}

function makeParticles(): Particle[] {
  return Array.from({ length: CONFETTI_COUNT }, (_, i) => {
    const seed = (i * 9301 + 49297) % 233280; // deterministic-ish
    const rand = (n: number) => ((seed * (n + 1)) % 1000) / 1000;
    return {
      id: i,
      left: rand(1) * 100,
      delay: rand(2) * 0.4,
      duration: 1.6 + rand(3) * 1.4,
      rotateEnd: (rand(4) - 0.5) * 720,
      size: 6 + Math.floor(rand(5) * 8),
      color: COLORS[i % COLORS.length] ?? '#F8E71C',
    };
  });
}

export function InboxZeroOverlay({
  open,
  onClose,
  autoDismissMs = 2400,
}: InboxZeroOverlayProps) {
  const reduce = useReducedMotion();
  const particles = React.useMemo(() => makeParticles(), []);

  React.useEffect(() => {
    if (!open) return;
    const t = setTimeout(onClose, autoDismissMs);
    return () => clearTimeout(t);
  }, [open, onClose, autoDismissMs]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="inbox-zero"
          role="dialog"
          aria-modal="true"
          aria-label="Inbox zero unlocked"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] flex items-center justify-center cursor-pointer"
          style={{ background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(6px)' }}
        >
          {/* Confetti */}
          {!reduce && (
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
              {particles.map((p) => (
                <motion.span
                  key={p.id}
                  initial={{ y: -40, x: 0, rotate: 0, opacity: 0 }}
                  animate={{
                    y: '110vh',
                    rotate: p.rotateEnd,
                    opacity: [0, 1, 1, 0.8],
                  }}
                  transition={{
                    duration: p.duration,
                    delay: p.delay,
                    ease: 'linear',
                  }}
                  className="absolute"
                  style={{
                    left: `${p.left}%`,
                    width: p.size,
                    height: p.size,
                    backgroundColor: p.color,
                    borderRadius: p.id % 3 === 0 ? '9999px' : '2px',
                    boxShadow:
                      p.color === '#F8E71C' || p.color === '#FAED4A'
                        ? '0 0 6px rgba(255,215,0,0.5)'
                        : 'none',
                  }}
                />
              ))}
            </div>
          )}

          {/* Centre stack */}
          <motion.div
            initial={reduce ? { opacity: 0 } : { scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 22 }}
            className="relative z-10 flex flex-col items-center text-center px-6"
          >
            {/* Soft gold radial glow behind the bee */}
            <div
              aria-hidden="true"
              className="absolute -z-10"
              style={{
                width: 320,
                height: 320,
                background:
                  'radial-gradient(circle at center, rgba(255,215,0,0.35) 0%, rgba(255,215,0,0) 70%)',
                filter: 'blur(2px)',
              }}
            />
            <BeeSleeping size={160} />
            <h2 className="mt-6 text-[32px] leading-[40px] font-bold text-white">
              Inbox zero unlocked! 🐝
            </h2>
            <p className="mt-2 text-[15px] leading-[22px] text-white/70">
              Free as a bee. Tap anywhere to wake me up.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
