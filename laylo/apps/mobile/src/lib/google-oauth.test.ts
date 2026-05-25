/**
 * Unit tests for the Google OAuth state machine.
 *
 * Covers parseOAuthCallback() + the happy-path / cancel / error /
 * state-mismatch branches of runOAuthFlow().
 *
 * We never call the real expo-web-browser — instead we inject a
 * fake via the `deps.webBrowser` parameter so the test stays in
 * pure JS and is robust to the package not being installed.
 */
import {
  parseOAuthCallback,
  runOAuthFlow,
  type GoogleOAuthState,
} from './google-oauth';

describe('parseOAuthCallback', () => {
  it('extracts code + state from a custom-scheme URL', () => {
    const out = parseOAuthCallback(
      'lifeadminai://google-oauth?code=abc123&state=xyz789',
    );
    expect(out).toEqual({ code: 'abc123', state: 'xyz789' });
  });

  it('extracts code + state from an https URL', () => {
    const out = parseOAuthCallback(
      'https://example.com/cb?code=foo&state=bar&extra=ignored',
    );
    expect(out).toEqual({ code: 'foo', state: 'bar' });
  });

  it('returns null when code is missing', () => {
    expect(parseOAuthCallback('lifeadminai://google-oauth?state=xyz')).toBeNull();
  });

  it('returns null when state is missing', () => {
    expect(parseOAuthCallback('lifeadminai://google-oauth?code=abc')).toBeNull();
  });

  it('returns null on a malformed URL', () => {
    expect(parseOAuthCallback('not a url at all')).toBeNull();
  });
});

describe('runOAuthFlow', () => {
  function makeBrowserStub(url: string | null, type = 'success') {
    return {
      openAuthSessionAsync: jest.fn(async () =>
        url ? { type, url } : { type: 'cancel' as const },
      ),
    };
  }

  it('drives idle → starting → awaiting → exchanging → done on the happy path', async () => {
    const states: GoogleOAuthState[] = [];
    const startLink = jest.fn(async () => ({
      redirectUrl: 'https://accounts.google.com/auth?...',
      state: 'csrf-token-1',
    }));
    const completeLink = jest.fn(async () => ({ ok: true as const }));
    const webBrowser = makeBrowserStub(
      'lifeadminai://google-oauth?code=AUTH_CODE&state=csrf-token-1',
    );

    await runOAuthFlow((s) => states.push(s), {
      startLink,
      completeLink,
      webBrowser,
    });

    expect(states.map((s) => s.kind)).toEqual([
      'starting',
      'awaiting_callback',
      'exchanging',
      'done',
    ]);
    expect(startLink).toHaveBeenCalledTimes(1);
    expect(webBrowser.openAuthSessionAsync).toHaveBeenCalledWith(
      'https://accounts.google.com/auth?...',
      'lifeadminai://google-oauth',
    );
    expect(completeLink).toHaveBeenCalledWith({
      code: 'AUTH_CODE',
      state: 'csrf-token-1',
    });
  });

  it('returns to idle when the user cancels the browser', async () => {
    const states: GoogleOAuthState[] = [];
    const startLink = jest.fn(async () => ({
      redirectUrl: 'https://google.test',
      state: 'csrf-2',
    }));
    const completeLink = jest.fn();
    const webBrowser = makeBrowserStub(null);

    await runOAuthFlow((s) => states.push(s), {
      startLink,
      completeLink,
      webBrowser,
    });

    expect(states.map((s) => s.kind)).toEqual([
      'starting',
      'awaiting_callback',
      'idle',
    ]);
    expect(completeLink).not.toHaveBeenCalled();
  });

  it('throws + reports error when state mismatches (CSRF guard)', async () => {
    const states: GoogleOAuthState[] = [];
    const startLink = jest.fn(async () => ({
      redirectUrl: 'https://google.test',
      state: 'expected-state',
    }));
    const completeLink = jest.fn();
    const webBrowser = makeBrowserStub(
      'lifeadminai://google-oauth?code=AC&state=tampered-state',
    );

    await expect(
      runOAuthFlow((s) => states.push(s), {
        startLink,
        completeLink,
        webBrowser,
      }),
    ).rejects.toThrow(/state mismatch/i);

    expect(states.at(-1)?.kind).toBe('error');
    expect(completeLink).not.toHaveBeenCalled();
  });

  it('surfaces an error if start() throws', async () => {
    const states: GoogleOAuthState[] = [];
    const startLink = jest.fn(async () => {
      throw new Error('network down');
    });
    const webBrowser = makeBrowserStub(null);

    await expect(
      runOAuthFlow((s) => states.push(s), {
        startLink,
        completeLink: jest.fn(),
        webBrowser,
      }),
    ).rejects.toThrow(/network down/);

    const final = states.at(-1);
    expect(final?.kind).toBe('error');
    if (final?.kind === 'error') {
      // User-facing string is the friendly bee voice, not the raw error.
      expect(final.message).toBe('Hmm, sync stalled. Try again?');
    }
  });

  it('surfaces an error if the callback URL is malformed', async () => {
    const states: GoogleOAuthState[] = [];
    const startLink = jest.fn(async () => ({
      redirectUrl: 'https://google.test',
      state: 'csrf-3',
    }));
    const webBrowser = makeBrowserStub('not a url');

    await expect(
      runOAuthFlow((s) => states.push(s), {
        startLink,
        completeLink: jest.fn(),
        webBrowser,
      }),
    ).rejects.toThrow(/Malformed/i);

    expect(states.at(-1)?.kind).toBe('error');
  });
});
