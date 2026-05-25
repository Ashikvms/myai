/**
 * Mobile tab bar — Phase 3b restructure.
 *
 * Five flat tabs per REDESIGN_BRIEF.md §3.2 + the Phase 3b scope:
 *   Home · Money · Tasks · Vault · Settings
 *
 * The previous "Assistant" centre-raised FAB tab is gone — AI is now
 * accessed via the AskAi pill in the home header + the per-card
 * sparkle buttons that pop the AiBottomSheet.
 *
 * Active tint = gold. Inactive = textMuted. Active tab is visually
 * underlined by a 3 px gold bar inside the icon group (Reanimated
 * fade so it animates in when focused).
 */
import React from 'react';
import { Tabs } from 'expo-router';
import { View, StyleSheet, Platform } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { tokens } from '../../src/lib/tokens';
import {
  HomeIcon,
  WalletIcon,
  CheckSquareIcon,
  ArchiveIcon,
  SettingsIcon,
} from '../../src/components/icons/tab-icons';
import { GradientPill, GRADIENT_PALETTES } from '../../src/components/ui/gradient-pill';

type TabIconProps = {
  Icon: React.ComponentType<{ color: string; size?: number }>;
  focused: boolean;
};

function TabIcon({ Icon, focused }: TabIconProps) {
  const reduceMotion = useReducedMotion();
  const indicator = useSharedValue(focused ? 1 : 0);

  React.useEffect(() => {
    indicator.value = withTiming(focused ? 1 : 0, {
      duration: reduceMotion ? 0 : 200,
    });
  }, [focused, reduceMotion, indicator]);

  const indicatorStyle = useAnimatedStyle(() => ({
    opacity: indicator.value,
    transform: [{ scaleX: 0.4 + indicator.value * 0.6 }],
  }));

  return (
    <View style={styles.iconWrap}>
      <Icon color={focused ? tokens.accent : tokens.textMuted} size={24} />
      {/* Active-tab underline: 3-stop gold gradient (transparent →
          gold → transparent) so the stripe has soft edges instead of
          a flat hard bar. Scale + fade animate when focus changes. */}
      <Animated.View style={[styles.activeBarWrap, indicatorStyle]} pointerEvents="none">
        <GradientPill
          colors={GRADIENT_PALETTES.goldFade}
          locations={[0, 0.5, 1]}
          direction="horizontal"
          width="100%"
          height="100%"
          borderRadius={2}
        />
      </Animated.View>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: tokens.accent,
        tabBarInactiveTintColor: tokens.textMuted,
        tabBarLabelStyle: styles.tabLabel,
        tabBarStyle: styles.tabBar,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => <TabIcon Icon={HomeIcon} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="money"
        options={{
          title: 'Money',
          tabBarIcon: ({ focused }) => <TabIcon Icon={WalletIcon} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: 'Tasks',
          tabBarIcon: ({ focused }) => <TabIcon Icon={CheckSquareIcon} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="vault"
        options={{
          title: 'Vault',
          tabBarIcon: ({ focused }) => <TabIcon Icon={ArchiveIcon} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ focused }) => <TabIcon Icon={SettingsIcon} focused={focused} />,
        }}
      />
      {/*
        Documents was previously a tab — now reachable from the Vault
        hub. Hide its tab so the screen still mounts as part of the
        tabs group but doesn't render in the bar.
      */}
      <Tabs.Screen
        name="documents"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: tokens.surface,
    borderTopWidth: 1,
    borderTopColor: tokens.border,
    height: Platform.OS === 'ios' ? 88 : 68,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 28 : 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    paddingTop: 2,
  },
  // Wrapper for the gradient stripe; sizing matches the previous flat
  // bar (3 × 24) so existing icon spacing is unchanged.
  activeBarWrap: {
    position: 'absolute',
    bottom: -10,
    height: 3,
    width: 24,
    borderRadius: 2,
    overflow: 'hidden',
  },
});
