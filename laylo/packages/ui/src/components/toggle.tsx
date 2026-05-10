'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils';

/**
 * Toggle — Phase 2 spec.
 * See /DESIGN_SYSTEM.md §7.14. rounded-full retained for the track
 * and thumb (one of the two sanctioned uses of pill radius).
 */
const toggleTrackVariants = cva(
  [
    'relative inline-flex shrink-0 cursor-pointer rounded-full border-2 border-transparent',
    'transition-colors duration-200 ease-in-out',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] focus-visible:ring-offset-2',
    'focus-visible:ring-offset-[var(--color-bg)]',
    'disabled:cursor-not-allowed disabled:opacity-50',
  ].join(' '),
  {
    variants: {
      size: {
        sm: 'h-5 w-9',
        md: 'h-6 w-11',
      },
      checked: {
        true: 'bg-[var(--color-accent)]',
        false: 'bg-[var(--color-surface-2)]',
      },
    },
    defaultVariants: {
      size: 'md',
      checked: false,
    },
  }
);

const toggleThumbVariants = cva(
  'pointer-events-none inline-block rounded-full bg-white shadow-[var(--shadow-sm)] ring-0 transition-transform duration-200 ease-in-out',
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
            'text-[15px] leading-[22px] text-[var(--color-text)] select-none',
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
