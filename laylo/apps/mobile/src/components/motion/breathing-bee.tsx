/**
 * BreathingBee — Phase 3b playfulness pass (D2 + D5).
 *
 * Wraps a bee pose in a gentle infinite "breathing" loop: scale 1 ↔
 * 1.03 over 4s. Optional `drift` mode adds a slow horizontal sway
 * (translateX -6 ↔ +6 over 5s) — used on onboarding bees.
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
  /** Cumulative breathing period in ms. Default 4000. */
  period?: number;
  /** When true, also drifts side-to-side. Default false. */
  drift?: boolean;
  style?: ViewStyle;
};

export function BreathingBee({
  children,
  period = 4000,
  drift = false,
  style,
}: BreathingBeeProps) {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const tx = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    const half = Math.max(400, Math.floor(period / 2));
    scale.value = withRepeat(
      withSequence(
        withTiming(1.03, { duration: half, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: half, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
    if (drift) {
      const driftHalf = Math.max(800, Math.floor(period * 0.6));
      tx.value = withRepeat(
        withSequence(
          withTiming(6, { duration: driftHalf, easing: Easing.inOut(Easing.ease) }),
          withTiming(-6, { duration: driftHalf, easing: Easing.inOut(Easing.ease) }),
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
