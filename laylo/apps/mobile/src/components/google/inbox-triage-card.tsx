/**
 * InboxTriageCard — Dashboard top-of-feed module.
 *
 * Shown when the user has linked Google + Gmail and the API returned
 * an `inboxTriage` payload on /api/google/status. Three bands:
 *
 *   1. Headline — "Five emails worth your eyes" (display type).
 *   2. Must act — max 5 cards (from / subject / why / Open link).
 *   3. FYI — collapsible expander.
 *   4. Noise count footer.
 *
 * Tapping "Open" launches the Gmail web URL via Linking.openURL().
 *
 * Mirror of the web component at
 * `apps/web/src/components/google/inbox-triage-card.tsx`. Keep the
 * heading + "FYI"/"Must act" labels in lockstep so the bee voice
 * sounds the same across surfaces.
 */
import React, { useMemo, useState } from 'react';
import {
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { radius, spacing, useTokens, type Tokens } from '../../lib/tokens';
import {
  gmailMessageUrl,
  type GoogleInboxTriage,
  type GoogleInboxTriageItem,
} from '../../lib/api/resources';

export interface InboxTriageCardProps {
  triage: GoogleInboxTriage;
}

export function InboxTriageCard({ triage }: InboxTriageCardProps) {
  const t = useTokens();
  const styles = useMemo(() => makeStyles(t), [t]);
  const [fyiOpen, setFyiOpen] = useState(false);

  const mustAct = triage.mustAct.slice(0, 5);
  const fyi = triage.fyi ?? [];
  const fyiCount = fyi.length;

  return (
    <View style={styles.card}>
      {/* Headline band */}
      <View style={styles.headerRow}>
        <View style={styles.envelope}>
          <Text style={styles.envelopeGlyph}>✉︎</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>INBOX TRIAGE</Text>
          <Text style={styles.headline}>{triage.headline}</Text>
        </View>
      </View>

      {/* Must act */}
      {mustAct.length > 0 && (
        <View style={styles.band}>
          <Text style={styles.bandTitle}>Must act</Text>
          {mustAct.map((item) => (
            <TriageItem key={item.id} item={item} styles={styles} />
          ))}
        </View>
      )}

      {/* FYI (collapsible) */}
      {fyiCount > 0 && (
        <View style={styles.band}>
          <Pressable
            onPress={() => setFyiOpen((v) => !v)}
            style={styles.bandHeaderPress}
            accessibilityRole="button"
            accessibilityState={{ expanded: fyiOpen }}
            accessibilityLabel={`FYI section, ${fyiCount} items, ${fyiOpen ? 'expanded' : 'collapsed'}`}
          >
            <Text style={styles.bandTitle}>FYI ({fyiCount})</Text>
            <Text style={styles.chevron}>{fyiOpen ? '▾' : '▸'}</Text>
          </Pressable>
          {fyiOpen &&
            fyi.map((item) => (
              <TriageItem
                key={item.id}
                item={item}
                styles={styles}
                muted
              />
            ))}
        </View>
      )}

      {/* Noise count */}
      {triage.noise > 0 && (
        <Text style={styles.noise}>
          {triage.noise} more emails ignored. Free as a bee.
        </Text>
      )}
    </View>
  );
}

function TriageItem({
  item,
  styles,
  muted = false,
}: {
  item: GoogleInboxTriageItem;
  styles: Styles;
  muted?: boolean;
}) {
  return (
    <View style={[styles.itemRow, muted && styles.itemRowMuted]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.itemFrom} numberOfLines={1}>
          {item.from}
        </Text>
        <Text style={styles.itemSubject} numberOfLines={2}>
          {item.subject}
        </Text>
        {item.why && (
          <Text style={styles.itemWhy} numberOfLines={2}>
            {item.why}
          </Text>
        )}
      </View>
      <Pressable
        style={styles.openButton}
        onPress={() => {
          // Mirror web — build the Gmail web URL from the externalId
          // server-side ids stay stable across both clients.
          void Linking.openURL(gmailMessageUrl(item.externalId));
        }}
        accessibilityRole="button"
        accessibilityLabel={`Open ${item.subject} in Gmail`}
      >
        <Text style={styles.openButtonText}>Open</Text>
      </Pressable>
    </View>
  );
}

function makeStyles(t: Tokens) {
  return StyleSheet.create({
    card: {
      backgroundColor: t.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: t.border,
      padding: spacing.lg,
      gap: spacing.lg,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    envelope: {
      width: 40,
      height: 40,
      borderRadius: radius.sm,
      backgroundColor: t.surface2,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: t.border,
    },
    envelopeGlyph: {
      fontSize: 20,
      color: t.text,
    },
    eyebrow: {
      fontSize: 11,
      lineHeight: 14,
      fontWeight: '600',
      color: t.textSubtle,
      letterSpacing: 1.2,
    },
    headline: {
      fontSize: 18,
      lineHeight: 24,
      fontWeight: '700',
      color: t.text,
      marginTop: 2,
    },
    band: {
      gap: spacing.sm,
    },
    bandTitle: {
      fontSize: 11,
      fontWeight: '700',
      color: t.textMuted,
      letterSpacing: 1.4,
      textTransform: 'uppercase',
    },
    bandHeaderPress: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    chevron: {
      fontSize: 14,
      color: t.textMuted,
      fontWeight: '600',
    },
    itemRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.md,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: radius.sm,
      backgroundColor: t.surface2,
      borderWidth: 1,
      borderColor: t.border,
    },
    itemRowMuted: {
      backgroundColor: 'transparent',
    },
    itemFrom: {
      fontSize: 12,
      fontWeight: '600',
      color: t.textMuted,
    },
    itemSubject: {
      marginTop: 2,
      fontSize: 14,
      fontWeight: '600',
      color: t.text,
      lineHeight: 18,
    },
    itemWhy: {
      marginTop: 4,
      fontSize: 12,
      color: t.textMuted,
      lineHeight: 16,
      fontStyle: 'italic',
    },
    openButton: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm - 2,
      borderRadius: radius.sm,
      backgroundColor: t.accent,
      alignSelf: 'flex-start',
    },
    openButtonText: {
      color: t.textOnAccent,
      fontSize: 12,
      fontWeight: '700',
    },
    noise: {
      fontSize: 12,
      color: t.textSubtle,
      fontStyle: 'italic',
      textAlign: 'center',
    },
  });
}

type Styles = ReturnType<typeof makeStyles>;
