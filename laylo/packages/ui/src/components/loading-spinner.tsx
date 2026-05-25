import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils';

/**
 * LoadingSpinner — Phase 2 spec.
 * See /DESIGN_SYSTEM.md §7.11. Default colour now `accent` (gold) —
 * engineers should still keep the `primary` alias working at the
 * callsite (TS-level synonym below).
 */
const spinnerVariants = cva('animate-spin', {
  variants: {
    size: {
      sm: 'h-4 w-4',
      md: 'h-6 w-6',
      lg: 'h-8 w-8',
    },
    color: {
      accent: 'text-[var(--color-accent)]',
      // `primary` is a backwards-compat alias kept stable for Phase 3a.
      primary: 'text-[var(--color-accent)]',
      white: 'text-white',
      gray: 'text-[var(--color-text-subtle)]',
    },
  },
  defaultVariants: {
    size: 'md',
    color: 'accent',
  },
});

export interface LoadingSpinnerProps
  extends Omit<React.HTMLAttributes<SVGSVGElement>, 'color'>,
    VariantProps<typeof spinnerVariants> {}

function LoadingSpinner({
  className,
  size,
  color,
  ...props
}: LoadingSpinnerProps) {
  return (
    <svg
      className={cn(spinnerVariants({ size, color }), className)}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      role="status"
      aria-label="Loading"
      {...props}
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

export { LoadingSpinner, spinnerVariants };
