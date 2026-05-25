/**
 * MotionButton — RN port of apps/web/.../motion-button.tsx.
 *
 * Bouncy Pressable wrapper: scales to 0.96 on pressIn and springs back on
 * pressOut. Optionally fires a light haptic on press — graceful no-op if
 * `expo-haptics` isn't installed in the workspace (we resolve it lazily so
 * the bundle still compiles).
 *
 * Drop-in for any place that currently uses a bare <Pressable>. Children
 * render as-is — this is a behaviour primitive, not a visual one. Pair
 * with the project's button styling for the actual look.
 *
 * Reduced motion: skips the scale, still triggers onPress + haptic.
 */
import React from 'react';
import {
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

/**
 * Lazy haptic shim. We avoid a static import so the file still compiles in
 * environments that haven't installed `expo-haptics`. If/when the package
 * lands, the call becomes real automatically — no code change needed.
 */
type HapticsLike = {
  ImpactFeedbackStyle?: { Light?: unknown };
  impactAsync?: (style?: unknown) => Promise<void> | void;
};

let cachedHaptics: HapticsLike | null | undefined;
function getHaptics(): HapticsLike | null {
  if (cachedHaptics !== undefined) return cachedHaptics;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cachedHaptics = require('expo-haptics') as HapticsLike;
  } catch {
    cachedHaptics = null;
  }
  return cachedHaptics;
}

function fireLightHaptic() {
  const h = getHaptics();
  if (!h?.impactAsync) return;
  try {
    h.impactAsync(h.ImpactFeedbackStyle?.Light);
  } catch {
    // Swallow — haptics are nice-to-have, never load-bearing.
  }
}

export type MotionButtonProps = Omit<PressableProps, 'style'> & {
  children: React.ReactNode;
  /** Press scale target. Default 0.96 (matches web). */
  pressScale?: number;
  /** Fire a light haptic on press. Default true. */
  haptic?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function MotionButton({
  children,
  pressScale = 0.96,
  haptic = true,
  onPressIn,
  onPressOut,
  onPress,
  style,
  ...rest
}: MotionButtonProps) {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPressIn={(e) => {
        if (!reduceMotion) {
          scale.value = withSpring(pressScale, { stiffness: 500, damping: 25 });
        }
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        if (!reduceMotion) {
          scale.value = withSpring(1, { stiffness: 500, damping: 25 });
        }
        onPressOut?.(e);
      }}
      onPress={(e) => {
        if (haptic) fireLightHaptic();
        onPress?.(e);
      }}
      {...rest}
    >
      <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>
    </Pressable>
  );
}

export default MotionButton;
