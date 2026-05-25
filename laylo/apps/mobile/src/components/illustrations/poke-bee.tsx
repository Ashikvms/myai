/**
 * PokeBee — easter egg.
 *
 * Wraps any bee illustration in a Pressable that counts taps in a 2.5-second
 * rolling window. After 5 taps, a `BeeSpeechBubble` floats above the bee
 * with "Stop poking me!" for 2 seconds; the counter then resets.
 *
 * Each tap fires a light haptic and a tiny wobble on the bee for instant
 * tactile feedback. Reduced-motion still counts the taps and shows the
 * bubble — only the wobble is suppressed.
 *
 * Usage:
 *   <PokeBee>
 *     <BeeStanding size={120} />
 *   </PokeBee>
 *
 * The wrapped bee can be any illustration; we don't assume a specific pose.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { BeeSpeechBubble } from './bee-speech-bubble';

const POKE_WINDOW_MS = 2500;
const POKE_THRESHOLD = 5;
const COMPLAINT_DURATION_MS = 2000;

// Lazy haptics — same shim as motion-button. Local copy keeps this file
// self-contained so it can be lifted into other apps easily.
type HapticsLike = {
  ImpactFeedbackStyle?: { Light?: unknown };
  impactAsync?: (style?: unknown) => Promise<void> | void;
};
let cachedHaptics: HapticsLike | null | undefined;
function fireLightHaptic() {
  if (cachedHaptics === undefined) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      cachedHaptics = require('expo-haptics') as HapticsLike;
    } catch {
      cachedHaptics = null;
    }
  }
  const h = cachedHaptics;
  if (!h?.impactAsync) return;
  try {
    h.impactAsync(h.ImpactFeedbackStyle?.Light);
  } catch {
    // Swallow — haptics are nice-to-have.
  }
}

export type PokeBeeProps = {
  /** The bee illustration to wrap. */
  children: React.ReactNode;
  /** Override the complaint copy. Default "Stop poking me!". */
  message?: string;
  style?: ViewStyle | ViewStyle[];
};

export function PokeBee({
  children,
  message = 'Stop poking me!',
  style,
}: PokeBeeProps) {
  const reduceMotion = useReducedMotion();
  const [complaining, setComplaining] = useState(false);

  // Tap timestamps in the rolling window. Held in a ref so taps don't
  // re-render the bee each time.
  const tapsRef = useRef<number[]>([]);
  const wobble = useSharedValue(0);

  // Clear any pending dismiss timeout on unmount.
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    };
  }, []);

  const handlePress = useCallback(() => {
    fireLightHaptic();

    if (!reduceMotion) {
      // Tiny shake — three quick swings then back to rest.
      wobble.value = withSequence(
        withTiming(-4, { duration: 70 }),
        withTiming(4, { duration: 70 }),
        withTiming(0, { duration: 90 }),
      );
    }

    const now = Date.now();
    const fresh = [...tapsRef.current.filter((t) => now - t < POKE_WINDOW_MS), now];
    tapsRef.current = fresh;

    if (fresh.length >= POKE_THRESHOLD && !complaining) {
      setComplaining(true);
      tapsRef.current = []; // reset so the user has to earn it again
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = setTimeout(() => {
        setComplaining(false);
      }, COMPLAINT_DURATION_MS);
    }
  }, [complaining, reduceMotion, wobble]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: wobble.value }],
  }));

  return (
    <View style={[styles.wrap, style]}>
      {complaining && (
        <View pointerEvents="none" style={styles.bubbleSlot}>
          <BeeSpeechBubble direction="bottom">{message}</BeeSpeechBubble>
        </View>
      )}
      <Pressable onPress={handlePress} accessibilityRole="button" accessibilityLabel="Poke the bee">
        <Animated.View style={animatedStyle}>{children}</Animated.View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
    alignItems: 'center',
  },
  bubbleSlot: {
    position: 'absolute',
    // Sit above the bee with a small gap so the tail clears the head.
    bottom: '100%',
    marginBottom: 8,
    zIndex: 10,
  },
});

export default PokeBee;
