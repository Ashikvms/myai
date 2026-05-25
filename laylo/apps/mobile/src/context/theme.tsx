/**
 * ThemeProvider — single source of truth for the user's theme choice.
 *
 * Mirrors the `next-themes` API used on the web so app code reads the
 * same way on both platforms: `{ mode, resolvedTheme, setMode, toggle }`.
 *
 *  - `mode` is the user's preference: 'light' | 'dark' | 'system'.
 *  - `resolvedTheme` is what's actually applied: 'light' | 'dark'.
 *    When `mode === 'system'` we resolve via `useColorScheme()`.
 *
 * On mount we hydrate from SecureStore (see `theme-mode.ts`). Until
 * the read completes we default to 'dark' — BillBee ships dark-first
 * as the brand presentation (black canvas + gold accents). Users who
 * previously chose a different mode keep their stored preference; only
 * fresh installs get dark as the starting point.
 *
 * Every `setMode` call is persisted; the write is fire-and-forget so
 * the UI doesn't await disk I/O.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useColorScheme } from 'react-native';
import {
  type ThemeMode,
  getStoredThemeMode,
  setStoredThemeMode,
} from '../lib/theme-mode';

type ThemeContextValue = {
  /** The user's preference. Persisted to SecureStore. */
  mode: ThemeMode;
  /**
   * The theme actually applied right now. 'system' is resolved via
   * `useColorScheme()` so callers never have to branch on `mode`.
   */
  resolvedTheme: 'light' | 'dark';
  /** Update the preference + persist it. */
  setMode: (mode: ThemeMode) => void;
  /**
   * Toggle between light and dark, skipping 'system'. Handy for a
   * single-tap moon/sun button. If the current resolved theme is dark
   * we flip to light, and vice-versa.
   */
  toggle: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Default to 'dark' so fresh installs launch into the black/gold
  // brand presentation. The hydrate below restores the user's stored
  // preference (light/dark/system) on subsequent launches.
  const [mode, setModeState] = useState<ThemeMode>('dark');
  const systemScheme = useColorScheme();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = await getStoredThemeMode();
      if (!cancelled && stored) setModeState(stored);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    // Fire-and-forget; persistence failure is non-fatal.
    void setStoredThemeMode(next);
  }, []);

  const resolvedTheme: 'light' | 'dark' = useMemo(() => {
    if (mode === 'system') return systemScheme === 'dark' ? 'dark' : 'light';
    return mode;
  }, [mode, systemScheme]);

  const toggle = useCallback(() => {
    setMode(resolvedTheme === 'dark' ? 'light' : 'dark');
  }, [resolvedTheme, setMode]);

  const value = useMemo<ThemeContextValue>(
    () => ({ mode, resolvedTheme, setMode, toggle }),
    [mode, resolvedTheme, setMode, toggle],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/**
 * Read the active theme. Throws if called outside a `ThemeProvider` —
 * we want that loud failure during development. Tests can wrap their
 * subjects in `<ThemeProvider>` or mock this module.
 */
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used inside a <ThemeProvider>');
  }
  return ctx;
}

/**
 * Soft variant that returns `null` if no provider is mounted. Used by
 * `useTokens()` so that hooks called outside the provider (eg in
 * isolated unit tests) keep working via `useColorScheme()` fallback.
 */
export function useThemeOrNull(): ThemeContextValue | null {
  return useContext(ThemeContext);
}
