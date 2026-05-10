'use client';

/**
 * AnimatedNumber — Group B (B6).
 *
 * Counts a numeric value up from 0 → final on mount over ~800ms.
 * Useful on dashboard hero stats: "Pending Tasks", "Due This Week", etc.
 *
 * Reduced motion: render the final formatted value instantly.
 *
 * Built with Framer Motion's `animate()` imperative driver — no extra deps.
 */
import * as React from 'react';
import { animate, useReducedMotion } from 'framer-motion';

interface AnimatedNumberProps {
  value: number;
  /** Override duration in seconds. Default 0.8s. */
  duration?: number;
  /** Format the displayed string. Default = locale-string with no decimals. */
  format?: (n: number) => string;
  /** Display decimals; ignored when `format` is provided. Default 0. */
  decimals?: number;
  /** Optional prefix, e.g. "$". Ignored when `format` is provided. */
  prefix?: string;
  /** Optional suffix, e.g. " items". Ignored when `format` is provided. */
  suffix?: string;
  className?: string;
}

export function AnimatedNumber({
  value,
  duration = 0.8,
  format,
  decimals = 0,
  prefix = '',
  suffix = '',
  className,
}: AnimatedNumberProps) {
  const reduce = useReducedMotion();
  const ref = React.useRef<HTMLSpanElement | null>(null);

  const formatter = React.useCallback(
    (n: number) => {
      if (format) return format(n);
      const fixed = n.toFixed(decimals);
      // Pretty thousands separators while preserving decimal places.
      const [intPart, fracPart] = fixed.split('.');
      const pretty =
        Number(intPart).toLocaleString('en-US') +
        (fracPart ? `.${fracPart}` : '');
      return `${prefix}${pretty}${suffix}`;
    },
    [format, decimals, prefix, suffix],
  );

  React.useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (reduce) {
      node.textContent = formatter(value);
      return;
    }
    const controls = animate(0, value, {
      duration,
      ease: [0.4, 0, 0.2, 1],
      onUpdate(latest) {
        node.textContent = formatter(latest);
      },
    });
    return () => controls.stop();
    // We intentionally re-run when `value` changes so updates re-tween.
  }, [value, duration, reduce, formatter]);

  // Initial render: print the formatted final value so SSR + reduce-motion
  // both produce a sensible string and there's no FOUC.
  return (
    <span ref={ref} className={className}>
      {formatter(reduce ? value : 0)}
    </span>
  );
}
