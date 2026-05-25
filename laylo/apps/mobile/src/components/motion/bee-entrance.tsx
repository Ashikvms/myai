/**
 * BeeEntrance — one-shot "land and settle" mount animation for bee mascots.
 *
 * Scales from 0 → 1.05 → 1 with a soft spring, and fades in alongside, so
 * the bee feels like it just buzzed into frame and stopped to face the
 * user. Inspired by the web's `fall-into-place` choreography, but tuned
 * for a single-element entrance with a tiny overshoot.
 *
 * Pair it OUTSIDE `BreathingBee` / `FloatingBee` so the idle loops kick in
 * once the entrance has resolved (the inner loops run continuously; this
 * wrapper just plays once).
 *
 * Reduced motion: renders at rest with full opacity, no animation.
 *
 * Usage:
 *   <BeeEntrance>
 *     <BreathingBee>
 *       <FloatingBee>
 *         <BeeStanding size={140} />
 *       </FloatingBee>
 *     </BreathingBee>
 *   </BeeEntrance>
 */
import React, { useEffect } from 'react';
import { type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

const SETTLE_SPRING = { stiffness: 220, damping: 14, mass: 0.9 } as const;

export type BeeEntranceProps = {
  children: React.ReactNode;
  /** Optional delay before the entrance plays (ms). Default 0. */
  delay?: number;
  style?: ViewStyle | ViewStyle[];
};

export function BeeEntrance({ children, delay = 0, style }: BeeEntranceProps) {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(reduceMotion ? 1 : 0);
  const opacity = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (reduceMotion) {
      scale.value = 1;
      opacity.value = 1;
      return;
    }
    // Fade comes in fast; scale uses a sequence to overshoot to 1.05 then
    // settle to 1 via a soft spring. Reads as "lands, bounces once".
    opacity.value = withDelay(delay, withTiming(1, { duration: 220 }));
    scale.value = withDelay(
      delay,
      withSequence(
        withTiming(1.05, { duration: 260 }),
        withSpring(1, SETTLE_SPRING),
      ),
    );
  }, [reduceMotion, delay, scale, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
}

export default BeeEntrance;
