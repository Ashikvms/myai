/**
 * BeeSpeechBubble — RN port of apps/web/.../bee-speech-bubble.tsx.
 *
 * Small stylised speech bubble used SPARINGLY for moments when the bee
 * "says something" — auth screens, first-time empty states, easter eggs.
 *
 * Visual contract (matches web):
 *  - Rounded surface card with a 1px gold border + soft glow shadow.
 *  - A rotated square "tail" punching out from one of four sides; the
 *    tail's two visible edges share the bubble's border so the join reads
 *    as a single shape.
 *  - Body text is NEVER gold (locked design rule) — the gold is the
 *    frame, not the message.
 *
 * Entrance: a tiny opacity + scale spring on mount via Reanimated. Honors
 * `useReducedMotion()` — when reduced motion is on we render at rest.
 */
import React, { useEffect } from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { beePalette } from '../../lib/tokens';

export type BubbleSide = 'left' | 'right' | 'top' | 'bottom';
export type BubbleTone = 'gold' | 'white';

export type BeeSpeechBubbleProps = {
  /** Bubble contents — string or a custom node. Strings get default styling. */
  children: React.ReactNode;
  /**
   * Which side the tail points TOWARD (i.e. where the bee sits relative to
   * the bubble). Default 'left'.
   *
   * Aliases: 'direction' is the prop name used in the brief; we accept both.
   */
  tail?: BubbleSide;
  /** Alias for `tail` — matches the brief's prop name. */
  direction?: BubbleSide;
  /** Surface treatment. 'gold' soft-fills the body; 'white' is default. */
  tone?: BubbleTone;
  /** Wrapper style for absolute positioning by callers. */
  style?: ViewStyle | ViewStyle[];
};

// The bee's speech bubble is part of the mascot identity, so it uses the
// theme-INDEPENDENT brand gold for the frame — same colour the bee itself
// is painted in. Keeps the bubble legible whether the app is in
// black-over-yellow (light) or yellow-over-black (dark).
const BORDER_COLOR = beePalette.gold;
const SURFACE_WHITE = beePalette.white;
const SURFACE_GOLD = '#FFF4B8'; // pale honey — readable on either theme
const TAIL_SIZE = 10;

export function BeeSpeechBubble({
  children,
  tail,
  direction,
  tone = 'white',
  style,
}: BeeSpeechBubbleProps) {
  const side: BubbleSide = direction ?? tail ?? 'left';
  const reduceMotion = useReducedMotion();

  const opacity = useSharedValue(reduceMotion ? 1 : 0);
  const scale = useSharedValue(reduceMotion ? 1 : 0.92);

  useEffect(() => {
    if (reduceMotion) {
      opacity.value = 1;
      scale.value = 1;
      return;
    }
    opacity.value = withSpring(1, { stiffness: 360, damping: 26, mass: 0.9 });
    scale.value = withSpring(1, { stiffness: 360, damping: 26, mass: 0.9 });
  }, [reduceMotion, opacity, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const surface = tone === 'gold' ? SURFACE_GOLD : SURFACE_WHITE;
  const tailStyle = getTailStyle(side, surface);

  return (
    <Animated.View
      accessibilityRole="text"
      style={[
        styles.bubble,
        { backgroundColor: surface },
        animatedStyle,
        style,
      ]}
    >
      {typeof children === 'string' ? (
        <Text style={styles.bubbleText}>{children}</Text>
      ) : (
        children
      )}
      <View pointerEvents="none" style={tailStyle} />
    </Animated.View>
  );
}

/**
 * Tail = a small rotated square (`rotate: 45deg`) anchored to one side of
 * the bubble. Only two of its edges carry the gold border so it merges
 * cleanly with the bubble's perimeter.
 */
function getTailStyle(side: BubbleSide, surface: string): ViewStyle {
  const base: ViewStyle = {
    position: 'absolute',
    width: TAIL_SIZE,
    height: TAIL_SIZE,
    backgroundColor: surface,
    borderColor: BORDER_COLOR,
  };
  switch (side) {
    case 'left':
      return {
        ...base,
        left: -TAIL_SIZE / 2,
        top: '50%',
        marginTop: -TAIL_SIZE / 2,
        borderLeftWidth: 1,
        borderTopWidth: 1,
        transform: [{ rotate: '45deg' }],
      };
    case 'right':
      return {
        ...base,
        right: -TAIL_SIZE / 2,
        top: '50%',
        marginTop: -TAIL_SIZE / 2,
        borderRightWidth: 1,
        borderBottomWidth: 1,
        transform: [{ rotate: '45deg' }],
      };
    case 'top':
      return {
        ...base,
        top: -TAIL_SIZE / 2,
        left: '50%',
        marginLeft: -TAIL_SIZE / 2,
        borderLeftWidth: 1,
        borderTopWidth: 1,
        transform: [{ rotate: '45deg' }],
      };
    case 'bottom':
      return {
        ...base,
        bottom: -TAIL_SIZE / 2,
        left: '50%',
        marginLeft: -TAIL_SIZE / 2,
        borderRightWidth: 1,
        borderBottomWidth: 1,
        transform: [{ rotate: '45deg' }],
      };
  }
}

const styles = StyleSheet.create({
  bubble: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    // Soft brand glow — matches the web's `shadow-glow` token.
    shadowColor: BORDER_COLOR,
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  bubbleText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    // Always render on the bubble's white/honey surface; the mascot
    // bubble is theme-independent so we pin the text colour to black.
    color: beePalette.black,
  },
});

export default BeeSpeechBubble;
