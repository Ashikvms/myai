/**
 * GoogleConnectCard — Settings section.
 *
 * "Connect Google" CTA when unlinked; once linked it shows the
 * connected email, scope chips (Calendar / Gmail), last-synced
 * timestamps, per-source "Sync now" buttons, and a Disconnect
 * action behind an Alert confirm.
 *
 * Design language matches the rest of the Settings hub:
 *   - eyebrow label ("YOUR GOOGLE ACCOUNT")
 *   - card body on `surface` with 1 px `border`
 *   - primary CTAs paint `accent` with `textOnAccent` labels
 *   - scope chips use neutral `surface2` (we never paint small
 *     text in yellow per the brand contract)
 *
 * Web parity: mirrors the structure the web engineer is wiring
 * for `apps/web/src/components/google/google-connect-card.tsx`.
 * If web ships with a different chip layout, this file is the
 * single touch-point to mirror.
 */
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { radius, spacing, useTokens, type Tokens } from '../../lib/tokens';
import {
  getGoogleStatus,
  hasCalendarScope,
  hasGmailScope,
  syncGoogleCalendar,
  pollGmail,
  unlinkGoogle,
  type GoogleStatus,
} from '../../lib/api/resources';
import {
  runOAuthFlow,
  type GoogleOAuthState,
} from '../../lib/google-oauth';

type ScopeGroup = 'calendar' | 'gmail';
const SCOPE_GROUP_LABEL: Record<ScopeGroup, string> = {
  calendar: 'Calendar',
  gmail: 'Gmail',
};

function relativeTime(iso: string | null): string {
  if (!iso) return 'Never';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 'Never';
  const diffMs = Date.now() - then;
  const min = Math.round(diffMs / 60_000);
  if (min < 1) return 'Just now';
  if (min < 60) return `${min} min ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} hour${hr === 1 ? '' : 's'} ago`;
  const day = Math.round(hr / 24);
  if (day < 7) return `${day} day${day === 1 ? '' : 's'} ago`;
  return new Date(iso).toLocaleDateString();
}

export function GoogleConnectCard() {
  const t = useTokens();
  const styles = useMemo(() => makeStyles(t), [t]);
  const queryClient = useQueryClient();
  const [oauthState, setOauthState] = useState<GoogleOAuthState>({
    kind: 'idle',
  });

  const statusQuery = useQuery<GoogleStatus>({
    queryKey: ['google', 'status'],
    queryFn: getGoogleStatus,
    // Backend may not exist yet during early integration — fail soft
    // so the card still renders the "Connect" CTA.
    retry: false,
  });

  const status = statusQuery.data;

  const syncCalendarMutation = useMutation({
    mutationFn: syncGoogleCalendar,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['google', 'status'] });
      queryClient.invalidateQueries({ queryKey: ['google', 'calendar'] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
    onError: () => Alert.alert('Hmm, sync stalled. Try again?'),
  });

  const pollGmailMutation = useMutation({
    mutationFn: pollGmail,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['google', 'status'] });
      queryClient.invalidateQueries({ queryKey: ['google', 'gmail'] });
      queryClient.invalidateQueries({ queryKey: ['bills'] });
    },
    onError: () => Alert.alert('Hmm, sync stalled. Try again?'),
  });

  const unlinkMutation = useMutation({
    mutationFn: unlinkGoogle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['google'] });
    },
    onError: () =>
      Alert.alert("Hmm, couldn't disconnect. Try again?"),
  });

  const handleConnect = async () => {
    try {
      await runOAuthFlow(setOauthState);
      queryClient.invalidateQueries({ queryKey: ['google'] });
    } catch {
      // runOAuthFlow already pushed an error state — nothing else
      // to do; the toast/banner inside the card surfaces it.
    }
  };

  const handleDisconnect = () => {
    Alert.alert(
      'Disconnect Google?',
      'BillBee will stop syncing your calendar and inbox. You can reconnect anytime.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: () => unlinkMutation.mutate(),
        },
      ],
    );
  };

  const connectBusy =
    oauthState.kind === 'starting' ||
    oauthState.kind === 'awaiting_callback' ||
    oauthState.kind === 'exchanging';
  const connectLabel = (() => {
    switch (oauthState.kind) {
      case 'starting':
        return 'Opening Google…';
      case 'awaiting_callback':
        return 'Waiting for sign-in…';
      case 'exchanging':
        return 'Finishing up…';
      default:
        return 'Connect Google';
    }
  })();

  // Loading skeleton for the first paint — keep it cheap.
  if (statusQuery.isLoading) {
    return (
      <View style={styles.card}>
        <ActivityIndicator color={t.accent} />
        <Text style={styles.helperText}>Checking your Google link…</Text>
      </View>
    );
  }

  const linked = status?.linked === true;
  const scopes = status?.scopes ?? [];
  const calendarGranted = hasCalendarScope(scopes);
  const gmailGranted = hasGmailScope(scopes);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.headerIcon} accessibilityLabel="Google logo">
          <Text style={styles.headerIconText}>G</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Google Account</Text>
          <Text style={styles.subtitle}>
            {linked
              ? 'Calendar + inbox syncing into the hive.'
              : 'Let BillBee see your calendar and bill emails.'}
          </Text>
        </View>
      </View>

      {!linked ? (
        <>
          <TouchableOpacity
            style={[styles.primaryButton, connectBusy && { opacity: 0.7 }]}
            onPress={handleConnect}
            disabled={connectBusy}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Connect Google"
          >
            {connectBusy ? (
              <ActivityIndicator color={t.textOnAccent} />
            ) : (
              <Text style={styles.primaryButtonText}>{connectLabel}</Text>
            )}
          </TouchableOpacity>
          {oauthState.kind === 'error' && (
            <Text style={styles.errorText}>{oauthState.message}</Text>
          )}
          <Text style={styles.disclaimer}>
            Your messages never leave the hive. Tokens stay encrypted.
          </Text>
        </>
      ) : (
        <>
          {/* Connected identity */}
          <View style={styles.identityRow}>
            <View style={styles.checkBadge}>
              <Text style={styles.checkBadgeText}>✓</Text>
            </View>
            <Text
              style={styles.identityEmail}
              numberOfLines={1}
              ellipsizeMode="middle"
            >
              {status?.googleEmail ?? 'Connected'}
            </Text>
          </View>

          {/* Scope chips */}
          <View style={styles.chipsRow}>
            {(['calendar', 'gmail'] as ScopeGroup[]).map((group) => {
              const granted =
                group === 'calendar' ? calendarGranted : gmailGranted;
              return (
                <View
                  key={group}
                  style={[
                    styles.chip,
                    granted ? styles.chipOn : styles.chipOff,
                  ]}
                  accessibilityLabel={`${SCOPE_GROUP_LABEL[group]} ${granted ? 'connected' : 'not connected'}`}
                >
                  <View
                    style={[
                      styles.chipDot,
                      { backgroundColor: granted ? t.success : t.textSubtle },
                    ]}
                  />
                  <Text style={styles.chipText}>
                    {SCOPE_GROUP_LABEL[group]}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Last-synced timestamps + per-source sync buttons */}
          <View style={styles.syncRow}>
            <View style={styles.syncInfo}>
              <Text style={styles.syncLabel}>Calendar</Text>
              <Text style={styles.syncTime}>
                {relativeTime(status?.calendarLastSyncedAt ?? null)}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.syncButton}
              onPress={() => syncCalendarMutation.mutate()}
              disabled={syncCalendarMutation.isPending || !calendarGranted}
              activeOpacity={0.8}
            >
              {syncCalendarMutation.isPending ? (
                <ActivityIndicator color={t.text} size="small" />
              ) : (
                <Text style={styles.syncButtonText}>Sync now</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          <View style={styles.syncRow}>
            <View style={styles.syncInfo}>
              <Text style={styles.syncLabel}>Gmail</Text>
              <Text style={styles.syncTime}>
                {relativeTime(status?.gmailLastPolledAt ?? null)}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.syncButton}
              onPress={() => pollGmailMutation.mutate()}
              disabled={pollGmailMutation.isPending || !gmailGranted}
              activeOpacity={0.8}
            >
              {pollGmailMutation.isPending ? (
                <ActivityIndicator color={t.text} size="small" />
              ) : (
                <Text style={styles.syncButtonText}>Sync now</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Disconnect */}
          <TouchableOpacity
            style={styles.disconnectButton}
            onPress={handleDisconnect}
            disabled={unlinkMutation.isPending}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Disconnect Google"
          >
            {unlinkMutation.isPending ? (
              <ActivityIndicator color={t.danger} size="small" />
            ) : (
              <Text style={styles.disconnectText}>Disconnect Google</Text>
            )}
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

function makeStyles(t: Tokens) {
  return StyleSheet.create({
    card: {
      backgroundColor: t.surface,
      borderRadius: radius.md,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: t.border,
      gap: spacing.md,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    headerIcon: {
      width: 44,
      height: 44,
      borderRadius: radius.sm,
      backgroundColor: t.surface2,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: t.border,
    },
    headerIconText: {
      fontSize: 22,
      fontWeight: '700',
      color: t.text,
    },
    title: {
      fontSize: 16,
      fontWeight: '600',
      color: t.text,
    },
    subtitle: {
      marginTop: 2,
      fontSize: 13,
      color: t.textMuted,
      lineHeight: 18,
    },
    primaryButton: {
      backgroundColor: t.accent,
      paddingVertical: spacing.md + 2,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: spacing.sm,
    },
    primaryButtonText: {
      color: t.textOnAccent,
      fontSize: 15,
      fontWeight: '700',
    },
    disclaimer: {
      marginTop: spacing.xs,
      fontSize: 11,
      color: t.textSubtle,
      textAlign: 'center',
      lineHeight: 14,
    },
    helperText: {
      marginTop: spacing.sm,
      fontSize: 13,
      color: t.textMuted,
      textAlign: 'center',
    },
    errorText: {
      marginTop: spacing.sm,
      fontSize: 13,
      color: t.danger,
      textAlign: 'center',
      fontWeight: '500',
    },
    identityRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.xs,
    },
    checkBadge: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: t.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkBadgeText: {
      color: t.textOnAccent,
      fontSize: 13,
      fontWeight: '700',
    },
    identityEmail: {
      flex: 1,
      fontSize: 14,
      fontWeight: '600',
      color: t.text,
    },
    chipsRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      flexWrap: 'wrap',
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs + 2,
      paddingHorizontal: spacing.md - 2,
      paddingVertical: 6,
      borderRadius: radius.sm,
      borderWidth: 1,
    },
    chipOn: {
      backgroundColor: t.surface2,
      borderColor: t.borderStrong,
    },
    chipOff: {
      backgroundColor: 'transparent',
      borderColor: t.border,
    },
    chipDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    chipText: {
      fontSize: 12,
      fontWeight: '600',
      color: t.text,
    },
    syncRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    syncInfo: {
      flex: 1,
    },
    syncLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: t.text,
    },
    syncTime: {
      marginTop: 2,
      fontSize: 11,
      color: t.textSubtle,
      fontWeight: '500',
    },
    syncButton: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.sm,
      backgroundColor: t.surface2,
      borderWidth: 1,
      borderColor: t.border,
      minWidth: 84,
      alignItems: 'center',
    },
    syncButtonText: {
      fontSize: 12,
      fontWeight: '700',
      color: t.text,
    },
    divider: {
      height: 1,
      backgroundColor: t.border,
    },
    disconnectButton: {
      marginTop: spacing.sm,
      paddingVertical: spacing.md,
      borderRadius: radius.md,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: t.border,
      backgroundColor: 'transparent',
    },
    disconnectText: {
      fontSize: 13,
      fontWeight: '700',
      color: t.danger,
    },
  });
}
