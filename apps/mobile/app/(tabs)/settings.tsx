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

const COLORS = {
  primary: '#6366F1',
  bg: '#FAFAFA',
  surface: '#FFFFFF',
  text: '#111',
  textSecondary: '#666',
};

export default function SettingsScreen() {
  const [pushNotifications, setPushNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [billReminders, setBillReminders] = useState(true);
  const [taskReminders, setTaskReminders] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      {/* Profile Section */}
      <View style={styles.section}>
        <View style={styles.profileCard}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>AJ</Text>
          </View>
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
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Push Notifications</Text>
              <Text style={styles.settingDesc}>Receive push alerts on your device</Text>
            </View>
            <Switch
              value={pushNotifications}
              onValueChange={setPushNotifications}
              trackColor={{ false: '#E5E7EB', true: COLORS.primary + '60' }}
              thumbColor={pushNotifications ? COLORS.primary : '#F4F4F5'}
              ios_backgroundColor="#E5E7EB"
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Email Notifications</Text>
              <Text style={styles.settingDesc}>Get updates via email</Text>
            </View>
            <Switch
              value={emailNotifications}
              onValueChange={setEmailNotifications}
              trackColor={{ false: '#E5E7EB', true: COLORS.primary + '60' }}
              thumbColor={emailNotifications ? COLORS.primary : '#F4F4F5'}
              ios_backgroundColor="#E5E7EB"
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Bill Reminders</Text>
              <Text style={styles.settingDesc}>Get notified before bills are due</Text>
            </View>
            <Switch
              value={billReminders}
              onValueChange={setBillReminders}
              trackColor={{ false: '#E5E7EB', true: COLORS.primary + '60' }}
              thumbColor={billReminders ? COLORS.primary : '#F4F4F5'}
              ios_backgroundColor="#E5E7EB"
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Task Reminders</Text>
              <Text style={styles.settingDesc}>Reminders for upcoming tasks</Text>
            </View>
            <Switch
              value={taskReminders}
              onValueChange={setTaskReminders}
              trackColor={{ false: '#E5E7EB', true: COLORS.primary + '60' }}
              thumbColor={taskReminders ? COLORS.primary : '#F4F4F5'}
              ios_backgroundColor="#E5E7EB"
            />
          </View>
        </View>
      </View>

      {/* Appearance */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Appearance</Text>
        <View style={styles.card}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Dark Mode</Text>
              <Text style={styles.settingDesc}>Switch to dark theme</Text>
            </View>
            <Switch
              value={darkMode}
              onValueChange={setDarkMode}
              trackColor={{ false: '#E5E7EB', true: COLORS.primary + '60' }}
              thumbColor={darkMode ? COLORS.primary : '#F4F4F5'}
              ios_backgroundColor="#E5E7EB"
            />
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
                  <Text style={styles.freeBadgeText}>FREE</Text>
                </View>
              </View>
              <Text style={styles.settingDesc}>
                Basic features with limited AI usage
              </Text>
            </View>
          </View>
          <TouchableOpacity style={styles.upgradeButton} activeOpacity={0.7}>
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
            <Text style={styles.aboutValue}>2026.03.15</Text>
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
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 48,
    paddingBottom: 16,
    backgroundColor: COLORS.surface,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.text,
  },
  section: {
    paddingHorizontal: 16,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
    paddingLeft: 4,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  profileAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  profileAvatarText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '700',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  profileEmail: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  editLink: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
  },
  settingDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginHorizontal: 16,
  },
  planRow: {
    padding: 16,
    paddingBottom: 12,
  },
  planLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  freeBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  freeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#16A34A',
  },
  upgradeButton: {
    backgroundColor: COLORS.primary,
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  upgradeButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  aboutLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
  },
  aboutValue: {
    fontSize: 15,
    color: COLORS.textSecondary,
  },
  chevron: {
    fontSize: 22,
    color: COLORS.textSecondary,
    fontWeight: '300',
  },
  signOutButton: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#DC2626',
  },
  bottomSpacer: {
    height: 120,
  },
});
