/**
 * GradientPill — reusable gradient surface for active-state indicators.
 *
 * Replaces the flat solid backgrounds we were using for active states on:
 *   - bottom tab bar indicator     (apps/mobile/app/(tabs)/_layout.tsx)
 *   - auth screen segment toggle   (apps/mobile/app/auth.tsx)
 *   - settings theme toggle        (apps/mobile/app/(tabs)/settings.tsx)
 *   - tasks filter chips           (apps/mobile/app/(tabs)/tasks.tsx)
 *
 * Single source of truth so all four reads as one design language: a
 * subtle accent→accentHover sheen rather than a dead-flat fill.
 *
 * Implementation: `expo-linear-gradient` (LinearGradient) — installed via
 * `npx expo install expo-linear-gradient`. Falls back to a flat fill
 * automatically if the native module is unavailable (e.g. in unit tests
 * that don't pull native deps), so this component is always safe to
 * render.
 */
import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

// Import is conditional via try/catch so unit tests / non-native envs
// don't blow up when the native module isn't linked.
let LinearGradient: React.ComponentType<{
  colors: readonly string[];
  start?: { x: number; y: number };
  end?: { x: number; y: number };
  locations?: readonly number[];
  style?: ViewStyle | ViewStyle[];
  children?: React.ReactNode;
}> | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  LinearGradient = require('expo-linear-gradient').LinearGradient;
} catch {
  LinearGradient = null;
}

export type GradientPillProps = {
  /** Pill width. Required for the bottom-tab stripe; layout-controlled elsewhere via `style`. */
  width?: number | string;
  /** Pill height. */
  height?: number | string;
  /** Corner radius. */
  borderRadius?: number;
  /** Gradient colour stops. Accepts 2+ colours. Default: accent → accentHover for a subtle sheen. */
  colors?: readonly string[];
  /** Optional location stops (0..1) for the colours. Must match `colors.length`. */
  locations?: readonly number[];
  /** Optional overlay style. Useful when the parent positions the pill absolutely. */
  style?: ViewStyle | ViewStyle[];
  /** Gradient direction. Default horizontal (left→right). */
  direction?: 'horizontal' | 'vertical' | 'diagonal';
  /** Optional children rendered on top of the gradient (e.g. label text). */
  children?: React.ReactNode;
};

const DIRECTIONS = {
  horizontal: { start: { x: 0, y: 0.5 }, end: { x: 1, y: 0.5 } },
  vertical: { start: { x: 0.5, y: 0 }, end: { x: 0.5, y: 1 } },
  diagonal: { start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },
} as const;

export function GradientPill({
  width,
  height,
  borderRadius,
  colors,
  locations,
  style,
  direction = 'horizontal',
  children,
}: GradientPillProps) {
  // Default colours are intentionally a tight gold→gold sheen.
  // Callers override per use-case.
  const palette = colors ?? (['#F8E71C', '#FAED4A'] as const);

  const sizing: ViewStyle = {
    ...(width !== undefined ? { width: width as ViewStyle['width'] } : null),
    ...(height !== undefined ? { height: height as ViewStyle['height'] } : null),
    ...(borderRadius !== undefined ? { borderRadius } : null),
    overflow: 'hidden',
  };

  if (LinearGradient) {
    const { start, end } = DIRECTIONS[direction];
    return (
      <LinearGradient
        colors={palette}
        locations={locations}
        start={start}
        end={end}
        style={[sizing, style as ViewStyle]}
      >
        {children}
      </LinearGradient>
    );
  }

  // Fallback: solid fill using the first colour. Keeps the component
  // safe to render in jest where the native module isn't loaded.
  return (
    <View style={[sizing, { backgroundColor: palette[0] }, style as ViewStyle]}>
      {children}
    </View>
  );
}

// Re-export common palettes so callers stay consistent.
export const GRADIENT_PALETTES = {
  /** Gold sheen — used on dark backgrounds (dark mode active states). */
  goldSheen: ['#F8E71C', '#FAED4A'] as const,
  /** Black sheen — used on yellow backgrounds (light mode active states). */
  blackSheen: ['#0A0A0A', '#1F1F1F'] as const,
  /** Soft fade — for the tab-bar underline, transparent edges. */
  goldFade: ['rgba(248,231,28,0.0)', '#F8E71C', 'rgba(248,231,28,0.0)'] as const,
} as const;

const _unused = StyleSheet.create({});
void _unused;

export default GradientPill;
