'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils';

const avatarVariants = cva(
  'relative inline-flex shrink-0 items-center justify-center rounded-full bg-gray-100 dark:bg-[#2A2A2A] overflow-hidden',
  {
    variants: {
      size: {
        sm: 'h-8 w-8 text-[12px]',
        md: 'h-10 w-10 text-[14px]',
        lg: 'h-12 w-12 text-[16px]',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  }
);

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0]!.charAt(0).toUpperCase();
  return (parts[0]!.charAt(0) + parts[parts.length - 1]!.charAt(0)).toUpperCase();
}

export interface AvatarProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof avatarVariants> {
  src?: string | null;
  alt?: string;
  name?: string;
}

function Avatar({ className, size, src, alt, name, ...props }: AvatarProps) {
  const [imgError, setImgError] = React.useState(false);

  const showImage = src && !imgError;
  const initials = name ? getInitials(name) : '?';

  return (
    <span
      className={cn(avatarVariants({ size }), className)}
      role="img"
      aria-label={alt || name || 'Avatar'}
      {...props}
    >
      {showImage ? (
        <img
          src={src}
          alt={alt || name || 'Avatar'}
          className="h-full w-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <span className="font-medium text-gray-600 dark:text-gray-300 select-none">
          {initials}
        </span>
      )}
    </span>
  );
}

export { Avatar, avatarVariants };
