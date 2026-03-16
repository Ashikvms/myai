'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils';

const inputWrapperVariants = cva('flex flex-col gap-1.5 w-full', {
  variants: {},
  defaultVariants: {},
});

const inputVariants = cva(
  [
    'w-full rounded-[10px] border bg-white px-3 py-2 text-[14px] text-gray-900',
    'outline-none transition-colors duration-150',
    'placeholder:text-gray-400',
    'focus:border-[#6366F1] focus:ring-2 focus:ring-[#6366F1]/20',
    'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-50',
    'dark:bg-[#1A1A1A] dark:text-gray-100 dark:border-[#333333]',
    'dark:placeholder:text-gray-500',
    'dark:focus:border-[#6366F1] dark:focus:ring-[#6366F1]/30',
    'dark:disabled:bg-[#151515]',
  ].join(' '),
  {
    variants: {
      state: {
        default: 'border-gray-200',
        error:
          'border-[#EF4444] focus:border-[#EF4444] focus:ring-[#EF4444]/20 dark:border-[#EF4444] dark:focus:border-[#EF4444]',
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
            className="text-[14px] font-medium text-gray-700 dark:text-gray-300"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {iconLeft && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">
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
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">
              {iconRight}
            </span>
          )}
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
Input.displayName = 'Input';

export { Input, inputVariants };
