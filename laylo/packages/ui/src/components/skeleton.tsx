import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils';

/**
 * Skeleton — Phase 2 spec.
 * See /DESIGN_SYSTEM.md §7.12. Surface-2 token (slightly darker than
 * cards). animate-pulse honours prefers-reduced-motion automatically.
 */
const skeletonVariants = cva(
  'animate-pulse bg-[var(--color-surface-2)]',
  {
    variants: {
      variant: {
        text: 'rounded-[8px] h-4 w-full',
        circle: 'rounded-full',
        rect: 'rounded-[16px]',
      },
    },
    defaultVariants: {
      variant: 'text',
    },
  }
);

export interface SkeletonProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof skeletonVariants> {
  width?: string | number;
  height?: string | number;
}

function Skeleton({
  className,
  variant,
  width,
  height,
  style,
  ...props
}: SkeletonProps) {
  const sizeStyle: React.CSSProperties = {
    ...(width != null ? { width: typeof width === 'number' ? `${width}px` : width } : {}),
    ...(height != null ? { height: typeof height === 'number' ? `${height}px` : height } : {}),
    ...(variant === 'circle' && width && !height
      ? { height: typeof width === 'number' ? `${width}px` : width }
      : {}),
    ...style,
  };

  return (
    <div
      className={cn(skeletonVariants({ variant }), className)}
      style={sizeStyle}
      aria-hidden="true"
      {...props}
    />
  );
}

export { Skeleton, skeletonVariants };
