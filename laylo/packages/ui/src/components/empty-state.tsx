import * as React from 'react';
import { cn } from '../utils';

/**
 * EmptyState — Phase 2 spec.
 * See /DESIGN_SYSTEM.md §7.10. Generic component — engineers pass a
 * <Bee*> illustration as the `icon` prop at the callsite to give it
 * personality (Brief §9.7 keeps copy out of this component).
 */
export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 px-6 text-center',
        className
      )}
      {...props}
    >
      {icon && (
        <div className="mb-4 text-[var(--color-text-subtle)]">{icon}</div>
      )}
      <h3 className="text-[16px] leading-[22px] font-semibold text-[var(--color-text)]">
        {title}
      </h3>
      {description && (
        <p className="mt-2 max-w-md text-[15px] leading-[22px] text-[var(--color-text-muted)]">
          {description}
        </p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export { EmptyState };
