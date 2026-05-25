/**
 * Auth — Phase 3b restyle.
 *
 * Black + gold tokens. Bee mascot fronts the logo, copy uses
 * "Welcome back" / "Join the hive" per the personality bank.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../src/context/auth';
import { tokens, radius, spacing } from '../src/lib/tokens';
import { BreathingBee } from '../src/components/motion/breathing-bee';
import { WelcomeBeeBubble } from '../src/components/illustrations/welcome-bee-bubble';
import { HoneycombPattern } from '../src/components/illustrations/honeycomb-pattern';

type Tab = 'signin' | 'signup';

export default function AuthScreen() {
  const router = useRouter();
  const { login, signup, isLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<Tab>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (activeTab === 'signup' && !name.trim()) {
      newErrors.name = 'Name is required';
    }
    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!email.includes('@')) {
      newErrors.email = 'Enter a valid email';
    }
    if (!password.trim()) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setErrors({});

    try {
      if (activeTab === 'signin') {
        await login(email.trim(), password);
      } else {
        await signup(name.trim(), email.trim(), password);
      }
      // The AuthRedirect in _layout.tsx forwards us to /(tabs) once
      // the auth context flips. Explicit navigate handles slow renders.
      router.replace('/(tabs)');
    } catch (err) {
      const message =
        err instanceof Error && err.message
          ? // Surface the API error message when meaningful, fall back
            // to the on-brand "stung" copy otherwise.
            err.message.includes('401') || err.message.includes('400')
            ? activeTab === 'signin'
              ? 'Email or password incorrect.'
              : 'Could not create your account. Try a different email?'
            : 'Hmm, sync stalled. Try again?'
          : 'Hmm, sync stalled. Try again?';
      setErrors({ form: message });
    }
  };

  const handleGoogleAuth = () => {
    // Mobile Google OAuth needs `expo-auth-session` + native config
    // (iosClientId in the GoogleSignin SDK or a custom URL scheme).
    // Out of scope for this functionality pass — surface the limit so
    // the user reaches for the email form instead.
    setErrors({
      form: 'Google sign-in on mobile is coming soon. Use email for now.',
    });
  };

  const switchTab = (tab: Tab) => {
    setActiveTab(tab);
    setErrors({});
    setName('');
    setEmail('');
    setPassword('');
  };

  return (
    <SafeAreaView style={styles.container}>
      <HoneycombPattern opacity={0.04} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo + speech bubble */}
          <View style={styles.logoContainer}>
            <BreathingBee>
              <WelcomeBeeBubble
                variant={activeTab === 'signin' ? 'login' : 'signup'}
                beeSize={140}
              />
            </BreathingBee>
            <Text style={styles.logoTitle}>BillBee</Text>
          </View>

          {/* Tab Toggle */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'signin' && styles.tabActive]}
              onPress={() => switchTab('signin')}
            >
              <Text
                style={[styles.tabText, activeTab === 'signin' && styles.tabTextActive]}
              >
                Welcome back
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'signup' && styles.tabActive]}
              onPress={() => switchTab('signup')}
            >
              <Text
                style={[styles.tabText, activeTab === 'signup' && styles.tabTextActive]}
              >
                Join the hive
              </Text>
            </TouchableOpacity>
          </View>

          {/* Form Error */}
          {errors.form && (
            <View style={styles.formError}>
              <Text style={styles.formErrorText}>{errors.form}</Text>
            </View>
          )}

          {/* Form Fields */}
          <View style={styles.form}>
            {activeTab === 'signup' && (
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Full Name</Text>
                <TextInput
                  style={[styles.input, errors.name ? styles.inputError : null]}
                  placeholder="John Doe"
                  placeholderTextColor={tokens.textSubtle}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  autoComplete="name"
                />
                {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
              </View>
            )}

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={[styles.input, errors.email ? styles.inputError : null]}
                placeholder="you@example.com"
                placeholderTextColor={tokens.textSubtle}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
              {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={[
                    styles.input,
                    styles.passwordInput,
                    errors.password ? styles.inputError : null,
                  ]}
                  placeholder="••••••••"
                  placeholderTextColor={tokens.textSubtle}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoComplete="password"
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Text style={styles.eyeIcon}>{showPassword ? '⊝' : '⊙'}</Text>
                </TouchableOpacity>
              </View>
              {errors.password && (
                <Text style={styles.errorText}>{errors.password}</Text>
              )}
            </View>

            {activeTab === 'signin' && (
              <TouchableOpacity style={styles.forgotButton}>
                <Text style={styles.forgotText}>Forgot password?</Text>
              </TouchableOpacity>
            )}

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              activeOpacity={0.85}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={tokens.textOnAccent} size="small" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {activeTab === 'signin' ? 'Welcome back' : 'Join the hive'}
                </Text>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Google Button */}
            <TouchableOpacity
              style={styles.googleButton}
              onPress={handleGoogleAuth}
              activeOpacity={0.85}
            >
              <Text style={styles.googleIcon}>G</Text>
              <Text style={styles.googleButtonText}>
                {activeTab === 'signin'
                  ? 'Continue with Google'
                  : 'Sign up with Google'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.bg,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl + spacing.sm,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
    gap: spacing.md,
  },
  logoTitle: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '700',
    color: tokens.text,
    letterSpacing: -0.5,
  },
  logoSubtitle: {
    fontSize: 15,
    color: tokens.textMuted,
    fontWeight: '500',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: tokens.surface2,
    borderRadius: radius.sm,
    padding: 4,
    marginBottom: spacing.xl,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderRadius: radius.sm - 2,
  },
  tabActive: {
    backgroundColor: tokens.bg,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: tokens.textMuted,
  },
  tabTextActive: {
    color: tokens.text,
  },
  formError: {
    backgroundColor: 'rgba(239,68,68,0.10)',
    borderLeftWidth: 4,
    borderLeftColor: tokens.danger,
    borderRadius: radius.sm,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  formErrorText: {
    color: tokens.danger,
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '500',
  },
  form: { gap: spacing.xs },
  fieldGroup: { marginBottom: spacing.lg },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: tokens.textMuted,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: tokens.surface,
    borderWidth: 1,
    borderColor: tokens.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
    fontSize: 15,
    color: tokens.text,
  },
  inputError: {
    borderColor: tokens.danger,
  },
  passwordContainer: { position: 'relative' },
  passwordInput: { paddingRight: 52 },
  eyeButton: {
    position: 'absolute',
    right: spacing.lg,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  eyeIcon: { fontSize: 18, color: tokens.textMuted },
  errorText: {
    color: tokens.danger,
    fontSize: 12,
    marginTop: spacing.xs,
    marginLeft: spacing.xs,
  },
  forgotButton: {
    alignSelf: 'flex-end',
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  forgotText: {
    color: tokens.text,
    fontSize: 13,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  submitButton: {
    backgroundColor: tokens.accent,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: {
    color: tokens.textOnAccent,
    fontSize: 16,
    fontWeight: '700',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.xl - 4,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: tokens.border },
  dividerText: {
    color: tokens.textSubtle,
    fontSize: 13,
    marginHorizontal: spacing.lg,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokens.surface,
    borderWidth: 1,
    borderColor: tokens.border,
    borderRadius: radius.md,
    paddingVertical: spacing.md + 2,
    gap: spacing.md - 2,
  },
  googleIcon: {
    fontSize: 18,
    fontWeight: '700',
    color: tokens.text,
  },
  googleButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: tokens.text,
  },
});
