/**
 * BreathingBee — Phase 3b playfulness pass (D2 + D5).
 *
 * Wraps a bee pose in a gentle infinite "breathing" loop.
 *
 * Tuning rationale (user feedback: the previous breath felt like a pulse):
 *  - `Easing.inOut(Easing.sin)` instead of `Easing.inOut(Easing.ease)`.
 *    Sine in/out has no acceleration discontinuity at the apex/trough, so
 *    the inhale → exhale transition reads as a single continuous breath
 *    rather than two pumps glued together.
 *  - Full cycle ≈ 6s (period default raised from 4000 to 6000ms). The old
 *    4s cycle was fast enough to register as "pulsing".
 *  - Scale delta tightened from 1.03 → 1.025. Subtle is the brief.
 *
 * Both halves of the cycle now use the same sine curve so neither inhale
 * nor exhale appears faster than the other.
 *
 * Optional `drift` mode adds a slow horizontal sway (translateX -6 ↔ +6
 * over ~3.6s) — used on onboarding bees.
 *
 * Reduced-motion: renders a static pose at scale 1.
 */
import React, { useEffect } from 'react';
import { View, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
} from 'react-native-reanimated';

export type BreathingBeeProps = {
  /** Bee pose component to wrap. */
  children: React.ReactNode;
  /** Cumulative breathing period in ms. Default 6000 (was 4000 — felt pulsy). */
  period?: number;
  /** When true, also drifts side-to-side. Default false. */
  drift?: boolean;
  style?: ViewStyle;
};

export function BreathingBee({
  children,
  period = 6000,
  drift = false,
  style,
}: BreathingBeeProps) {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const tx = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    const half = Math.max(400, Math.floor(period / 2));
    // Same sine in/out on both halves so the apex/trough are smooth and
    // the breath reads as a single continuous beat (not a two-stage pump).
    scale.value = withRepeat(
      withSequence(
        withTiming(1.025, { duration: half, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: half, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
    if (drift) {
      const driftHalf = Math.max(800, Math.floor(period * 0.6));
      tx.value = withRepeat(
        withSequence(
          withTiming(6, { duration: driftHalf, easing: Easing.inOut(Easing.sin) }),
          withTiming(-6, { duration: driftHalf, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        false,
      );
    }
    return () => {
      cancelAnimation(scale);
      cancelAnimation(tx);
    };
  }, [reduceMotion, period, drift, scale, tx]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateX: tx.value }],
  }));

  if (reduceMotion) {
    return <View style={style}>{children}</View>;
  }
  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
}
