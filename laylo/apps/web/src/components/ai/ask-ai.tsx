'use client';

/**
 * AskAi affordance — chip + modal pattern.
 *
 * Spec: DESIGN_SYSTEM.md §9 + REDESIGN_BRIEF.md §3.3 / §5 #4.
 *
 * Rest state: 1 px gold-dim border @ 50% opacity; muted icon + label.
 * Hover/active: full gold border + glow + soft fill. Transition 150 ms.
 *
 * On submit, the modal shows a "We'll wire this up next" placeholder —
 * no backend chat scaffolding exists yet.
 */
import * as React from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Sparkles, ArrowUp, X } from 'lucide-react';

interface AskAiChipProps {
  prompt: string;
  context?: string;
  label?: string;
  className?: string;
  iconOnly?: boolean;
}

export function AskAiChip({
  prompt,
  context,
  label,
  className,
  iconOnly = false,
}: AskAiChipProps) {
  const [open, setOpen] = React.useState(false);
  const displayLabel = label ?? prompt;
  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setOpen(true);
        }}
        aria-label={`Ask Beedo: ${displayLabel}`}
        className={[
          'group inline-flex items-center gap-1.5 rounded-[8px] px-2.5 py-1',
          'border border-[var(--color-accent-dim)]/50',
          'text-[13px] leading-[18px] font-medium text-[var(--color-text-muted)]',
          'transition-all duration-[150ms] ease-[cubic-bezier(0.4,0,0.2,1)]',
          'hover:border-[var(--color-accent)] hover:text-[var(--color-text)] hover:shadow-glow',
          'hover:bg-[var(--color-accent-soft)]/40',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]',
          className ?? '',
        ].join(' ')}
      >
        <Sparkles
          className="w-[14px] h-[14px] text-[var(--color-accent)] opacity-70 group-hover:opacity-100"
          strokeWidth={1.75}
        />
        {!iconOnly && <span className="whitespace-nowrap">{displayLabel}</span>}
      </button>
      <AskAiModal
        open={open}
        onClose={() => setOpen(false)}
        initialPrompt={prompt}
        context={context}
      />
    </>
  );
}

interface AskAiModalProps {
  open: boolean;
  onClose: () => void;
  initialPrompt?: string;
  context?: string;
  placeholder?: string;
}

export function AskAiModal({
  open,
  onClose,
  initialPrompt = '',
  context,
  placeholder = 'Ask anything about your bills, tasks, or money…',
}: AskAiModalProps) {
  const reduceMotion = useReducedMotion();
  const [value, setValue] = React.useState(initialPrompt);
  const [submitted, setSubmitted] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setValue(initialPrompt);
      setSubmitted(false);
    }
  }, [open, initialPrompt]);

  const handleSubmit = React.useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!value.trim()) return;
      setSubmitted(true);
    },
    [value],
  );

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.15 }}
            className="fixed inset-0 z-50 bg-[var(--color-overlay)] backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />
          <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pointer-events-none">
            <motion.div
              initial={
                reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 8 }
              }
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={
                reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 8 }
              }
              transition={{
                duration: reduceMotion ? 0 : 0.22,
                ease: [0.4, 0, 0.2, 1],
              }}
              role="dialog"
              aria-modal="true"
              aria-label="Ask Beedo"
              className="relative mt-[10vh] w-full max-w-[640px] rounded-[16px] bg-[var(--color-surface)] border border-[var(--color-accent)] shadow-[var(--shadow-lg)] p-6 pointer-events-auto"
            >
              <button
                type="button"
                onClick={onClose}
                className="absolute right-4 top-4 rounded-[8px] p-1 text-[var(--color-text-subtle)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
                aria-label="Close"
              >
                <X className="w-4 h-4" strokeWidth={1.75} />
              </button>
              <div className="flex items-center gap-2 mb-4">
                <Sparkles
                  className="w-5 h-5 text-[var(--color-accent)]"
                  strokeWidth={1.75}
                />
                <h2 className="text-[22px] leading-[28px] font-semibold text-[var(--color-text)]">
                  Ask Beedo
                </h2>
              </div>
              {context && (
                <p className="text-[13px] leading-[18px] text-[var(--color-text-subtle)] mb-3">
                  Context: {context}
                </p>
              )}
              <form onSubmit={handleSubmit}>
                <textarea
                  autoFocus
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder={placeholder}
                  rows={4}
                  className="w-full rounded-[8px] bg-[var(--color-surface-2)] border border-[var(--color-border)] focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/25 focus:outline-none text-[15px] leading-[22px] text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] p-3 resize-none"
                />
                <div className="mt-4 flex items-center justify-between">
                  <p
                    className="text-[13px] leading-[18px] text-[var(--color-text-subtle)]"
                    role={submitted ? 'status' : undefined}
                  >
                    {submitted
                      ? "We'll wire this up next."
                      : 'Press send when you’re ready.'}
                  </p>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 rounded-[16px] bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] px-4 h-10 text-[15px] font-medium text-[var(--color-text-on-accent)] transition-colors disabled:opacity-50"
                    disabled={!value.trim()}
                  >
                    Send
                    <ArrowUp className="w-4 h-4" strokeWidth={1.75} />
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

interface AskBeedoHeroProps {
  className?: string;
  placeholder?: string;
}

/** The single prominent gold surface on the dashboard. */
export function AskBeedoHero({
  className,
  placeholder = 'Ask anything about your bills, tasks, or money…',
}: AskBeedoHeroProps) {
  const [value, setValue] = React.useState('');
  const [open, setOpen] = React.useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    setOpen(true);
  };

  return (
    <>
      <form
        onSubmit={submit}
        className={[
          'w-full rounded-[16px] bg-[var(--color-surface)]',
          'border-2 border-[var(--color-accent)] shadow-glow',
          'flex items-center gap-3 px-5 py-4',
          className ?? '',
        ].join(' ')}
        aria-label="Ask Beedo"
      >
        <Sparkles
          className="w-6 h-6 flex-shrink-0 text-[var(--color-accent)]"
          strokeWidth={1.75}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-transparent border-0 outline-none text-[16px] leading-[22px] font-semibold text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] placeholder:font-normal"
        />
        <button
          type="submit"
          aria-label="Send"
          className="flex items-center justify-center w-8 h-8 rounded-[8px] bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] disabled:opacity-50 transition-colors"
          disabled={!value.trim()}
        >
          <ArrowUp
            className="w-[18px] h-[18px] text-[var(--color-text-on-accent)]"
            strokeWidth={1.75}
          />
        </button>
      </form>
      <AskAiModal
        open={open}
        onClose={() => {
          setOpen(false);
          setValue('');
        }}
        initialPrompt={value}
      />
    </>
  );
}
