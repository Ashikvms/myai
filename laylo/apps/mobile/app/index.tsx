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
import { SafeAreaView } from 'react-native-safe-area-context';
import { BeeStanding } from '../src/components/illustrations/bee';
import { HoneycombPattern } from '../src/components/illustrations/honeycomb-pattern';
import { BeeEntrance } from '../src/components/motion/bee-entrance';
import { FloatingBee } from '../src/components/motion/floating-bee';
import { fontFamily, spacing } from '../src/lib/tokens';

const BLACK = '#000000';
const WHITE = '#FFFFFF';
const OFF_WHITE = 'rgba(255, 255, 255, 0.72)';

export default function SplashScreen() {
  return (
    <View style={styles.container}>
      {/* Subtle hive backdrop — 5 % opacity gold strokes on black. */}
      <HoneycombPattern opacity={0.05} />

      {/* SafeAreaView keeps the wordmark + bee comfortably clear of the
          Dynamic Island even though the splash is centred. The brief flash
          before routing handoff happens on iPhone 15+ where the notch /
          status bar would otherwise crop the top edge of the composition
          when this route is shown during deep links. */}
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.center}>
          {/* One-shot entrance, then sustained idle: scale in, then bob. */}
          <BeeEntrance>
            <FloatingBee>
              <BeeStanding size={140} />
            </FloatingBee>
          </BeeEntrance>
          <Text style={styles.wordmark}>BillBee</Text>
          <Text style={styles.tagline}>Your bumblebee for life's admin.</Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BLACK,
  },
  safe: {
    flex: 1,
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
