import React, { useMemo, useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '../src/context/auth';
import { ThemeProvider, useTheme } from '../src/context/theme';
import { useBricolageFont } from '../src/lib/fonts';
import { tokens, useTokens } from '../src/lib/tokens';

/**
 * Mirrors `resolvedTheme` to the OS status bar so the clock + battery
 * icons stay legible after a theme switch. `expo-status-bar` swaps
 * tint instantly when the `style` prop changes — no native reload.
 */
function ThemedStatusBar() {
  const { resolvedTheme } = useTheme();
  return <StatusBar style={resolvedTheme === 'dark' ? 'light' : 'dark'} />;
}

/**
 * Gate `(tabs)` and the other authenticated stack screens behind
 * a valid session. Public routes: `index`, `onboarding`, `auth`.
 */
const PROTECTED_SEGMENTS = new Set([
  '(tabs)',
  'bills',
  'banks',
  'transactions',
  'reminders',
  'appointments',
]);

function AuthRedirect({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isHydrating } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const t = useTokens();

  useEffect(() => {
    if (isHydrating) return;
    const first = segments[0] as string | undefined;
    const inProtected = first ? PROTECTED_SEGMENTS.has(first) : false;

    if (!isAuthenticated && inProtected) {
      router.replace('/auth');
    } else if (isAuthenticated && (first === 'auth' || first === 'onboarding')) {
      router.replace('/(tabs)');
    } else if (isAuthenticated && !first) {
      // Landed on the splash — push into the app.
      router.replace('/(tabs)');
    } else if (!isAuthenticated && !first) {
      // Splash with no auth → go to /auth.
      router.replace('/auth');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, isHydrating, segments[0]]);

  if (isHydrating) {
    return (
      <View style={[styles.loading, { backgroundColor: t.bg }]}>
        <ActivityIndicator color={t.accent} />
      </View>
    );
  }

  return <>{children}</>;
}

export default function RootLayout() {
  // Block the first render until the Bricolage TTFs hydrate. The native
  // splash (#000000) stays up until we return content, so the user
  // doesn't see a font-swap flicker. If loading fails we still render —
  // RN falls back to the OS font which is acceptable degradation.
  const fontsLoaded = useBricolageFont();
  const queryClient = useMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            staleTime: 30_000,
            refetchOnWindowFocus: false,
          },
        },
      }),
    [],
  );
  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: '#000000' }} />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <ThemedStatusBar />
          <AuthRedirect>
            <Stack
              screenOptions={{
                headerShown: false,
                animation: 'fade',
              }}
            >
              <Stack.Screen name="onboarding" />
              <Stack.Screen name="auth" />
              <Stack.Screen
                name="(tabs)"
                options={{ gestureEnabled: false }}
              />
              <Stack.Screen name="index" />
              <Stack.Screen name="bills" options={{ headerShown: false }} />
              <Stack.Screen name="appointments" options={{ headerShown: false }} />
              <Stack.Screen name="reminders" options={{ headerShown: false }} />
              <Stack.Screen name="banks" options={{ headerShown: false }} />
              <Stack.Screen name="transactions" options={{ headerShown: false }} />
            </Stack>
          </AuthRedirect>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokens.bg,
  },
});
