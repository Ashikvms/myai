/**
 * Onboarding — Phase 3b restyle.
 *
 * Black + gold tokens. Bee mascot fronts the hero slide. Copy
 * rebranded from "AI assistant" → "your bumblebee for life's admin".
 */
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ScrollView,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { tokens, radius, spacing } from '../src/lib/tokens';
import {
  BeeStanding,
  BeeLooking,
  BeeMagnifying,
} from '../src/components/illustrations/bee';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type Slide = {
  Pose: React.ComponentType<{ size?: number }>;
  title: string;
  subtitle: string;
  features?: string[];
};

const SLIDES: Slide[] = [
  {
    Pose: BeeStanding,
    title: 'Your bumblebee\nfor life’s admin',
    subtitle:
      'Manage bills, subscriptions, appointments, documents, and reminders — all in one place.',
  },
  {
    Pose: BeeLooking,
    title: 'Track everything\nthat matters',
    subtitle: 'Stay on top of bills, subs, and calendar in one breath.',
    features: [
      'Bills & payments',
      'Subscriptions',
      'Appointments',
      'Documents',
      'Smart reminders',
    ],
  },
  {
    Pose: BeeMagnifying,
    title: 'Powered by Laylo',
    subtitle:
      'Spot patterns, surface savings, and surface what needs your attention today.',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SCREEN_WIDTH);
    setActiveIndex(index);
  };

  const goToNext = () => {
    if (activeIndex < SLIDES.length - 1) {
      scrollRef.current?.scrollTo({
        x: SCREEN_WIDTH * (activeIndex + 1),
        animated: true,
      });
      setActiveIndex(activeIndex + 1);
    } else {
      router.replace('/auth');
    }
  };

  const skip = () => router.replace('/auth');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.skipContainer}>
        <TouchableOpacity onPress={skip} style={styles.skipButton}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        style={styles.scrollView}
      >
        {SLIDES.map((slide, index) => {
          const Pose = slide.Pose;
          return (
            <View key={index} style={styles.slide}>
              <View style={styles.poseWrap}>
                <Pose size={120} />
              </View>
              <Text style={styles.title}>{slide.title}</Text>
              <Text style={styles.subtitle}>{slide.subtitle}</Text>

              {slide.features && (
                <View style={styles.featureList}>
                  {slide.features.map((feature, i) => (
                    <View key={i} style={styles.featureItem}>
                      <View style={styles.featureDot} />
                      <Text style={styles.featureText}>{feature}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((_, index) => (
            <View
              key={index}
              style={[styles.dot, index === activeIndex && styles.dotActive]}
            />
          ))}
        </View>

        <TouchableOpacity
          style={styles.nextButton}
          onPress={goToNext}
          activeOpacity={0.85}
        >
          <Text style={styles.nextButtonText}>
            {activeIndex === SLIDES.length - 1 ? 'Join the hive' : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.bg,
  },
  skipContainer: {
    alignItems: 'flex-end',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
  },
  skipButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  skipText: {
    fontSize: 15,
    color: tokens.textMuted,
    fontWeight: '500',
  },
  scrollView: { flex: 1 },
  slide: {
    width: SCREEN_WIDTH,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  poseWrap: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: tokens.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '700',
    color: tokens.text,
    textAlign: 'center',
    marginBottom: spacing.lg,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: tokens.textMuted,
    textAlign: 'center',
    paddingHorizontal: spacing.sm,
  },
  featureList: {
    marginTop: spacing.xxl,
    alignSelf: 'stretch',
    paddingHorizontal: spacing.lg,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md + 2,
  },
  featureDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: tokens.accent,
    marginRight: spacing.md + 2,
  },
  featureText: {
    fontSize: 15,
    color: tokens.text,
    fontWeight: '500',
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    gap: spacing.xl,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md - 2,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: tokens.border,
  },
  dotActive: {
    backgroundColor: tokens.accent,
    width: 24,
  },
  nextButton: {
    backgroundColor: tokens.accent,
    borderRadius: radius.md,
    paddingVertical: spacing.lg + 2,
    alignItems: 'center',
  },
  nextButtonText: {
    color: tokens.textOnAccent,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
