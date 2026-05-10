/**
 * Mobile design tokens — Phase 3b.
 *
 * Mirror of apps/mobile/global.css and tailwind.config.js, exported as
 * a plain TS object so React Native StyleSheet callsites can consume
 * them directly without parsing CSS variables (which RN doesn't do).
 *
 * Source of truth: /DESIGN_SYSTEM.md §1.
 *
 * Light/dark switching is handled imperatively by callers — Phase 3b
 * scope is a static black + gold paint job; theme switching follows in
 * a later phase. Defaults to light values; engineers reading the dark
 * map can swap when the dark-mode toggle ships.
 */
export const tokens = {
  // Backgrounds
  bg: '#FFFFFF',
  surface: '#FAFAFA',
  surface2: '#F4F4F5',
  surfaceHover: '#EFEFEF',

  // Text
  text: '#0A0A0A',
  textMuted: '#525252',
  textSubtle: '#737373',
  textOnAccent: '#0A0A0A',

  // Brand accent — gold
  accent: '#F8E71C',
  accentHover: '#FAED4A',
  accentDim: '#8A7400',
  accentSoft: '#FFF4B8',

  // Borders
  border: '#E5E5E5',
  borderStrong: '#D4D4D4',
  focusRing: '#F8E71C',

  // Semantic
  success: '#22C55E',
  warning: '#F59E0B',
  danger: '#EF4444',

  // Overlay (modal backdrop)
  overlay: 'rgba(0,0,0,0.5)',
} as const;

export const radius = {
  sm: 8, // chips, inputs, badges
  md: 16, // cards, modals, buttons
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
  hero: 64,
} as const;

/** Theme-independent palette that the bee mascot relies on. */
export const beePalette = {
  gold: '#F8E71C',
  black: '#0A0A0A',
  white: '#FFFFFF',
} as const;
