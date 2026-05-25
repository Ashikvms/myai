import * as React from 'react';
import { cn } from '../utils';

/**
 * UpgradePrompt — Phase 2 spec.
 * See /DESIGN_SYSTEM.md §7.15. Gradients removed (Brief §4.1 hard rule).
 * Solid surface card with a single gold-tinted border + gold star icon.
 */
export interface UpgradePromptProps extends React.HTMLAttributes<HTMLDivElement> {
  featureName: string;
  description?: string;
  ctaLabel?: string;
  onUpgrade?: () => void;
  icon?: React.ReactNode;
}

function UpgradePrompt({
  featureName,
  description,
  ctaLabel = 'Upgrade to Premium',
  onUpgrade,
  icon,
  className,
  ...props
}: UpgradePromptProps) {
  return (
    <div
      className={cn(
        'rounded-[16px] border bg-[var(--color-surface)] p-8',
        // 30% gold border to call attention without going full-bleed.
        'border-[color-mix(in_oklab,var(--color-accent)_30%,transparent)]',
        className
      )}
      {...props}
    >
      <div className="flex flex-col items-center text-center">
        {icon ? (
          <div className="mb-3 text-[var(--color-accent)]">{icon}</div>
        ) : (
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-accent-soft)]">
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="text-[var(--color-accent)]"
              aria-hidden="true"
            >
              <path
                d="M10 1.667L12.575 6.883 18.333 7.725 14.167 11.783 15.15 17.517 10 14.808 4.85 17.517 5.833 11.783 1.667 7.725 7.425 6.883 10 1.667Z"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        )}
        <h3 className="text-[16px] leading-[22px] font-semibold text-[var(--color-text)]">
          {featureName}
        </h3>
        {description && (
          <p className="mt-2 max-w-xs text-[15px] leading-[22px] text-[var(--color-text-muted)]">
            {description}
          </p>
        )}
        <button
          onClick={onUpgrade}
          className={cn(
            'mt-6 inline-flex items-center justify-center gap-2 rounded-[16px] px-5 py-2.5',
            'bg-[var(--color-accent)] text-[var(--color-text-on-accent)]',
            'text-[15px] leading-[22px] font-medium',
            'hover:bg-[var(--color-accent-hover)] active:scale-[0.98]',
            'transition-all duration-150 shadow-[var(--shadow-sm)]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] focus-visible:ring-offset-2',
            'focus-visible:ring-offset-[var(--color-bg)]'
          )}
          type="button"
        >
          {ctaLabel}
        </button>
      </div>
    </div>
  );
}

export { UpgradePrompt };
