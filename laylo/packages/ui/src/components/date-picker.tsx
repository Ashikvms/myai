'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils';

/**
 * DatePicker — Phase 2 spec.
 * See /DESIGN_SYSTEM.md §7.6. Native <input type="date">. Mirrors
 * Input styling. Calendar icon inverted in dark mode for legibility.
 */
const datePickerVariants = cva(
  [
    'w-full rounded-[8px] border bg-[var(--color-surface)] px-3 py-2',
    'text-[15px] leading-[22px] text-[var(--color-text)]',
    'outline-none transition-colors duration-150',
    'focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/25',
    'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-[var(--color-surface-2)]',
    '[&::-webkit-calendar-picker-indicator]:cursor-pointer',
    'dark:[&::-webkit-calendar-picker-indicator]:filter dark:[&::-webkit-calendar-picker-indicator]:invert',
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

export interface DatePickerProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'>,
    VariantProps<typeof datePickerVariants> {
  label?: string;
  error?: string;
}

const DatePicker = React.forwardRef<HTMLInputElement, DatePickerProps>(
  ({ className, label, error, state, id, ...props }, ref) => {
    const inputId = id || React.useId();
    const errorId = error ? `${inputId}-error` : undefined;
    const computedState = error ? 'error' : state;

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="text-[13px] leading-[18px] font-medium text-[var(--color-text-muted)]"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          type="date"
          className={cn(datePickerVariants({ state: computedState }), className)}
          aria-invalid={!!error}
          aria-describedby={errorId}
          {...props}
        />
        {error && (
          <p id={errorId} className="text-[13px] leading-[18px] text-[var(--color-danger)]" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);
DatePicker.displayName = 'DatePicker';

export { DatePicker, datePickerVariants };
