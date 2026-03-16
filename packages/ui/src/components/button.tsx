'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils';

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 font-medium transition-all duration-150',
    'rounded-[10px] outline-none',
    'focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500',
    'disabled:pointer-events-none disabled:opacity-50',
    'dark:focus-visible:ring-offset-[#0F0F0F]',
  ].join(' '),
  {
    variants: {
      variant: {
        default:
          'bg-[#6366F1] text-white hover:bg-[#5558E6] active:bg-[#4F46E5] shadow-sm',
        secondary:
          'bg-gray-100 text-gray-900 hover:bg-gray-200 active:bg-gray-300 dark:bg-[#2A2A2A] dark:text-gray-100 dark:hover:bg-[#333333]',
        outline:
          'border border-gray-200 bg-transparent text-gray-900 hover:bg-gray-50 active:bg-gray-100 dark:border-[#333333] dark:text-gray-100 dark:hover:bg-[#1F1F1F]',
        ghost:
          'bg-transparent text-gray-700 hover:bg-gray-100 active:bg-gray-200 dark:text-gray-300 dark:hover:bg-[#1F1F1F]',
        danger:
          'bg-[#EF4444] text-white hover:bg-[#DC2626] active:bg-[#B91C1C] shadow-sm',
      },
      size: {
        sm: 'h-8 px-3 text-[13px] rounded-[6px]',
        md: 'h-10 px-4 text-[14px]',
        lg: 'h-12 px-6 text-[16px]',
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
