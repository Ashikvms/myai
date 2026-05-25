/**
 * AskAi bottom sheet — Phase 3b.
 *
 * A modal that slides up from the bottom containing a TextInput
 * pre-filled with a context-specific prompt. Submit just shows a
 * placeholder toast for now ("We'll wire this up next").
 *
 * Spec: REDESIGN_BRIEF.md §3.3, DESIGN_SYSTEM.md §6.7 + §9.4.
 *
 * Implementation notes:
 * - Uses React Native's built-in Modal (no third-party sheet library
 *   in the workspace, and the brief forbids new deps).
 * - Reanimated v3 drives the slide-up + backdrop fade per
 *   DESIGN_SYSTEM.md §6.2 #7 (280 ms, Easing.out(Easing.cubic)).
 * - Respects useReducedMotion(): snaps when reduced-motion is on.
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useTokens, radius, spacing } from '../../lib/tokens';
import { SparkleIcon } from './sparkle-icon';
import { askAi } from '../../lib/api/resources';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export type AiBottomSheetProps = {
  visible: boolean;
  onClose: () => void;
  /** Pre-filled prompt — typically context-derived. */
  initialPrompt?: string;
  /** Title above the textarea. Defaults to "Ask BillBee". */
  title?: string;
  /** Optional one-tap suggestion chips above the textarea. */
  suggestions?: string[];
};

export function AiBottomSheet({
  visible,
  onClose,
  initialPrompt = '',
  title = 'Ask BillBee',
  suggestions,
}: AiBottomSheetProps) {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [answer, setAnswer] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>(
    undefined,
  );

  const reduceMotion = useReducedMotion();
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const backdropOpacity = useSharedValue(0);
  const t = useTokens();
  const styles = useMemo(
    () =>
      StyleSheet.create({
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
          backgroundColor: t.surface,
          borderTopLeftRadius: radius.md,
          borderTopRightRadius: radius.md,
          paddingHorizontal: spacing.xl,
          paddingTop: spacing.md,
          paddingBottom: Platform.OS === 'ios' ? spacing.xxl + spacing.md : spacing.xl,
          borderWidth: 1,
          borderBottomWidth: 0,
          borderColor: t.borderStrong,
        },
        handle: {
          width: 40,
          height: 4,
          borderRadius: 2,
          backgroundColor: t.border,
          alignSelf: 'center',
          marginBottom: spacing.lg,
        },
        headerRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: spacing.lg,
        },
        titleRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
        },
        title: {
          fontSize: 22,
          lineHeight: 28,
          fontWeight: '600',
          color: t.text,
        },
        closeIcon: {
          fontSize: 28,
          color: t.textMuted,
          fontWeight: '300',
          lineHeight: 28,
        },
        suggestionsRow: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: spacing.sm,
          marginBottom: spacing.md,
        },
        suggestionChip: {
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.xs + 2,
          borderRadius: radius.sm,
          borderWidth: 1,
          borderColor: t.accentDim,
          backgroundColor: 'transparent',
        },
        suggestionText: {
          fontSize: 13,
          fontWeight: '500',
          color: t.textMuted,
        },
        input: {
          minHeight: 96,
          backgroundColor: t.surface2,
          borderRadius: radius.sm,
          padding: spacing.md,
          fontSize: 15,
          lineHeight: 22,
          color: t.text,
          marginBottom: spacing.lg,
        },
        submitButton: {
          backgroundColor: t.accent,
          paddingVertical: spacing.md,
          borderRadius: radius.md,
          alignItems: 'center',
        },
        submitButtonDisabled: {
          opacity: 0.5,
        },
        submitText: {
          color: t.textOnAccent,
          fontSize: 16,
          fontWeight: '700',
        },
        errorBox: {
          marginTop: spacing.md,
          padding: spacing.md,
          borderRadius: radius.sm,
          backgroundColor: 'rgba(239,68,68,0.10)',
          borderLeftWidth: 4,
          borderLeftColor: t.danger,
        },
        errorText: {
          fontSize: 13,
          fontWeight: '500',
          color: t.danger,
        },
        answerScroll: {
          marginTop: spacing.lg,
          maxHeight: 200,
        },
        answerWrap: {
          padding: spacing.md,
          borderRadius: radius.sm,
          backgroundColor: t.accentSoft,
          borderLeftWidth: 4,
          borderLeftColor: t.accent,
        },
        answerText: {
          fontSize: 14,
          lineHeight: 20,
          color: t.text,
        },
      }),
    [t],
  );

  useEffect(() => {
    if (visible) {
      setPrompt(initialPrompt);
      setAnswer(null);
      setErrorMessage(null);
      const duration = reduceMotion ? 0 : 280;
      translateY.value = withTiming(0, {
        duration,
        easing: Easing.out(Easing.cubic),
      });
      backdropOpacity.value = withTiming(0.6, {
        duration,
        easing: Easing.out(Easing.cubic),
      });
    } else {
      const duration = reduceMotion ? 0 : 200;
      translateY.value = withTiming(SCREEN_HEIGHT, {
        duration,
        easing: Easing.in(Easing.cubic),
      });
      backdropOpacity.value = withTiming(0, {
        duration,
        easing: Easing.in(Easing.cubic),
      });
    }
  }, [visible, initialPrompt, reduceMotion, translateY, backdropOpacity]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const handleSubmit = async () => {
    const trimmed = prompt.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await askAi(trimmed, conversationId);
      setConversationId(res.conversationId);
      setAnswer(res.assistantMessage.content);
      setPrompt('');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Hmm, sync stalled. Try again?';
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

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
            <View style={styles.handle} />

            {/* Header */}
            <View style={styles.headerRow}>
              <View style={styles.titleRow}>
                <SparkleIcon size={20} color={t.accent} />
                <Text style={styles.title}>{title}</Text>
              </View>
              <TouchableOpacity
                onPress={onClose}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <Text style={styles.closeIcon}>×</Text>
              </TouchableOpacity>
            </View>

            {/* Optional suggestions */}
            {suggestions && suggestions.length > 0 && (
              <View style={styles.suggestionsRow}>
                {suggestions.map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={styles.suggestionChip}
                    onPress={() => setPrompt(s)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.suggestionText}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Input */}
            <TextInput
              style={styles.input}
              value={prompt}
              onChangeText={setPrompt}
              placeholder="Ask anything about your bills, tasks, or money…"
              placeholderTextColor={t.textSubtle}
              multiline
              autoFocus
              textAlignVertical="top"
            />

            {/* Submit */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                (!prompt.trim() || submitting) && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              activeOpacity={0.85}
              disabled={!prompt.trim() || submitting}
              accessibilityRole="button"
              accessibilityLabel="Send to BillBee"
            >
              {submitting ? (
                <ActivityIndicator color={t.textOnAccent} />
              ) : (
                <Text style={styles.submitText}>Ask BillBee</Text>
              )}
            </TouchableOpacity>

            {errorMessage && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            )}

            {answer && (
              <ScrollView
                style={styles.answerScroll}
                contentContainerStyle={styles.answerWrap}
                showsVerticalScrollIndicator={false}
              >
                <Text style={styles.answerText}>{answer}</Text>
              </ScrollView>
            )}
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

