import * as React from 'react';
import { cn } from '../utils';

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
        'rounded-[16px] border border-[#6366F1]/20 bg-gradient-to-br from-[#6366F1]/5 to-transparent p-6',
        'dark:border-[#6366F1]/15 dark:from-[#6366F1]/10',
        className
      )}
      {...props}
    >
      <div className="flex flex-col items-center text-center">
        {icon ? (
          <div className="mb-3 text-[#6366F1]">{icon}</div>
        ) : (
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#6366F1]/10">
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="text-[#6366F1]"
              aria-hidden="true"
            >
              <path
                d="M10 1.667L12.575 6.883 18.333 7.725 14.167 11.783 15.15 17.517 10 14.808 4.85 17.517 5.833 11.783 1.667 7.725 7.425 6.883 10 1.667Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        )}
        <h3 className="text-[16px] font-semibold text-gray-900 dark:text-gray-50">
          {featureName}
        </h3>
        {description && (
          <p className="mt-1.5 max-w-xs text-[14px] text-gray-500 dark:text-gray-400">
            {description}
          </p>
        )}
        <button
          onClick={onUpgrade}
          className={cn(
            'mt-5 inline-flex items-center justify-center gap-2 rounded-[10px] px-5 py-2.5',
            'bg-[#6366F1] text-white text-[14px] font-medium',
            'hover:bg-[#5558E6] active:bg-[#4F46E5]',
            'transition-colors duration-150 shadow-sm',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6366F1] focus-visible:ring-offset-2',
            'dark:focus-visible:ring-offset-[#0F0F0F]'
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
