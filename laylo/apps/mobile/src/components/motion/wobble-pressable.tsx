/**
 * WobblePressable — Phase 3b playfulness pass (B5 + D6).
 *
 * Card-like Pressable that, on press-in, scales down to 0.97 AND adds a
 * tiny rotation wobble (+1.5° → 0° over 300ms). Optionally emits a
 * gold ring expanding outward from the card center on press (D6
 * "flourish") — purely decorative, dismissed automatically.
 *
 * All decorative motion is gated on `useReducedMotion()`.
 */
import React, { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type GestureResponderEvent,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useTokens, radius } from '../../lib/tokens';

export type WobblePressableProps = {
  children: React.ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  /** When true, a gold "ring" expands from the card center on press. */
  flourish?: boolean;
  style?: ViewStyle | ViewStyle[];
};

export function WobblePressable({
  children,
  onPress,
  onLongPress,
  flourish = false,
  style,
}: WobblePressableProps) {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const rotate = useSharedValue(0);

  // Ring "flourish" — keyed list keeps refs around long enough for the
  // 300 ms animation to play out before pruning.
  const [rings, setRings] = useState<number[]>([]);

  const removeRing = (id: number) =>
    setRings((prev) => prev.filter((r) => r !== id));

  const onPressIn = () => {
    if (reduceMotion) return;
    scale.value = withSpring(0.97, { stiffness: 320, damping: 22 });
    rotate.value = withSequence(
      withTiming(1.5, { duration: 100, easing: Easing.out(Easing.cubic) }),
      withTiming(0, { duration: 200, easing: Easing.out(Easing.cubic) }),
    );
  };

  const onPressOut = () => {
    scale.value = withSpring(1, { stiffness: 320, damping: 22 });
  };

  const handlePress = (_e: GestureResponderEvent) => {
    if (flourish && !reduceMotion) {
      const id = Date.now() + Math.random();
      setRings((prev) => [...prev, id]);
      // Ring auto-prunes after the animation; safe to leave it
      // unmounted in the next render.
      setTimeout(() => removeRing(id), 360);
    }
    onPress?.();
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotate.value}deg` },
    ],
  }));

  const t = useTokens();

  return (
    <Pressable
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      onPress={handlePress}
      onLongPress={onLongPress}
      delayLongPress={420}
    >
      <Animated.View style={[style, animatedStyle]}>
        {children}
        {flourish && rings.length > 0 && (
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {rings.map((id) => (
              <FlourishRing
                key={id}
                onDone={() => removeRing(id)}
                accentColor={t.accent}
              />
            ))}
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}

/** Internal — a single expanding gold ring that fades out. */
function FlourishRing({
  onDone: _onDone,
  accentColor,
}: {
  onDone: () => void;
  accentColor: string;
}) {
  const ringScale = useSharedValue(0.4);
  const ringOpacity = useSharedValue(0.6);

  React.useEffect(() => {
    ringScale.value = withTiming(1.4, {
      duration: 320,
      easing: Easing.out(Easing.cubic),
    });
    ringOpacity.value = withTiming(0, {
      duration: 320,
      easing: Easing.out(Easing.cubic),
    });
  }, [ringScale, ringOpacity]);

  const ringStyle = useAnimatedStyle(() => ({
    opacity: ringOpacity.value,
    transform: [{ scale: ringScale.value }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        {
          borderRadius: radius.md,
          borderWidth: 2,
          borderColor: accentColor,
        },
        ringStyle,
      ]}
    />
  );
}
