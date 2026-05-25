/**
 * inbox-zero-flag — Phase 3b playfulness pass (D3).
 *
 * In-memory module-level "session" flag for whether the user has
 * already seen the inbox-zero celebration this app run. AsyncStorage
 * isn't installed in the workspace and the brief forbids new deps; an
 * in-memory ref is sufficient for "once per session".
 *
 * Resets when the JS bundle reloads (cold start) — exactly matching
 * the web-side `sessionStorage` semantics described in the brief.
 */
let shownThisSession = false;

/** Returns true the FIRST time it's called per session, then false. */
export function markInboxZeroShown(): boolean {
  if (shownThisSession) return false;
  shownThisSession = true;
  return true;
}

/** Test/debug-only escape hatch — not used at runtime. */
export function _resetInboxZeroFlag() {
  shownThisSession = false;
}
