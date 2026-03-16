'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils';

const textareaVariants = cva(
  [
    'w-full rounded-[10px] border bg-white px-3 py-2 text-[14px] text-gray-900',
    'outline-none transition-colors duration-150 resize-vertical',
    'placeholder:text-gray-400',
    'focus:border-[#6366F1] focus:ring-2 focus:ring-[#6366F1]/20',
    'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-50',
    'dark:bg-[#1A1A1A] dark:text-gray-100 dark:border-[#333333]',
    'dark:placeholder:text-gray-500',
    'dark:focus:border-[#6366F1] dark:focus:ring-[#6366F1]/30',
    'dark:disabled:bg-[#151515]',
  ].join(' '),
  {
    variants: {
      state: {
        default: 'border-gray-200',
        error:
          'border-[#EF4444] focus:border-[#EF4444] focus:ring-[#EF4444]/20 dark:border-[#EF4444]',
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
            className="text-[14px] font-medium text-gray-700 dark:text-gray-300"
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
            <p id={errorId} className="text-[13px] text-[#EF4444]" role="alert">
              {error}
            </p>
          ) : (
            <span />
          )}
          {showCount && (
            <span className="text-[12px] text-gray-400 dark:text-gray-500 tabular-nums">
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
