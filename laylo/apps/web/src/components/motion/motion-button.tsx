'use client';

/**
 * MotionButton — Group B (B2).
 *
 * Bouncy primary button: scale 0.96 on tap with a spring transition.
 * Drop-in replacement for `<button>` everywhere we want playful feedback,
 * without touching packages/ui (out of scope per Playfulness Engineer brief).
 *
 * Reduced motion: skips scale, still fires onClick instantly.
 */
import * as React from 'react';
import { motion, useReducedMotion, type HTMLMotionProps } from 'framer-motion';

type ButtonProps = HTMLMotionProps<'button'>;

export const MotionButton = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function MotionButton({ children, ...props }, ref) {
    const reduce = useReducedMotion();
    return (
      <motion.button
        ref={ref}
        whileTap={reduce ? undefined : { scale: 0.96 }}
        transition={{ type: 'spring', stiffness: 500, damping: 25 }}
        {...props}
      >
        {children}
      </motion.button>
    );
  },
);
