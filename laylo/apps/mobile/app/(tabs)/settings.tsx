/**
 * Settings tab — Phase 3b restyle.
 *
 * Black + gold tokens. Switches, plan card, and CTA all consume the
 * shared token table. Sign-out keeps the danger semantic.
 */
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Switch,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useTokens, type Tokens, radius, spacing } from '../../src/lib/tokens';
import { AvatarBadge } from '../../src/components/icons/tab-icons';
import { useAuth } from '../../src/context/auth';
import { useTheme } from '../../src/context/theme';
import type { ThemeMode } from '../../src/lib/theme-mode';
import { GradientPill, GRADIENT_PALETTES } from '../../src/components/ui/gradient-pill';

const THEME_OPTIONS: ReadonlyArray<{
  value: ThemeMode;
  label: string;
  icon: string;
}> = [
  { value: 'light', label: 'Light', icon: '☀️' },
  { value: 'dark', label: 'Dark', icon: '🌑' },
  { value: 'system', label: 'System', icon: '📱' },
];

function initialsFromName(name: string | null | undefined): string {
  if (!name) return '··';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '··';
  if (parts.length === 1) return (parts[0]?.slice(0, 2) ?? '··').toUpperCase();
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
}

export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  const { mode: themeMode, setMode: setThemeMode } = useTheme();
  const t = useTokens();
  const styles = useMemo(() => makeStyles(t), [t]);
  const [signingOut, setSigningOut] = useState(false);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [billReminders, setBillReminders] = useState(true);
  const [taskReminders, setTaskReminders] = useState(true);

  const handleSignOut = () => {
    Alert.alert(
      'Sign out of the hive?',
      "You'll need to sign back in to see your stuff.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign out',
          style: 'destructive',
          onPress: async () => {
            setSigningOut(true);
            try {
              await logout();
              queryClient.clear();
            } finally {
              setSigningOut(false);
            }
          },
        },
      ],
    );
  };

  const planLabel = (user?.plan ?? 'FREE').toUpperCase();
  const isPro = planLabel === 'PRO';

  const switchProps = (value: boolean) => ({
    trackColor: { false: t.border, true: t.accent },
    thumbColor: value ? '#FFFFFF' : t.surface2,
    ios_backgroundColor: t.border,
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
          <AvatarBadge
            initials={initialsFromName(user?.name)}
            size={56}
            bg={t.surface2}
            textColor={t.text}
          />
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.name ?? 'Signed in'}</Text>
            <Text style={styles.profileEmail}>{user?.email ?? ''}</Text>
          </View>
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
            styles={styles}
          />
          <Row
            label="Email Notifications"
            desc="Get updates via email"
            value={emailNotifications}
            onChange={setEmailNotifications}
            switchProps={switchProps}
            divider
            styles={styles}
          />
          <Row
            label="Bill Reminders"
            desc="Get notified before bills are due"
            value={billReminders}
            onChange={setBillReminders}
            switchProps={switchProps}
            divider
            styles={styles}
          />
          <Row
            label="Task Reminders"
            desc="Reminders for upcoming tasks"
            value={taskReminders}
            onChange={setTaskReminders}
            switchProps={switchProps}
            styles={styles}
          />
        </View>
      </View>

      {/* Appearance */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Appearance</Text>
        <View style={styles.card}>
          <View style={styles.themeRow}>
            <View style={styles.themeInfo}>
              <Text style={styles.settingLabel}>Theme</Text>
              <Text style={styles.settingDesc}>
                Yellow canvas or black canvas — your call.
              </Text>
            </View>
            <View
              style={styles.themeToggleContainer}
              accessibilityRole="radiogroup"
              accessibilityLabel="Theme"
            >
              {THEME_OPTIONS.map((opt) => {
                const active = themeMode === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={styles.themeTab}
                    onPress={() => setThemeMode(opt.value)}
                    activeOpacity={0.85}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={opt.label}
                  >
                    {active && (
                      <GradientPill
                        colors={GRADIENT_PALETTES.blackSheen}
                        direction="diagonal"
                        borderRadius={radius.sm - 2}
                        style={styles.themeTabActiveFill}
                      />
                    )}
                    <Text
                      style={[
                        styles.themeTabText,
                        active && styles.themeTabTextActive,
                      ]}
                    >
                      {opt.icon} {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
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
                  <Text style={styles.freeBadgeText}>{planLabel}</Text>
                </View>
              </View>
              <Text style={styles.settingDesc}>
                {isPro
                  ? 'Full hive access — unlimited AI.'
                  : 'Basic features with limited AI usage.'}
              </Text>
            </View>
          </View>
          {!isPro && (
            <TouchableOpacity style={styles.upgradeButton} activeOpacity={0.85}>
              <Text style={styles.upgradeButtonText}>Upgrade to Pro</Text>
            </TouchableOpacity>
          )}
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
        <TouchableOpacity
          style={styles.signOutButton}
          activeOpacity={0.7}
          onPress={handleSignOut}
          disabled={signingOut}
        >
          {signingOut ? (
            <ActivityIndicator color={t.danger} />
          ) : (
            <Text style={styles.signOutText}>Sign out of the hive</Text>
          )}
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
  styles,
}: {
  label: string;
  desc: string;
  value: boolean;
  onChange: (b: boolean) => void;
  switchProps: (v: boolean) => Record<string, unknown>;
  divider?: boolean;
  styles: Styles;
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

function makeStyles(t: Tokens) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: t.bg,
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
      color: t.textSubtle,
      letterSpacing: 1.4,
      marginBottom: spacing.xs,
    },
    headerTitle: {
      fontSize: 32,
      lineHeight: 40,
      fontWeight: '700',
      color: t.text,
    },
    section: {
      paddingHorizontal: spacing.lg,
      marginTop: spacing.xl,
    },
    sectionTitle: {
      fontSize: 11,
      lineHeight: 14,
      fontWeight: '600',
      color: t.textSubtle,
      textTransform: 'uppercase',
      letterSpacing: 1.4,
      marginBottom: spacing.md - 2,
      paddingLeft: spacing.xs,
    },
    card: {
      backgroundColor: t.surface,
      borderRadius: radius.md,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: t.border,
    },
    profileCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: t.surface,
      borderRadius: radius.md,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: t.border,
      gap: spacing.md,
    },
    profileInfo: { flex: 1 },
    profileName: {
      fontSize: 16,
      fontWeight: '600',
      color: t.text,
    },
    profileEmail: {
      fontSize: 13,
      color: t.textMuted,
      marginTop: 2,
    },
    editLink: {
      fontSize: 13,
      fontWeight: '600',
      color: t.text,
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
      color: t.text,
    },
    settingDesc: {
      fontSize: 13,
      color: t.textMuted,
      marginTop: 2,
    },
    divider: {
      height: 1,
      backgroundColor: t.border,
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
      backgroundColor: t.surface2,
      paddingHorizontal: spacing.md - 2,
      paddingVertical: 3,
      borderRadius: radius.sm,
    },
    freeBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      color: t.text,
      letterSpacing: 0.6,
    },
    upgradeButton: {
      backgroundColor: t.accent,
      marginHorizontal: spacing.lg,
      marginBottom: spacing.lg,
      paddingVertical: spacing.md + 2,
      borderRadius: radius.md,
      alignItems: 'center',
    },
    upgradeButtonText: {
      color: t.textOnAccent,
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
      color: t.text,
    },
    aboutValue: {
      fontSize: 13,
      color: t.textMuted,
    },
    chevron: {
      fontSize: 22,
      color: t.textSubtle,
      fontWeight: '300',
    },
    signOutButton: {
      backgroundColor: t.surface,
      borderRadius: radius.md,
      padding: spacing.lg,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: t.border,
    },
    signOutText: {
      fontSize: 15,
      fontWeight: '600',
      color: t.danger,
    },
    bottomSpacer: {
      height: 120,
    },
    // Appearance / theme toggle — borrows the segmented control look from
    // `app/auth.tsx` (tabContainer + tabActive) so the control feels
    // native to the app's existing style language.
    themeRow: {
      padding: spacing.lg,
      gap: spacing.md,
    },
    themeInfo: {
      flex: 0,
    },
    themeToggleContainer: {
      flexDirection: 'row',
      backgroundColor: t.surface2,
      borderRadius: radius.sm,
      padding: 4,
    },
    themeTab: {
      flex: 1,
      paddingVertical: spacing.sm + 2,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.sm - 2,
      overflow: 'hidden',
    },
    // Gradient fill underlay for the active option (replaces the previous
    // flat `themeTabActive` background). Same treatment as the auth tab
    // toggle so the two segment selectors feel like one design system.
    themeTabActiveFill: {
      ...StyleSheet.absoluteFillObject,
    },
    themeTabText: {
      fontSize: 13,
      fontWeight: '600',
      color: t.textMuted,
    },
    themeTabTextActive: {
      color: t.textOnAccent,
    },
  });
}

type Styles = ReturnType<typeof makeStyles>;
