import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  useColorScheme,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../constants/Colors';
import usePreferenceStore from '../../store/usePreferenceStore';

interface SettingRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  onPress?: () => void;
}

function SettingRow({
  icon,
  iconColor,
  title,
  subtitle,
  right,
  onPress,
}: SettingRowProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

  return (
    <TouchableOpacity
      activeOpacity={onPress ? 0.7 : 1}
      onPress={onPress}
      style={styles.settingRow}
    >
      <View
        style={[styles.settingIcon, { backgroundColor: iconColor + '15' }]}
      >
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <View style={styles.settingContent}>
        <Text style={[styles.settingTitle, { color: colors.text }]}>
          {title}
        </Text>
        {subtitle && (
          <Text
            style={[styles.settingSubtitle, { color: colors.textTertiary }]}
          >
            {subtitle}
          </Text>
        )}
      </View>
      {right || (
        <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
      )}
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];
  const {
    userName,
    userEmail,
    darkMode,
    notifications,
    defaultAIModel,
    setDarkMode,
    setNotifications,
  } = usePreferenceStore();

  const firstName = userName.split(' ')[0];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: colors.text }]}>Settings</Text>

        {/* Profile Section */}
        <View
          style={[
            styles.section,
            {
              backgroundColor: colors.surface,
              shadowColor: colors.cardShadow,
            },
          ]}
        >
          <View style={styles.profileRow}>
            <View
              style={[
                styles.profileAvatar,
                { backgroundColor: colors.primary + '20' },
              ]}
            >
              <Text style={[styles.profileInitial, { color: colors.primary }]}>
                {firstName[0]}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={[styles.profileName, { color: colors.text }]}>
                {userName}
              </Text>
              <Text
                style={[
                  styles.profileEmail,
                  { color: colors.textSecondary },
                ]}
              >
                {userEmail}
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.textTertiary}
            />
          </View>
        </View>

        {/* Preferences */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
          PREFERENCES
        </Text>
        <View
          style={[
            styles.section,
            {
              backgroundColor: colors.surface,
              shadowColor: colors.cardShadow,
            },
          ]}
        >
          <SettingRow
            icon="moon-outline"
            iconColor="#6366F1"
            title="Dark Mode"
            subtitle={
              darkMode === 'system'
                ? 'System default'
                : darkMode
                  ? 'On'
                  : 'Off'
            }
            right={
              <Switch
                value={darkMode === true}
                onValueChange={(val) => setDarkMode(val)}
                trackColor={{
                  false: colors.border,
                  true: colors.primary + '60',
                }}
                thumbColor={darkMode === true ? colors.primary : '#f4f3f4'}
                ios_backgroundColor={colors.border}
              />
            }
          />
          <View
            style={[styles.rowDivider, { backgroundColor: colors.border }]}
          />
          <SettingRow
            icon="notifications-outline"
            iconColor="#F59E0B"
            title="Notifications"
            subtitle={notifications ? 'Enabled' : 'Disabled'}
            right={
              <Switch
                value={notifications}
                onValueChange={setNotifications}
                trackColor={{
                  false: colors.border,
                  true: colors.primary + '60',
                }}
                thumbColor={notifications ? colors.primary : '#f4f3f4'}
                ios_backgroundColor={colors.border}
              />
            }
          />
          <View
            style={[styles.rowDivider, { backgroundColor: colors.border }]}
          />
          <SettingRow
            icon="sparkles-outline"
            iconColor="#EC4899"
            title="Default AI Model"
            subtitle={defaultAIModel}
          />
        </View>

        {/* App */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
          APP
        </Text>
        <View
          style={[
            styles.section,
            {
              backgroundColor: colors.surface,
              shadowColor: colors.cardShadow,
            },
          ]}
        >
          <SettingRow
            icon="help-circle-outline"
            iconColor="#3B82F6"
            title="Help & Support"
            subtitle="FAQs, contact support"
          />
          <View
            style={[styles.rowDivider, { backgroundColor: colors.border }]}
          />
          <SettingRow
            icon="star-outline"
            iconColor="#F59E0B"
            title="Rate the App"
            subtitle="Leave a review on the App Store"
          />
          <View
            style={[styles.rowDivider, { backgroundColor: colors.border }]}
          />
          <SettingRow
            icon="shield-checkmark-outline"
            iconColor="#10B981"
            title="Privacy Policy"
          />
          <View
            style={[styles.rowDivider, { backgroundColor: colors.border }]}
          />
          <SettingRow
            icon="document-text-outline"
            iconColor="#64748B"
            title="Terms of Service"
          />
        </View>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={[styles.appName, { color: colors.textTertiary }]}>
            Life Admin AI
          </Text>
          <Text style={[styles.appVersion, { color: colors.textTertiary }]}>
            Version 1.0.0
          </Text>
          <Text style={[styles.appCopyright, { color: colors.textTertiary }]}>
            Built with Expo & Claude
          </Text>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 24,
    marginTop: 8,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 24,
    marginLeft: 4,
  },
  section: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  profileAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  profileInitial: {
    fontSize: 22,
    fontWeight: '700',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 2,
  },
  profileEmail: {
    fontSize: 14,
    fontWeight: '500',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  settingSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 1,
  },
  rowDivider: {
    height: 0.5,
    marginLeft: 62,
  },
  appInfo: {
    alignItems: 'center',
    marginTop: 32,
  },
  appName: {
    fontSize: 15,
    fontWeight: '700',
  },
  appVersion: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  appCopyright: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  bottomSpacer: {
    height: 20,
  },
});
