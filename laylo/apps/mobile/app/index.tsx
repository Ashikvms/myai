/**
 * Splash / entry route — BillBee brand moment.
 *
 * Matches the website's first impression: pure-black canvas (same hex
 * as the native splash in `app.json`, so there's no flash on launch),
 * a subtle gold honeycomb pattern at low opacity behind everything,
 * the elaborate `BeeStanding` mascot, the "BillBee" wordmark in
 * Bricolage Grotesque Bold, and the brand tagline.
 *
 * Routing handoff is owned by `AuthRedirect` in `_layout.tsx` — it
 * watches segments + auth state and `router.replace()`s away from
 * this splash to `/auth` (signed-out) or `/(tabs)` (signed-in) as
 * soon as the auth provider finishes hydrating. We render the brand
 * frame while we wait.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BeeStanding } from '../src/components/illustrations/bee';
import { HoneycombPattern } from '../src/components/illustrations/honeycomb-pattern';
import { fontFamily, spacing } from '../src/lib/tokens';

const BLACK = '#000000';
const WHITE = '#FFFFFF';
const OFF_WHITE = 'rgba(255, 255, 255, 0.72)';

export default function SplashScreen() {
  return (
    <View style={styles.container}>
      {/* Subtle hive backdrop — 5 % opacity gold strokes on black. */}
      <HoneycombPattern opacity={0.05} />

      <View style={styles.center}>
        <BeeStanding size={140} />
        <Text style={styles.wordmark}>BillBee</Text>
        <Text style={styles.tagline}>Your bumblebee for life's admin.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BLACK,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  wordmark: {
    fontFamily: fontFamily.display,
    fontSize: 44,
    fontWeight: '700',
    color: WHITE,
    letterSpacing: -1,
    marginTop: spacing.lg,
  },
  tagline: {
    fontFamily: fontFamily.body,
    fontSize: 15,
    color: OFF_WHITE,
    textAlign: 'center',
  },
});
