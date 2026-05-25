/**
 * Mobile design tokens — black-yellow hive theme.
 *
 * Mirrors `apps/web/src/styles/globals.css` `:root` (light) and `.dark`
 * (dark). React Native StyleSheet can't read CSS variables so we expose
 * matching TypeScript maps + a `useTokens()` hook that picks the right
 * one off `useColorScheme()`.
 *
 * Source of truth: /DESIGN_SYSTEM.md §1.
 */
import { useColorScheme } from 'react-native';
import { useThemeOrNull } from '../context/theme';

/**
 * Light mode = "black over yellow". Yellow IS the canvas; black is the
 * stand-out (CTAs, focus, mascot). Matches the web `:root` block.
 */
export const tokensLight = {
  // Backgrounds
  bg: '#F8E71C',         // highlight yellow canvas
  surface: '#FAEC4A',
  surface2: '#FCF180',
  surfaceHover: '#F4E211',

  // Text — all dark to read on yellow
  text: '#0A0A0A',
  textMuted: '#2A2A2A',
  textSubtle: '#4A4A0A',
  textOnAccent: '#F8E71C', // yellow text on black CTAs

  // Brand accent — BLACK is the accent in light mode
  accent: '#0A0A0A',
  accentHover: '#1F1F1F',
  accentDim: '#4A4A4A',
  accentSoft: '#2A2A2A',

  // Borders — dark amber hairlines on yellow
  border: '#B8A800',
  borderStrong: '#8A7E00',
  focusRing: '#0A0A0A',

  // Semantic — darker variants read better on yellow
  success: '#166534',
  warning: '#9A3412',
  danger: '#991B1B',

  overlay: 'rgba(0,0,0,0.55)',
} as const;

/** Dark mode = "yellow over black". Matches the web `.dark` block. */
export const tokensDark = {
  bg: '#000000',
  surface: '#0A0A0A',
  surface2: '#141414',
  surfaceHover: '#1A1A1A',

  text: '#FFFFFF',
  textMuted: '#A3A3A3',
  textSubtle: '#737373',
  textOnAccent: '#0A0A0A',

  accent: '#F8E71C',
  accentHover: '#FAED4A',
  accentDim: '#8A7E00',
  accentSoft: '#3D3700',

  border: '#1F1F1F',
  borderStrong: '#2A2A2A',
  focusRing: '#F8E71C',

  success: '#22C55E',
  warning: '#F59E0B',
  danger: '#EF4444',

  overlay: 'rgba(0,0,0,0.65)',
} as const;

/**
 * Widen the shape so callers see plain `string` for every token —
 * mirrors what they'd get from `tokens.bg` today. We deliberately
 * avoid `as const` narrowing on the return type because `useTokens()`
 * picks at runtime between light + dark maps whose literal hex types
 * differ.
 */
export type Tokens = { [K in keyof typeof tokensLight]: string };

/**
 * Returns the active token map for the current theme.
 *
 * Resolution order:
 *   1. If a `<ThemeProvider>` is mounted, use its `resolvedTheme`
 *      (which honours the user's persisted light/dark/system choice).
 *   2. Otherwise fall back to `useColorScheme()` so that components
 *      rendered outside the provider (eg. isolated unit tests, the
 *      `loading` fallback rendered before context mounts) still get
 *      a sensible theme.
 *
 * Components that need theming should call this each render so they
 * react to theme changes instantly.
 */
export function useTokens(): Tokens {
  const theme = useThemeOrNull();
  const scheme = useColorScheme();
  const resolved = theme ? theme.resolvedTheme : scheme === 'dark' ? 'dark' : 'light';
  return resolved === 'dark' ? tokensDark : tokensLight;
}

/**
 * @deprecated Use `useTokens()` to react to OS dark-mode switches.
 *   This static export is kept as an alias of `tokensLight` so existing
 *   `import { tokens } from '.../tokens'` callsites keep compiling
 *   during the incremental migration. Migrate callsites to the hook.
 */
export const tokens = tokensLight;

export const radius = {
  sm: 8,   // chips, inputs, badges
  md: 16,  // cards, modals, buttons
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

/**
 * Bricolage Grotesque font family names — must match the keys we pass
 * to `useFonts()` in `src/lib/fonts.ts`. Use with the StyleSheet
 * `fontFamily` prop on React Native `<Text>`.
 *
 * Until fonts finish loading the OS fallback (San Francisco on iOS,
 * Roboto on Android) is used — no need to gate on `fontsLoaded` for
 * non-blocking surfaces.
 */
export const fontFamily = {
  display: 'BricolageGrotesque_700Bold',
  displaySemibold: 'BricolageGrotesque_600SemiBold',
  body: 'BricolageGrotesque_400Regular',
  bodyMedium: 'BricolageGrotesque_500Medium',
} as const;

/** Theme-independent palette that the bee mascot relies on. */
export const beePalette = {
  gold: '#F8E71C',
  black: '#0A0A0A',
  white: '#FFFFFF',
} as const;

/**
 * Atmospheric background-gradient stops.
 *
 * Mirrors the web `--bg-gradient` (see `apps/web/src/styles/globals.css`).
 * Consumed by `<GradientBackground />` (apps/mobile/src/components/layout/gradient-bg.tsx).
 *
 * Stops are kept in token-land so the design system stays the single
 * source of truth — a designer changing the wash strength only edits
 * this map, not the component.
 *
 * Both maps use **only the existing palette** plus alpha — no new hexes.
 *  - Light: highlight-yellow canvas (#F8E71C) with a softer #FCF180
 *    (surface-2) pool top-left → "sunlit canvas".
 *  - Dark: pure black (#000000) with a ~6% gold halo (#F8E71C alpha)
 *    top-centre → "ambient depth", never reads as a yellow wash.
 *
 * Three stops each so the gradient eases over distance rather than
 * banding. Locations are ordered low → high so consumers can pass them
 * straight to `expo-linear-gradient`.
 */
export const bgGradient = {
  light: {
    colors: [
      'rgba(252, 241, 128, 0.55)', // surface-2 (#FCF180) @ 55% — warm pool
      'rgba(252, 241, 128, 0.18)', // mid fade
      '#F8E71C',                    // base canvas
    ] as const,
    locations: [0, 0.35, 0.95] as const,
  },
  dark: {
    colors: [
      'rgba(248, 231, 28, 0.06)',  // gold @ 6% — barely-there halo
      'rgba(248, 231, 28, 0.02)',  // gold @ 2% — fades through
      '#000000',                    // base canvas
    ] as const,
    locations: [0, 0.3, 0.7] as const,
  },
} as const;
