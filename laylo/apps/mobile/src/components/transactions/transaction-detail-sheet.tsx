/**
 * TransactionDetailSheet — Item 28 Phase 3b mobile.
 *
 * Bottom sheet that slides up from the screen edge to ~85% height when a
 * transaction row is tapped. Mirrors the 10-card layout the web client
 * surfaces for the same backend contract:
 *
 *   GET   /api/transactions/:id
 *   PATCH /api/transactions/:id/note
 *   POST  /api/ai/explain-transaction/:id
 *
 * Reuses the same Reanimated v3 primitives as `ai-bottom-sheet.tsx`
 * (translateY + backdrop opacity, Easing.out(Easing.cubic) per
 * DESIGN_SYSTEM.md §6.2 #7 / §6.7) and respects useReducedMotion(). No
 * third-party sheet library — react-native Modal is the host.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  BackHandler,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { tokens, radius, spacing } from '../../lib/tokens';
import { SparkleIcon } from '../ai/sparkle-icon';
import {
  explainTransaction,
  getTransactionDetail,
  updateTransactionNote,
} from '../../lib/api/transactions';
import type {
  TransactionDetail,
  TransactionDetailResponse,
  TransactionPattern,
} from '../../lib/api/types';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
// Sheet snaps to ~85% of the screen height.
const SHEET_HEIGHT = Math.round(SCREEN_HEIGHT * 0.85);

export type TransactionDetailSheetProps = {
  /** Selected transaction id; null means the sheet is closed. */
  transactionId: string | null;
  onClose: () => void;
};

export function TransactionDetailSheet({
  transactionId,
  onClose,
}: TransactionDetailSheetProps) {
  const reduceMotion = useReducedMotion();
  const visible = transactionId !== null;

  const translateY = useSharedValue(SHEET_HEIGHT);
  const backdropOpacity = useSharedValue(0);

  // Server state.
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [detail, setDetail] = useState<TransactionDetail | null>(null);
  const [pattern, setPattern] = useState<TransactionPattern | null>(null);

  // Note state.
  const [noteDraft, setNoteDraft] = useState('');
  const lastSavedNoteRef = useRef<string>('');
  const noteSavedRef = useRef<number>(0);
  const [savingNote, setSavingNote] = useState(false);
  const [noteSavedAt, setNoteSavedAt] = useState<number | null>(null);

  // Save indicator scale (spring 0 → 1).
  const savedScale = useSharedValue(0);
  const savedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: savedScale.value }],
    opacity: savedScale.value,
  }));

  // AI explainer state.
  const [explaining, setExplaining] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [explanationMock, setExplanationMock] = useState(false);

  // ── Sheet animation ────────────────────────────────────────────
  useEffect(() => {
    if (visible) {
      const duration = reduceMotion ? 0 : 320;
      translateY.value = withTiming(0, {
        duration,
        easing: Easing.out(Easing.cubic),
      });
      backdropOpacity.value = withTiming(0.6, {
        duration,
        easing: Easing.out(Easing.cubic),
      });
    } else {
      const duration = reduceMotion ? 0 : 220;
      translateY.value = withTiming(SHEET_HEIGHT, {
        duration,
        easing: Easing.in(Easing.cubic),
      });
      backdropOpacity.value = withTiming(0, {
        duration,
        easing: Easing.in(Easing.cubic),
      });
    }
  }, [visible, reduceMotion, translateY, backdropOpacity]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  // ── Hardware back (Android) closes the sheet ───────────────────
  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [visible, onClose]);

  // ── Load detail when a transaction is selected ─────────────────
  useEffect(() => {
    if (!transactionId) return;
    let cancelled = false;
    setLoading(true);
    setErrorMsg(null);
    setDetail(null);
    setPattern(null);
    setExplanation(null);
    setExplanationMock(false);
    setNoteSavedAt(null);

    getTransactionDetail(transactionId)
      .then((res: TransactionDetailResponse) => {
        if (cancelled) return;
        setDetail(res.transaction);
        setPattern(res.pattern);
        const initialNote = res.transaction.userNote ?? '';
        setNoteDraft(initialNote);
        lastSavedNoteRef.current = initialNote;
      })
      .catch((err) => {
        if (cancelled) return;
        const msg =
          err instanceof Error ? err.message : 'Could not load transaction';
        setErrorMsg(msg);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [transactionId]);

  // ── Note: save on blur, skip if unchanged ──────────────────────
  const handleNoteBlur = useCallback(async () => {
    if (!transactionId) return;
    const trimmed = noteDraft.trim();
    const lastTrimmed = lastSavedNoteRef.current.trim();
    if (trimmed === lastTrimmed) return;
    setSavingNote(true);
    try {
      const res = await updateTransactionNote(
        transactionId,
        trimmed.length > 0 ? trimmed : null,
      );
      lastSavedNoteRef.current = res.userNote ?? '';
      setNoteSavedAt(Date.now());
      // Spring the checkmark in, then fade out after 1.6s.
      const stamp = Date.now();
      savedScale.value = reduceMotion
        ? withTiming(1, { duration: 0 })
        : withSpring(1, { stiffness: 320, damping: 18 });
      setTimeout(() => {
        // Only fade out if no newer save kicked in.
        if (stamp === noteSavedRef.current) {
          savedScale.value = withTiming(0, { duration: 200 });
        }
      }, 1600);
      noteSavedRef.current = stamp;
    } catch {
      // Non-fatal; user can retry by editing again.
    } finally {
      setSavingNote(false);
    }
  }, [transactionId, noteDraft, reduceMotion, savedScale]);

  // ── AI Explain ─────────────────────────────────────────────────
  const handleExplain = useCallback(async () => {
    if (!transactionId || explaining) return;
    setExplaining(true);
    try {
      const res = await explainTransaction(transactionId);
      setExplanation(res.explanation);
      setExplanationMock(res.mock);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Could not generate explanation';
      setExplanation(msg);
      setExplanationMock(false);
    } finally {
      setExplaining(false);
    }
  }, [transactionId, explaining]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.root}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
          <Animated.View style={[styles.backdrop, backdropStyle]} />
        </Pressable>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.kavWrap}
          pointerEvents="box-none"
        >
          <Animated.View style={[styles.sheet, sheetStyle]}>
            {/* Drag handle */}
            <View style={styles.handle} />

            {loading && !detail ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator color={tokens.accent} />
                <Text style={styles.loadingText}>Loading transaction…</Text>
              </View>
            ) : errorMsg && !detail ? (
              <View style={styles.loadingWrap}>
                <Text style={styles.errorText}>{errorMsg}</Text>
                <TouchableOpacity
                  style={styles.dismissButton}
                  onPress={onClose}
                >
                  <Text style={styles.dismissText}>Close</Text>
                </TouchableOpacity>
              </View>
            ) : detail ? (
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
              >
                {/* Card 1 — Header */}
                <HeaderCard detail={detail} onClose={onClose} />

                {/* Card 2 — When */}
                <Card>
                  <CardHeader title="When" />
                  <Text style={styles.cardBody}>
                    {formatLongDate(detail.date)}
                  </Text>
                  {detail.authorizedDate &&
                    detail.authorizedDate !== detail.date && (
                      <Text style={styles.cardSub}>
                        Authorized {formatLongDate(detail.authorizedDate)}
                      </Text>
                    )}
                </Card>

                {/* Card 3 — Where (skip if no location data) */}
                {(detail.isoLocationCity ||
                  detail.isoLocationRegion ||
                  detail.isoLocationCountry ||
                  detail.paymentChannel) && (
                  <Card>
                    <CardHeader title="Where" />
                    {(detail.isoLocationCity ||
                      detail.isoLocationRegion ||
                      detail.isoLocationCountry) && (
                      <Text style={styles.cardBody}>
                        {[
                          detail.isoLocationCity,
                          detail.isoLocationRegion,
                          detail.isoLocationCountry,
                        ]
                          .filter(Boolean)
                          .join(', ')}
                      </Text>
                    )}
                    {detail.paymentChannel && (
                      <Text style={styles.cardSub}>
                        via {prettyPaymentChannel(detail.paymentChannel)}
                      </Text>
                    )}
                  </Card>
                )}

                {/* Card 4 — Category */}
                {(detail.category || detail.categoryDetailed) && (
                  <Card>
                    <CardHeader title="Category" />
                    <Text style={styles.cardBody}>
                      {detail.category ?? '—'}
                    </Text>
                    {detail.categoryDetailed &&
                      detail.categoryDetailed !== detail.category && (
                        <Text style={styles.cardSub}>
                          {detail.categoryDetailed}
                        </Text>
                      )}
                  </Card>
                )}

                {/* Card 5 — Bank */}
                <Card>
                  <CardHeader title="Bank" />
                  <Text style={styles.cardBody}>
                    Charged to{' '}
                    {detail.bankAccount.institutionName ??
                      detail.bankAccount.name}
                    {detail.bankAccount.mask
                      ? ` ····${detail.bankAccount.mask}`
                      : ''}
                  </Text>
                </Card>

                {/* Card 6 — AI Explainer */}
                <Card>
                  <CardHeader title="Ask Laylo" />
                  <TouchableOpacity
                    style={styles.explainButton}
                    onPress={handleExplain}
                    disabled={explaining}
                    activeOpacity={0.85}
                  >
                    <SparkleIcon size={16} color={tokens.accent} />
                    <Text style={styles.explainButtonText}>
                      {explaining
                        ? 'Thinking…'
                        : explanation
                          ? 'Re-ask Laylo'
                          : 'Why did this repeat?'}
                    </Text>
                  </TouchableOpacity>
                  {explanation && (
                    <View style={styles.explanationBox}>
                      <Text style={styles.explanationText}>{explanation}</Text>
                      {explanationMock && (
                        <Text style={styles.explanationMockTag}>
                          Preview · Real AI lands shortly
                        </Text>
                      )}
                    </View>
                  )}
                </Card>

                {/* Card 7 — Notes */}
                <Card>
                  <View style={styles.noteHeader}>
                    <CardHeader title="Notes" />
                    {(savingNote || noteSavedAt !== null) && (
                      <View style={styles.noteStatusRow}>
                        {savingNote ? (
                          <ActivityIndicator
                            size="small"
                            color={tokens.textSubtle}
                          />
                        ) : (
                          <Animated.View
                            style={[styles.noteSavedPill, savedStyle]}
                          >
                            <Text style={styles.noteSavedCheck}>✓</Text>
                            <Text style={styles.noteSavedText}>Saved</Text>
                          </Animated.View>
                        )}
                      </View>
                    )}
                  </View>
                  <TextInput
                    style={styles.noteInput}
                    value={noteDraft}
                    onChangeText={setNoteDraft}
                    onBlur={handleNoteBlur}
                    multiline
                    placeholder="Add a note for future-you…"
                    placeholderTextColor={tokens.textSubtle}
                    textAlignVertical="top"
                  />
                </Card>

                {/* Card 8 — Receipt placeholder */}
                <Card>
                  <CardHeader title="Receipt" />
                  <Text style={styles.cardSub}>
                    📎 Attach receipt — coming soon
                  </Text>
                </Card>

                {/* Card 9 — Pattern stats (skip if txCount === 1) */}
                {pattern && pattern.txCount > 1 && (
                  <Card>
                    <CardHeader title="Pattern" />
                    <Text style={styles.cardBody}>
                      {pattern.txCount} charges in the last 30 days
                    </Text>
                    <Text style={styles.cardSub}>
                      {formatCurrencyValue(
                        pattern.totalSpent,
                        detail.isoCurrencyCode,
                      )}{' '}
                      total · avg{' '}
                      {formatCurrencyValue(
                        pattern.avgAmount,
                        detail.isoCurrencyCode,
                      )}
                      {pattern.firstSeen
                        ? ` · since ${formatLongDate(pattern.firstSeen)}`
                        : ''}
                    </Text>
                  </Card>
                )}

                {/* Card 10 — Linked bill / subscription */}
                {(detail.bill || detail.subscription) && (
                  <Card>
                    <CardHeader
                      title={detail.bill ? 'Linked bill' : 'Linked subscription'}
                    />
                    <Text style={styles.cardBody}>
                      {(detail.bill ?? detail.subscription)?.name}
                    </Text>
                    <Text style={styles.cardSub}>
                      {formatCurrencyValue(
                        (detail.bill ?? detail.subscription)?.amount ?? 0,
                        detail.isoCurrencyCode,
                      )}
                      {(detail.bill ?? detail.subscription)?.frequency
                        ? ` · ${(detail.bill ?? detail.subscription)?.frequency}`
                        : ''}
                    </Text>
                  </Card>
                )}
              </ScrollView>
            ) : null}
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// ── Helpers ──────────────────────────────────────────────────────

function formatCurrencyValue(value: number, currency = 'USD'): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `$${value.toFixed(2)}`;
  }
}

function formatLongDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function prettyPaymentChannel(s: string): string {
  // Backend sends ALL_CAPS strings like ONLINE / IN_STORE / OTHER.
  return s
    .toLowerCase()
    .split('_')
    .map((p) => {
      const first = p.charAt(0);
      return first ? first.toUpperCase() + p.slice(1) : p;
    })
    .join(' ');
}

function getMerchantInitial(detail: TransactionDetail): string {
  const src = detail.merchantName || detail.name || '?';
  return src.trim().charAt(0).toUpperCase() || '?';
}

// ── Subcomponents ────────────────────────────────────────────────

function Card({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

function CardHeader({ title }: { title: string }) {
  return <Text style={styles.cardHeader}>{title}</Text>;
}

function HeaderCard({
  detail,
  onClose,
}: {
  detail: TransactionDetail;
  onClose: () => void;
}) {
  const isInflow = detail.amount < 0;
  const initial = getMerchantInitial(detail);
  return (
    <View style={[styles.card, styles.headerCard]}>
      <View style={styles.headerTopRow}>
        <View style={{ flex: 1 }} />
        <TouchableOpacity
          onPress={onClose}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Close transaction details"
        >
          <Text style={styles.closeIcon}>×</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.headerBody}>
        <View style={styles.merchantAvatar}>
          <Text style={styles.merchantAvatarText}>{initial}</Text>
        </View>
        <Text style={styles.merchantName} numberOfLines={2}>
          {detail.merchantName || detail.name}
        </Text>
        <View style={styles.amountRow}>
          <Text
            style={[
              styles.amountText,
              isInflow && styles.amountInflowText,
            ]}
          >
            {isInflow ? '+' : '−'}
            {formatCurrencyValue(
              Math.abs(detail.amount),
              detail.isoCurrencyCode,
            )}
          </Text>
          {detail.pending && (
            <View style={styles.pendingChip}>
              <Text style={styles.pendingChipText}>Pending</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  kavWrap: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    height: SHEET_HEIGHT,
    backgroundColor: tokens.surface,
    borderTopLeftRadius: radius.md,
    borderTopRightRadius: radius.md,
    paddingTop: spacing.md,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: tokens.borderStrong,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: tokens.border,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  loadingText: {
    fontSize: 13,
    color: tokens.textMuted,
  },
  errorText: {
    fontSize: 14,
    color: tokens.danger,
    textAlign: 'center',
  },
  dismissButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: tokens.surface2,
  },
  dismissText: {
    fontSize: 14,
    fontWeight: '600',
    color: tokens.text,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl + spacing.lg,
  },
  card: {
    backgroundColor: tokens.surface,
    borderWidth: 1,
    borderColor: tokens.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardHeader: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
    color: tokens.textMuted,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  cardBody: {
    fontSize: 15,
    lineHeight: 22,
    color: tokens.text,
    fontWeight: '500',
  },
  cardSub: {
    fontSize: 13,
    lineHeight: 18,
    color: tokens.textMuted,
    marginTop: 2,
  },
  // ── Header card ──
  headerCard: {
    paddingTop: spacing.sm,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  closeIcon: {
    fontSize: 28,
    color: tokens.textMuted,
    fontWeight: '300',
    lineHeight: 28,
    paddingHorizontal: spacing.xs,
  },
  headerBody: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  merchantAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: tokens.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  merchantAvatarText: {
    fontSize: 22,
    fontWeight: '700',
    color: tokens.textMuted,
  },
  merchantName: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
    color: tokens.text,
    textAlign: 'center',
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  amountText: {
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '700',
    color: tokens.text,
  },
  amountInflowText: {
    color: tokens.success,
  },
  pendingChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    backgroundColor: tokens.surface2,
  },
  pendingChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: tokens.warning,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  // ── AI explainer ──
  explainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: tokens.accentDim,
    alignSelf: 'flex-start',
  },
  explainButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: tokens.text,
  },
  explanationBox: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.sm,
    backgroundColor: tokens.surface2,
    borderLeftWidth: 3,
    borderLeftColor: tokens.accent,
  },
  explanationText: {
    fontSize: 14,
    lineHeight: 20,
    color: tokens.text,
  },
  explanationMockTag: {
    marginTop: spacing.sm,
    fontSize: 11,
    fontWeight: '600',
    color: tokens.textSubtle,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  // ── Note ──
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  noteStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  noteSavedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    backgroundColor: tokens.accentSoft,
  },
  noteSavedCheck: {
    fontSize: 11,
    fontWeight: '700',
    color: tokens.text,
  },
  noteSavedText: {
    fontSize: 11,
    fontWeight: '600',
    color: tokens.text,
  },
  noteInput: {
    minHeight: 80,
    backgroundColor: tokens.surface2,
    borderRadius: radius.sm,
    padding: spacing.md,
    fontSize: 14,
    lineHeight: 20,
    color: tokens.text,
  },
});
