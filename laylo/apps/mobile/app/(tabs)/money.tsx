/**
 * Money tab — Phase 3b hub screen.
 *
 * Bills/Subs, Transactions, and Banks live as stack screens at
 * /bills, /transactions, /banks. This hub is the single Money tab
 * destination — it links out to those screens with breathable cards
 * + an inline AskAi affordance per REDESIGN_BRIEF.md §3.3.
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
import { tokens, radius, spacing } from '../../src/lib/tokens';
import {
  AiBottomSheet,
  AskAiButton,
  useAiSheet,
} from '../../src/components/ai';
import { WalletIcon } from '../../src/components/icons/tab-icons';
import { HoneycombPattern } from '../../src/components/illustrations/honeycomb-pattern';
import { WobblePressable } from '../../src/components/motion/wobble-pressable';

type Hub = {
  id: string;
  title: string;
  description: string;
  href: string;
  glyph: string; // ascii / unicode glyph used inside the avatar
};

const HUBS: Hub[] = [
  {
    id: 'bills',
    title: 'Bills & Subs',
    description: 'Recurring outflows. See what is due this week.',
    href: '/bills',
    glyph: '$',
  },
  {
    id: 'transactions',
    title: 'Transactions',
    description: 'Recent activity across every connected account.',
    href: '/transactions',
    glyph: '#',
  },
  {
    id: 'banks',
    title: 'Connected Banks',
    description: 'Manage Plaid links + sync status.',
    href: '/banks',
    glyph: 'B',
  },
];

export default function MoneyTab() {
  const router = useRouter();
  const sheet = useAiSheet('Help me understand my money this month.');

  return (
    <View style={styles.container}>
      <HoneycombPattern />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>YOUR MONEY</Text>
            <Text style={styles.title}>Money</Text>
          </View>
          <AskAiButton
            variant="pill"
            label="Ask Beedo"
            onPress={() =>
              sheet.open('How am I doing on bills + subscriptions this month?')
            }
          />
        </View>

        {/* Hub cards */}
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

        {/* Footnote */}
        <View style={styles.footnote}>
          <WalletIcon color={tokens.textSubtle} size={18} />
          <Text style={styles.footnoteText}>
            Tip: long-press any card to ask Beedo about it.
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
