import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils';

const badgeVariants = cva(
  'inline-flex items-center font-medium rounded-full transition-colors',
  {
    variants: {
      variant: {
        default:
          'bg-[#6366F1]/10 text-[#6366F1] dark:bg-[#6366F1]/20 dark:text-[#818CF8]',
        success:
          'bg-[#22C55E]/10 text-[#16A34A] dark:bg-[#22C55E]/20 dark:text-[#4ADE80]',
        warning:
          'bg-[#F59E0B]/10 text-[#D97706] dark:bg-[#F59E0B]/20 dark:text-[#FBBF24]',
        danger:
          'bg-[#EF4444]/10 text-[#DC2626] dark:bg-[#EF4444]/20 dark:text-[#F87171]',
        outline:
          'border border-gray-200 text-gray-700 dark:border-[#333333] dark:text-gray-300',
      },
      size: {
        sm: 'px-2 py-0.5 text-[11px]',
        md: 'px-2.5 py-0.5 text-[12px]',
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
