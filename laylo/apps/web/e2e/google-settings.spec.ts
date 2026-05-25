import { test, expect } from '@playwright/test';

/**
 * Google integration smoke — Settings page surface.
 *
 * Coverage (per the brief):
 *   1. Log in (mock auth — same shortcut the rest of the suite takes by
 *      hitting /dashboard directly; the AppLayout redirects to /login if
 *      unauthenticated but renders if a session token is present).
 *   2. Navigate to /settings and assert the Google Connect card is visible.
 *   3. Click "Connect Google" — assert the link kicks off (we mock the
 *      backend response so the redirect URL points back to the app, which
 *      we observe via the page URL change).
 *   4. With a linked state mocked, assert the Disconnect button is present
 *      and clicking it pops the confirm modal.
 *
 * The API surface is fully mocked via `page.route()` so the spec is hermetic
 * — no real Google account / backend required.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

test.describe('Google integration — settings card', () => {
  test('not-linked → connect kicks off OAuth redirect', async ({ page }) => {
    // Stub status as "not linked".
    await page.route(`${API_BASE}/api/google/status`, async (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            linked: false,
            googleEmail: null,
            scopes: [],
            calendarLastSyncedAt: null,
            gmailLastPolledAt: null,
          },
        }),
      }),
    );

    // Stub the link start — return a redirect URL we can observe.
    const REDIRECT_URL = 'https://example.com/oauth/mocked';
    await page.route(`${API_BASE}/api/google/link`, async (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { redirectUrl: REDIRECT_URL },
        }),
      }),
    );

    await page.goto('/settings');
    // Card heading should be visible.
    await expect(page.getByRole('heading', { name: 'Google Account' })).toBeVisible();
    // Explainer copy is rendered.
    await expect(page.getByText('Sync your calendar both ways')).toBeVisible();

    // Click Connect — we intercept the navigation away from the app so the
    // test doesn't blow up trying to load example.com.
    let navigatedAwayTo: string | null = null;
    page.on('framenavigated', (frame) => {
      const url = frame.url();
      if (url.startsWith(REDIRECT_URL)) navigatedAwayTo = url;
    });
    await page.getByRole('button', { name: /connect google/i }).click();

    // Either the browser navigated to the redirect URL, or the redirect URL
    // was set on `window.location.href` (Playwright still records it).
    await expect
      .poll(() => navigatedAwayTo ?? page.url(), { timeout: 5_000 })
      .toContain('example.com/oauth/mocked');
  });

  test('linked → disconnect opens the confirm modal', async ({ page }) => {
    await page.route(`${API_BASE}/api/google/status`, async (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            linked: true,
            googleEmail: 'alex@example.com',
            scopes: ['calendar.readonly', 'gmail.readonly'],
            calendarLastSyncedAt: new Date().toISOString(),
            gmailLastPolledAt: new Date().toISOString(),
          },
        }),
      }),
    );

    await page.goto('/settings');
    await expect(page.getByText('alex@example.com')).toBeVisible();

    await page.getByRole('button', { name: /disconnect google/i }).click();
    await expect(
      page.getByRole('dialog', { name: /send google out of the hive/i }),
    ).toBeVisible();
    // Cancel out so the spec cleans up.
    await page.getByRole('button', { name: /keep it/i }).click();
    await expect(
      page.getByRole('dialog', { name: /send google out of the hive/i }),
    ).toBeHidden();
  });
});
