/**
 * BeeFlyBy (mobile) — React Native port of
 * `apps/web/src/components/motion/bee-fly-by.tsx` in `mode="loop"`.
 *
 * Renders a tiny bee that loops across the parent container along a
 * configurable trajectory. Designed as an ambient layer on auth screens —
 * spawn 3-4 of these with different delays, durations, sizes and Y
 * positions to make the background feel like a live hive.
 *
 * Performance contract:
 *  - GPU-only transforms (translateX / translateY).
 *  - `pointerEvents="none"` so it never blocks form taps.
 *  - Honors `useReducedMotion()` — renders nothing when on.
 *
 * Trajectory model: a single horizontal sweep from `fromX` → `toX` with a
 * gentle vertical sine (a 4-keyframe Y wobble around `baseY`). The whole
 * cycle then `withRepeat`s forever. `withDelay` staggers each bee.
 */
import React, { useEffect } from 'react';
import { Dimensions, StyleSheet } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { BeeFlying } from '../illustrations/bee-flying';

const { width: SCREEN_W } = Dimensions.get('window');

export type BeeFlyByProps = {
  /** Bee size in px. Default 22. */
  size?: number;
  /** Start delay in ms. Default 0. */
  delay?: number;
  /** Full traversal duration in ms. Default 8000. */
  duration?: number;
  /** Direction across the screen. Default 'ltr'. */
  direction?: 'ltr' | 'rtl';
  /** Vertical anchor — px offset from the top of the parent. Default 80. */
  baseY?: number;
  /** Vertical wobble amplitude in px. Default 14. */
  yAmplitude?: number;
};

export function BeeFlyBy({
  size = 22,
  delay = 0,
  duration = 8000,
  direction = 'ltr',
  baseY = 80,
  yAmplitude = 14,
}: BeeFlyByProps = {}) {
  const reduceMotion = useReducedMotion();

  // Off-screen on either side so the bee fully enters / exits.
  const offset = size + 32;
  const startX = direction === 'ltr' ? -offset : SCREEN_W + offset;
  const endX = direction === 'ltr' ? SCREEN_W + offset : -offset;

  const tx = useSharedValue(startX);
  const ty = useSharedValue(baseY);

  useEffect(() => {
    if (reduceMotion) return;

    // Horizontal sweep — linear so the bee tracks at constant speed across
    // the screen (an `easeInOut` sweep would feel like it's "waiting" at the
    // edges, which reads wrong for a flying bee).
    tx.value = startX;
    tx.value = withDelay(
      delay,
      withRepeat(
        withTiming(endX, { duration, easing: Easing.linear }),
        -1,
        false,
      ),
    );

    // Gentle vertical sine wobble — quarter of the duration per half-cycle,
    // so the bee bobs up + down twice across the screen.
    const quarter = Math.max(400, Math.floor(duration / 4));
    ty.value = baseY;
    ty.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(baseY - yAmplitude, {
            duration: quarter,
            easing: Easing.inOut(Easing.sin),
          }),
          withTiming(baseY + yAmplitude, {
            duration: quarter,
            easing: Easing.inOut(Easing.sin),
          }),
        ),
        -1,
        true,
      ),
    );

    return () => {
      cancelAnimation(tx);
      cancelAnimation(ty);
    };
  }, [reduceMotion, delay, duration, startX, endX, baseY, yAmplitude, tx, ty]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }],
  }));

  if (reduceMotion) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.bee, animatedStyle]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <BeeFlying size={size} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bee: {
    position: 'absolute',
    top: 0,
    left: 0,
    // Sits behind the form. Auth screen content lives on z-index 0+.
    zIndex: -1,
  },
});

export default BeeFlyBy;
