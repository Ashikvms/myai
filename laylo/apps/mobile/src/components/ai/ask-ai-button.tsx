/**
 * AskAiButton — Phase 3b.
 *
 * Small reusable trigger that pops the AskAi bottom sheet. Two flavours:
 *   • `icon`  — 24 px gold sparkle, used in card top-rights (rest 50%).
 *   • `chip`  — pill with sparkle + label, e.g. "Ask Beedo".
 *   • `pill`  — header-prominence "Ask Beedo" pill (DESIGN_SYSTEM §9.4).
 *
 * State handling for the sheet itself lives at the call-site so a
 * single sheet can be re-used across multiple triggers on the screen.
 */
import React, { useEffect } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
  cancelAnimation,
} from 'react-native-reanimated';
import { tokens, radius, spacing } from '../../lib/tokens';
import { SparkleIcon } from './sparkle-icon';

export type AskAiButtonProps = {
  onPress: () => void;
  variant?: 'icon' | 'chip' | 'pill';
  /** Override label for `chip`/`pill` variants. */
  label?: string;
  /** Add a soft pulsing glow — used on the dashboard hero trigger. */
  pulse?: boolean;
  style?: ViewStyle;
  /** Touch target hitbox padding. */
  hitSlop?: number;
};

export function AskAiButton({
  onPress,
  variant = 'icon',
  label = 'Ask Beedo',
  pulse = false,
  style,
  hitSlop = 8,
}: AskAiButtonProps) {
  const reduceMotion = useReducedMotion();
  const glow = useSharedValue(0.5);
  const scale = useSharedValue(1);

  useEffect(() => {
    if (pulse && !reduceMotion) {
      glow.value = withRepeat(
        withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      );
    } else {
      glow.value = 0.6;
    }
    return () => {
      cancelAnimation(glow);
    };
  }, [pulse, reduceMotion, glow]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glow.value,
  }));

  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const onPressIn = () => {
    if (reduceMotion) return;
    scale.value = withTiming(0.95, { duration: 80 });
  };

  const onPressOut = () => {
    scale.value = withTiming(1, { duration: 120 });
  };

  if (variant === 'icon') {
    return (
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        hitSlop={hitSlop}
        accessibilityRole="button"
        accessibilityLabel="Ask Beedo"
        style={style}
      >
        <Animated.View style={[styles.iconButton, pressStyle]}>
          {pulse && (
            <Animated.View style={[styles.glowRing, glowStyle]} pointerEvents="none" />
          )}
          <View style={styles.iconInner}>
            <SparkleIcon size={16} color={tokens.accent} />
          </View>
        </Animated.View>
      </Pressable>
    );
  }

  if (variant === 'chip') {
    return (
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={style}
      >
        <Animated.View style={[styles.chip, pressStyle]}>
          <SparkleIcon size={14} color={tokens.accent} dim />
          <Text style={styles.chipLabel}>{label}</Text>
        </Animated.View>
      </Pressable>
    );
  }

  // pill — full-prominence header trigger
  return (
    <Pressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={style}
    >
      <Animated.View style={[styles.pill, pressStyle]}>
        {pulse && (
          <Animated.View style={[styles.pillGlow, glowStyle]} pointerEvents="none" />
        )}
        <SparkleIcon size={16} color={tokens.accent} />
        <Text style={styles.pillLabel}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  iconButton: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: tokens.accentDim,
    backgroundColor: 'transparent',
  },
  iconInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowRing: {
    position: 'absolute',
    top: -4,
    right: -4,
    bottom: -4,
    left: -4,
    borderRadius: radius.sm + 2,
    borderWidth: 2,
    borderColor: tokens.accent,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.md - 2,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: tokens.accentDim,
    backgroundColor: 'transparent',
  },
  chipLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: tokens.textMuted,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: tokens.accent,
    backgroundColor: 'transparent',
  },
  pillGlow: {
    position: 'absolute',
    top: -3,
    right: -3,
    bottom: -3,
    left: -3,
    borderRadius: radius.md + 2,
    borderWidth: 2,
    borderColor: tokens.accent,
  },
  pillLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: tokens.text,
  },
});
