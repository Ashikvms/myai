/**
 * WelcomeBeeBubble — composed mascot + speech bubble for auth screens.
 *
 * Pairs the standing bee with a `BeeSpeechBubble` that says the right thing
 * for the moment: a returning-user "Missed you" on login, a fresh-start
 * "Let's get you set up" on signup.
 *
 * The bee sits on the LEFT, the bubble on the RIGHT with its tail pointing
 * left (toward the bee), so the layout reads as a single speech beat from
 * a single character.
 *
 * Usage:
 *   <WelcomeBeeBubble variant="login" />
 *   <WelcomeBeeBubble variant="signup" />
 */
import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { BeeStanding } from './bee';
import { BeeSpeechBubble } from './bee-speech-bubble';
import { copy } from '../../lib/copy';

export type WelcomeBeeBubbleVariant = 'login' | 'signup';

export type WelcomeBeeBubbleProps = {
  variant: WelcomeBeeBubbleVariant;
  /** Bee illustration size in px. Default 96. */
  beeSize?: number;
  style?: ViewStyle | ViewStyle[];
};

export function WelcomeBeeBubble({
  variant,
  beeSize = 96,
  style,
}: WelcomeBeeBubbleProps) {
  const message = variant === 'login' ? copy.missedYou : copy.letsGetSetUp;
  return (
    <View style={[styles.row, style]}>
      <BeeStanding size={beeSize} />
      <View style={styles.bubbleWrap}>
        <BeeSpeechBubble direction="left">{message}</BeeSpeechBubble>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bubbleWrap: {
    marginLeft: 12,
    flexShrink: 1,
  },
});

export default WelcomeBeeBubble;
