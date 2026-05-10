'use client';

/**
 * Login — Phase C3 (droplet choreography) + LAYOUT_REDESIGN_BRIEF.md §3.
 *
 * The droplet falls, three gold ripples expand from impact, then the form
 * cascades outward into place over 1.8s. See
 * `components/motion/droplet-choreography.tsx` for the orchestration.
 *
 * Auth wiring (useAuth, react-hook-form + zod) is unchanged from the
 * previous version — the choreography is purely presentational.
 */
import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, useReducedMotion } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../../../lib/auth-context';
import { ApiError } from '../../../lib/api';
import { BeeStanding } from '@/components/illustrations/bee';
import { HoneycombPattern } from '@/components/illustrations/honeycomb-pattern';
import { MotionButton } from '@/components/motion/motion-button';
import { DropletChoreography } from '@/components/motion/droplet-choreography';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const reduce = useReducedMotion();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(data: LoginFormData) {
    setApiError(null);
    try {
      await login(data.email, data.password);
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

      <DropletChoreography variant="login">
        <div className="relative w-full max-w-[440px]">
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
                    <BeeStanding size={180} />
                  </motion.div>
                </div>
                <h1 className="mt-2 text-[22px] leading-[28px] font-semibold text-[var(--color-text)]">
                  Welcome back
                </h1>
              </div>
            </DropletChoreography.Logo>

            <DropletChoreography.Subtitle>
              <p className="mb-6 text-center text-[13px] leading-[18px] text-[var(--color-text-muted)]">
                Sign in to your Laylo account
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
                  {errors.email && (
                    <p className="mt-1.5 text-[11px] leading-[14px] text-[var(--color-danger)]">{errors.email.message}</p>
                  )}
                </div>
              </DropletChoreography.EmailField>

              <DropletChoreography.PasswordField>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="password" className="block text-[13px] leading-[18px] font-medium text-[var(--color-text-muted)]">
                      Password
                    </label>
                    <Link href="/forgot-password" className="text-[11px] leading-[14px] font-medium text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] transition-colors">
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-subtle)]" strokeWidth={1.75} />
                    <input
                      {...register('password')}
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="Enter your password"
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
                  {errors.password && (
                    <p className="mt-1.5 text-[11px] leading-[14px] text-[var(--color-danger)]">{errors.password.message}</p>
                  )}
                </div>
              </DropletChoreography.PasswordField>

              <DropletChoreography.Submit>
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
                    'Welcome back'
                  )}
                </MotionButton>
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
                Sign in with Google
              </a>
            </DropletChoreography.Google>

            <DropletChoreography.Footer>
              <p className="mt-6 text-center text-[13px] leading-[18px] text-[var(--color-text-muted)]">
                New to Laylo?{' '}
                <Link href="/signup" className="font-semibold text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] transition-colors">
                  Join the hive
                </Link>
              </p>
            </DropletChoreography.Footer>
          </div>
        </div>
      </DropletChoreography>
    </div>
  );
}
