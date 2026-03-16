import React from 'react';
import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, Platform } from 'react-native';

const COLORS = {
  primary: '#6366F1',
  inactive: '#9CA3AF',
  surface: '#FFFFFF',
  bg: '#FAFAFA',
};

function TabIcon({ emoji, focused, isCenter }: { emoji: string; focused: boolean; isCenter?: boolean }) {
  if (isCenter) {
    return (
      <View style={styles.centerIconWrapper}>
        <View style={styles.centerIconGradient}>
          <Text style={styles.centerIconText}>{emoji}</Text>
        </View>
      </View>
    );
  }

  return (
    <Text style={[styles.iconText, { opacity: focused ? 1 : 0.6 }]}>
      {emoji}
    </Text>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.inactive,
        tabBarLabelStyle: styles.tabLabel,
        tabBarStyle: styles.tabBar,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: 'Tasks',
          tabBarIcon: ({ focused }) => <TabIcon emoji="✅" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="assistant"
        options={{
          title: 'Assistant',
          tabBarIcon: ({ focused }) => <TabIcon emoji="💬" focused={focused} isCenter />,
          tabBarLabelStyle: {
            ...styles.tabLabel,
            color: COLORS.primary,
            fontWeight: '600',
          },
        }}
      />
      <Tabs.Screen
        name="documents"
        options={{
          title: 'Documents',
          tabBarIcon: ({ focused }) => <TabIcon emoji="📄" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ focused }) => <TabIcon emoji="⚙️" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
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
  iconText: {
    fontSize: 22,
  },
  centerIconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -12,
  },
  centerIconGradient: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  centerIconText: {
    fontSize: 24,
  },
});
