'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils';

/**
 * Input — Phase 2 spec.
 * See /DESIGN_SYSTEM.md §7.3. radius-sm (8 px). Focus ring is gold.
 */
const inputWrapperVariants = cva('flex flex-col gap-1.5 w-full', {
  variants: {},
  defaultVariants: {},
});

const inputVariants = cva(
  [
    'w-full rounded-[8px] border bg-[var(--color-surface)] px-3 py-2',
    'text-[15px] leading-[22px] text-[var(--color-text)]',
    'outline-none transition-colors duration-150',
    'placeholder:text-[var(--color-text-subtle)]',
    'focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/25',
    'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-[var(--color-surface-2)]',
  ].join(' '),
  {
    variants: {
      state: {
        default: 'border-[var(--color-border)]',
        error:
          'border-[var(--color-danger)] focus:border-[var(--color-danger)] focus:ring-[var(--color-danger)]/25',
      },
    },
    defaultVariants: {
      state: 'default',
    },
  }
);

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  label?: string;
  error?: string;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, state, iconLeft, iconRight, id, ...props }, ref) => {
    const inputId = id || React.useId();
    const errorId = error ? `${inputId}-error` : undefined;
    const computedState = error ? 'error' : state;

    return (
      <div className={inputWrapperVariants()}>
        {label && (
          <label
            htmlFor={inputId}
            className="text-[13px] leading-[18px] font-medium text-[var(--color-text-muted)]"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {iconLeft && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-subtle)]">
              {iconLeft}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              inputVariants({ state: computedState }),
              iconLeft && 'pl-10',
              iconRight && 'pr-10',
              className
            )}
            aria-invalid={!!error}
            aria-describedby={errorId}
            {...props}
          />
          {iconRight && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-subtle)]">
              {iconRight}
            </span>
          )}
        </div>
        {error && (
          <p
            id={errorId}
            className="text-[13px] leading-[18px] text-[var(--color-danger)]"
            role="alert"
          >
            {error}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';

export { Input, inputVariants };
