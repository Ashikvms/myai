'use client';

import * as React from 'react';
import { cn } from '../utils';

/**
 * Modal — Phase 2 spec.
 * See /DESIGN_SYSTEM.md §7.9. radius-md (16 px). Max-width 640 px.
 * Backdrop blur retained. Animation contract per §6 #6 — engineers
 * wrap with Framer Motion at the callsite if entering animation needed;
 * this component itself stays presentational.
 */
export interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}

function Modal({ open, onClose, children, className }: ModalProps) {
  const overlayRef = React.useRef<HTMLDivElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const previousFocus = React.useRef<HTMLElement | null>(null);

  // Focus trap and escape key
  React.useEffect(() => {
    if (!open) return;

    previousFocus.current = document.activeElement as HTMLElement;

    // Focus the panel
    const timer = setTimeout(() => {
      panelRef.current?.focus();
    }, 0);

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }

      // Basic focus trap
      if (e.key === 'Tab' && panelRef.current) {
        const focusable = panelRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;

        const first = focusable[0]!;
        const last = focusable[focusable.length - 1]!;

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    // Prevent body scroll
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      clearTimeout(timer);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = prev;
      previousFocus.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center p-4',
        'bg-[var(--color-overlay)] backdrop-blur-sm',
        'data-[state=open]:animate-in data-[state=closed]:animate-out'
      )}
      data-state={open ? 'open' : 'closed'}
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
      role="presentation"
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className={cn(
          'relative w-full max-w-[640px] rounded-[16px] p-8 outline-none',
          'bg-[var(--color-surface)] border border-[var(--color-border-strong)]',
          'shadow-[var(--shadow-lg)]',
          'data-[state=open]:animate-in data-[state=closed]:animate-out',
          className
        )}
        data-state={open ? 'open' : 'closed'}
      >
        {children}
      </div>
    </div>
  );
}

function ModalClose({
  onClose,
  className,
}: {
  onClose: () => void;
  className?: string;
}) {
  return (
    <button
      onClick={onClose}
      className={cn(
        'absolute right-4 top-4 rounded-[8px] p-1 text-[var(--color-text-subtle)] transition-colors',
        'hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]',
        className
      )}
      aria-label="Close"
      type="button"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M12 4L4 12M4 4L12 12"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

function ModalTitle({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn(
        // h2 token: 22/28/600.
        'text-[22px] leading-[28px] font-semibold text-[var(--color-text)]',
        className
      )}
      {...props}
    >
      {children}
    </h2>
  );
}

function ModalDescription({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn(
        'mt-1 text-[15px] leading-[22px] text-[var(--color-text-muted)]',
        className
      )}
      {...props}
    >
      {children}
    </p>
  );
}

export { Modal, ModalClose, ModalTitle, ModalDescription };
