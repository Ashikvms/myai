import type { Config } from 'tailwindcss';

/**
 * Laylo web Tailwind config — Phase 2.
 *
 * All colour tokens are CSS variables declared in
 * apps/web/src/styles/globals.css (`:root` for light, `.dark` for dark).
 * Components consume them via either the named theme keys below
 * (`bg-bg`, `text-text-muted`, `bg-accent`) or via arbitrary values
 * (`bg-[var(--color-accent)]`).
 *
 * Source of truth for the token palette: /DESIGN_SYSTEM.md §1.
 *
 * Backwards-compat: the legacy `primary`, `surface.*`, and `card.*`
 * keys are kept as aliases that point at the new tokens so any
 * page file in Phase 3a that hasn't been migrated yet still compiles.
 * Phase 3a removes them at the callsite, then this config drops them.
 */
const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // === Semantic tokens (preferred) ===
        bg: 'var(--color-bg)',
        surface: {
          DEFAULT: 'var(--color-surface)',
          2: 'var(--color-surface-2)',
          hover: 'var(--color-surface-hover)',
          // legacy aliases
          light: 'var(--color-surface)',
          dark: 'var(--color-surface)',
        },
        text: {
          DEFAULT: 'var(--color-text)',
          muted: 'var(--color-text-muted)',
          subtle: 'var(--color-text-subtle)',
          'on-accent': 'var(--color-text-on-accent)',
        },
        accent: {
          DEFAULT: 'var(--color-accent)',
          hover: 'var(--color-accent-hover)',
          dim: 'var(--color-accent-dim)',
          soft: 'var(--color-accent-soft)',
        },
        border: {
          DEFAULT: 'var(--color-border)',
          strong: 'var(--color-border-strong)',
        },
        success: 'var(--color-success)',
        warning: 'var(--color-warning)',
        danger: 'var(--color-danger)',

        // === Legacy aliases (Phase 3a removes callsites then we delete these) ===
        // The old `primary` ramp now collapses to a single gold value at every step.
        primary: {
          50: 'var(--color-accent-soft)',
          100: 'var(--color-accent-soft)',
          200: 'var(--color-accent-soft)',
          300: 'var(--color-accent)',
          400: 'var(--color-accent)',
          500: 'var(--color-accent)',
          600: 'var(--color-accent-hover)',
          700: 'var(--color-accent-hover)',
          800: 'var(--color-accent-dim)',
          900: 'var(--color-accent-dim)',
          DEFAULT: 'var(--color-accent)',
        },
        card: {
          DEFAULT: 'var(--color-surface)',
          light: 'var(--color-surface)',
          dark: 'var(--color-surface)',
        },
      },
      fontFamily: {
        sans: ['var(--font-bricolage)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['var(--font-bricolage)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // Per /DESIGN_SYSTEM.md §2 — seven sizes only.
        display: ['48px', { lineHeight: '56px', fontWeight: '700' }],
        h1: ['32px', { lineHeight: '40px', fontWeight: '700' }],
        h2: ['22px', { lineHeight: '28px', fontWeight: '600' }],
        h3: ['16px', { lineHeight: '22px', fontWeight: '600' }],
        body: ['15px', { lineHeight: '22px', fontWeight: '400' }],
        'body-sm': ['13px', { lineHeight: '18px', fontWeight: '500' }],
        caption: [
          '11px',
          { lineHeight: '14px', fontWeight: '600', letterSpacing: '0.05em' },
        ],
      },
      borderRadius: {
        // Two values only per Brief §4.4.
        sm: '8px',
        md: '16px',
        // Legacy aliases — collapse to the two real tokens.
        lg: '16px',
        xl: '16px',
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
        pop: 'var(--shadow-pop)',
        glow: 'var(--shadow-glow)',
      },
      spacing: {
        // 4-px grid — explicitly enumerated in /DESIGN_SYSTEM.md §3.
        // Tailwind's defaults already cover these — listed for documentation.
      },
      transitionTimingFunction: {
        entry: 'cubic-bezier(0.4, 0, 0.2, 1)',
        exit: 'cubic-bezier(0.4, 0, 1, 1)',
      },
      transitionDuration: {
        micro: '120ms',
        standard: '200ms',
        expansive: '320ms',
        modal: '280ms',
      },
    },
  },
  plugins: [],
};

export default config;
