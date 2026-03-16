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

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const SLIDES = [
  {
    icon: '\u2728',
    title: 'Your AI assistant\nfor life\u2019s admin',
    subtitle: 'Manage bills, subscriptions, appointments, documents, and reminders \u2014 all in one place.',
    gradient: true,
  },
  {
    icon: '\uD83D\uDCB3',
    title: 'Track bills,\nsubscriptions & more',
    subtitle: 'Stay on top of everything that matters.',
    features: [
      'Bills & payments',
      'Subscriptions',
      'Appointments',
      'Documents',
      'Smart reminders',
    ],
  },
  {
    icon: '\uD83E\uDDE0',
    title: 'Powered by AI',
    subtitle: 'Your intelligent assistant provides insights, sends timely reminders, and keeps everything organised automatically.',
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

  const skip = () => {
    router.replace('/auth');
  };

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
        {SLIDES.map((slide, index) => (
          <View key={index} style={styles.slide}>
            <View
              style={[
                styles.iconContainer,
                index === 0 && styles.iconContainerPrimary,
              ]}
            >
              <Text style={styles.icon}>{slide.icon}</Text>
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
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === activeIndex && styles.dotActive,
              ]}
            />
          ))}
        </View>

        <TouchableOpacity
          style={styles.nextButton}
          onPress={goToNext}
          activeOpacity={0.8}
        >
          <Text style={styles.nextButtonText}>
            {activeIndex === SLIDES.length - 1 ? 'Get Started' : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  skipContainer: {
    alignItems: 'flex-end',
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  skipButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  skipText: {
    fontSize: 16,
    color: '#6366F1',
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  slide: {
    width: SCREEN_WIDTH,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  iconContainerPrimary: {
    backgroundColor: '#6366F1',
  },
  icon: {
    fontSize: 48,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
    lineHeight: 40,
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 17,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 26,
    paddingHorizontal: 8,
  },
  featureList: {
    marginTop: 32,
    alignSelf: 'stretch',
    paddingHorizontal: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  featureDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#6366F1',
    marginRight: 14,
  },
  featureText: {
    fontSize: 17,
    color: '#374151',
    fontWeight: '500',
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 24,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D1D5DB',
  },
  dotActive: {
    backgroundColor: '#6366F1',
    width: 24,
  },
  nextButton: {
    backgroundColor: '#6366F1',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
