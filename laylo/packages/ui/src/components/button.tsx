'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils';

/**
 * Button — Phase 2 spec.
 * See /DESIGN_SYSTEM.md §7.1. Tokens consumed via CSS variables so
 * theme swap (light ↔ dark) is automatic via the `.dark` class on root.
 */
const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 font-medium',
    'transition-all duration-150 ease-[cubic-bezier(0.4,0,0.2,1)]',
    'rounded-[16px] outline-none',
    'focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] focus-visible:ring-offset-2',
    'focus-visible:ring-offset-[var(--color-bg)]',
    'disabled:pointer-events-none disabled:opacity-50',
    'active:scale-[0.98]',
  ].join(' '),
  {
    variants: {
      variant: {
        default: [
          'bg-[var(--color-accent)] text-[var(--color-text-on-accent)]',
          'hover:bg-[var(--color-accent-hover)]',
          'shadow-[var(--shadow-sm)]',
        ].join(' '),
        secondary: [
          'bg-[var(--color-surface-2)] text-[var(--color-text)]',
          'hover:bg-[var(--color-surface-hover)]',
        ].join(' '),
        outline: [
          'border border-[var(--color-border-strong)] bg-transparent text-[var(--color-text)]',
          'hover:bg-[var(--color-surface-hover)]',
        ].join(' '),
        ghost: [
          'bg-transparent text-[var(--color-text-muted)]',
          'hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]',
        ].join(' '),
        danger: [
          'bg-[var(--color-danger)] text-white',
          'hover:bg-[#DC2626] active:bg-[#B91C1C]',
          'shadow-[var(--shadow-sm)]',
        ].join(' '),
      },
      size: {
        sm: 'h-8 px-3 text-[13px] leading-[18px]',
        md: 'h-10 px-4 text-[15px] leading-[22px]',
        lg: 'h-12 px-6 text-[16px] leading-[22px]',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

const spinnerSizes = {
  sm: 'h-3.5 w-3.5',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
};

function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  return (
    <svg
      className={cn('animate-spin', spinnerSizes[size])}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
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

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      loading = false,
      disabled,
      iconLeft,
      iconRight,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || loading}
        aria-busy={loading}
        {...props}
      >
        {loading ? <Spinner size={size ?? 'md'} /> : iconLeft}
        {children}
        {!loading && iconRight}
      </button>
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
