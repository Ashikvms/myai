'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils';

const selectVariants = cva(
  [
    'w-full appearance-none rounded-[10px] border bg-white px-3 py-2 pr-10 text-[14px] text-gray-900',
    'outline-none transition-colors duration-150',
    'focus:border-[#6366F1] focus:ring-2 focus:ring-[#6366F1]/20',
    'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-50',
    'dark:bg-[#1A1A1A] dark:text-gray-100 dark:border-[#333333]',
    'dark:focus:border-[#6366F1] dark:focus:ring-[#6366F1]/30',
    'dark:disabled:bg-[#151515]',
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

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement>,
    VariantProps<typeof selectVariants> {
  label?: string;
  error?: string;
  placeholder?: string;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, state, placeholder, children, id, ...props }, ref) => {
    const selectId = id || React.useId();
    const errorId = error ? `${selectId}-error` : undefined;
    const computedState = error ? 'error' : state;

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label
            htmlFor={selectId}
            className="text-[14px] font-medium text-gray-700 dark:text-gray-300"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={cn(selectVariants({ state: computedState }), className)}
            aria-invalid={!!error}
            aria-describedby={errorId}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {children}
          </select>
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M4 6L8 10L12 6"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </div>
        {error && (
          <p id={errorId} className="text-[13px] text-[#EF4444]" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);
Select.displayName = 'Select';

export { Select, selectVariants };
