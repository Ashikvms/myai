/**
 * WelcomeBeeBubble — composed mascot + speech bubble for auth screens.
 *
 * Layout (matches web reference at apps/web/src/app/(marketing)/login/page.tsx):
 *  - Bee sits DEAD CENTER of a fixed-aspect frame.
 *  - A soft gold radial glow lives BEHIND the bee — the "afterglow".
 *  - The speech bubble floats BELOW the bee, centered, tail pointing UP
 *    toward the bee's head. Reads as a single beat from a single
 *    character without the off-balance left-leaning row layout we had
 *    before.
 *
 * Why we switched from `flexDirection: 'row'`: the previous layout had
 * the bee on the left + bubble on the right; even with the parent set
 * to `alignItems: 'center'`, the bee read as floating in the upper-left.
 * Centering the bee in its own square frame matches the web exactly and
 * gives us a stable hook for the radial glow.
 *
 * Glow technique: react-native-svg `<RadialGradient>` inside `<Defs>`
 * fills a single `<Circle>`. RNSVG is already a hard dep, so no extra
 * install. Stops mirror the web: 32% gold at center, 0% at edge.
 *
 * Usage:
 *   <WelcomeBeeBubble variant="login" />
 *   <WelcomeBeeBubble variant="signup" />
 */
import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { BeeStanding } from './bee';
import { BeeSpeechBubble } from './bee-speech-bubble';
import { copy } from '../../lib/copy';
import { beePalette } from '../../lib/tokens';

export type WelcomeBeeBubbleVariant = 'login' | 'signup';

export type WelcomeBeeBubbleProps = {
  variant: WelcomeBeeBubbleVariant;
  /** Bee illustration size in px. Default 104. */
  beeSize?: number;
  style?: ViewStyle | ViewStyle[];
};

/**
 * The frame is intentionally wider than the bee so the radial glow
 * extends past the bee's silhouette. Ratio ≈ 1.5× the bee size keeps
 * the halo readable without dominating the screen.
 */
function GlowHalo({ size }: { size: number }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
    >
      <Defs>
        <RadialGradient
          id="bee-glow"
          cx="50%"
          cy="50%"
          rx="50%"
          ry="50%"
          fx="50%"
          fy="50%"
        >
          <Stop offset="0%" stopColor={beePalette.gold} stopOpacity="0.32" />
          <Stop offset="55%" stopColor={beePalette.gold} stopOpacity="0.12" />
          <Stop offset="100%" stopColor={beePalette.gold} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Circle cx={size / 2} cy={size / 2} r={size / 2} fill="url(#bee-glow)" />
    </Svg>
  );
}

export function WelcomeBeeBubble({
  variant,
  beeSize = 104,
  style,
}: WelcomeBeeBubbleProps) {
  const message = variant === 'login' ? copy.missedYou : copy.letsGetSetUp;
  // Halo frame ~1.5× the bee so the glow extends well past the silhouette
  // without overlapping the speech bubble. Rounded to keep the SVG crisp.
  const haloSize = Math.round(beeSize * 1.6);

  return (
    <View style={[styles.column, style]}>
      {/* Bee + glow live in a centered, fixed-size frame so the glow
          doesn't push surrounding layout. */}
      <View
        style={[
          styles.beeFrame,
          { width: haloSize, height: haloSize },
        ]}
      >
        <GlowHalo size={haloSize} />
        <View style={styles.beeWrap}>
          <BeeStanding size={beeSize} />
        </View>
      </View>

      {/* Bubble floats below the bee — tail points UP toward the bee's
          head, identical to the web's `tail="bottom"` (i.e. bee sits
          ABOVE the bubble, so the tail points UP/towards the top). */}
      <View style={styles.bubbleWrap}>
        <BeeSpeechBubble direction="top">{message}</BeeSpeechBubble>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  column: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  beeFrame: {
    alignItems: 'center',
    justifyContent: 'center',
    // Pull surrounding layout in a touch — the halo is decoration, the
    // bee is the visual anchor.
    marginVertical: -8,
  },
  beeWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubbleWrap: {
    marginTop: 14,
    // Slight horizontal padding so the bubble can't bump the screen edge
    // even on the narrowest devices.
    paddingHorizontal: 4,
  },
});

export default WelcomeBeeBubble;
