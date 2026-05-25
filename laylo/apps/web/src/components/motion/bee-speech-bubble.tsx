'use client';

/**
 * BeeSpeechBubble — small stylised speech bubble for moments when the bee
 * "says something" to the user.
 *
 * Used sparingly (3–4 places max): auth pages, first-time empty states,
 * after a streak of completions. Reuses --color-accent for the border + a
 * tiny tail anchored to a side. Body text NEVER gold (locked rule).
 *
 * Reduce motion: still renders, just without the entrance animation.
 */
import * as React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

export type BubbleSide = 'left' | 'right' | 'top' | 'bottom';

interface BeeSpeechBubbleProps {
  children: React.ReactNode;
  /** Which side the tail points toward (i.e. the bee's position). */
  tail?: BubbleSide;
  className?: string;
  /** Optional aria-label for screen readers — defaults to children. */
  ariaLabel?: string;
}

const TAIL_POSITION: Record<BubbleSide, string> = {
  left:   'left-0 top-1/2 -translate-x-[6px] -translate-y-1/2',
  right:  'right-0 top-1/2 translate-x-[6px] -translate-y-1/2',
  top:    'top-0 left-1/2 -translate-y-[6px] -translate-x-1/2',
  bottom: 'bottom-0 left-1/2 translate-y-[6px] -translate-x-1/2',
};

export function BeeSpeechBubble({
  children,
  tail = 'left',
  className,
  ariaLabel,
}: BeeSpeechBubbleProps) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      role="note"
      aria-label={ariaLabel}
      initial={reduce ? false : { opacity: 0, scale: 0.92, y: 4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 360, damping: 26 }}
      className={[
        'relative inline-flex items-center gap-2 px-3 py-2',
        'rounded-[16px] border border-[var(--color-accent)]',
        'bg-[var(--color-surface)] shadow-glow',
        'text-[13px] leading-[18px] font-medium text-[var(--color-text)]',
        className ?? '',
      ].join(' ')}
    >
      {/* Tail — small rotated diamond punching out from the chosen side. */}
      <span
        aria-hidden="true"
        className={[
          'absolute w-[10px] h-[10px] rotate-45',
          'bg-[var(--color-surface)]',
          'border-l border-t border-[var(--color-accent)]',
          tail === 'left' ? 'left-0 top-1/2 -translate-x-[5px] -translate-y-1/2' : '',
          tail === 'right' ? 'right-0 top-1/2 translate-x-[5px] -translate-y-1/2 rotate-[225deg]' : '',
          tail === 'top' ? 'top-0 left-1/2 -translate-y-[5px] -translate-x-1/2 -rotate-[45deg]' : '',
          tail === 'bottom' ? 'bottom-0 left-1/2 translate-y-[5px] -translate-x-1/2 rotate-[135deg]' : '',
        ].join(' ')}
      />
      {/* Mark TAIL_POSITION as referenced (for future positional tweaks); kept exported intent. */}
      <span className="hidden" aria-hidden="true" data-tail={TAIL_POSITION[tail]} />
      <span className="relative z-10">{children}</span>
    </motion.div>
  );
}

export default BeeSpeechBubble;
