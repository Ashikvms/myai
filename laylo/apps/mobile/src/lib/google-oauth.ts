/**
 * Google OAuth — mobile flow.
 *
 * Authorization-code-with-PKCE pattern handled by the BillBee API.
 * The app drives a small state machine:
 *
 *   idle → starting → awaiting_callback → exchanging → done
 *                                                    ↘ error
 *
 * Step-by-step:
 *   1. App POSTs /api/google/link/start → server returns
 *      { redirectUrl, state }. The server holds the PKCE verifier
 *      so the mobile client never sees client secrets.
 *   2. App opens redirectUrl via WebBrowser.openAuthSessionAsync()
 *      with the deep-link return scheme `lifeadminai://google-oauth`.
 *   3. Google redirects back; WebBrowser closes and returns the URL.
 *   4. App parses code+state from the URL and POSTs them to
 *      /api/google/link/callback for exchange + token storage.
 *   5. Caller invalidates ['google', 'status'] so the UI flips.
 *
 * `expo-auth-session` + `expo-web-browser` are loaded lazily so this
 * module typechecks even when the packages are not yet installed
 * (the user must run `npx expo install expo-auth-session
 * expo-web-browser expo-crypto` before the flow can run on device).
 */
import {
  startGoogleLink,
  completeGoogleLink,
  type GoogleLinkStart,
} from './api/resources';

/** Deep-link scheme + host registered in app.json. */
export const GOOGLE_REDIRECT_SCHEME = 'lifeadminai';
export const GOOGLE_REDIRECT_HOST = 'google-oauth';
export const GOOGLE_REDIRECT_URI = `${GOOGLE_REDIRECT_SCHEME}://${GOOGLE_REDIRECT_HOST}`;

export type GoogleOAuthState =
  | { kind: 'idle' }
  | { kind: 'starting' }
  | { kind: 'awaiting_callback'; state: string }
  | { kind: 'exchanging' }
  | { kind: 'done' }
  | { kind: 'error'; message: string };

export type WebBrowserResult =
  | { type: 'success'; url: string }
  | { type: 'cancel' | 'dismiss' | 'locked' | 'opened' }
  | { type: string; url?: string };

/**
 * Lazy-loaded WebBrowser binding. Returning a thin shim keeps the
 * surface small and makes mocking trivial in tests.
 */
interface WebBrowserModule {
  openAuthSessionAsync(
    url: string,
    redirectUrl: string,
  ): Promise<WebBrowserResult>;
}

function loadWebBrowser(): WebBrowserModule {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('expo-web-browser') as WebBrowserModule;
}

/**
 * Parse `code` and `state` from a deep-link callback URL.
 *
 * Returns `null` if the URL is malformed or missing either field.
 * Exposed for the Jest test in `google-oauth.test.ts` and for
 * any code path that needs to handle the URL outside of the
 * default `runOAuthFlow()` happy path (e.g. cold-start from a
 * lifeadminai:// deep link while the app was killed).
 */
export function parseOAuthCallback(
  url: string,
): { code: string; state: string } | null {
  try {
    // RN URL doesn't always honor custom schemes — normalise to https
    // for parsing so the query parser works deterministically.
    const safeUrl = url.replace(/^[a-z]+:\/\//i, 'https://');
    const parsed = new URL(safeUrl);
    const code = parsed.searchParams.get('code');
    const state = parsed.searchParams.get('state');
    if (!code || !state) return null;
    return { code, state };
  } catch {
    return null;
  }
}

/**
 * Drive the full OAuth flow. Calls `onState` at every transition so
 * the caller can render a button label / spinner accordingly.
 *
 * Throws on failure with a human-readable message that is also
 * surfaced via the final `{ kind: 'error' }` state.
 *
 * Implementation notes:
 *   - `WebBrowser.openAuthSessionAsync` is used because it handles
 *     the SFAuthenticationSession / Custom Tabs lifecycle (closes
 *     itself when the redirect fires).
 *   - State validation lives here, not the server, because we must
 *     compare against the value we got from /link/start. The server
 *     can also cross-check.
 */
export async function runOAuthFlow(
  onState: (s: GoogleOAuthState) => void,
  deps?: {
    startLink?: () => Promise<GoogleLinkStart>;
    completeLink?: (input: {
      code: string;
      state: string;
    }) => Promise<{ ok: true }>;
    webBrowser?: WebBrowserModule;
  },
): Promise<void> {
  const start = deps?.startLink ?? startGoogleLink;
  const complete = deps?.completeLink ?? completeGoogleLink;
  const browser = deps?.webBrowser ?? loadWebBrowser();

  onState({ kind: 'starting' });

  let initial: GoogleLinkStart;
  try {
    initial = await start();
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Could not start sign-in';
    onState({ kind: 'error', message: 'Hmm, sync stalled. Try again?' });
    throw new Error(message);
  }

  onState({ kind: 'awaiting_callback', state: initial.state });

  let result: WebBrowserResult;
  try {
    result = await browser.openAuthSessionAsync(
      initial.redirectUrl,
      GOOGLE_REDIRECT_URI,
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Browser failed';
    onState({ kind: 'error', message: 'Hmm, sync stalled. Try again?' });
    throw new Error(message);
  }

  if (result.type !== 'success' || !('url' in result) || !result.url) {
    // User cancelled or dismissed.
    onState({ kind: 'idle' });
    return;
  }

  const parsed = parseOAuthCallback(result.url);
  if (!parsed) {
    onState({ kind: 'error', message: 'Hmm, sync stalled. Try again?' });
    throw new Error('Malformed OAuth callback URL');
  }

  if (parsed.state !== initial.state) {
    onState({ kind: 'error', message: 'Hmm, sync stalled. Try again?' });
    throw new Error('OAuth state mismatch');
  }

  onState({ kind: 'exchanging' });

  try {
    await complete({ code: parsed.code, state: parsed.state });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Token exchange failed';
    onState({ kind: 'error', message: 'Hmm, sync stalled. Try again?' });
    throw new Error(message);
  }

  onState({ kind: 'done' });
}
