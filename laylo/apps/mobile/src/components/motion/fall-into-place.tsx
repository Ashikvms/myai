/**
 * FallIntoPlace — RN port of apps/web/.../fall-into-place.tsx.
 *
 * Staggered "settle" entrance: every wrapped element fades + drops into its
 * resting position with a soft spring. Used for choreographed page mounts
 * (e.g. dashboard after login) so the screen reads as one cohesive
 * arrival rather than N independent animations.
 *
 * Spring contract (locked, matches web): stiffness 220, damping 22, mass 0.9.
 * Slightly bouncier than the web's 240/28/0.8 — chosen so RN's frame budget
 * still feels "weighted" without overshoot on lower-end devices.
 *
 * Usage:
 *   <FallIntoPlace index={0} from="top"><Hero /></FallIntoPlace>
 *   <FallIntoPlace index={1} from="top"><Card /></FallIntoPlace>
 *   <FallIntoPlace index={2} from="bottom"><Footer /></FallIntoPlace>
 *
 * Reduced motion: renders at rest, no offset, no stagger.
 */
import React, { useEffect } from 'react';
import { type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

const SETTLE_SPRING = { stiffness: 220, damping: 22, mass: 0.9 } as const;
const OFFSET_PX = 20;

export type FallDirection = 'top' | 'bottom';

export type FallIntoPlaceProps = {
  children: React.ReactNode;
  /** Stagger position. 0-based. Default 0. */
  index?: number;
  /** Per-item stagger step in ms. Default 60. */
  stagger?: number;
  /** Direction to enter FROM. Default 'top' (starts above, falls down). */
  from?: FallDirection;
  /** Optional explicit delay (ms). Wins over `index * stagger` when set. */
  delay?: number;
  style?: ViewStyle | ViewStyle[];
};

export function FallIntoPlace({
  children,
  index = 0,
  stagger = 60,
  from = 'top',
  delay,
  style,
}: FallIntoPlaceProps) {
  const reduceMotion = useReducedMotion();

  const startY = from === 'top' ? -OFFSET_PX : OFFSET_PX;
  const opacity = useSharedValue(reduceMotion ? 1 : 0);
  const ty = useSharedValue(reduceMotion ? 0 : startY);

  useEffect(() => {
    if (reduceMotion) {
      opacity.value = 1;
      ty.value = 0;
      return;
    }
    const wait = delay ?? index * stagger;
    // Fade is a short timing — the spring carries the position. Two parallel
    // tracks read as one settle.
    opacity.value = withDelay(wait, withTiming(1, { duration: 280 }));
    ty.value = withDelay(wait, withSpring(0, SETTLE_SPRING));
  }, [reduceMotion, delay, index, stagger, opacity, ty]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: ty.value }],
  }));

  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
}

/** Re-export the spring config so callers can compose matching transitions. */
export const FALL_SETTLE_SPRING = SETTLE_SPRING;

export default FallIntoPlace;
