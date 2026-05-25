/** @type {import('tailwindcss').Config} */
/**
 * BillBee mobile (Expo + NativeWind 4) Tailwind config — Phase 2.
 *
 * NativeWind reads tokens declared here. CSS variables are wired
 * via apps/mobile/global.css (declared at the App root). Same
 * semantic names as the web config so cross-platform classes
 * (`bg-accent`, `text-text-muted`, `border-border`) Just Work.
 *
 * Source of truth for the token palette: /DESIGN_SYSTEM.md §1.
 */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
  ],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: 'var(--color-bg)',
        surface: {
          DEFAULT: 'var(--color-surface)',
          2: 'var(--color-surface-2)',
          hover: 'var(--color-surface-hover)',
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
      },
      fontSize: {
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
        sm: '8px',
        md: '16px',
        lg: '16px',
        xl: '16px',
      },
    },
  },
  plugins: [],
};
