/**
 * GradientBackground — atmospheric canvas wash for tab screens.
 *
 * Mirrors the web `body::before` radial gradient defined in
 * `apps/web/src/styles/globals.css` (`--bg-gradient`). Goal: soften
 * the light↔dark theme flip so the canvas crossfades instead of
 * snapping between very different luminances.
 *
 * Implementation notes
 * --------------------
 * RN has no first-class radial gradient on iOS without pulling
 * `react-native-svg`'s `RadialGradient`. To keep the bundle slim and
 * avoid SVG layout quirks at full-screen size, we use **two stacked
 * linear gradients** from `expo-linear-gradient` (already installed):
 *
 *   - layer A: the *light* palette gradient
 *   - layer B: the *dark* palette gradient, painted over A
 *
 * Both layers are `StyleSheet.absoluteFillObject` with
 * `pointerEvents="none"`. On theme change we drive the dark layer's
 * opacity with Reanimated `withTiming(…, 300 ms)` so the swap reads
 * as a fade rather than a paint. When the dark layer is fully opaque
 * (resolved theme === 'dark') the light layer beneath is occluded;
 * when transparent, only the light layer shows. Zero JS animation —
 * everything runs on the UI thread.
 *
 * The gradient direction is **top-left → bottom-right** (diagonal).
 * A true radial isn't necessary — at ~6% alpha the directional cue
 * is invisible and the implementation cost halves. If a future
 * refactor wants a literal radial, swap the LinearGradient for
 * `react-native-svg`'s `RadialGradient` and keep the same outer API.
 *
 * Placement
 * ---------
 * Wrap your screen-group layout's root `<View>` and render this as
 * the **first** child so it sits behind subsequent content. Set
 * sibling content's own backgroundColor to `'transparent'` if you
 * want the wash to show through; opaque screen containers will
 * occlude it (the wash will still show during route transitions
 * and around safe-area edges, which is enough to mask the flash).
 */
import React, { useEffect } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { bgGradient } from '../../lib/tokens';
import { useTheme } from '../../context/theme';

// Conditional import — same pattern as `gradient-pill.tsx` so unit
// tests / non-native envs that don't link expo-linear-gradient still
// render (degraded to a solid fill of the base canvas hex).
type LinearGradientProps = {
  colors: readonly string[];
  start?: { x: number; y: number };
  end?: { x: number; y: number };
  locations?: readonly number[];
  style?: ViewStyle | ViewStyle[];
};
let LinearGradient: React.ComponentType<LinearGradientProps> | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  LinearGradient = require('expo-linear-gradient').LinearGradient;
} catch {
  LinearGradient = null;
}

// Diagonal direction — gives the wash a top-left → bottom-right
// lean which reads as ambient room light. Centre-vertical would
// look like a horizon line; diagonal feels more organic.
const DIAGONAL = {
  start: { x: 0, y: 0 },
  end: { x: 1, y: 1 },
} as const;

export type GradientBackgroundProps = {
  /**
   * Optional explicit theme override. Defaults to the active theme
   * resolved from `<ThemeProvider>`. Useful for previews/Storybook.
   */
  theme?: 'light' | 'dark';
};

/**
 * Renders the atmospheric wash filling its parent. Must be inside a
 * parent with `flex: 1` (or fixed dimensions) — the wash uses
 * `StyleSheet.absoluteFillObject` so it inherits the parent's size.
 */
export function GradientBackground({ theme }: GradientBackgroundProps = {}) {
  const { resolvedTheme } = useTheme();
  const active = theme ?? resolvedTheme;
  const reduceMotion = useReducedMotion();

  // 1 → dark layer fully visible; 0 → light layer fully visible.
  // Initialise to the current state so the first frame doesn't
  // animate from an arbitrary default.
  const darkLayer = useSharedValue(active === 'dark' ? 1 : 0);

  useEffect(() => {
    // 300 ms ease-out crossfade — long enough to read as a "fade"
    // but short enough to feel responsive. `reduce-motion` users
    // jump straight to the target.
    darkLayer.value = withTiming(active === 'dark' ? 1 : 0, {
      duration: reduceMotion ? 0 : 300,
      easing: Easing.out(Easing.quad),
    });
  }, [active, darkLayer, reduceMotion]);

  const darkAnimatedStyle = useAnimatedStyle(() => ({
    opacity: darkLayer.value,
  }));

  // Fallback: native module missing (e.g. jest, web export). Paint
  // a solid base of the active theme's canvas hex so we don't crash.
  if (!LinearGradient) {
    const baseHex = active === 'dark' ? '#000000' : '#F8E71C';
    return (
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFillObject, { backgroundColor: baseHex }]}
      />
    );
  }

  const LG = LinearGradient;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
      {/* Light layer — base canvas wash, always painted. */}
      <LG
        colors={bgGradient.light.colors}
        locations={bgGradient.light.locations}
        start={DIAGONAL.start}
        end={DIAGONAL.end}
        style={StyleSheet.absoluteFillObject}
      />
      {/* Dark layer — opacity is animated so the swap crossfades. */}
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFillObject, darkAnimatedStyle]}
      >
        <LG
          colors={bgGradient.dark.colors}
          locations={bgGradient.dark.locations}
          start={DIAGONAL.start}
          end={DIAGONAL.end}
          style={StyleSheet.absoluteFillObject}
        />
      </Animated.View>
    </View>
  );
}

export default GradientBackground;
