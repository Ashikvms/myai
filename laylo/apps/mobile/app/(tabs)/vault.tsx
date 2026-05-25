/**
 * Vault tab — Phase 3b hub screen.
 *
 * Documents, Reminders, and Appointments live as stack/tab screens
 * elsewhere. Vault is the umbrella destination — same hub-card
 * pattern as Money, plus an AskAi affordance.
 */
import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { tokens, radius, spacing } from '../../src/lib/tokens';
import {
  AiBottomSheet,
  AskAiButton,
  useAiSheet,
} from '../../src/components/ai';
import { ArchiveIcon } from '../../src/components/icons/tab-icons';
import { HoneycombPattern } from '../../src/components/illustrations/honeycomb-pattern';
import { WobblePressable } from '../../src/components/motion/wobble-pressable';
import { getDashboard } from '../../src/lib/api/resources';

type Hub = {
  id: string;
  title: string;
  description: string;
  href: string;
  glyph: string;
};

export default function VaultTab() {
  const router = useRouter();
  const sheet = useAiSheet('Help me find a document.');
  const dashboardQuery = useQuery({
    queryKey: ['dashboard'],
    queryFn: getDashboard,
  });

  const data = dashboardQuery.data;
  const recentDocs = data?.recentDocuments?.length ?? 0;
  const upcomingAppts = data?.upcomingAppointments?.length ?? 0;
  const pendingReminders = data?.pendingReminders ?? 0;

  const HUBS: Hub[] = [
    {
      id: 'documents',
      title: 'Documents',
      description: dashboardQuery.isLoading
        ? 'Loading the hive…'
        : recentDocs > 0
          ? `${recentDocs} recent document${recentDocs === 1 ? '' : 's'}`
          : 'Tax forms, IDs, contracts. Drop a file in.',
      href: '/(tabs)/documents',
      glyph: 'D',
    },
    {
      id: 'appointments',
      title: 'Appointments',
      description: dashboardQuery.isLoading
        ? 'Loading the hive…'
        : upcomingAppts > 0
          ? `${upcomingAppts} upcoming`
          : 'Upcoming visits, calls, and meetings.',
      href: '/appointments',
      glyph: 'A',
    },
    {
      id: 'reminders',
      title: 'Reminders',
      description: dashboardQuery.isLoading
        ? 'Loading the hive…'
        : pendingReminders > 0
          ? `${pendingReminders} pending`
          : 'Things BillBee will buzz you about.',
      href: '/reminders',
      glyph: 'R',
    },
  ];

  return (
    <View style={styles.container}>
      <HoneycombPattern />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>YOUR VAULT</Text>
            <Text style={styles.title}>Vault</Text>
          </View>
          <AskAiButton
            variant="pill"
            label="Ask BillBee"
            onPress={() =>
              sheet.open('Find me the document I need for my next appointment.')
            }
          />
        </View>

        <View style={styles.hubList}>
          {HUBS.map((h) => (
            <WobblePressable
              key={h.id}
              style={styles.hubCard}
              flourish
              onPress={() => router.push(h.href as never)}
              onLongPress={() =>
                sheet.open(`Tell me about my ${h.title.toLowerCase()}.`)
              }
            >
              <View style={styles.hubInner}>
                <View style={styles.hubLeft}>
                  <View style={styles.hubAvatar}>
                    <Text style={styles.hubAvatarText}>{h.glyph}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.hubTitle}>{h.title}</Text>
                    <Text style={styles.hubDesc}>{h.description}</Text>
                  </View>
                </View>
                <View style={styles.hubRight}>
                  <AskAiButton
                    variant="icon"
                    onPress={() =>
                      sheet.open(`Tell me about my ${h.title.toLowerCase()}.`)
                    }
                  />
                  <Text style={styles.chevron}>›</Text>
                </View>
              </View>
            </WobblePressable>
          ))}
        </View>

        <View style={styles.footnote}>
          <ArchiveIcon color={tokens.textSubtle} size={18} />
          <Text style={styles.footnoteText}>
            Tip: long-press any card to ask BillBee about it.
          </Text>
        </View>
      </ScrollView>

      <AiBottomSheet
        visible={sheet.visible}
        onClose={sheet.close}
        initialPrompt={sheet.prompt}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: tokens.bg },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: Platform.OS === 'ios' ? 60 : 44,
    paddingBottom: 120,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: spacing.xxl,
  },
  eyebrow: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
    color: tokens.textSubtle,
    letterSpacing: 1.4,
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '700',
    color: tokens.text,
  },
  hubList: {
    gap: spacing.md,
  },
  hubCard: {
    backgroundColor: tokens.surface,
    borderRadius: radius.md,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: tokens.border,
    overflow: 'hidden',
  },
  hubInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  hubLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    flex: 1,
  },
  hubAvatar: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: tokens.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hubAvatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: tokens.text,
  },
  hubTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
    color: tokens.text,
  },
  hubDesc: {
    marginTop: spacing.xs,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    color: tokens.textMuted,
  },
  hubRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  chevron: {
    fontSize: 22,
    color: tokens.textSubtle,
    fontWeight: '300',
  },
  footnote: {
    marginTop: spacing.xxl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  footnoteText: {
    fontSize: 13,
    color: tokens.textSubtle,
    fontWeight: '500',
  },
});
