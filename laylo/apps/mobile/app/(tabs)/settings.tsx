/**
 * Settings tab — Phase 3b restyle.
 *
 * Black + gold tokens. Switches, plan card, and CTA all consume the
 * shared token table. Sign-out keeps the danger semantic.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Switch,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { tokens, radius, spacing } from '../../src/lib/tokens';
import { AvatarBadge } from '../../src/components/icons/tab-icons';

export default function SettingsScreen() {
  const [pushNotifications, setPushNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [billReminders, setBillReminders] = useState(true);
  const [taskReminders, setTaskReminders] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  const switchProps = (value: boolean) => ({
    trackColor: { false: tokens.border, true: tokens.accent },
    thumbColor: value ? '#FFFFFF' : tokens.surface2,
    ios_backgroundColor: tokens.border,
  });

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.eyebrow}>YOUR ACCOUNT</Text>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      {/* Profile */}
      <View style={styles.section}>
        <View style={styles.profileCard}>
          <AvatarBadge initials="AJ" size={56} bg={tokens.surface2} textColor={tokens.text} />
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>Alex Johnson</Text>
            <Text style={styles.profileEmail}>alex.johnson@email.com</Text>
          </View>
          <TouchableOpacity activeOpacity={0.7}>
            <Text style={styles.editLink}>Edit</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Notifications */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        <View style={styles.card}>
          <Row
            label="Push Notifications"
            desc="Receive push alerts on your device"
            value={pushNotifications}
            onChange={setPushNotifications}
            switchProps={switchProps}
            divider
          />
          <Row
            label="Email Notifications"
            desc="Get updates via email"
            value={emailNotifications}
            onChange={setEmailNotifications}
            switchProps={switchProps}
            divider
          />
          <Row
            label="Bill Reminders"
            desc="Get notified before bills are due"
            value={billReminders}
            onChange={setBillReminders}
            switchProps={switchProps}
            divider
          />
          <Row
            label="Task Reminders"
            desc="Reminders for upcoming tasks"
            value={taskReminders}
            onChange={setTaskReminders}
            switchProps={switchProps}
          />
        </View>
      </View>

      {/* Appearance */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Appearance</Text>
        <View style={styles.card}>
          <Row
            label="Dark Mode"
            desc="Switch to dark theme"
            value={darkMode}
            onChange={setDarkMode}
            switchProps={switchProps}
          />
        </View>
      </View>

      {/* Plan */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Subscription</Text>
        <View style={styles.card}>
          <View style={styles.planRow}>
            <View>
              <View style={styles.planLabelRow}>
                <Text style={styles.settingLabel}>Current Plan</Text>
                <View style={styles.freeBadge}>
                  <Text style={styles.freeBadgeText}>FREE</Text>
                </View>
              </View>
              <Text style={styles.settingDesc}>
                Basic features with limited AI usage.
              </Text>
            </View>
          </View>
          <TouchableOpacity style={styles.upgradeButton} activeOpacity={0.85}>
            <Text style={styles.upgradeButtonText}>Upgrade to Pro</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* About */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.card}>
          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>Version</Text>
            <Text style={styles.aboutValue}>1.0.0</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>Build</Text>
            <Text style={styles.aboutValue}>2026.04.28</Text>
          </View>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.aboutRow} activeOpacity={0.7}>
            <Text style={styles.aboutLabel}>Terms of Service</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.aboutRow} activeOpacity={0.7}>
            <Text style={styles.aboutLabel}>Privacy Policy</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Sign Out */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.signOutButton} activeOpacity={0.7}>
          <Text style={styles.signOutText}>Sign out of the hive</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

function Row({
  label,
  desc,
  value,
  onChange,
  switchProps,
  divider = false,
}: {
  label: string;
  desc: string;
  value: boolean;
  onChange: (b: boolean) => void;
  switchProps: (v: boolean) => Record<string, unknown>;
  divider?: boolean;
}) {
  return (
    <>
      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingLabel}>{label}</Text>
          <Text style={styles.settingDesc}>{desc}</Text>
        </View>
        <Switch value={value} onValueChange={onChange} {...switchProps(value)} />
      </View>
      {divider && <View style={styles.divider} />}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.bg,
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: Platform.OS === 'ios' ? 60 : 48,
    paddingBottom: spacing.lg,
  },
  eyebrow: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
    color: tokens.textSubtle,
    letterSpacing: 1.4,
    marginBottom: spacing.xs,
  },
  headerTitle: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '700',
    color: tokens.text,
  },
  section: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
  },
  sectionTitle: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
    color: tokens.textSubtle,
    textTransform: 'uppercase',
    letterSpacing: 1.4,
    marginBottom: spacing.md - 2,
    paddingLeft: spacing.xs,
  },
  card: {
    backgroundColor: tokens.surface,
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: tokens.border,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tokens.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: tokens.border,
    gap: spacing.md,
  },
  profileInfo: { flex: 1 },
  profileName: {
    fontSize: 16,
    fontWeight: '600',
    color: tokens.text,
  },
  profileEmail: {
    fontSize: 13,
    color: tokens.textMuted,
    marginTop: 2,
  },
  editLink: {
    fontSize: 13,
    fontWeight: '600',
    color: tokens.text,
    textDecorationLine: 'underline',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
  },
  settingInfo: {
    flex: 1,
    marginRight: spacing.lg,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: tokens.text,
  },
  settingDesc: {
    fontSize: 13,
    color: tokens.textMuted,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: tokens.border,
    marginHorizontal: spacing.lg,
  },
  planRow: {
    padding: spacing.lg,
    paddingBottom: spacing.md,
  },
  planLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md - 2,
    marginBottom: spacing.xs,
  },
  freeBadge: {
    backgroundColor: tokens.surface2,
    paddingHorizontal: spacing.md - 2,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  freeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: tokens.text,
    letterSpacing: 0.6,
  },
  upgradeButton: {
    backgroundColor: tokens.accent,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    paddingVertical: spacing.md + 2,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  upgradeButtonText: {
    color: tokens.textOnAccent,
    fontSize: 15,
    fontWeight: '700',
  },
  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
  },
  aboutLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: tokens.text,
  },
  aboutValue: {
    fontSize: 13,
    color: tokens.textMuted,
  },
  chevron: {
    fontSize: 22,
    color: tokens.textSubtle,
    fontWeight: '300',
  },
  signOutButton: {
    backgroundColor: tokens.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: tokens.border,
  },
  signOutText: {
    fontSize: 15,
    fontWeight: '600',
    color: tokens.danger,
  },
  bottomSpacer: {
    height: 120,
  },
});
