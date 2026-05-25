/**
 * GoldSweep — Phase 3b playfulness pass (B4).
 *
 * Plays a brief "sweep" of warm gold across the parent row when
 * `active` flips true. A positioned `Animated.View` with width:'100%'
 * translates from -100% → 100% over 600 ms. Above the sweep, a tiny
 * coin emoji floats upward + fades.
 *
 * Designed to be dropped INSIDE a row container (the row is the
 * relative parent). Renders absolutely fitted; pointerEvents none.
 *
 * Reduced-motion: renders nothing.
 */
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { tokens, radius } from '../../lib/tokens';

const { width: SCREEN_W } = Dimensions.get('window');

export type GoldSweepProps = {
  active: boolean;
  /** Show floating coin emoji. Default true. */
  showCoin?: boolean;
};

export function GoldSweep({ active, showCoin = true }: GoldSweepProps) {
  const reduceMotion = useReducedMotion();
  if (reduceMotion || !active) return null;
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.clip]}>
      <Sweep />
      {showCoin && <Coin />}
    </View>
  );
}

function Sweep() {
  // Translate the band from -screenWidth → +screenWidth so it visibly
  // crosses any reasonable card width.
  const x = useSharedValue(-SCREEN_W);
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withSequence(
      withTiming(1, { duration: 60 }),
      withDelay(360, withTiming(0, { duration: 240 })),
    );
    x.value = withTiming(SCREEN_W, {
      duration: 600,
      easing: Easing.out(Easing.cubic),
    });
  }, [x, opacity]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: x.value }],
  }));

  return (
    <Animated.View pointerEvents="none" style={[styles.sweep, style]} />
  );
}

function Coin() {
  const ty = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withSequence(
      withTiming(1, { duration: 100 }),
      withDelay(280, withTiming(0, { duration: 320 })),
    );
    ty.value = withTiming(-30, {
      duration: 700,
      easing: Easing.out(Easing.cubic),
    });
  }, [ty, opacity]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: ty.value }],
  }));

  return (
    <Animated.View style={[styles.coin, style]}>
      <Text style={styles.coinText}>🪙</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  clip: {
    overflow: 'hidden',
    borderRadius: radius.md,
  },
  sweep: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: '60%',
    backgroundColor: tokens.accent,
    opacity: 0.22,
    // Slight skew gives the sweep a real "shimmer" feel.
    transform: [{ skewX: '-15deg' }],
  },
  coin: {
    position: 'absolute',
    right: 16,
    top: 12,
  },
  coinText: {
    fontSize: 18,
  },
});
