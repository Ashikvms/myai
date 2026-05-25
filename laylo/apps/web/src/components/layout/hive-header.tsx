'use client';

/**
 * HiveHeader — Bills page (LAYOUT_REDESIGN_BRIEF §2.2).
 *
 * A horizontal strip of small hex pips, one per bill.
 * Gold = paid, dim gold = due, red-tinted = overdue.
 * Hover shows a tooltip.
 */
import * as React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

const HEX_CLIP = 'polygon(25% 5%, 75% 5%, 100% 50%, 75% 95%, 25% 95%, 0% 50%)';

export type HivePipStatus = 'paid' | 'due' | 'overdue';

export interface HivePip {
  id: string;
  status: HivePipStatus;
  label: string;
}

export function HiveHeader({ pips, allPaid }: { pips: HivePip[]; allPaid?: boolean }) {
  const reduce = useReducedMotion();
  if (pips.length === 0) return null;

  return (
    <div className="mb-6 flex items-center gap-3 flex-wrap">
      <p className="text-[11px] leading-[14px] font-semibold uppercase tracking-wider text-[var(--color-text-subtle)]">
        Hive
      </p>
      <div className="flex items-center gap-1.5">
        {pips.map((pip, i) => (
          <Pip
            key={pip.id}
            pip={pip}
            index={i}
            allPaid={!!allPaid}
            reduce={!!reduce}
          />
        ))}
      </div>
    </div>
  );
}

function Pip({
  pip,
  index,
  allPaid,
  reduce,
}: {
  pip: HivePip;
  index: number;
  allPaid: boolean;
  reduce: boolean;
}) {
  const bg =
    pip.status === 'paid'
      ? 'var(--color-accent)'
      : pip.status === 'overdue'
      ? 'var(--color-danger)'
      : 'var(--color-accent-dim)';
  return (
    <div className="relative group">
      <motion.div
        animate={
          allPaid && !reduce
            ? { scale: [1, 1.25, 1], opacity: [1, 1, 1] }
            : undefined
        }
        transition={
          allPaid
            ? {
                duration: 0.6,
                delay: index * 0.05,
                repeat: 0,
                ease: [0.4, 0, 0.2, 1],
              }
            : undefined
        }
        className="w-4 h-4"
        style={{
          clipPath: HEX_CLIP,
          WebkitClipPath: HEX_CLIP,
          background: bg,
        }}
      />
      <div
        role="tooltip"
        className="pointer-events-none absolute left-1/2 -translate-x-1/2 -top-9 px-2 py-1 rounded-[8px] bg-[var(--color-text)] text-[var(--color-bg)] text-[11px] leading-[14px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-20"
      >
        {pip.label}
      </div>
    </div>
  );
}
