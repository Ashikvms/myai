/**
 * InboxZeroOverlay — Phase 3b playfulness pass (D3).
 *
 * Full-screen Modal celebration that fires once per session when the
 * task list transitions from "has tasks" → "zero tasks". Auto-dismisses
 * after 2s, or sooner on tap.
 *
 * Visual: black/translucent backdrop, centered sleeping bee + headline,
 * 24 tiny gold/black particles falling from the top.
 *
 * Reduced-motion: still mounts (it's celebratory), but particles snap
 * to their final positions without animation.
 */
import React, { useEffect, useMemo } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  Dimensions,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useTokens, radius, spacing } from '../../lib/tokens';
import { BeeSleeping } from '../illustrations/bee';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

export type InboxZeroOverlayProps = {
  visible: boolean;
  onDismiss: () => void;
};

export function InboxZeroOverlay({ visible, onDismiss }: InboxZeroOverlayProps) {
  const t = useTokens();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        backdrop: {
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.78)',
          alignItems: 'center',
          justifyContent: 'center',
        },
        center: {
          alignItems: 'center',
          paddingHorizontal: spacing.xl,
        },
        headline: {
          marginTop: spacing.xl,
          fontSize: 28,
          lineHeight: 34,
          fontWeight: '800',
          color: '#FFFFFF',
          textAlign: 'center',
          letterSpacing: -0.4,
        },
        sub: {
          marginTop: spacing.sm,
          fontSize: 14,
          fontWeight: '500',
          color: 'rgba(255,255,255,0.75)',
          textAlign: 'center',
        },
        // Used as a hint of brand chroma in case future variants want a card
        // styling underneath. Kept for downstream tweaks.
        card: {
          backgroundColor: t.surface,
          borderRadius: radius.md,
          padding: spacing.xl,
        },
      }),
    [t],
  );
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(onDismiss, 2000);
    return () => clearTimeout(timer);
  }, [visible, onDismiss]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
      statusBarTranslucent
    >
      <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss}>
        <View style={styles.backdrop}>
          <ParticleField accentColor={t.accent} />
          <View style={styles.center}>
            <BeeSleeping size={160} />
            <Text style={styles.headline}>Inbox zero unlocked</Text>
            <Text style={styles.sub}>Free as a bee. Tap anywhere to dismiss.</Text>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

function ParticleField({ accentColor }: { accentColor: string }) {
  const reduceMotion = useReducedMotion();
  // 24 particles — 12 gold, 12 black — randomised once per mount.
  const particles = React.useMemo(() => {
    const out = [];
    for (let i = 0; i < 24; i++) {
      out.push({
        id: i,
        x: Math.random() * SCREEN_W,
        delay: Math.random() * 600,
        duration: 1200 + Math.random() * 600,
        size: 5 + Math.random() * 5,
        gold: i % 2 === 0,
        drift: (Math.random() - 0.5) * 60,
      });
    }
    return out;
  }, []);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {particles.map((p) => (
        <FallingParticle
          key={p.id}
          x={p.x}
          delay={p.delay}
          duration={p.duration}
          size={p.size}
          gold={p.gold}
          drift={p.drift}
          reduced={reduceMotion}
          accentColor={accentColor}
        />
      ))}
    </View>
  );
}

function FallingParticle({
  x,
  delay,
  duration,
  size,
  gold,
  drift,
  reduced,
  accentColor,
}: {
  x: number;
  delay: number;
  duration: number;
  size: number;
  gold: boolean;
  drift: number;
  reduced: boolean;
  accentColor: string;
}) {
  const ty = useSharedValue(reduced ? SCREEN_H * 0.7 : -40);
  const tx = useSharedValue(0);
  const opacity = useSharedValue(reduced ? 0.6 : 0);

  useEffect(() => {
    if (reduced) return;
    opacity.value = withDelay(delay, withTiming(1, { duration: 200 }));
    ty.value = withDelay(
      delay,
      withTiming(SCREEN_H + 20, {
        duration,
        easing: Easing.in(Easing.quad),
      }),
    );
    tx.value = withDelay(
      delay,
      withTiming(drift, {
        duration,
        easing: Easing.inOut(Easing.ease),
      }),
    );
  }, [delay, duration, drift, reduced, ty, tx, opacity]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: tx.value }, { translateY: ty.value }],
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: x,
          top: 0,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: gold ? accentColor : '#0A0A0A',
        },
        style,
      ]}
    />
  );
}

