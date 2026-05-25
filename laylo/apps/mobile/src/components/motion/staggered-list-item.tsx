/**
 * StaggeredListItem — Phase 3b playfulness pass (B1).
 *
 * Wraps a list item in a Reanimated `Animated.View` with a `FadeInDown`
 * entering animation, staggered by `index * 50ms`. Caps the delay so a
 * 100-item list doesn't take 5s to fully settle.
 *
 * Reduced-motion: skips the entrance entirely and renders the child in
 * its final position.
 */
import React from 'react';
import { View, type ViewStyle } from 'react-native';
import Animated, {
  FadeInDown,
  useReducedMotion,
} from 'react-native-reanimated';

export type StaggeredListItemProps = {
  index: number;
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  /** Per-item delay in ms. Default 50. */
  step?: number;
  /** Cap on the cumulative delay (ms). Default 600 ms (≈ 12 items). */
  maxDelay?: number;
  /** Entry duration in ms. Default 280 ms per spec. */
  duration?: number;
};

export function StaggeredListItem({
  index,
  children,
  style,
  step = 50,
  maxDelay = 600,
  duration = 280,
}: StaggeredListItemProps) {
  const reduceMotion = useReducedMotion();
  if (reduceMotion) {
    return <View style={style}>{children}</View>;
  }
  const delay = Math.min(index * step, maxDelay);
  return (
    <Animated.View
      style={style}
      entering={FadeInDown.duration(duration).delay(delay)}
    >
      {children}
    </Animated.View>
  );
}
