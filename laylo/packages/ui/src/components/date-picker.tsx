'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils';

const datePickerVariants = cva(
  [
    'w-full rounded-[10px] border bg-white px-3 py-2 text-[14px] text-gray-900',
    'outline-none transition-colors duration-150',
    'focus:border-[#6366F1] focus:ring-2 focus:ring-[#6366F1]/20',
    'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-50',
    'dark:bg-[#1A1A1A] dark:text-gray-100 dark:border-[#333333]',
    'dark:focus:border-[#6366F1] dark:focus:ring-[#6366F1]/30',
    'dark:disabled:bg-[#151515]',
    // Style the calendar icon
    '[&::-webkit-calendar-picker-indicator]:cursor-pointer',
    'dark:[&::-webkit-calendar-picker-indicator]:filter dark:[&::-webkit-calendar-picker-indicator]:invert',
  ].join(' '),
  {
    variants: {
      state: {
        default: 'border-gray-200',
        error:
          'border-[#EF4444] focus:border-[#EF4444] focus:ring-[#EF4444]/20 dark:border-[#EF4444]',
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
            className="text-[14px] font-medium text-gray-700 dark:text-gray-300"
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
          <p id={errorId} className="text-[13px] text-[#EF4444]" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);
DatePicker.displayName = 'DatePicker';

export { DatePicker, datePickerVariants };
