/**
 * AnimatedNumber — Phase 3b playfulness pass (B6).
 *
 * Counts a numeric value up from 0 → `value` over `duration` ms when
 * the component mounts (or whenever `value` changes meaningfully). Uses
 * Reanimated `useSharedValue` + `withTiming` and an `Animated.Text`
 * driven by `useAnimatedProps` so the number is interpolated on the UI
 * thread (no React re-renders per frame).
 *
 * Honors `useReducedMotion()` — when reduced motion is enabled the
 * value is set instantly.
 *
 * Intentionally tolerant of non-numeric prefixes/suffixes (e.g. "$78",
 * "5"): pass the raw number + a `format(n) => string` mapper.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Text, TextProps } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedReaction,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

export type AnimatedNumberProps = Omit<TextProps, 'children'> & {
  /** Final numeric value to count up to. */
  value: number;
  /** Animation duration. Default 800 ms per Phase 3b spec. */
  duration?: number;
  /** Map a tweened number → display string. Default = rounded integer. */
  format?: (n: number) => string;
};

/**
 * Counts a numeric value up from 0 → `value` over `duration` ms.
 *
 * Implementation note: Reanimated's `Animated.Text` + `text` animated
 * prop is the more efficient path (no React reconciliation per frame),
 * but its types in v3 don't accept `children`, which means we'd have
 * to drop our static fallback and the type-checker complains. We use
 * `useAnimatedReaction` to throttle React state updates instead — it
 * fires on every UI-thread frame but `setState` short-circuits when
 * the formatted string is stable (e.g. integer-rounded values stay the
 * same across many sub-pixel ticks).
 */
export function AnimatedNumber({
  value,
  duration = 800,
  format = (n) => Math.round(n).toString(),
  ...textProps
}: AnimatedNumberProps) {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(0);
  const [display, setDisplay] = useState<string>(() => format(0));

  useEffect(() => {
    if (reduceMotion) {
      progress.value = value;
      setDisplay(format(value));
      return;
    }
    progress.value = 0;
    progress.value = withTiming(value, {
      duration,
      easing: Easing.out(Easing.cubic),
    });
  }, [value, duration, reduceMotion, progress, format]);

  // JS-side bridge: takes a raw integer, formats it, and updates React
  // state. Stable per `format` so the worklet's runOnJS reference doesn't
  // churn each frame.
  const applyFormatted = useCallback(
    (n: number) => {
      setDisplay(format(n));
    },
    [format],
  );

  // Project the shared value onto a React string only when the *rounded*
  // integer changes. Reanimated 3 + Bridgeless mode rejects calls to
  // non-worklet functions from the UI thread, so the prepare callback
  // must be self-contained — we can NOT invoke the caller-supplied
  // `format` here (it's plain JS). Instead the worklet rounds on the UI
  // thread (cheap, allowed) and bounces the raw integer over to JS via
  // `runOnJS`, where `applyFormatted` runs `format` and updates state.
  // Sub-integer ticks are filtered by the equality check on `rounded`,
  // so we re-render at most once per integer step.
  useAnimatedReaction(
    () => Math.round(progress.value),
    (rounded, prev) => {
      if (rounded !== prev) {
        runOnJS(applyFormatted)(rounded);
      }
    },
    [applyFormatted],
  );

  return <Text {...textProps}>{display}</Text>;
}
// Re-export the underlying Animated import path so consumers of this
// module can still get `Animated` if they tree-shake aggressively.
export { Animated };
