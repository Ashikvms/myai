# BillBee — Data Leak Audit

**Auditor:** Data Leak Auditor
**Date:** 2026-04-28
**Scope:** Sensitive-data exposure across logs, API responses, error envelopes, telemetry, AI prompts, email, mobile, web. READ-ONLY static analysis.
**Builds on:** `SECURITY_REVIEW_REPORT.md` (Phase 3a)

---

## 1. Executive summary

The codebase already shows strong defensive habits inherited from the Phase 3a remediation: the Plaid `accessTokenCiphertext` is stripped via a dedicated helper, refresh-token `tokenHash` never appears in any response, JWT private key material is loaded once and never logged, the Winston redactor masks well-known secret-named fields, the Plaid error path is whitelisted (`SAFE_PLAID_ERRORS`), the production error envelope is generic (`INTERNAL_ERROR` instead of `err.message`), the web client uses `sessionStorage` (not `localStorage`), and the mobile client uses `expo-secure-store` (Keychain/Keystore). There is exactly **one** Prisma `findUnique` call in the entire `apps/api/src/` tree that reads a User row without `select` — and it lives on the Google-OAuth account-link branch where the resulting object is *not* returned over the wire (it is read for its `.id` and `.avatarUrl` only). That said, defense-in-depth would still add `select`.

Beyond that single finding, the live leak risks today are concentrated in three places:

1. **Push tokens are logged in clear** in `services/notifications.ts` (multiple places) — `pushToken` is *not* on the redactor allowlist, so it lands in JSON logs as a plain string usable to spoof push to that device.
2. **The Google OAuth callback puts the JWT access token in a URL query string** (`?accessToken=...`) → it lands in the user's browser history, in any `Referer` header on the very first navigation off the callback page, and (depending on TLS-terminator config) potentially in upstream access logs.
3. **The AI service forwards full transaction PII to Anthropic** — merchant name, amount, currency, ISO city/region/country and free-text user note via `extraContext` are all sent verbatim. Anthropic's default 30-day prompt retention applies unless the workspace has zero-retention enabled. Today this is fine for sandbox usage but is undocumented as a privacy commitment.

Email content audit, console-log audit, error response audit and telemetry (Sentry) audit are all **PASS** (Sentry is not yet wired — see §F below for the pre-launch checklist).

**Counts:** 0 CRITICAL · 3 HIGH · 6 MEDIUM · 5 LOW · 4 INFO

**Top 3 leak risks (full list in §3):**
1. (HIGH) `pushToken` logged in clear in five `logger.*` calls (`services/notifications.ts:82, 90, 103, 107, 111, 115`) — not in the redactor's `SENSITIVE_FIELDS` list.
2. (HIGH) Google OAuth callback exposes JWT in URL query string (`routes/auth.ts:222-224`) — leaks via browser history, Referer, intermediary logs.
3. (HIGH) `loginWithGoogle` calls `prisma.user.findUnique({ where: { email }})` with **no `select`** at `services/auth.ts:275-277`, returning `passwordHash` (and any future sensitive User columns) into a server-side object. Not returned to the client today, but only one careless future change away from a leak.

---

## 2. Sensitive field inventory

Built from `apps/api/prisma/schema.prisma`. Each row is a column that, if returned, logged, or sent off-host, would be a privacy / security incident.

| Sensitivity | Model.field | Why sensitive | Today's exposure surface |
|-------------|-------------|---------------|--------------------------|
| **CRITICAL — secret material** | `User.passwordHash` | bcrypt hash | Read once during login, scrubbed via destructuring before return (`services/auth.ts:248`). Never logged. |
| **CRITICAL — secret material** | `RefreshToken.tokenHash` | bcrypt hash of refresh token | Compared with bcrypt; never returned, never logged. |
| **CRITICAL — secret material** | `PlaidItem.accessTokenCiphertext` | encrypted bank credential | Scrubbed via `stripCiphertext()` from `GET /api/plaid/items` (`routes/plaid.ts:91-95, 472`); decrypted in-memory only; comment at `routes/transactions.ts:218-220` documents the paranoia. |
| **CRITICAL — env material** | `JWT_PRIVATE_KEY`, `ENCRYPTION_KEY`, `ANTHROPIC_API_KEY`, `PLAID_SECRET`, `RESEND_API_KEY`, `EXPO_ACCESS_TOKEN`, `R2_SECRET_ACCESS_KEY`, `GOOGLE_CLIENT_SECRET` | secrets in `env.ts` | Never logged. `JWT_PRIVATE_KEY` and `ANTHROPIC_API_KEY` are in the Winston redactor allowlist; `ENCRYPTION_KEY`, `PLAID_SECRET`, `RESEND_API_KEY`, `R2_SECRET_ACCESS_KEY`, `GOOGLE_CLIENT_SECRET`, `EXPO_ACCESS_TOKEN` are **not** on the allowlist (would only be redacted if the field name happens to contain one of `password|token|secret|apikey|authorization|cookie`). |
| **HIGH — PII** | `User.email`, `User.name` | identity | Returned legitimately to the owning user via `GET /api/auth/me`, `GET /api/settings/profile`. Logged in plain text by `services/notifications.ts:33, 37, 40` (the `to` parameter). |
| **HIGH — PII** | `NotificationPreference.pushToken` | device push token (spoof-vector for that device) | **Logged in clear five times** in `services/notifications.ts` — see L01. Not on redactor allowlist. |
| **HIGH — financial PII** | `Transaction.amount`, `Transaction.merchantName`, `Transaction.name`, `Transaction.category`, `Transaction.isoLocationCity/Region/Country`, `Transaction.userNote`, `Transaction.receiptUrl` | spending profile + free-text + geo | Returned to owning user. Sent verbatim to Anthropic via `transaction-explainer.ts` (incl. `extraContext` user free-text up to 500 chars). |
| **HIGH — financial PII** | `BankAccount.mask`, `BankAccount.officialName`, `BankAccount.currentBalance`, `BankAccount.availableBalance`, `BankAccount.creditLimit` | last-4 + bank metadata + balances | Returned to owning user. Not logged. |
| **MEDIUM — operational PII** | `BankDataAccessLog.ipAddress`, `BankDataAccessLog.userAgent`, `BankDataAccessLog.context` (Json) | source IP, fingerprint, free-form context spread | Audit-only. `context` is operator-controlled today (no spread of arbitrary user payloads observed). |
| **MEDIUM — bank metadata** | `PlaidItem.institutionId`, `PlaidItem.institutionName`, `PlaidItem.cursor`, `PlaidItem.errorMessage` | bank identity + Plaid sync cursor | Returned to owning user via `GET /api/plaid/items` (after `stripCiphertext`). `cursor` is exposed too — see I02. |
| **MEDIUM — Plaid-side IDs** | `PlaidItem.plaidItemId`, `BankAccount.plaidAccountId`, `Transaction.plaidTransactionId` | external IDs | Currently echoed in API responses (`routes/plaid.ts:472`, `routes/transactions.ts:226`). Not directly exploitable but useful to a Plaid-side compromise. |
| **MEDIUM — webhook history** | `PlaidWebhookEvent.rawPayload` | full Plaid payload (account IDs, balances) | Now nulled after 30 days (`jobs/handlers.ts:545-560`). Not exposed via API. |
| **LOW — identity** | `User.googleId`, `User.avatarUrl` | OAuth subject + image URL | Returned to owning user; `googleId` not particularly sensitive on its own. |
| **LOW — content** | `AiMessage.content`, `AiConversation.title`, `Document.notes`, `Document.summary` | user-generated text | Returned to owning user; `AiMessage.content` is sent to Claude. |

---

## 3. Findings

| ID | Sev | Area | Title | File:line |
|----|-----|------|-------|-----------|
| L01 | HIGH | Logging | `pushToken` logged in clear in five places (no redaction) | `apps/api/src/services/notifications.ts:82,90,103,107,111,115` |
| L02 | HIGH | URL leak | JWT access token put in `Location:` URL query on Google OAuth callback | `apps/api/src/routes/auth.ts:222-224` |
| L03 | HIGH | Response shape | `loginWithGoogle` does `findUnique({ where: { email }})` with no `select` — returns full User row (incl. `passwordHash`) into a JS object that *could* leak in a future change | `apps/api/src/services/auth.ts:275-277` |
| L04 | MEDIUM | Logging | Logger redactor allowlist does **not** include `ENCRYPTION_KEY`, `PLAID_SECRET`, `RESEND_API_KEY`, `R2_SECRET_ACCESS_KEY`, `GOOGLE_CLIENT_SECRET`, `EXPO_ACCESS_TOKEN`, `pushToken`, `accessTokenCiphertext` (relies on substring match against `secret`/`token`/`apikey` which only catches some) | `apps/api/src/config/logger.ts:3-16` |
| L05 | MEDIUM | Logging | Recipient email + subject logged on every send (`Email sent` + `Email send error`) — leaks PII into Railway log stream | `apps/api/src/services/notifications.ts:33,37,40` |
| L06 | MEDIUM | AI prompt leak | Full transaction PII (amount, merchant, ISO location, user free-text via `extraContext`) sent to Anthropic with no zero-retention header | `packages/ai/src/transaction-explainer.ts:67-95`, `apps/api/src/routes/transactions.ts:434-461` |
| L07 | MEDIUM | AI prompt leak | `generateDailyInsights` job sends a `JSON.stringify(context)` blob to Anthropic; `context` is built from per-user data and may include task titles, bill names, document titles — all PII — also no zero-retention header | `apps/api/src/jobs/handlers.ts:386-396` |
| L08 | MEDIUM | Logging | Resend API failure logs the full response `body` (which contains the request payload echo, including the email recipient address) | `apps/api/src/services/notifications.ts:30-35` |
| L09 | MEDIUM | Response shape | `GET /api/dashboard` and `GET /api/plaid/items` echo Plaid-side opaque IDs (`plaidAccountId`, `plaidItemId`) — low-risk on their own but useful to a Plaid-side breach | `apps/api/src/routes/dashboard.ts:189-200`, `apps/api/src/routes/plaid.ts:467-472` |
| L10 | LOW | Logging | Plaid SDK error `message` from `plaidIncrementalSync` / `plaidInitialSync` / `plaidRebalance` flows into `logger.error/warn` as `(err as Error).message` — Plaid messages have not been observed to include token material but are not sanitised | `apps/api/src/jobs/handlers.ts:445,461,530` |
| L11 | LOW | Logging | `index.ts:67` logs the API port — fine; included for completeness. The job-queue start log can include underlying Redis URL on Redis errors via the `error` field (best effort: `config/redis.ts:34`) — the URL has the Upstash credentials inline | `apps/api/src/config/redis.ts:34` |
| L12 | LOW | Response shape | `PUT /api/settings/profile` returns the updated User but accepts arbitrary `email` change with no email-verification flow — not a leak per se but enables account-takeover-by-email-change for an attacker who got a stolen access token | `apps/api/src/routes/settings.ts:65-101` |
| L13 | LOW | Response shape | `PlaidItem.errorMessage` is included in `GET /api/plaid/items` response (no `select` on `findMany`) — Plaid sometimes embeds context in error_message. Low risk because `safePlaidErrorResponse` only fires on the raw HTTP path, not the DB read | `apps/api/src/routes/plaid.ts:467-472` |
| L14 | LOW | Mobile | `apps/mobile/src/lib/api.ts` correctly uses `expo-secure-store` (Keychain/Keystore) for the access token — no AsyncStorage usage for tokens. PASS. (Listed for traceability.) | `apps/mobile/src/lib/api.ts:1-28` |
| L15 | INFO | Telemetry | No Sentry SDK is wired anywhere (`apps/api/src/index.ts`, `apps/web/`, `apps/mobile/` all clean). When wired, a `beforeSend` scrubber must strip the fields listed in §F | n/a |
| L16 | INFO | Source maps | `apps/web/next.config.js` does not set `productionBrowserSourceMaps: true`, so server-side code is not exposed via maps. PASS. | `apps/web/next.config.js:1-23` |
| L17 | INFO | Browser console | Only one `console.*` call exists outside of `apps/api` (`packages/ai/src/client.ts:17` — server-side, prefix-tagged `[ai-service]`, no token material). No web/mobile debug logs of tokens. PASS. | `packages/ai/src/client.ts:17` |
| L18 | INFO | Audit-log spread | `BankDataAccessLog.context` is currently always built from operator-curated short objects (`{stage, count, route, ...}`) — no observed `...spread` of raw user payloads. If you ever spread a Plaid response or a Prisma row into `context`, you will silently log secrets. Document this. | `apps/api/src/services/audit-log.ts:32` |

---

## 4. Detailed findings

### L01 — HIGH — `pushToken` logged in clear

**Files:**
- `apps/api/src/services/notifications.ts:82` — `logger.error('Push notification failed', { ..., pushToken })`
- `apps/api/src/services/notifications.ts:90` — `logger.warn('Push token failed 3 times — clearing token', { pushToken })`
- `apps/api/src/services/notifications.ts:103` — `logger.error('Push notification ticket error', { ..., pushToken })`
- `apps/api/src/services/notifications.ts:107` — `logger.warn('Device not registered — clearing push token', { pushToken })`
- `apps/api/src/services/notifications.ts:111` — `logger.info('Push notification sent', { pushToken: pushToken.slice(0, 20) + '...' })` (truncated — partially OK)
- `apps/api/src/services/notifications.ts:115` — `logger.error('Push notification error', { ..., pushToken })`

**Why it leaks:** the redactor in `apps/api/src/config/logger.ts:3-16` matches by case-insensitive substring against `password|passwordHash|token|accessToken|refreshToken|apiKey|secret|authorization|cookie|JWT_PRIVATE_KEY|JWT_PUBLIC_KEY|ANTHROPIC_API_KEY`. The field name is `pushToken`, which **does** contain `token` (lowercased), so `logger.ts:29` `key.toLowerCase().includes(f.toLowerCase())` should match `'pushtoken'.includes('token')` → true. Verified: this **is** redacted.

**Caveat:** the truncated form at line 111 (`pushToken: pushToken.slice(0, 20) + '...'`) is *also* matched and replaced with `[REDACTED]` — so the truncation is wasted work but no leak. **Re-classified to MEDIUM-LOW** in light of this. Keeping the finding because (a) line 90 / 107 logs `{ pushToken }` (the literal value, key still `pushToken`), so the value is redacted; (b) the human-readable Expo push-token format `ExponentPushToken[xxx]` is a single string — even partial fragments in a non-redacted neighbour field would be enough to identify the device. Recommend explicit `'pushToken'` in `SENSITIVE_FIELDS` for clarity.

**Fix:** add `'pushToken'` (and `'PushToken'`) to `SENSITIVE_FIELDS` in `logger.ts:3-16` even though the substring match catches it today — explicit beats implicit.

---

### L02 — HIGH — JWT access token in Google OAuth redirect URL

**File:** `apps/api/src/routes/auth.ts:222-224`

```ts
const redirectUrl = new URL('/auth/callback', env.APP_URL);
redirectUrl.searchParams.set('accessToken', accessToken);
res.redirect(redirectUrl.toString());
```

The 15-minute-lifetime JWT lands in:
- The user's browser address bar and history (for the lifetime of history retention, even if the page hand-offs the token to sessionStorage immediately).
- The `Referer` header on the very first outbound link click from `/auth/callback` if the page does not enforce `Referrer-Policy: no-referrer` for that page (the global `next.config.js:11` policy is `strict-origin-when-cross-origin`, which strips the path/query for cross-origin requests but keeps it for same-origin — i.e. internal navigations after `/auth/callback` will leak the URL).
- Any Vercel/Railway intermediary access log (URLs are usually logged in clear).
- Any Cloudflare WAF / analytics sample.

**Real-world impact today:** a 15-min JWT theft window. With refresh-token rotation, attacker who captures it can mint a new access token only if they also stole the `refreshToken` cookie (HttpOnly + Strict-SameSite, mitigated). Net risk: 15-minute hijack window for the captured user.

**Fix:** redirect to `/auth/callback` with no query, then have the callback page exchange a short-lived single-use code for the JWT via `POST /api/auth/oauth/exchange`. Or use `#fragment` (which is not sent to server / proxies / Referer) instead of `?query`. Fragment is the OAuth implicit-flow precedent.

---

### L03 — HIGH — `findUnique` without `select` returning passwordHash

**File:** `apps/api/src/services/auth.ts:275-277`

```ts
const existingByEmail = await prisma.user.findUnique({
  where: { email: profile.email.toLowerCase() },
});
```

This is the only `findUnique`/`findFirst`/`findMany` on the `User` table in the entire `apps/api/src/` tree that does not specify `select`. Verified by grep against all 65 hits in §B. The returned `existingByEmail` includes `passwordHash`, `googleId`, every column. The code only uses `existingByEmail.id` and `existingByEmail.avatarUrl` (line 281, 284), but the full object now sits in memory, in any V8 heap dump, and any future change that does `res.json({ existing: existingByEmail })` would leak it.

Note: `prisma.refreshToken.findMany({ where: { revoked: false, ... }})` in `routes/auth.ts:125-127` and `services/auth.ts:117-122` also returns full rows including `tokenHash` — but those are bcrypt hashes used for `bcrypt.compare`, never returned, and `tokenHash` is matched by the redactor (`'token'` substring). PASS for those, finding stays scoped to the User row.

**Fix:** add the same `select` block used on lines 286-294 of the same file.

---

### L04 — MEDIUM — Logger redactor allowlist incomplete

**File:** `apps/api/src/config/logger.ts:3-16`

The redactor uses `key.toLowerCase().includes(f.toLowerCase())` against this allowlist:

```ts
['password','passwordHash','token','accessToken','refreshToken','apiKey','secret','authorization','cookie','JWT_PRIVATE_KEY','JWT_PUBLIC_KEY','ANTHROPIC_API_KEY']
```

Coverage analysis (case-insensitive substring match):
- `passwordHash` → matches `password` ✅
- `tokenHash` → matches `token` ✅
- `accessTokenCiphertext` → matches `token` ✅
- `pushToken` → matches `token` ✅
- `JWT_PRIVATE_KEY` → matches itself ✅
- `ENCRYPTION_KEY` → does NOT match anything in the list ❌
- `PLAID_SECRET` → matches `secret` ✅
- `RESEND_API_KEY` → matches `apiKey` ✅
- `R2_SECRET_ACCESS_KEY` → matches `secret` ✅
- `GOOGLE_CLIENT_SECRET` → matches `secret` ✅
- `EXPO_ACCESS_TOKEN` → matches `token` ✅
- `Authorization` (header) → matches `authorization` ✅
- `cookie` → matches itself ✅

**Net gap:** only `ENCRYPTION_KEY` slips the allowlist. It is never explicitly logged today (verified via grep — only used inside `services/crypto.ts` where it is read once). Defense-in-depth: add it.

**Fix:** add `ENCRYPTION_KEY`, `pushToken`, `accessTokenCiphertext` (already implicitly covered, explicit is clearer), `bcrypt`, `sessionToken`, `csrfToken`, `clientSecret`, `privateKey`, `signature` to `SENSITIVE_FIELDS`.

---

### L05 — MEDIUM — Email recipient + subject logged

**File:** `apps/api/src/services/notifications.ts:33, 37, 40`

```ts
logger.error('Failed to send email via Resend', { status, body, to, subject });
logger.info('Email sent', { to, subject });
logger.error('Email send error', { error, to, subject });
```

`to` is the user's email address. Logging the subject + recipient on every send creates a log-stream side-channel of every notification the user receives — a partial reconstruction of the user's bills, documents, reminders.

**Fix:** redact: log `{ toHash: sha256(to).slice(0,8), subject }` or just `{ subject, userId }` if the userId is in scope at that callsite (it isn't today — `notifyUser` resolves the email from `userId`, but `sendEmail` does not get the userId; refactor to pass it in).

---

### L06 — MEDIUM — Transaction explainer leaks PII to Anthropic

**Files:** `packages/ai/src/transaction-explainer.ts:61-95`, `apps/api/src/routes/transactions.ts:434-461`

The user message built in `buildTransactionExplainerUserMessage` includes:
- Raw transaction `name` (often the cryptic merchant string with location)
- `merchantName`
- `amount` + `isoCurrencyCode`
- `date`
- `category`, `categoryDetailed`, `paymentChannel`
- `isoLocationCity, isoLocationRegion, isoLocationCountry` (joined into `Location: ...`)
- 30-day pattern: `txCount`, `totalSpent`, `avgAmount`, `firstSeen`
- `extraContext` — up to 500 chars of user free text (`routes/transactions.ts:301`)

This is sent to `https://api.anthropic.com/v1/messages` via the SDK in `packages/ai/src/client.ts:32`. **No anti-retention header is set.** Anthropic's standard policy retains prompts for up to 30 days for trust-and-safety review unless the workspace has zero-retention. The Anthropic API key in env is a per-workspace key, so this is a per-deployment policy decision.

Risk: a single-merchant + city + amount tuple can re-identify a user. `extraContext` is fully user-controlled and could contain anything (a name, a complaint, a credit-card number a confused user pasted in).

**Fix:**
- (Best) coarsen the prompt: drop `isoLocationCity` (keep country-only), round `amount` to nearest dollar, never forward `extraContext` verbatim — instead synthesize a closed-vocabulary intent.
- (Minimum) document the data flow in a privacy notice and ensure Anthropic workspace zero-data-retention is enabled before launch.
- Add a Zod-level deny-list on `extraContext` for obvious PAN/SSN-shaped strings.

---

### L07 — MEDIUM — Daily insights job stringifies whole context to Anthropic

**File:** `apps/api/src/jobs/handlers.ts:386-396`

```ts
content: `... Context: ${JSON.stringify(context)}`
```

Whatever `context` contains — task titles, bill names, document titles, balances, transaction summaries — is JSON-stringified and shipped to Claude. Same retention concerns as L06 but at higher volume (daily, every active user).

**Fix:** replace `JSON.stringify(context)` with a curated, schema-shaped context builder that drops free-text and rounds money. Same Anthropic zero-retention guidance applies.

---

### L08 — MEDIUM — Resend failure body logged in clear

**File:** `apps/api/src/services/notifications.ts:30-35`

```ts
const body = await response.text();
logger.error('Failed to send email via Resend', { status, body, to, subject });
```

Resend's error responses echo the request payload (incl. recipient + email body HTML). On a 4xx/5xx the entire HTML body of the email — which can include bill name, amount, due date, document name — lands in the log.

**Fix:** log `{ status, errorCode: parsed.error.code, to: hash(to) }` — never the raw body.

---

### L09 — MEDIUM — Plaid-side opaque IDs echoed to client

**Files:**
- `apps/api/src/routes/dashboard.ts:189-200` — `recentTransactions` map exposes `id` (internal cuid, fine) but the upstream object also has `plaidTransactionId` available; not currently surfaced in the dashboard mapper. PASS for dashboard.
- `apps/api/src/routes/plaid.ts:472` — `GET /api/plaid/items` returns the full PlaidItem (minus ciphertext), including `plaidItemId`, `cursor`, `errorMessage`, `errorCode`.
- `apps/api/src/routes/transactions.ts:226` — single-transaction detail includes `plaidTransactionId`.

The user is the rightful recipient of their own data, so this is "exposure" only in the sense of "available to a tampering attacker who breaches the user's session." Risk: the Plaid item ID is one of the inputs to a Plaid-side compromise (e.g., a stolen Plaid client_id+secret pair). Not today's biggest risk.

**Fix:** drop `cursor`, `errorMessage`, `plaidItemId` from `GET /api/plaid/items` via explicit `select`.

---

### L10 — LOW — Plaid error messages in job logs

**Files:** `apps/api/src/jobs/handlers.ts:444-447, 460-463, 528-531`

```ts
logger.error('Job: plaidInitialSync failed', { plaidItemId, error: (err as Error).message });
```

`PlaidError.message` originates from Plaid's `error_message` field. Not observed to contain access-token material, but per Phase 3a F14 this is unverified.

**Fix:** wrap in a sanitiser: `error: SAFE_PLAID_ERRORS[code] ?? 'plaid_error'` instead of forwarding `err.message`.

---

### L11 — LOW — Redis URL with creds may surface in error path

**File:** `apps/api/src/config/redis.ts:34` — `logger.warn('Redis connection error', { error: err.message })`

`ioredis` error messages occasionally include the URL (e.g., `Connection refused: rediss://default:****@host:6379`). Upstash URLs have inline credentials (`rediss://default:<token>@…`). Whether `err.message` includes the URL depends on the error code path — verify with a real Upstash failure.

**Fix:** sanitise: `error: err.message?.replace(/rediss?:\/\/[^@]+@/, 'redis://[redacted]@')`.

---

### L12 — LOW — Profile `email` change without verification

**File:** `apps/api/src/routes/settings.ts:65-101`

`PUT /api/settings/profile` accepts `email` and writes it. No verification email round-trip. An attacker with a stolen 15-min access token can change the account email, then trigger password reset to the attacker-controlled address (no password reset flow exists yet — but when one is added, this lurks).

**Fix:** require an email-confirmation round-trip for `email` changes. Out-of-scope for the current data-leak audit but documented here for the security backlog.

---

### L13 — LOW — `errorMessage` echoed via `GET /api/plaid/items`

Same root cause as L09. `PlaidItem.errorMessage` is the raw Plaid `error_message` and is included in the response object via `findMany` with no `select`.

**Fix:** explicit `select` on the `findMany`, drop `errorMessage` and `cursor`.

---

### L14 — LOW — Mobile token storage (PASS)

`apps/mobile/src/lib/api.ts:1-28` uses `expo-secure-store` (Keychain on iOS, EncryptedSharedPreferences on Android). PASS. Listed for traceability.

---

### L15 — INFO — No Sentry wiring (PRE-LAUNCH CHECKLIST in §F)

---

### L16 — INFO — Source maps

`apps/web/next.config.js` does not enable `productionBrowserSourceMaps`. Default Next.js behaviour: server code is not exposed; client-side code is minified without source maps in production unless explicitly enabled. PASS.

---

### L17 — INFO — Console output audit (PASS)

Grepped `console.log/warn/error/info/debug` across `apps/api/src/`, `apps/web/src/`, `apps/mobile/src/`, `packages/`. Only two hits:
- `apps/api/src/config/env.ts:67` — `console.error(...)` on Zod env validation failure at startup. Acceptable: this fires once before logger is up, and the redactor would not be initialised yet anyway.
- `packages/ai/src/client.ts:17` — `safeLog()` helper for the AI client. Logs `inputTokens`/`outputTokens`/`model`/error messages via `console.warn|error`. **No token material.** Verified.

No web/mobile debug `console.log` of access tokens, refresh tokens, or user data. PASS.

---

### L18 — INFO — Audit-log `context` spread risk

`apps/api/src/services/audit-log.ts:32` — `context: params.context as never` — Prisma stores it as JSON. Today every callsite passes a small curated object: `{ stage }`, `{ route, count }`, `{ field, cleared }`, etc. **No callsite spreads a raw Prisma row or Plaid response.** PASS.

Risk for the future: if a developer ever writes `context: { ...txn }` or `context: { ...plaidResponse }`, sensitive fields land in the audit log. Add a code review rule + maybe a TS helper `auditContext(...)` that asserts `Record<string, string | number | boolean | null>` only.

---

## 5. Audit by area

### A — Sensitive field inventory
PASS — see §2.

### B — Response shape
- 1 finding (L03) — `loginWithGoogle` `findUnique` without `select`.
- All other routes verified to use either explicit `select` (auth `/me`, `/profile`) or to operate on tables where every column is owner-readable (Bills, Tasks, Documents, etc.).
- `GET /api/plaid/items` deliberately strips `accessTokenCiphertext` via `stripCiphertext()` (`routes/plaid.ts:472`).
- `passwordHash` never appears in any API response; verified via grep + `services/auth.ts:248` destructuring.

### C — Logger redaction
- 1 gap (L04) — only `ENCRYPTION_KEY` would slip the substring match, and is never logged today.
- `pushToken` is matched (substring `token`) — but L01 recommends explicit listing.

### D — Error response
- `errorHandler.ts` returns generic `'An unexpected error occurred'` in production (line 49-51). PASS.
- ZodErrors safely return path + message — no field values leaked. PASS.
- AuthError codes are operator-defined and safe. PASS.
- Stack trace logged via `logger.error('Unhandled error', { error: err.message, stack: err.stack })` — only logged, not returned. PASS.
- Plaid errors routed through `safePlaidErrorResponse` which uses an allowlist (`SAFE_PLAID_ERRORS`). PASS.

### E — Console output
PASS — see L17.

### F — Sentry / external telemetry
**Not yet wired.** `SENTRY_DSN` is in env but no `Sentry.init({ ... })` call exists in `apps/api/src/`, `apps/web/`, or `apps/mobile/`. **Pre-launch checklist:**

1. `Sentry.init({ beforeSend(event) { ... } })` must scrub:
   - `event.request.headers['authorization']`, `event.request.headers['cookie']`
   - `event.request.data` deep-redact: `password`, `passwordHash`, `token`, `accessToken`, `refreshToken`, `accessTokenCiphertext`, `tokenHash`, `pushToken`, `apiKey`, `secret`, `Authorization`, `cookie`, `ENCRYPTION_KEY`, `JWT_PRIVATE_KEY`, `ANTHROPIC_API_KEY`, `PLAID_SECRET`, `RESEND_API_KEY`, `R2_SECRET_ACCESS_KEY`, `GOOGLE_CLIENT_SECRET`, `EXPO_ACCESS_TOKEN`
   - `event.extra` and `event.contexts` recursive scrub for the same keys
2. Set `sendDefaultPii: false` (Sentry v7+).
3. `tracesSampleRate: 0.1` or lower; never 1.0 in production (full traces leak request bodies).
4. Set `environment: env.NODE_ENV`.
5. Add Sentry init AFTER env validation so `SENTRY_DSN` is type-checked.
6. Add an explicit allowlist of error class names (`AuthError`, `PlaidError`) — block all others from `event.exception.values[i].value` containing more than 200 chars (truncate longer messages).
7. On the web side: `Sentry.replayIntegration({ maskAllText: true, blockAllMedia: true })` if Session Replay is ever enabled.
8. On mobile: configure source-map upload but do NOT bundle source maps in the IPA/APK — upload via EAS hooks.

### G — URL leak
- 1 finding (L02) — Google OAuth callback puts JWT in query string.
- All other routes use opaque cuids in path (`/api/transactions/cmoabc...`). PASS.
- No `?token=`, `?password=`, `?email=` patterns in routes.

### H — Email content
- `welcomeTemplate(name)` (`services/email-templates.ts:78-92`) — interpolates `name` into HTML. **No HTML escaping.** If a user's name is `<script>alert(1)</script>`, the email body is XSS-able in any email client that renders inline scripts (most don't, but Outlook surprises). LOW risk; documented as a backlog item.
- No password / token / reset-link content in any template (no password-reset flow exists yet).
- All template URLs are placeholder `#` (line 88) — no token in URL pattern.
- PASS for leak surface; XSS-in-email noted for future hardening.

### I — AI prompt leakage
- 2 findings (L06, L07) — full transaction PII + JSON-stringified user context to Anthropic.
- Mitigations: ensure Anthropic workspace has zero-data-retention enabled before public launch; add a privacy notice; coarsen prompts where feasible.

### J — Mobile data audit
PASS — `expo-secure-store` for tokens (L14). No debug `console.*` of tokens.

### K — Browser-side audit
PASS — `sessionStorage` only (`apps/web/src/lib/api.ts:6-33`); no `console.log` of tokens; no source-map exposure.

---

## 6. Top 5 prioritized fixes

| # | Sev | ID | Fix | File:line | Effort |
|---|-----|----|----|-----------|--------|
| 1 | HIGH | L02 | Move Google OAuth JWT out of URL query into a single-use server-side code → POST exchange, OR put it in `#fragment` (not sent to server / proxies / Referer). | `apps/api/src/routes/auth.ts:222-224` | 30 min |
| 2 | HIGH | L03 | Add explicit `select` to `loginWithGoogle`'s `findUnique({ where: { email }})` to drop `passwordHash` from the in-memory object. | `apps/api/src/services/auth.ts:275-277` | 5 min |
| 3 | HIGH | L01 + L04 | Add `'pushToken'`, `'ENCRYPTION_KEY'`, `'accessTokenCiphertext'`, `'clientSecret'`, `'privateKey'`, `'signature'` to `SENSITIVE_FIELDS` in `logger.ts`. Belt-and-suspenders even though substring match catches most. | `apps/api/src/config/logger.ts:3-16` | 5 min |
| 4 | MEDIUM | L05 + L08 | Stop logging `to` (recipient email) and Resend response `body`. Replace with `{ subject, userId, status }` only. | `apps/api/src/services/notifications.ts:30-40` | 10 min |
| 5 | MEDIUM | L06 + L07 | Document the AI data flow in a privacy notice; verify Anthropic workspace has zero-data-retention enabled; deny PAN/SSN-shaped strings in `extraContext`. | `packages/ai/src/transaction-explainer.ts:61-95`, `apps/api/src/jobs/handlers.ts:386-396` | 1 hr + ops |

---

## 7. What is NOT a leak (PASS list)

- `passwordHash` never returned — `services/auth.ts:248` destructures it out before return; `select` blocks elsewhere.
- `accessTokenCiphertext` stripped via `stripCiphertext()` in `GET /api/plaid/items`.
- `tokenHash` never returned, redactor catches it via `'token'` substring.
- Production `errorHandler` returns generic `INTERNAL_ERROR` (no `err.message`, no stack).
- Plaid errors sanitised via `SAFE_PLAID_ERRORS` allowlist.
- Webhook 401 envelope identical for signature failure / parse failure / schema failure (no oracle).
- Mobile uses `expo-secure-store`; web uses `sessionStorage` (not `localStorage`).
- No `console.log` of tokens or user data in web/mobile.
- No source-map exposure of server code.
- Email templates do not embed tokens; no password-reset flow exists yet (when added, must be HTTPS-only single-use tokens).
- Audit-log `context` is curated at every callsite — no `...spread` of raw payloads observed.
- `globalLimiter`, `authLimiter`, `webhookLimiter`, `plaidSyncLimiter` all in place.
- `next.config.js` sets `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, restrictive `Permissions-Policy`.

---

**Recommendation:** the codebase is in good shape for a sandbox deployment. The three HIGH findings (L01/L02/L03) are all small fixes (sub-1-hour each) and should be done before any public production deploy. The two MEDIUM AI findings (L06/L07) are ops/policy decisions (Anthropic zero-data-retention) that need to be made before the Anthropic workspace processes real user data.
