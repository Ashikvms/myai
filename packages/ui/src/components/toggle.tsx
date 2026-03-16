'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils';

const toggleTrackVariants = cva(
  [
    'relative inline-flex shrink-0 cursor-pointer rounded-full border-2 border-transparent',
    'transition-colors duration-200 ease-in-out',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6366F1] focus-visible:ring-offset-2',
    'disabled:cursor-not-allowed disabled:opacity-50',
    'dark:focus-visible:ring-offset-[#0F0F0F]',
  ].join(' '),
  {
    variants: {
      size: {
        sm: 'h-5 w-9',
        md: 'h-6 w-11',
      },
      checked: {
        true: 'bg-[#6366F1]',
        false: 'bg-gray-200 dark:bg-[#333333]',
      },
    },
    defaultVariants: {
      size: 'md',
      checked: false,
    },
  }
);

const toggleThumbVariants = cva(
  'pointer-events-none inline-block rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ease-in-out',
  {
    variants: {
      size: {
        sm: 'h-4 w-4',
        md: 'h-5 w-5',
      },
      checked: {
        true: '',
        false: 'translate-x-0',
      },
    },
    compoundVariants: [
      { size: 'sm', checked: true, class: 'translate-x-4' },
      { size: 'md', checked: true, class: 'translate-x-5' },
    ],
    defaultVariants: {
      size: 'md',
      checked: false,
    },
  }
);

export interface ToggleProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  size?: 'sm' | 'md';
  label?: string;
}

function Toggle({
  checked = false,
  onChange,
  size = 'md',
  label,
  disabled,
  className,
  id,
  ...props
}: ToggleProps) {
  const toggleId = id || React.useId();

  return (
    <div className="inline-flex items-center gap-2">
      <button
        id={toggleId}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={!label ? props['aria-label'] : undefined}
        disabled={disabled}
        onClick={() => onChange?.(!checked)}
        className={cn(
          toggleTrackVariants({ size, checked }),
          className
        )}
        {...props}
      >
        <span
          className={toggleThumbVariants({ size, checked })}
          aria-hidden="true"
        />
      </button>
      {label && (
        <label
          htmlFor={toggleId}
          className={cn(
            'text-[14px] text-gray-700 dark:text-gray-300 select-none',
            disabled && 'opacity-50 cursor-not-allowed',
            !disabled && 'cursor-pointer'
          )}
        >
          {label}
        </label>
      )}
    </div>
  );
}

export { Toggle, toggleTrackVariants, toggleThumbVariants };
