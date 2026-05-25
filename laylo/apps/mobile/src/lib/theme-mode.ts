/**
 * Persistence layer for the user's theme preference.
 *
 * Stored as a single key in `expo-secure-store` (which is already a
 * dependency via the auth token flow — no new npm deps required).
 *
 * Three legal modes mirror what `next-themes` uses on the web so the
 * mental model stays consistent across platforms:
 *   - 'light'  → force the yellow-canvas light theme
 *   - 'dark'   → force the black-canvas dark theme
 *   - 'system' → follow the OS color scheme via `useColorScheme()`
 *
 * Failure to read/write is non-fatal — we fall back to the default
 * ('system') and the UI just behaves as if no preference was stored.
 */
import * as SecureStore from 'expo-secure-store';

export type ThemeMode = 'light' | 'dark' | 'system';

const THEME_MODE_KEY = 'billbee_theme_mode';

function isThemeMode(value: unknown): value is ThemeMode {
  return value === 'light' || value === 'dark' || value === 'system';
}

export async function getStoredThemeMode(): Promise<ThemeMode | null> {
  try {
    const raw = await SecureStore.getItemAsync(THEME_MODE_KEY);
    if (raw && isThemeMode(raw)) return raw;
    return null;
  } catch {
    return null;
  }
}

export async function setStoredThemeMode(mode: ThemeMode): Promise<void> {
  try {
    await SecureStore.setItemAsync(THEME_MODE_KEY, mode);
  } catch {
    // SecureStore can fail on some platforms / in tests — silent skip.
  }
}
