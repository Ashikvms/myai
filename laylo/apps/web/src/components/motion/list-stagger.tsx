'use client';

/**
 * List stagger primitives — Group B (B1).
 *
 * Cascade list cards in on mount. Subtle fade + 8px translateY rise.
 *  - <ListStagger> wraps the parent. Sets up the stagger schedule.
 *  - <ListItem>   wraps each child. Inherits the stagger from its parent.
 *
 * Both are gated on useReducedMotion(): when reduced motion is on, the
 * children render at their final state immediately.
 *
 * Usage:
 *   <ListStagger className="space-y-3">
 *     {items.map((it) => (
 *       <ListItem key={it.id}>{render(it)}</ListItem>
 *     ))}
 *   </ListStagger>
 *
 * Spec: REDESIGN_BRIEF.md §5 + DESIGN_SYSTEM.md §6 (dur-standard, ease-entry).
 */
import * as React from 'react';
import { motion, useReducedMotion, type HTMLMotionProps } from 'framer-motion';

const containerVariants = {
  hidden: { opacity: 1 }, // parent stays visible; only the children animate
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.02 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] as const },
  },
};

type DivProps = HTMLMotionProps<'div'>;

export function ListStagger({ children, ...props }: DivProps) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : 'hidden'}
      animate="visible"
      variants={containerVariants}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function ListItem({ children, ...props }: DivProps) {
  return (
    <motion.div variants={itemVariants} {...props}>
      {children}
    </motion.div>
  );
}

/** Lower-level export — useful if you need to put variants on existing motion.div */
export const listStaggerVariants = {
  container: containerVariants,
  item: itemVariants,
};
