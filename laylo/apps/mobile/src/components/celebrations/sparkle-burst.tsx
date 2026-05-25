/**
 * SparkleBurst — Phase 3b playfulness pass (B3).
 *
 * One-shot celebration overlay that emits 5–7 small gold particles in
 * a circle and a "+1" floats up and fades out. Mounts when `active`
 * flips true; auto-dismisses after ~700ms (parent should reset
 * `active` back to false on the same tick or shortly after).
 *
 * Designed to be absolutely positioned over the originating cell —
 * parent supplies the wrapper. We don't size or place anything; we
 * just paint inside a `pointerEvents="none"` overlay.
 *
 * Reduced-motion: renders nothing.
 */
import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useTokens } from '../../lib/tokens';

export type SparkleBurstProps = {
  /** When true, the burst plays once. Reset to false to allow replay. */
  active: boolean;
  /** Number of particles. Default 6. */
  count?: number;
  /** Origin x/y inside the parent (defaults to top-left of overlay). */
  originX?: number;
  originY?: number;
  /** Show the floating "+1" text. Default true. */
  showPlusOne?: boolean;
};

const PARTICLE_DISTANCE = 36;

export function SparkleBurst({
  active,
  count = 6,
  originX = 0,
  originY = 0,
  showPlusOne = true,
}: SparkleBurstProps) {
  const reduceMotion = useReducedMotion();
  const t = useTokens();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        particle: {
          position: 'absolute',
          width: 6,
          height: 6,
          borderRadius: 3,
          backgroundColor: t.accent,
        },
        plusOne: {
          position: 'absolute',
        },
        plusOneText: {
          fontSize: 13,
          fontWeight: '800',
          color: t.accent,
          letterSpacing: 0.4,
          // Subtle dark outline so gold reads on light surfaces too.
          textShadowColor: 'rgba(0,0,0,0.25)',
          textShadowRadius: 1,
          textShadowOffset: { width: 0, height: 1 },
        },
      }),
    [t],
  );
  if (reduceMotion || !active) return null;

  // Compute static angle distribution — bursts are visually richer
  // with a slight asymmetry vs a perfect equal split.
  const particles = Array.from({ length: count }, (_, i) => {
    const angle = (i * (360 / count) + (i % 2 === 0 ? 0 : 18)) * (Math.PI / 180);
    return {
      id: i,
      dx: Math.cos(angle) * PARTICLE_DISTANCE,
      dy: Math.sin(angle) * PARTICLE_DISTANCE,
    };
  });

  return (
    <View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        { alignItems: 'flex-start', justifyContent: 'flex-start' },
      ]}
    >
      {particles.map((p) => (
        <Particle
          key={p.id}
          x={originX}
          y={originY}
          dx={p.dx}
          dy={p.dy}
          delay={p.id * 12}
          particleStyle={styles.particle}
        />
      ))}
      {showPlusOne && (
        <PlusOne
          x={originX}
          y={originY}
          plusOneStyle={styles.plusOne}
          plusOneTextStyle={styles.plusOneText}
        />
      )}
    </View>
  );
}

function Particle({
  x,
  y,
  dx,
  dy,
  delay,
  particleStyle,
}: {
  x: number;
  y: number;
  dx: number;
  dy: number;
  delay: number;
  particleStyle: object;
}) {
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withSequence(
      withDelay(delay, withTiming(1, { duration: 80 })),
      withDelay(120, withTiming(0, { duration: 320 })),
    );
    scale.value = withDelay(
      delay,
      withSequence(
        withTiming(1, { duration: 140, easing: Easing.out(Easing.cubic) }),
        withTiming(0.6, { duration: 280, easing: Easing.in(Easing.cubic) }),
      ),
    );
    tx.value = withDelay(
      delay,
      withTiming(dx, { duration: 420, easing: Easing.out(Easing.cubic) }),
    );
    ty.value = withDelay(
      delay,
      withTiming(dy, { duration: 420, easing: Easing.out(Easing.cubic) }),
    );
  }, [dx, dy, delay, tx, ty, opacity, scale]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { scale: scale.value },
    ],
  }));

  return (
    <Animated.View
      style={[
        particleStyle,
        { left: x, top: y },
        style,
      ]}
    />
  );
}

function PlusOne({
  x,
  y,
  plusOneStyle,
  plusOneTextStyle,
}: {
  x: number;
  y: number;
  plusOneStyle: object;
  plusOneTextStyle: object;
}) {
  const ty = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withSequence(
      withTiming(1, { duration: 120 }),
      withDelay(280, withTiming(0, { duration: 380 })),
    );
    ty.value = withTiming(-32, {
      duration: 700,
      easing: Easing.out(Easing.cubic),
    });
  }, [ty, opacity]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: ty.value }],
  }));

  return (
    <Animated.View style={[plusOneStyle, { left: x, top: y - 6 }, style]}>
      <Text style={plusOneTextStyle}>+1</Text>
    </Animated.View>
  );
}
