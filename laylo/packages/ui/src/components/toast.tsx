'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils';

const toastVariants = cva(
  [
    'pointer-events-auto w-full max-w-sm rounded-[10px] border p-4 shadow-lg',
    'flex items-start gap-3 transition-all duration-200',
  ].join(' '),
  {
    variants: {
      type: {
        success:
          'bg-white border-[#22C55E]/30 dark:bg-[#1A1A1A] dark:border-[#22C55E]/20',
        error:
          'bg-white border-[#EF4444]/30 dark:bg-[#1A1A1A] dark:border-[#EF4444]/20',
        warning:
          'bg-white border-[#F59E0B]/30 dark:bg-[#1A1A1A] dark:border-[#F59E0B]/20',
        info: 'bg-white border-gray-200 dark:bg-[#1A1A1A] dark:border-[#2A2A2A]',
      },
    },
    defaultVariants: {
      type: 'info',
    },
  }
);

const toastIconColors = {
  success: 'text-[#22C55E]',
  error: 'text-[#EF4444]',
  warning: 'text-[#F59E0B]',
  info: 'text-[#6366F1]',
};

const toastIcons: Record<ToastType, React.ReactNode> = {
  success: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M16.667 5L7.5 14.167 3.333 10"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  error: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M12.5 7.5L7.5 12.5M7.5 7.5L12.5 12.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
  warning: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M10 7V10.5M10 13H10.01"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.57 3.222L1.517 15.556A1.667 1.667 0 003.002 18h14.053a1.667 1.667 0 001.43-2.444L11.43 3.222a1.667 1.667 0 00-2.86 0z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  info: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M10 9V14M10 7H10.01"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
};

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
}

interface ToastContextValue {
  toast: (opts: { type?: ToastType; title: string; description?: string }) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

function useToast(): ToastContextValue {
  const ctx = React.useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}

const MAX_TOASTS = 3;
const AUTO_DISMISS_MS = 5000;

function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const timersRef = React.useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const addToast = React.useCallback(
    (opts: { type?: ToastType; title: string; description?: string }) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const newToast: Toast = {
        id,
        type: opts.type || 'info',
        title: opts.title,
        description: opts.description,
      };

      setToasts((prev) => {
        const next = [...prev, newToast];
        // Trim to max
        if (next.length > MAX_TOASTS) {
          const removed = next.shift()!;
          const timer = timersRef.current.get(removed.id);
          if (timer) {
            clearTimeout(timer);
            timersRef.current.delete(removed.id);
          }
        }
        return next;
      });

      const timer = setTimeout(() => removeToast(id), AUTO_DISMISS_MS);
      timersRef.current.set(id, timer);
    },
    [removeToast]
  );

  // Cleanup timers on unmount
  React.useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => clearTimeout(timer));
    };
  }, []);

  const contextValue = React.useMemo<ToastContextValue>(
    () => ({ toast: addToast }),
    [addToast]
  );

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <div
        className="fixed bottom-4 right-4 z-[100] flex flex-col-reverse gap-2 pointer-events-none"
        aria-live="polite"
        aria-label="Notifications"
      >
        {toasts.map((t) => (
          <div key={t.id} className={cn(toastVariants({ type: t.type }))}>
            <span className={cn('shrink-0 mt-0.5', toastIconColors[t.type])}>
              {toastIcons[t.type]}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-medium text-gray-900 dark:text-gray-50">
                {t.title}
              </p>
              {t.description && (
                <p className="mt-0.5 text-[13px] text-gray-500 dark:text-gray-400">
                  {t.description}
                </p>
              )}
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="shrink-0 rounded-[6px] p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-[#2A2A2A] dark:hover:text-gray-300 transition-colors"
              aria-label="Dismiss"
              type="button"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M10.5 3.5L3.5 10.5M3.5 3.5L10.5 10.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export { ToastProvider, useToast, toastVariants };
export type { Toast, ToastType, ToastContextValue };
