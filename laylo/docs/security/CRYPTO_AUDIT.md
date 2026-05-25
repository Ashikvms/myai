# BillBee — Cryptography Audit

**Auditor:** Cryptography Engineer
**Date:** 2026-04-28
**Scope:** Every place BillBee encrypts, signs, hashes, or verifies cryptographic material. READ-ONLY review; no code changed.
**Files reviewed:**
- `apps/api/src/services/crypto.ts` (AES-256-GCM)
- `apps/api/src/services/auth.ts` (JWT RS256 + bcrypt + refresh tokens)
- `apps/api/src/services/plaid.ts` (ES256 webhook verification)
- `apps/api/src/routes/plaid.ts` (webhook handler, encrypt-on-link, decrypt-on-remove)
- `apps/api/src/routes/auth.ts` (refresh-token cookie + logout)
- `apps/api/src/middleware/auth.ts` (Bearer-token gate)
- `apps/api/src/config/env.ts` (key validation)
- `apps/api/src/config/logger.ts` (sensitive-field redaction)
- `apps/api/src/index.ts` (helmet, CORS, raw-body ordering)
- `apps/api/prisma/schema.prisma` (RefreshToken / PlaidItem.accessTokenKeyVersion)
- `apps/api/src/__tests__/crypto.test.ts`

This audit assumes the prior `SECURITY_REVIEW_REPORT.md` findings (F1–F20) are tracked separately and does not re-derive them. Where this audit overlaps with that report, items are flagged "(see also Fxx)".

---

## 1. Executive summary

**Overall posture: STRONG on primitives, WEAK on lifecycle.** The cryptographic primitives themselves are textbook-correct: AES-256-GCM with a 12-byte random IV from `crypto.randomBytes`, 32-byte hex-validated key, auth-tag-verified decrypt, ES256 webhook verification with explicit algorithm allowlisting and `request_body_sha256` body-binding, JWT RS256 with `audience`/`issuer` enforcement, bcrypt cost-factor 12 for passwords. There is no MD5, no SHA-1, no `Math.random()` for security, no `alg: none` exposure, no token leakage in logs.

The meaningful risks live in **lifecycle and operational** layers around the primitives:

1. **Refresh-token rotation is O(N) and unscoped to user.** `rotateRefreshToken` (`apps/api/src/services/auth.ts:117-122`) and `logout` (`apps/api/src/routes/auth.ts:125-127`) both load **every** non-revoked refresh token in the database and run `bcrypt.compare` against each in a loop. At 10k active users this becomes a per-refresh DoS pattern (10k × 100ms bcrypt ≈ 17 minutes per refresh) AND a side-channel: total time leaks the size of the active-token set. This is the single biggest crypto-adjacent issue in the codebase.
2. **`accessTokenKeyVersion` schema field exists but is never written or read.** `PlaidItem.accessTokenKeyVersion` is declared in the Prisma schema (`apps/api/prisma/schema.prisma:369`), but no code path persists it on `PlaidItem.create`, and no code path reads it during decrypt. The version prefix in the ciphertext (`v1:…`) is parsed but never used to route to a key (only one key is loaded). Key rotation is documented as a feature but is not actually implemented (consistent with prior F16).
3. **Refresh-token TTL is 30 days with no idle timeout, no per-user cap, no reuse-detection.** A leaked refresh token is good for a month; rotating it does not invalidate the entire session family if reuse is detected.

Beyond those, two minor leaks are worth flagging quickly: `helmet()` is invoked with defaults (so HSTS is enabled, but no `preload`, no explicit CSP, `crossOriginEmbedderPolicy` left at default — fine for an API but worth documenting), and the JWT access-token TTL (15 min) is good but the refresh-cookie `Path` is too narrow (`/api/auth`) which will silently break refresh from any other path that needs it (not a vuln, but operationally important).

**Counts:** 0 CRITICAL · 3 HIGH · 6 MEDIUM · 5 LOW · 4 INFO

**Top 3 crypto concerns**
1. (HIGH) Unscoped O(N) bcrypt scan on every refresh / logout — DoS + timing side-channel.
2. (HIGH) `accessTokenKeyVersion` is declared but never written/read — key rotation is non-functional.
3. (HIGH) No refresh-token reuse detection or session-family revocation; TTL 30d is long for a stolen token.

**Already excellent (worth noting)**
- `services/crypto.ts` is genuinely good: format `v<n>:base64(iv‖tag‖ct)`, generic decrypt error, key cached after format check, no plaintext or ciphertext in error messages, dedicated `CryptoError` class. The unit-test suite covers tamper, wrong-key, empty input, and round-trip.
- ES256 webhook verification correctly does (a) explicit `algorithms: ['ES256']`, (b) `kid`-driven key fetch with 24h cache, (c) `iat ≤ 5 min` skew, (d) `request_body_sha256` recomputed against the raw request body. This is the textbook implementation pattern.
- Helmet is on, CORS is allowlisted, refresh token is `HttpOnly` + `SameSite=Strict` + `Secure` in production, sensitive fields are recursively redacted by Winston before any log line is written.

---

## 2. Findings table

| ID  | Sev      | Area              | Title                                                                  | File:line                                          |
|-----|----------|-------------------|------------------------------------------------------------------------|----------------------------------------------------|
| C1  | HIGH     | JWT / refresh     | Refresh-token rotation is unscoped + O(N) bcrypt scan                  | `apps/api/src/services/auth.ts:117-132`            |
| C2  | HIGH     | AES key rotation  | `accessTokenKeyVersion` schema field is never written or read          | `apps/api/prisma/schema.prisma:369`; `crypto.ts:88-96` |
| C3  | HIGH     | JWT / refresh     | No reuse-detection / session-family revocation on refresh tokens       | `apps/api/src/services/auth.ts:113-149`            |
| C4  | MEDIUM   | JWT / refresh     | Logout enumerates ALL non-revoked refresh tokens (cross-user)          | `apps/api/src/routes/auth.ts:125-137`              |
| C5  | MEDIUM   | JWT               | Access token has no `algorithms` allowlist on `jwtVerify`              | `apps/api/src/services/auth.ts:99-102`             |
| C6  | MEDIUM   | OAuth flow        | Google OAuth callback puts JWT in URL query string                     | `apps/api/src/routes/auth.ts:222-224`              |
| C7  | MEDIUM   | bcrypt            | Refresh-token bcrypt cost is 10 (vs 12 for passwords) — inconsistent   | `apps/api/src/services/auth.ts:81`                 |
| C8  | MEDIUM   | Decrypt on remove | Decrypt-failure during `/items DELETE` is logged but never alerted     | `apps/api/src/routes/plaid.ts:493-518`             |
| C9  | MEDIUM   | TLS / HSTS        | Helmet defaults — no HSTS `preload`, no explicit CSP for API           | `apps/api/src/index.ts:29`                         |
| C10 | LOW      | AES-GCM           | No AAD bound to ciphertext (e.g., `userId\|plaidItemId`)               | `apps/api/src/services/crypto.ts:64`               |
| C11 | LOW      | JWT               | No `nbf` claim set; no `jti` for revocation list                       | `apps/api/src/services/auth.ts:66-75`              |
| C12 | LOW      | Refresh cookie    | `SameSite=Strict` blocks cross-site GET-redirect refresh after OAuth   | `apps/api/src/routes/auth.ts:43, 56`               |
| C13 | LOW      | Encrypted at rest | Plaintext access token is held in JS `string` (immutable, GC-deferred) | `apps/api/src/routes/plaid.ts:381, 435`            |
| C14 | LOW      | RNG               | `Math.random()` used for toast ID — non-security, but flag             | `packages/ui/src/components/toast.tsx:139`         |
| C15 | INFO     | Hashes            | `cuid` (default Prisma `@default(cuid())`) is collision-resistant only — not crypto-secure | `apps/api/prisma/schema.prisma` (passim) |
| C16 | INFO     | Crypto agility    | No per-record `algId` byte — version prefix `v1:` is the only signal   | `apps/api/src/services/crypto.ts:51, 73`           |
| C17 | INFO     | Field encryption  | `BankAccount.officialName`, `mask`, `currentBalance` not encrypted at rest | `apps/api/prisma/schema.prisma:394-414`        |
| C18 | INFO     | Quantum readiness | RSA-2048 / ECDSA P-256 — no post-quantum migration plan documented     | `apps/api/src/services/auth.ts:41`                 |

---

## 3. Detailed findings

### C1 — HIGH — Refresh-token rotation is unscoped + O(N) bcrypt scan

**File:** `apps/api/src/services/auth.ts:117-132`

```ts
const storedTokens = await prisma.refreshToken.findMany({
  where: {
    revoked: false,
    expiresAt: { gt: new Date() },
  },
});

let matchedToken: (typeof storedTokens)[number] | null = null;
for (const stored of storedTokens) {
  const isMatch = await bcrypt.compare(oldToken, stored.tokenHash);
  if (isMatch) {
    matchedToken = stored;
    break;
  }
}
```

**Problem.** The `findMany` has no `userId` filter — it returns the entire active refresh-token table. Each refresh request then runs `bcrypt.compare` (cost 10 → ~70ms) against every row until a match is found, in declaration order. Consequences:

1. **DoS at scale.** At 10,000 active users with ~3 active tokens each = 30,000 `bcrypt.compare` calls × 70ms = ~35 minutes worst-case per refresh. Long before that threshold, a single refresh stalls the Node event loop because bcrypt's threadpool has only 4 default workers.
2. **Timing side-channel.** Wall-clock time of a `/refresh` response leaks the size of the active-token table (and, indirectly, MAU).
3. **Cross-user collision risk is theoretical.** A 48-byte (`crypto.randomBytes(48)`) raw token has 384 bits of entropy, so collisions are negligible — but the design pattern is wrong even if collisions are not.

**Why this is HIGH.** Production-traffic-affecting and an information leak via timing. Both are exploitable by any unauthenticated network observer who can hit `/api/auth/refresh`.

**Fix.** Store the token in two parts: `lookupId` (first N bytes, indexed) + `secret` (remaining bytes, bcrypt-hashed). Send both to the client as `<lookupId>.<secret>`. On verify: `findUnique({ where: { lookupId } })`, then a single `bcrypt.compare`. O(1) lookup, O(1) bcrypt. Alternatively, derive `lookupId = HMAC-SHA256(server_pepper, token)` so the DB never sees a usable plaintext.

---

### C2 — HIGH — `accessTokenKeyVersion` field is never written or read

**Files:**
- Schema declaration: `apps/api/prisma/schema.prisma:369` — `accessTokenKeyVersion Int @default(1)`
- Encrypt path that should write it: `apps/api/src/routes/plaid.ts:407-417` — `prisma.plaidItem.create({ data: { ... } })` — no `accessTokenKeyVersion` in the data object.
- Decrypt path that should read it: `apps/api/src/services/crypto.ts:88-96` — version is parsed from the ciphertext prefix but **the parsed version is discarded** (the comment even acknowledges this: "versionStr is parsed for forward-compat; current implementation has only v1.").
- Key resolver: `apps/api/src/services/crypto.ts:24-38` — only loads `env.ENCRYPTION_KEY`, no `Map<version, Buffer>`.

**Problem.** Three layers of "we will rotate keys someday" exist (schema column, ciphertext prefix, env var version) but none is wired up. The result is a false sense of security: an operator who runs the documented "key rotation" runbook will brick every existing PlaidItem because the new `ENCRYPTION_KEY` cannot decrypt ciphertext that was written with the old key, and there is no fallback map.

**Why this is HIGH.** Not an exploit today — it is a *latent operational outage*. The first time this is exercised (e.g., responding to a key compromise) is exactly the wrong time to discover the rotation path doesn't work.

**Fix.** Either:
- Implement it: `Map<number, Buffer>` keyed by version, populated from `ENCRYPTION_KEY_V1`, `ENCRYPTION_KEY_V2`, …; ciphertext-prefix dispatch in `decryptAccessToken`; write `accessTokenKeyVersion` on every `PlaidItem.create`; background re-encrypt job after rotation.
- Or remove the misleading scaffolding: drop the schema column, drop the version prefix, document "no rotation today; full re-link required on key change."

---

### C3 — HIGH — No refresh-token reuse detection or session-family revocation

**File:** `apps/api/src/services/auth.ts:113-149`

`rotateRefreshToken` revokes the old token and issues a new pair. But:

- There is no `parentTokenId` linking child to parent, so we cannot identify a "session family."
- If an attacker steals a refresh token and uses it before the legitimate user, the legitimate user's next `/refresh` call will fail with `INVALID_REFRESH_TOKEN` (the attacker's rotation revoked it). This is detectable but **the attacker's session continues uninterrupted**.
- Standard mitigation (RFC 6819 §5.2.2.3): on detected reuse of a revoked refresh token, revoke the entire family — every descendant token issued from the same root.

Combined with C1, the 30-day TTL, and no per-user concurrent-session cap, a stolen refresh token is a 30-day backdoor with no automatic detection.

**Fix.**
1. Add `parentTokenId String?` to `RefreshToken` (chain).
2. On `rotateRefreshToken`: if the presented token is `revoked: true` (i.e., already rotated once), walk the chain and revoke all descendants by family-id. Log a `SUSPECTED_REFRESH_REUSE` event.
3. Cap concurrent active refresh tokens per user (e.g., 5).

---

### C4 — MEDIUM — Logout enumerates ALL non-revoked refresh tokens (cross-user)

**File:** `apps/api/src/routes/auth.ts:125-137`

```ts
const storedTokens = await prisma.refreshToken.findMany({
  where: { revoked: false, expiresAt: { gt: new Date() } },
});
for (const stored of storedTokens) {
  const isMatch = await bcrypt.compare(token, stored.tokenHash);
  if (isMatch) { ... }
}
```

Same pathology as C1 (unscoped, O(N), bcrypt-bound), but on `POST /api/auth/logout`. Logout is unauthenticated (no `requireAuth`), which means an unauthenticated attacker can hit `/logout` repeatedly with a junk cookie and exhaust bcrypt threadpool capacity for the whole API.

**Fix.** Same fix as C1 (lookup-id pattern). Additionally, `logout` should require an authenticated request (the access token is short-lived; if the user has it, prove it).

---

### C5 — MEDIUM — Access-token `jwtVerify` does not pin `algorithms`

**File:** `apps/api/src/services/auth.ts:99-102`

```ts
const { payload } = await jwtVerify(token, publicKey, {
  issuer: 'life-admin-api',
  audience: 'life-admin',
});
```

`jose` does pin to the key's algorithm internally when an asymmetric key is provided, so an `alg: none` or HS256 downgrade is rejected in practice. **But** the webhook verifier (`services/plaid.ts:280`) explicitly passes `algorithms: ['ES256']`, and the access-token verifier should match that defense-in-depth pattern. A future maintainer who swaps the key import to a symmetric secret would silently accept HS256 unless the allowlist is explicit.

**Fix.** Change to:
```ts
await jwtVerify(token, publicKey, {
  issuer: 'life-admin-api',
  audience: 'life-admin',
  algorithms: ['RS256'],
  clockTolerance: '5s',
});
```

(Also add `clockTolerance` — current implementation has zero tolerance for clock skew, which can flake at the 15-min boundary across NTP-drifted hosts.)

---

### C6 — MEDIUM — Google OAuth callback puts JWT in URL query string

**File:** `apps/api/src/routes/auth.ts:222-224`

```ts
const redirectUrl = new URL('/auth/callback', env.APP_URL);
redirectUrl.searchParams.set('accessToken', accessToken);
res.redirect(redirectUrl.toString());
```

JWTs in URLs leak via:
- Browser history / autofill
- HTTP `Referer` header on subsequent navigations
- Server access logs (Vercel, Cloudflare, any proxy in front)
- Browser extension URL trackers

The refresh cookie is set correctly (HttpOnly), but the access token rides in the query string for the duration of the callback page load. Even though the access token is short-lived (15 min), it's enough for a referrer-leak exploit.

**Fix.** Use the `postMessage` + opener pattern (popup) or set a short-lived `httpOnly` `accessToken` cookie scoped to `/api/auth/callback` that is exchanged for an in-memory token by the SPA before being cleared. Alternatively, use the OAuth2 PKCE + form-post response mode.

---

### C7 — MEDIUM — Inconsistent bcrypt cost factors

**File:** `apps/api/src/services/auth.ts:57, 81`

- Password: `bcrypt.hash(password, 12)` — OWASP-recommended minimum.
- Refresh token: `bcrypt.hash(token, 10)` — OWASP-deprecated since 2023.

The refresh token has 384 bits of entropy so the cost factor matters less for brute-force, but consistency matters. More importantly, the lower cost was probably chosen to mitigate the C1 O(N) scan — which is the wrong fix to the wrong problem.

**Fix.** After implementing the lookup-id fix from C1, raise to cost 12 across the board. With O(1) lookup, the per-request bcrypt cost is irrelevant.

---

### C8 — MEDIUM — Decrypt failure during `/items DELETE` is logged but never alerted

**File:** `apps/api/src/routes/plaid.ts:493-518`

The route correctly distinguishes "Plaid is down" from "GCM auth-tag mismatch / wrong key" and escalates the latter to `logger.error` with prefix `TAMPER_SUSPECTED:`. **However:**

- There is no Sentry / PagerDuty / on-call wiring (`SENTRY_DSN` is in env but unused — confirmed by prior F13).
- The user request continues with a soft-delete regardless. If the ciphertext is genuinely tampered, we destroy the only copy of evidence by soft-deleting the row.
- Repeated decrypt failures across many items would be a strong signal of key compromise or DB corruption — there is no metric or threshold that surfaces this.

**Fix.**
- Wire Sentry (or `console.error` to stderr where the platform aggregates) for any `TAMPER_SUSPECTED` log line.
- On decrypt failure during `/items DELETE`, hold the row in a `TAMPER_QUARANTINE` status instead of soft-deleting.
- Add a counter metric `plaid.decrypt_failures{reason}` and alert on `> 3 in 1h`.

---

### C9 — MEDIUM — Helmet defaults — no explicit HSTS preload, no API-tailored CSP

**File:** `apps/api/src/index.ts:29` — `app.use(helmet());`

Helmet's defaults give:
- `Strict-Transport-Security: max-age=15552000; includeSubDomains` — but no `preload`. For a financial app the recommendation is `max-age=63072000; includeSubDomains; preload` and submission to the HSTS preload list.
- Default CSP from Helmet is page-oriented and overly permissive for a JSON API. An API CSP should be `default-src 'none'; frame-ancestors 'none'`.
- `crossOriginResourcePolicy: same-origin` — fine, but the web frontend on a different subdomain (Vercel) will be blocked unless adjusted.

**Fix.**
```ts
app.use(helmet({
  hsts: { maxAge: 63072000, includeSubDomains: true, preload: true },
  contentSecurityPolicy: {
    directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] },
  },
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
```

---

### C10 — LOW — No AAD bound to ciphertext

**File:** `apps/api/src/services/crypto.ts:64`

```ts
const cipher = createCipheriv(ALGORITHM, key, iv);
// no cipher.setAAD(...)
```

Today this is fine — the auth tag binds IV + ciphertext, and we don't have a confused-deputy scenario (each ciphertext is associated with exactly one PlaidItem row). But binding `userId|plaidItemId` as AAD would prevent a future bug where a SQL operation accidentally swaps `accessTokenCiphertext` between rows: the decrypt would fail loudly instead of returning a valid plaintext for the wrong item.

**Fix (defense in depth).** `cipher.setAAD(Buffer.from(`${userId}|${plaidItemId}`))` on encrypt; same on decrypt. Requires passing `userId, plaidItemId` into `encryptAccessToken`/`decryptAccessToken` (changes the signature — schedule with the C2 rotation work).

---

### C11 — LOW — Access token has no `nbf`, no `jti`

**File:** `apps/api/src/services/auth.ts:66-75`

The access token sets `iss`, `aud`, `iat`, `exp`, `sub`, but no `nbf` (not-before) and no `jti` (token ID). Without `jti`:

- We cannot maintain a token revocation list (e.g., "force logout this user" cannot kill in-flight access tokens; we have to wait the 15 min for natural expiry).
- We cannot distinguish two access tokens issued in the same second.

**Fix.** Add `.setJti(crypto.randomUUID())` and `.setNotBefore('0s')` to `SignJWT`. If you want force-logout, also maintain a small Redis set of revoked `jti` values with TTL = access-token lifetime.

---

### C12 — LOW — Refresh cookie `SameSite=Strict` may block legitimate flows

**File:** `apps/api/src/routes/auth.ts:43, 56` — `SameSite=Strict`

`Strict` means the cookie is **not** sent on cross-site top-level navigations. The Google OAuth callback redirects from `accounts.google.com` → `api.yourdomain.com/api/auth/google/callback` → `app.yourdomain.com/auth/callback` — the second hop is cross-site to the third. After OAuth, the SPA cannot immediately call `/api/auth/refresh` from `app.yourdomain.com` because the freshly-set `Strict` cookie won't be attached on the initial navigation.

**Fix.** Use `SameSite=Lax` for the refresh cookie. `Lax` still blocks CSRF on POST/PUT/DELETE but allows the cookie on top-level GET navigations. The CSRF concern on `POST /api/auth/refresh` is already mitigated by (a) the cookie being scoped to `/api/auth`, (b) CORS allowlist, and (c) the request requiring the cookie to be sent (no CSRF token possible without the cookie being readable by JS, which it isn't).

---

### C13 — LOW — Plaintext access token held in JS `string`

**File:** `apps/api/src/routes/plaid.ts:381, 435`

```ts
exchanged = await exchangePublicToken(parsed.data.publicToken);
// ... encrypt ...
exchanged.accessToken = '';  // line 435 — best-effort scrub
```

The "scrub" reassigns the property but the original `string` lives until V8 GCs it (Node strings are immutable, so the original allocation is unreachable but not zeroed). This is the standard Node limitation and the comment `// Best-effort scrub of in-memory plaintext` correctly acknowledges it. **Out of scope per the audit checklist** — flagged here only for completeness.

**Fix.** Not actionable in pure-Node. Mitigation is process-level (no core dumps; restrict `/proc/<pid>/mem` access; rotate encryption keys regularly).

---

### C14 — LOW — `Math.random()` used for toast IDs

**File:** `packages/ui/src/components/toast.tsx:139`

```ts
const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
```

Non-security use (DOM key uniqueness for a transient UI element). Flagged per the checklist — no action required.

---

### C15 — INFO — `cuid` is collision-resistant only

**File:** `apps/api/prisma/schema.prisma` (every `@id @default(cuid())`)

`cuid` (and `cuid2`) is designed for collision resistance and horizontal scalability, not unpredictability. It encodes a timestamp + counter + machine fingerprint + random component. The random component uses `Math.random()` in cuid v1 and `crypto.getRandomValues()` in cuid v2 — verify which version Prisma is using.

For BillBee's threat model this is fine: every cuid is scoped to `userId` in queries (per prior F-section pass list B5), so even a guessable cuid does not yield an IDOR. **Do not rely on cuid as a secret.** No action needed.

---

### C16 — INFO — Single-byte version prefix

**File:** `apps/api/src/services/crypto.ts:51, 73` — format `v<n>:base64(...)`

The version is encoded as `v1:`, `v2:`, etc. There is no algorithm identifier. If we ever switch from AES-256-GCM to (e.g.) ChaCha20-Poly1305 or AES-256-GCM-SIV, the version prefix conflates "key version" and "algorithm version." Recommend extending the format to `v<n>:<algId>:base64(...)` before any algorithm change.

---

### C17 — INFO — Adjacent fields not encrypted at rest

**File:** `apps/api/prisma/schema.prisma:394-414`

`BankAccount` stores `name`, `officialName`, `mask` (last 4), `currentBalance`, `availableBalance`, `creditLimit` in plaintext. A DB compromise yields balance + bank + last-4 for every linked account — sufficient for very targeted phishing.

If a future threat model requires field-level encryption beyond the access token, the natural targets are:
- `mask` (always — never used in queries)
- `officialName` (rarely used in UI)
- `currentBalance` / `availableBalance` (used in totals — would need application-level decryption on every dashboard query, $$)

For now, Postgres TDE (Railway provides this) is the right answer for at-rest protection.

---

### C18 — INFO — No documented post-quantum migration plan

**File:** `apps/api/src/services/auth.ts:41` (RSA via `importPKCS8`), `services/plaid.ts:280` (ES256 = ECDSA P-256)

NIST PQC standards (ML-KEM, ML-DSA, SLH-DSA) finalised August 2024. No urgency for a 2026 financial app — but a 1-page runbook ("when CA / Plaid offer hybrid X25519+ML-KEM, here is how we cut over") prevents a scramble in 5–10 years.

---

## 4. Quick wins (≤ 1 day each)

| # | Action | File | Impact |
|---|--------|------|--------|
| 1 | Pass `algorithms: ['RS256']` + `clockTolerance: '5s'` to access-token `jwtVerify` | `services/auth.ts:99` | Closes C5 |
| 2 | Cap helmet HSTS to `maxAge: 63072000, preload: true` and add API-tailored CSP | `index.ts:29` | Closes C9 |
| 3 | Set refresh cookie `SameSite=Lax` (not Strict) | `routes/auth.ts:43, 56` | Closes C12 |
| 4 | Remove access-token from the OAuth callback URL — set short-lived HttpOnly cookie + redirect, SPA reads via `/api/auth/me` | `routes/auth.ts:222-224` | Closes C6 |
| 5 | Raise refresh-token bcrypt cost to 12 (paired with quick-win 6) | `services/auth.ts:81` | Closes C7 |
| 6 | Either delete the dead `accessTokenKeyVersion` schema field + version prefix, OR write a one-page "this is not implemented" notice in CLAUDE.md and a TODO at `crypto.ts:88` | schema.prisma + crypto.ts | Mitigates C2 (does not fix it, but stops the false sense of security) |
| 7 | Add `requireAuth` to `POST /api/auth/logout` | `routes/auth.ts:113-148` | Mitigates C4 (still O(N) but only authenticated users can trigger) |
| 8 | Wire Sentry `init` with a `beforeSend` scrubber that strips `accessToken*`, `Authorization`, `cookie`, `passwordHash`, `tokenHash` | `index.ts` | Closes prior F13 + makes C8 alertable |

---

## 5. Long-term recommendations

1. **Refresh-token redesign (C1, C3, C4 in one stroke).** Move to `<lookupId>.<secret>` format with HMAC-derived `lookupId` for O(1) lookup, plus session-family chaining for reuse detection. This is a 1-week project but eliminates the biggest crypto-adjacent risk surface.

2. **Real key rotation (C2).** Build the `Map<version, Buffer>` resolver, the `accessTokenKeyVersion` write/read paths, and a background re-encrypt job. Document the runbook (env var `ENCRYPTION_KEY_V<n>`, deploy, run `re-encrypt-plaid-tokens` job, drop old key from env). Test it once a quarter.

3. **AAD binding (C10).** When you touch `crypto.ts` for C2, also bind `userId|plaidItemId` as AAD. Schema already has both fields available at the call sites.

4. **JWT lifecycle (C11).** Add `jti` and a Redis-backed revocation list with TTL = access-token lifetime. Enables force-logout, password-reset-invalidates-sessions, and incident response.

5. **Observability for crypto failures (C8).** Wire Sentry; expose Prometheus metrics for `decrypt_failures`, `webhook_signature_failures`, `refresh_token_reuse_detected`. Define alert thresholds.

6. **HSTS preload submission (C9).** Once the `apex.yourdomain.com` and `api.yourdomain.com` are stable on HTTPS-only with `max-age >= 1y; includeSubDomains; preload`, submit to https://hstspreload.org/.

7. **Field-level encryption (C17).** Defer until the threat model warrants it. When/if it does, evaluate `pgsodium` or a service-side envelope-encryption with KMS rather than re-rolling AES-GCM in app code.

8. **PQ readiness (C18).** Track NIST PQC adoption in TLS libraries. No code action this year; plan a hybrid X25519+ML-KEM cutover when our CA and Plaid both support it.

---

## 6. Out-of-scope confirmations

- **TLS termination** is provided by Railway (API) and Vercel (web). No certificate management in our code.
- **Mobile certificate pinning** — explicitly not needed per the audit checklist.
- **In-memory secret zeroing** — Node strings are immutable; flagged out-of-scope per checklist (C13).
- **`npm audit`** — could not be executed in this read-only audit; recommend running before next prod deploy.

---

**Recommendation:** GO for sandbox traffic. Address C1, C2, C3 before any production user with real bank credentials. Quick-wins 1–8 should land within the next sprint.
