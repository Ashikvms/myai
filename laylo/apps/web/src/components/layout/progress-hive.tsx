'use client';

/**
 * ProgressHive — Tasks page (LAYOUT_REDESIGN_BRIEF §2.3).
 *
 * A row of small hex pips, one per task. Gold filled = completed,
 * outline only = pending. Thin gold connecting line beneath fills
 * left → right as the user clears tasks. Click pip → onSelect(id).
 */
import * as React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

const HEX_CLIP = 'polygon(25% 5%, 75% 5%, 100% 50%, 75% 95%, 25% 95%, 0% 50%)';

interface PipState {
  id: string;
  done: boolean;
  label?: string;
}

interface ProgressHiveProps {
  pips: PipState[];
  onSelect?: (id: string) => void;
}

export function ProgressHive({ pips, onSelect }: ProgressHiveProps) {
  const reduce = useReducedMotion();
  const total = pips.length;
  const done = pips.filter((p) => p.done).length;
  const pct = total === 0 ? 0 : (done / total) * 100;

  // Overshoot + bounce when we hit 100% — spring 350/22.
  const justCompleted = done > 0 && done === total;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] leading-[14px] font-semibold uppercase tracking-wider text-[var(--color-text-subtle)]">
          Progress · {done} of {total} cleared
        </p>
      </div>
      <div className="relative">
        {/* Pips */}
        <div className="flex items-center gap-2 flex-wrap mb-2">
          {pips.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelect?.(p.id)}
              aria-label={p.label ? `Jump to ${p.label}` : `Task ${p.id}`}
              className="relative w-5 h-5 transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] rounded-[4px]"
            >
              <motion.div
                animate={
                  reduce
                    ? undefined
                    : p.done
                    ? { scale: [1, 1.15, 1] }
                    : { scale: 1 }
                }
                transition={{ duration: 0.2 }}
                className="absolute inset-0"
                style={{
                  clipPath: HEX_CLIP,
                  WebkitClipPath: HEX_CLIP,
                  background: p.done
                    ? 'var(--color-accent)'
                    : 'var(--color-border-strong)',
                }}
              />
              {!p.done && (
                <div
                  aria-hidden="true"
                  className="absolute inset-[1.5px]"
                  style={{
                    clipPath: HEX_CLIP,
                    WebkitClipPath: HEX_CLIP,
                    background: 'var(--color-surface)',
                  }}
                />
              )}
            </button>
          ))}
        </div>
        {/* Connecting line */}
        <div className="relative h-[2px] bg-[var(--color-border)] rounded-full overflow-hidden">
          <motion.div
            initial={false}
            animate={{
              width: `${pct}%`,
              ...(justCompleted && !reduce
                ? { x: [0, 4, 0] }
                : {}),
            }}
            transition={
              justCompleted
                ? { type: 'spring', stiffness: 350, damping: 22 }
                : { duration: 0.4, ease: [0.4, 0, 0.2, 1] }
            }
            className="absolute left-0 top-0 h-full bg-[var(--color-accent)]"
          />
        </div>
      </div>
    </div>
  );
}
