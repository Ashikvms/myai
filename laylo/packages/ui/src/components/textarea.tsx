'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils';

/**
 * Textarea — Phase 2 spec.
 * See /DESIGN_SYSTEM.md §7.4. Same surface/border rules as Input.
 * radius-sm. min-height enforced via `min-h-[80px]`.
 */
const textareaVariants = cva(
  [
    'w-full rounded-[8px] border bg-[var(--color-surface)] px-3 py-2',
    'text-[15px] leading-[22px] text-[var(--color-text)] min-h-[80px]',
    'outline-none transition-colors duration-150 resize-vertical',
    'placeholder:text-[var(--color-text-subtle)]',
    'focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/25',
    'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-[var(--color-surface-2)]',
  ].join(' '),
  {
    variants: {
      state: {
        default: 'border-[var(--color-border)]',
        error:
          'border-[var(--color-danger)] focus:border-[var(--color-danger)] focus:ring-[var(--color-danger)]/25',
      },
    },
    defaultVariants: {
      state: 'default',
    },
  }
);

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    VariantProps<typeof textareaVariants> {
  label?: string;
  error?: string;
  autoResize?: boolean;
  showCount?: boolean;
  maxLength?: number;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className,
      label,
      error,
      state,
      autoResize = false,
      showCount = false,
      maxLength,
      id,
      value,
      defaultValue,
      onChange,
      ...props
    },
    ref
  ) => {
    const textareaId = id || React.useId();
    const errorId = error ? `${textareaId}-error` : undefined;
    const computedState = error ? 'error' : state;

    const internalRef = React.useRef<HTMLTextAreaElement | null>(null);
    const [charCount, setCharCount] = React.useState(
      () => String(value ?? defaultValue ?? '').length
    );

    // Combine refs
    const setRefs = React.useCallback(
      (el: HTMLTextAreaElement | null) => {
        internalRef.current = el;
        if (typeof ref === 'function') ref(el);
        else if (ref) (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = el;
      },
      [ref]
    );

    const handleAutoResize = React.useCallback(() => {
      const textarea = internalRef.current;
      if (!textarea || !autoResize) return;
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }, [autoResize]);

    React.useEffect(() => {
      handleAutoResize();
    }, [handleAutoResize, value]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setCharCount(e.target.value.length);
      handleAutoResize();
      onChange?.(e);
    };

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label
            htmlFor={textareaId}
            className="text-[13px] leading-[18px] font-medium text-[var(--color-text-muted)]"
          >
            {label}
          </label>
        )}
        <textarea
          ref={setRefs}
          id={textareaId}
          className={cn(
            textareaVariants({ state: computedState }),
            autoResize && 'resize-none overflow-hidden',
            className
          )}
          aria-invalid={!!error}
          aria-describedby={errorId}
          maxLength={maxLength}
          value={value}
          defaultValue={defaultValue}
          onChange={handleChange}
          rows={3}
          {...props}
        />
        <div className="flex items-center justify-between">
          {error ? (
            <p id={errorId} className="text-[13px] leading-[18px] text-[var(--color-danger)]" role="alert">
              {error}
            </p>
          ) : (
            <span />
          )}
          {showCount && (
            <span className="text-[11px] leading-[14px] text-[var(--color-text-subtle)] tabular-nums">
              {charCount}
              {maxLength != null && `/${maxLength}`}
            </span>
          )}
        </div>
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';

export { Textarea, textareaVariants };
