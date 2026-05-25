import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils';

/**
 * Badge — Phase 2 spec.
 * See /DESIGN_SYSTEM.md §7.7. radius-sm (8 px) — switched from rounded-full
 * per Brief §4.4. Body text never gold; accent variant uses --color-text
 * in light mode and --color-accent only in dark mode (where the soft
 * oxide background gives 5.6:1 contrast).
 */
const badgeVariants = cva(
  'inline-flex items-center font-medium rounded-[8px] transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-[var(--color-surface-2)] text-[var(--color-text)]',
        accent: 'bg-[var(--color-accent-soft)] text-[var(--color-text)] dark:text-[var(--color-accent)]',
        success:
          'bg-[rgba(34,197,94,0.10)] text-[#15803D] dark:bg-[rgba(34,197,94,0.20)] dark:text-[#86EFAC]',
        warning:
          'bg-[rgba(245,158,11,0.10)] text-[#B45309] dark:bg-[rgba(245,158,11,0.20)] dark:text-[#FCD34D]',
        danger:
          'bg-[rgba(239,68,68,0.10)] text-[#B91C1C] dark:bg-[rgba(239,68,68,0.20)] dark:text-[#FCA5A5]',
        outline:
          'border border-[var(--color-border)] text-[var(--color-text)] bg-transparent',
      },
      size: {
        sm: 'px-1.5 py-0.5 text-[11px] leading-[14px] uppercase tracking-wider',
        md: 'px-2.5 py-1 text-[13px] leading-[18px]',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant, size }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
