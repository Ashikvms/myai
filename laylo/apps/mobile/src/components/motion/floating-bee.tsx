/**
 * FloatingBee — gentle vertical bob to give a bee mascot a "hovering" feel.
 *
 * Wraps children in an infinite translateY loop (±amplitude px over `period`
 * ms). Pairs nicely with `BreathingBee` — outer breathing scales, this one
 * bobs in place. Together they read as a bee suspended on air, never
 * static. Mirrors the web's `cursor-bee` / `bee-fly-by` ambient motion
 * vocabulary, scaled down to a respectful idle.
 *
 * Reanimated 3 worklets: every transition uses `withTiming` / `withRepeat`
 * directly on a shared value, so callbacks stay on the UI thread without
 * any JS bridge work. Honors `useReducedMotion()` — when on, we render the
 * children at rest with no transform.
 *
 * Usage:
 *   <FloatingBee>
 *     <BeeStanding size={140} />
 *   </FloatingBee>
 */
import React, { useEffect } from 'react';
import { View, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

export type FloatingBeeProps = {
  /** Bee (or any node) to wrap. */
  children: React.ReactNode;
  /** Cumulative bob period in ms. Default 3000. */
  period?: number;
  /** Vertical amplitude in px (peak-to-rest). Default 3. */
  amplitude?: number;
  style?: ViewStyle;
};

export function FloatingBee({
  children,
  period = 3000,
  amplitude = 3,
  style,
}: FloatingBeeProps) {
  const reduceMotion = useReducedMotion();
  const ty = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    const half = Math.max(400, Math.floor(period / 2));
    ty.value = withRepeat(
      withSequence(
        withTiming(-amplitude, {
          duration: half,
          easing: Easing.inOut(Easing.ease),
        }),
        withTiming(amplitude, {
          duration: half,
          easing: Easing.inOut(Easing.ease),
        }),
      ),
      -1,
      false,
    );
    return () => {
      cancelAnimation(ty);
    };
  }, [reduceMotion, period, amplitude, ty]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: ty.value }],
  }));

  if (reduceMotion) {
    return <View style={style}>{children}</View>;
  }
  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
}

export default FloatingBee;
