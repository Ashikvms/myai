'use client';

/**
 * Signup — Phase C3 (droplet choreography) + LAYOUT_REDESIGN_BRIEF.md §3.
 *
 * Uses the same `<DropletChoreography>` wrapper as login with the "signup"
 * variant: 4 ripples and a slightly larger droplet (1.2×) — signup is a
 * bigger commitment, so the entrance is more emphatic. Session flag is
 * shared with login, so the choreography only plays once per session.
 *
 * Slot mapping (signup has more fields than the abstract slot vocabulary,
 * so we reuse cascade slots as animation cues, not literal field names):
 *   - Logo slot          : bee + "Join the hive"
 *   - Subtitle slot      : "Get started with BillBee"
 *   - EmailField slot    : Full name (slides in from left)
 *   - PasswordField slot : Email (slides in from right)
 *   - Submit slot wraps  : Password + Confirm + Create button
 *                          (drops in from below, together)
 *   - Footer slot        : "Already have an account? Log in"
 */
import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, useReducedMotion } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, User, Loader2, AlertCircle, Check, X } from 'lucide-react';
import { useAuth } from '../../../lib/auth-context';
import { ApiError } from '../../../lib/api';
import { BeeStanding } from '@/components/illustrations/bee';
import { HoneycombPattern } from '@/components/illustrations/honeycomb-pattern';
import { MotionButton } from '@/components/motion/motion-button';
import { DropletChoreography } from '@/components/motion/droplet-choreography';
import { AmbientBees } from '@/components/motion/ambient-bees';
import { IdleBob } from '@/components/motion/idle-bob';
import { BeeSpeechBubble } from '@/components/motion/bee-speech-bubble';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const signupSchema = z
  .object({
    name: z.string().min(1, "What should we call you?").min(2, "Just a little longer please"),
    email: z.string().min(1, "Pop your email in here").email("That doesn't look quite right"),
    password: z
      .string()
      .min(1, "Pick a password to lock things down")
      .min(8, "Just a few more characters please")
      .regex(/[A-Z]/, "Sneak in an uppercase letter")
      .regex(/[0-9]/, "And one number, please"),
    confirmPassword: z.string().min(1, "Type that one more time"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Hmm, those don't match yet",
    path: ['confirmPassword'],
  });

type SignupFormData = z.infer<typeof signupSchema>;

function getPasswordStrength(password: string): { label: string; tone: 'danger' | 'warning' | 'success'; width: string } {
  if (!password) return { label: '', tone: 'danger', width: 'w-0' };
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (score <= 2) return { label: 'Weak', tone: 'danger', width: 'w-1/3' };
  if (score <= 3) return { label: 'Medium', tone: 'warning', width: 'w-2/3' };
  return { label: 'Strong', tone: 'success', width: 'w-full' };
}

const TONE_BG: Record<'danger' | 'warning' | 'success', string> = {
  danger: 'bg-[var(--color-danger)]',
  warning: 'bg-[var(--color-warning)]',
  success: 'bg-[var(--color-success)]',
};
const TONE_TEXT: Record<'danger' | 'warning' | 'success', string> = {
  danger: 'text-[var(--color-danger)]',
  warning: 'text-[var(--color-warning)]',
  success: 'text-[var(--color-success)]',
};

export default function SignupPage() {
  const { register: authRegister } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const reduce = useReducedMotion();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormData>({ resolver: zodResolver(signupSchema) });

  const watchedPassword = watch('password', '');
  const passwordStrength = useMemo(() => getPasswordStrength(watchedPassword), [watchedPassword]);

  const passwordChecks = useMemo(
    () => [
      { label: 'At least 8 characters', met: watchedPassword.length >= 8 },
      { label: 'One uppercase letter', met: /[A-Z]/.test(watchedPassword) },
      { label: 'One number', met: /[0-9]/.test(watchedPassword) },
    ],
    [watchedPassword],
  );

  async function onSubmit(data: SignupFormData) {
    setApiError(null);
    try {
      await authRegister(data.email, data.password, data.name);
    } catch (err) {
      if (err instanceof ApiError) setApiError(err.message);
      else setApiError('Hmm, something stung. Try again?');
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-20">
      {/* Page-wide background — gold radial halo + faint honeycomb texture */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(ellipse at 50% 33%, rgba(255,215,0,0.10) 0%, rgba(255,215,0,0) 55%)',
        }}
      />
      <HoneycombPattern opacity={0.03} />

      <DropletChoreography variant="signup">
        <div className="relative w-full max-w-[440px]">
          {/* Ambient bee in the upper third — "the hive is alive". */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-1/3 overflow-hidden">
            <AmbientBees count={1} speed="slow" size={22} />
          </div>
          <div className="rounded-[16px] border border-[var(--color-border)] bg-[var(--color-surface)] p-8 shadow-md">
            <DropletChoreography.Logo>
              <div className="mb-8 flex flex-col items-center">
                <div className="relative flex items-center justify-center" style={{ width: 200, height: 180 }}>
                  {/* Soft gold radial glow behind the bee — the impact "afterglow" */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0"
                    style={{
                      background:
                        'radial-gradient(circle at center, rgba(255,215,0,0.32) 0%, rgba(255,215,0,0) 65%)',
                    }}
                  />
                  <motion.div
                    animate={reduce ? undefined : { scale: [1, 1.03, 1] }}
                    transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                    className="relative"
                  >
                    {/* Idle bob — bee "breathes" up/down once the droplet has landed. */}
                    <IdleBob amplitude={2} duration={4}>
                      <BeeStanding size={180} />
                    </IdleBob>
                  </motion.div>
                </div>
                <h1 className="mt-2 text-[22px] leading-[28px] font-semibold text-[var(--color-text)]">
                  Join the hive
                </h1>
                {/* Bee greets new arrivals — D: conversational helper */}
                <div className="mt-3">
                  <BeeSpeechBubble tail="bottom" ariaLabel="Bee says: let's get you set up">
                    Let&apos;s get you set up 🐝
                  </BeeSpeechBubble>
                </div>
              </div>
            </DropletChoreography.Logo>

            <DropletChoreography.Subtitle>
              <p className="mb-6 text-center text-[13px] leading-[18px] text-[var(--color-text-muted)]">
                Get started with BillBee
              </p>
            </DropletChoreography.Subtitle>

            {apiError && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 flex items-start gap-3 rounded-[8px] border-l-4 border-[var(--color-danger)] bg-[var(--color-surface-2)] p-4"
                role="alert"
              >
                <AlertCircle className="h-5 w-5 shrink-0 text-[var(--color-danger)] mt-0.5" strokeWidth={1.75} />
                <p className="text-[13px] leading-[18px] text-[var(--color-danger)]">{apiError}</p>
              </motion.div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <DropletChoreography.EmailField>
                <div>
                  <label htmlFor="name" className="block text-[13px] leading-[18px] font-medium text-[var(--color-text-muted)] mb-1.5">
                    Full name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-subtle)]" strokeWidth={1.75} />
                    <input
                      {...register('name')}
                      id="name"
                      type="text"
                      autoComplete="name"
                      placeholder="Your name"
                      className={`w-full rounded-[8px] border bg-[var(--color-surface-2)] pl-10 pr-4 py-3 text-[15px] text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30 focus:border-[var(--color-accent)] ${
                        errors.name ? 'border-[var(--color-danger)]' : 'border-[var(--color-border)]'
                      }`}
                    />
                  </div>
                  {errors.name && <p className="mt-1.5 text-[11px] leading-[14px] text-[var(--color-danger)]">{errors.name.message}</p>}
                </div>
              </DropletChoreography.EmailField>

              <DropletChoreography.PasswordField>
                <div>
                  <label htmlFor="email" className="block text-[13px] leading-[18px] font-medium text-[var(--color-text-muted)] mb-1.5">
                    Email address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-subtle)]" strokeWidth={1.75} />
                    <input
                      {...register('email')}
                      id="email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      className={`w-full rounded-[8px] border bg-[var(--color-surface-2)] pl-10 pr-4 py-3 text-[15px] text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30 focus:border-[var(--color-accent)] ${
                        errors.email ? 'border-[var(--color-danger)]' : 'border-[var(--color-border)]'
                      }`}
                    />
                  </div>
                  {errors.email && <p className="mt-1.5 text-[11px] leading-[14px] text-[var(--color-danger)]">{errors.email.message}</p>}
                </div>
              </DropletChoreography.PasswordField>

              <DropletChoreography.Submit>
                <div className="space-y-5">
                  <div>
                    <label htmlFor="password" className="block text-[13px] leading-[18px] font-medium text-[var(--color-text-muted)] mb-1.5">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-subtle)]" strokeWidth={1.75} />
                      <input
                        {...register('password')}
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        placeholder="Create a password"
                        className={`w-full rounded-[8px] border bg-[var(--color-surface-2)] pl-10 pr-12 py-3 text-[15px] text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30 focus:border-[var(--color-accent)] ${
                          errors.password ? 'border-[var(--color-danger)]' : 'border-[var(--color-border)]'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-subtle)] hover:text-[var(--color-text)] transition-colors"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" strokeWidth={1.75} /> : <Eye className="h-4 w-4" strokeWidth={1.75} />}
                      </button>
                    </div>

                    {watchedPassword && (
                      <div className="mt-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 flex-1 rounded-full bg-[var(--color-surface-2)] overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-300 ${TONE_BG[passwordStrength.tone]} ${passwordStrength.width}`} />
                          </div>
                          <span className={`text-[11px] leading-[14px] font-medium ${TONE_TEXT[passwordStrength.tone]}`}>
                            {passwordStrength.label}
                          </span>
                        </div>
                        <ul className="space-y-1">
                          {passwordChecks.map((check) => (
                            <li key={check.label} className="flex items-center gap-2 text-[11px] leading-[14px]">
                              {check.met ? (
                                <Check className="h-3 w-3 text-[var(--color-success)]" strokeWidth={1.75} />
                              ) : (
                                <X className="h-3 w-3 text-[var(--color-text-subtle)]" strokeWidth={1.75} />
                              )}
                              <span className={check.met ? 'text-[var(--color-success)]' : 'text-[var(--color-text-subtle)]'}>
                                {check.label}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {errors.password && !watchedPassword && (
                      <p className="mt-1.5 text-[11px] leading-[14px] text-[var(--color-danger)]">{errors.password.message}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="confirmPassword" className="block text-[13px] leading-[18px] font-medium text-[var(--color-text-muted)] mb-1.5">
                      Confirm password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-subtle)]" strokeWidth={1.75} />
                      <input
                        {...register('confirmPassword')}
                        id="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        placeholder="Confirm your password"
                        className={`w-full rounded-[8px] border bg-[var(--color-surface-2)] pl-10 pr-12 py-3 text-[15px] text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30 focus:border-[var(--color-accent)] ${
                          errors.confirmPassword ? 'border-[var(--color-danger)]' : 'border-[var(--color-border)]'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-subtle)] hover:text-[var(--color-text)] transition-colors"
                        tabIndex={-1}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" strokeWidth={1.75} /> : <Eye className="h-4 w-4" strokeWidth={1.75} />}
                      </button>
                    </div>
                    {errors.confirmPassword && (
                      <p className="mt-1.5 text-[11px] leading-[14px] text-[var(--color-danger)]">{errors.confirmPassword.message}</p>
                    )}
                  </div>

                  <MotionButton
                    type="submit"
                    disabled={isSubmitting}
                    className="relative w-full rounded-[16px] bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] px-5 py-3 text-[15px] font-semibold text-[var(--color-text-on-accent)] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} />
                        Hang on, organising your hive…
                      </span>
                    ) : (
                      'Create account'
                    )}
                  </MotionButton>
                </div>
              </DropletChoreography.Submit>
            </form>

            <DropletChoreography.Divider>
              <div className="my-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-[var(--color-border)]" />
                <span className="text-[11px] leading-[14px] text-[var(--color-text-subtle)]">or</span>
                <div className="h-px flex-1 bg-[var(--color-border)]" />
              </div>
            </DropletChoreography.Divider>

            <DropletChoreography.Google>
              <a
                href={`${API_URL}/api/auth/google`}
                className="flex w-full items-center justify-center gap-3 rounded-[16px] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-5 py-3 text-[15px] font-medium text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] transition-colors"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Sign up with Google
              </a>
            </DropletChoreography.Google>

            <DropletChoreography.Footer>
              <p className="mt-6 text-center text-[13px] leading-[18px] text-[var(--color-text-muted)]">
                Already have an account?{' '}
                <Link href="/login" className="font-semibold text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] transition-colors">
                  Log in
                </Link>
              </p>
            </DropletChoreography.Footer>
          </div>
        </div>
      </DropletChoreography>
    </div>
  );
}
