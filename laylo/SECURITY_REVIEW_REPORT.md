# Phase 3a — Security Review Report (Plaid Integration)

**Reviewer:** Security Analyst
**Date:** 2026-04-28
**Scope:** All Phase 1 / 2a / 2b / 2c bank-data code (Plaid integration)
**Review type:** READ-ONLY static analysis + threat-model verification
**Status:** Findings reported — Phase 4 merge gated on remediation of CRITICAL/HIGH

---

## 1. Executive Summary

Overall posture is **strong** for a sandbox-only integration. Cryptographic controls (AES-256-GCM with random IV, key-versioned, auth-tag-verified), webhook signing (ES256 + body-hash + iat skew), per-user query scoping, audit logging, rate limiting, raw-body webhook ordering, and `.strict()` Zod schemas blocking mass-assignment are all correctly implemented. There is no `dangerouslySetInnerHTML`, no raw SQL, no `localStorage` for tokens, and tokens are stored in Expo SecureStore on mobile.

However, **one CRITICAL** auth-bypass risk exists outside the Plaid code: the production web `auth-context.tsx` is still a demo stub that grants access to any string containing `@` and 8+ chars — meaning anyone on the public web can hit the JWT-protected Plaid endpoints with no real auth (the JWT verification on the API side is the only thing standing between the public internet and a victim's bank data once a Plaid item exists for that user). Combined with **two HIGH** findings (cascade-delete of audit logs and missing webhook payload Zod validation) and a handful of **MEDIUM** issues (no `.env.example` for Plaid, rebalance job not auditable per-user, webhook-event raw payload retention has no TTL), this is a **NO-GO for Phase 4 production merge** without fixes. Sandbox merge is acceptable.

**Counts:** 1 CRITICAL · 2 HIGH · 7 MEDIUM · 5 LOW · 4 INFO

**Top 3 concerns:**
1. (CRITICAL) Web auth context is demo-only — total auth bypass surface for the entire authenticated API.
2. (HIGH) `BankDataAccessLog.user` is `onDelete: Cascade` — deleting a user wipes their compliance audit trail.
3. (HIGH) Plaid webhook payload is not validated with Zod (spec §C4 / T2) — only string-slice coercion.

---

## 2. Findings table

| ID | Sev | Area | Title | File:line | Mitigation |
|----|-----|------|-------|-----------|------------|
| F1 | CRITICAL | Auth (J/L5) | Demo-only web auth context accepts arbitrary credentials | `apps/web/src/lib/auth-context.tsx:78-88` | Replace with real `/api/auth/login` JWT flow before any production Plaid traffic. |
| F2 | HIGH | Audit (K1) | `BankDataAccessLog` cascade-deletes with user → loses audit trail | `apps/api/prisma/schema.prisma:498` | Change `onDelete: Cascade` to `SetNull` (and make `userId` nullable) or `Restrict`; logs must outlive user. |
| F3 | HIGH | Validation (C4 / T2) | Webhook payload not Zod-validated | `apps/api/src/routes/plaid.ts:126-141` | Add `webhookPayloadSchema = z.object({ webhook_type, webhook_code, item_id, request_id?, ... }).strict().safeParse(payload)`. |
| F4 | MEDIUM | Secrets (I2) | `.env.example` missing all Plaid + ENCRYPTION_KEY entries | `laylo/.env.example` (no Plaid section) | Add `PLAID_CLIENT_ID=`, `PLAID_SECRET=`, `PLAID_ENV=sandbox`, `PLAID_PRODUCTS=transactions`, `PLAID_COUNTRY_CODES=US`, `PLAID_WEBHOOK_URL=`, `PLAID_REDIRECT_URI=`, `ENCRYPTION_KEY=`, `ENCRYPTION_KEY_VERSION=1`. |
| F5 | MEDIUM | Webhook (E5 / T2) | Failed-signature 401 leaks IP only — but `400` is also returned for invalid JSON which should also be 401 to avoid distinguishing fail modes | `apps/api/src/routes/plaid.ts:130` | Consider returning identical 401 envelope for both signature and parse failures; reduces probing oracle. |
| F6 | MEDIUM | Webhook (E2) | Raw payload retained forever in `PlaidWebhookEvent.rawPayload` | `apps/api/prisma/schema.prisma:466-484` | Add a TTL job that nulls `rawPayload` after 30 days while keeping the dedup row + summary. |
| F7 | MEDIUM | Audit (D5 / K3) | `plaidRebalance` job decrypts tokens for every active item but writes NO audit log | `apps/api/src/jobs/handlers.ts:470-524` | Call `writeAccessLog({action:'SYNC', actorUserId:'system:plaidRebalance', ...})` per item touched. |
| F8 | MEDIUM | Webhook (T2) | `lastWebhookAt` updated BEFORE incremental sync enqueue — a malicious replay accepted as duplicate still updates `lastWebhookAt` (not exploitable today; defense in depth) | `apps/api/src/routes/plaid.ts:163-168` | Move `lastWebhookAt` update inside the success branch of `enqueuePlaidJob`. |
| F9 | MEDIUM | Validation (C2) | `accountId`, `category`, `merchant`, `q` params have no max length cap | `apps/api/src/routes/transactions.ts:17-26` | `z.string().min(1).max(100)`. Long `merchant` strings reach Postgres ILIKE. |
| F10 | MEDIUM | Errors (D4 / T15) | `errorHandler` returns raw `err.message` in non-production envs — also true in `production` for `PlaidError` (`err.message` from Plaid is propagated) | `apps/api/src/routes/plaid.ts:237-243`, `268-271` | Wrap PlaidError messages so only safe-listed fields surface (e.g., `error_code` only). |
| F11 | LOW | Validation (C3) | `accounts` array on exchange has no max-length cap | `apps/api/src/routes/plaid.ts:85-95` | Add `.max(50)` on `z.array(...)`. |
| F12 | LOW | Webhook (E2) | Webhook `INITIAL_UPDATE`, `HISTORICAL_UPDATE`, `DEFAULT_UPDATE` all enqueue same job — no concern, but `ITEM_LOGIN_REQUIRED`, `ERROR`, `USER_PERMISSION_REVOKED`, `PENDING_EXPIRATION` codes are silently swallowed | `apps/api/src/routes/plaid.ts:185-200` | Handle `ITEM` webhooks at minimum — set `status` to `LOGIN_REQUIRED` proactively. |
| F13 | LOW | Headers (D3) | No request-log middleware exists, so `Authorization` redaction is moot — but if Sentry is added later, no `beforeSend` scrubber is configured | `apps/api/src/index.ts` (no Sentry) | When Sentry is wired, add a `beforeSend` that strips `accessTokenCiphertext`, `Authorization`, `cookie`. |
| F14 | LOW | Logging (D1) | `logger.warn` in `plaidRebalance` includes raw error message — Plaid SDK errors may include access token fragments in some 5xx responses | `apps/api/src/jobs/handlers.ts:514-517` | Already limited to `(err as Error).message`; verify no token fragments via PlaidError tests. |
| F15 | LOW | Mobile (G6) | iOS `LSApplicationQueriesSchemes` includes `plaid` (correct), but no `CFBundleURLTypes` namespacing — re-entry could be intercepted by another app declaring same `lifeadminai://plaid-oauth` host | `apps/mobile/app.json:13-37` | Android side uses `autoVerify: true` (good); iOS relies on Plaid's bounce-back. Acceptable — namespace `lifeadminai` is unique to this app's bundle id. |
| F16 | INFO | Crypto (A3) | Key rotation has version prefix support but no fallback key map (only one key resolvable today) | `apps/api/src/services/crypto.ts:24-38` | Document rotation runbook: read `ENCRYPTION_KEY_V1`, `ENCRYPTION_KEY_V2`, route by prefix. Track in DR runbook. |
| F17 | INFO | DoS (L3) | `?includeTransactions=true` on `/api/bills` and `/api/subscriptions` returns up to 6mo of detected txns per item, no cap | `apps/api/src/routes/bills.ts:79-90`, `subscriptions.ts:71-85` | Cap each include with `take: 50`. UX-only impact today (not a security DoS at current scale). |
| F18 | INFO | Currency (L1) | `totalBalance` / `totalDebt` on dashboard sum across all currency codes | `apps/api/src/routes/dashboard.ts:164-182` | UX issue, not security; matches spec out-of-scope. |
| F19 | INFO | Audit (L2) | High-volume audit-log writes (one row per dashboard load × 2) | `apps/api/src/routes/dashboard.ts:206-225` | Track `bank_data_access_logs` row growth; consider monthly partitioning if > 10M rows. |
| F20 | LOW | Webhook (T4) | Dedup key is `request_id` only; if Plaid omits/reuses it, replay would slip through. The current code allows `externalEventId === null` records to bypass the unique constraint | `apps/api/src/routes/plaid.ts:136-139` | If `request_id` is null, derive a hash of `(item_id, webhook_type, webhook_code, iat-from-header)` instead. |

---

## 3. Detailed findings

### F1 — CRITICAL — Demo-only web auth bypass

**File:** `apps/web/src/lib/auth-context.tsx:75-95`

```ts
const login = useCallback(async (email: string, password: string) => {
  if (
    (email === 'demo@lifeadmin.app' && password === 'Demo1234!') ||
    (email.includes('@') && password.length >= 8)
  ) {
    const loggedInUser: User = { ...DEMO_USER, email, ... };
    setUser(loggedInUser);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(loggedInUser));
    router.push('/dashboard');
  }
});
```

There is no call to `/api/auth/login`, no JWT set in `setAuthToken`, and the only "auth" is local sessionStorage of a user object. This means:
- The web UI never actually obtains a JWT, so `apps/web/src/lib/api.ts:getAuthToken()` will return `null`, meaning the API calls succeed only against routes that don't enforce `requireAuth`. Plaid routes DO require `requireAuth`, so currently web Plaid calls would fail with 401.
- However if a future change wires the demo flow into a real token issuance, the bypass becomes total.
- Today's risk is reputational + scope-creep; tomorrow's risk is an auth bypass into the entire bank-data API.

**Fix:** Replace `auth-context.tsx` with a real `POST /api/auth/login` flow that calls `setAuthToken(jwt)` from `apps/web/src/lib/api.ts`. Block Phase 4 merge until done.

---

### F2 — HIGH — Audit log cascade-deletes with user

**File:** `apps/api/prisma/schema.prisma:498`

```prisma
model BankDataAccessLog {
  ...
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

Spec §10/T8 says audit logs are "Append-only, exportable for compliance." `onDelete: Cascade` on the User relation deletes the entire access history when the user is deleted (e.g., GDPR right-to-erasure or account closure). For a financial integration, audit retention is typically required for 5–7 years independent of account lifecycle.

**Fix:** Change to `onDelete: SetNull` and make `userId` optional, OR move to a separate audit-DB schema with no FK. Add a migration.

---

### F3 — HIGH — Webhook payload not Zod-validated

**File:** `apps/api/src/routes/plaid.ts:126-141`

```ts
let payload: Record<string, unknown>;
try { payload = JSON.parse(rawBody) as Record<string, unknown>; } catch { ... }
const webhookType = String(payload.webhook_type ?? '').slice(0, 60);
const webhookCode = String(payload.webhook_code ?? '').slice(0, 60);
const externalEventId = typeof payload.request_id === 'string' && ... ? payload.request_id : null;
const plaidItemExternalId = typeof payload.item_id === 'string' ? payload.item_id : undefined;
```

Spec §C4 mandates "Webhook body validated with Zod or shape check." Today: only ad-hoc `String()` and `typeof` checks. While slicing/casting is defensive enough to prevent injection, missing schema validation means:
- Unknown fields are persisted in `rawPayload` (PII risk if Plaid adds new fields).
- An attacker who passes signature verification (compromised Plaid key) could ship arbitrary nested JSON.

**Fix:**

```ts
const webhookSchema = z.object({
  webhook_type: z.string().max(60),
  webhook_code: z.string().max(60),
  item_id: z.string().max(80).optional(),
  request_id: z.string().max(80).optional(),
}).passthrough(); // explicit passthrough OR pick known fields then drop the rest
```

---

### F4 — MEDIUM — `.env.example` missing all Plaid keys

**File:** `laylo/.env.example`

The example file has no `PLAID_CLIENT_ID`, `PLAID_SECRET`, `PLAID_ENV`, `PLAID_WEBHOOK_URL`, `PLAID_REDIRECT_URI`, `ENCRYPTION_KEY`, `ENCRYPTION_KEY_VERSION`, or `PLAID_PRODUCTS` / `PLAID_COUNTRY_CODES` documented. New deployments will silently fail on the Zod env parse with no prompt.

**Fix:** Add a `# ── Plaid + Encryption ─────────` section mirroring `apps/api/src/config/env.ts:42-56`. No real values — just placeholders.

---

### F5 — MEDIUM — Webhook 400/401 distinguishability

**File:** `apps/api/src/routes/plaid.ts:122, 130`

Bad signature → 401; bad JSON post-signature-verify → 400. An attacker can probe whether the JWT was accepted by inspecting the response code. Low real-world impact, but a single "always 401" response on any failed verification (signature OR body) is hardening Plaid recommends.

---

### F6 — MEDIUM — Raw payload retained forever

**File:** `apps/api/prisma/schema.prisma:472`

`rawPayload Json` per webhook event grows unbounded. For a user with 365 syncs/year × 5 banks, that's 1825 rows/year/user. Each payload contains item_id, account_ids, balance metadata. Over multi-year operation, this becomes a compliance liability (data minimisation under GDPR/CCPA).

**Fix:** Cron job (`PURGE_OLD_WEBHOOK_PAYLOADS`) that nulls `rawPayload` and `processingError` after 30 days while preserving the dedup row.

---

### F7 — MEDIUM — `plaidRebalance` writes no audit log

**File:** `apps/api/src/jobs/handlers.ts:470-524`

The cron-driven daily rebalance decrypts every active access token and reads balances — but never writes a `BankDataAccessLog` row. This is a system action on user data and per spec §K3 should record `actorUserId='system:plaidRebalance'`.

```ts
// after each successful per-item update:
await writeAccessLog({
  userId: item.userId,
  actorUserId: 'system:plaidRebalance',
  action: 'SYNC',
  resource: 'BankAccount',
  resourceId: item.id,
  context: { updated },
});
```

---

### F8 — MEDIUM — `lastWebhookAt` updates before dedup

**File:** `apps/api/src/routes/plaid.ts:163-168`

`lastWebhookAt` is set inside the create-event try block. If the webhook is a duplicate (P2002), the catch returns 200 without resetting. If the duplicate path runs first (we caught P2002), `lastWebhookAt` is not updated — actually OK. But on the success path, `lastWebhookAt` is updated even if the subsequent `enqueuePlaidJob` fails silently. Minor — defense in depth.

---

### F9 — MEDIUM — Unbounded query string lengths on `/api/transactions`

**File:** `apps/api/src/routes/transactions.ts:17-26`

```ts
const querySchema = z.object({
  ...
  category: z.string().min(1).optional(),     // no max
  merchant: z.string().min(1).optional(),     // no max
  q: z.string().min(1).optional(),            // no max
  cursor: z.string().min(1).optional(),       // no max
  ...
});
```

A 1MB `merchant` string is accepted, hits Postgres `ILIKE %...%`, and forces a full sequential scan on a potentially large `transactions` table. DoS vector through legitimate auth.

**Fix:** Add `.max(100)` to category/merchant/q, `.max(80)` to cursor.

---

### F10 — MEDIUM — Plaid error messages forwarded verbatim

**File:** `apps/api/src/routes/plaid.ts:237-243, 268-271`

```ts
res.status(502).json({
  success: false,
  error: { code: err.code, message: err.message },
});
```

`err.message` originates from Plaid (`error_message` field). Plaid sometimes includes details like institution, error context, even partial identifiers. Per spec §T15, errors should be sanitised in non-dev. Today's `errorHandler` does that for generic errors but the Plaid route bypasses it.

**Fix:** Whitelist a small set of `code → user-friendly message` strings; do not pass `err.message` upstream.

---

### F11 — LOW — Unbounded accounts array on exchange

`apps/api/src/routes/plaid.ts:85-95` — `z.array(...).min(1)` has no `.max()`. A pathological Plaid Link metadata response (or a forged exchange call before signature verification) could insert thousands of `BankAccount` rows. Add `.max(50)`.

---

### F12 — LOW — Item-level webhook codes silently dropped

`apps/api/src/routes/plaid.ts:185-200` — only `TRANSACTIONS` codes enqueue work. `ITEM` codes (`ITEM_LOGIN_REQUIRED`, `WEBHOOK_UPDATE_ACKNOWLEDGED`, `USER_PERMISSION_REVOKED`, `PENDING_EXPIRATION`, `ERROR`) are recorded as events but the `PlaidItem.status` is never updated to `LOGIN_REQUIRED`. Result: the user only learns about re-auth needs on next sync attempt (which fails). Security-adjacent (stale linked items remain "active" in UI).

---

### F13 — LOW — No Sentry scrubber configured

No Sentry usage exists yet (`SENTRY_DSN` is in env but not wired in `apps/api/src/index.ts`). When wired, ensure `Sentry.init({ beforeSend(event) { ... strip accessTokenCiphertext, Authorization, cookie ... } })` is configured.

---

### F14 — LOW — Plaid error message content

`apps/api/src/jobs/handlers.ts:514-517` — `(err as Error).message` is logged. Plaid messages have not been observed to include token material, but unverified — recommend a sanitiser test.

---

### F15 — LOW — Mobile deep-link namespacing

`apps/mobile/app.json:7,13-37` — `scheme: lifeadminai`, host `plaid-oauth`, `autoVerify: true`. Acceptable: scheme is namespaced and Android `autoVerify` ties to the bundle id. iOS relies on Plaid's bounce-back; standard pattern.

---

### F16 — INFO — Key rotation map not implemented

`apps/api/src/services/crypto.ts:24-38` — only the current key is loaded; the version prefix in ciphertext is parsed but always decrypted with the current key. A rotation runbook needs a `Map<version, key>` lookup.

---

### F17 — INFO — `?includeTransactions=true` payload size

`apps/api/src/routes/bills.ts:79-90`, `subscriptions.ts:71-85` — six months of detected transactions per bill/sub, with no cap. UX risk; not a security DoS at the current scale.

---

### F18, F19 — INFO

UX/scalability concerns flagged in the L-section of the audit checklist. Both confirmed as non-security.

---

### F20 — LOW — Dedup key fallback

`apps/api/src/routes/plaid.ts:136-139` — when `request_id` is missing, the row is inserted with `externalEventId = null` and the unique constraint does not catch duplicates. Recommend deriving a hash from `item_id + webhook_type + webhook_code + iat` as a fallback dedup key.

---

## 4. Pass list (verified ✅)

- **A1** AES-256-GCM, 12-byte random IV, 32-byte key, auth tag verified — `crypto.ts:13-17, 56-74, 109-123`
- **A2** `ENCRYPTION_KEY` 64-hex regex enforced in env Zod — `env.ts:52-54`
- **A3** Version prefix `v<n>:` in ciphertext format — `crypto.ts:73`
- **A4** Plaintext `accessToken` never returned in API responses or logged — verified by grep across `src/`
- **A5** `accessTokenCiphertext` stripped from `GET /items` via `stripCiphertext` — `routes/plaid.ts:68-72, 355`
- **A6** ES256, kid lookup, `iat ≤ 5min`, `request_body_sha256` hash, explicit `algorithms: ['ES256']` — `services/plaid.ts:254-303`
- **B1** All Plaid/transactions/accounts/dashboard routes use `requireAuth` (webhook explicitly mounted before)
- **B2** Every Plaid/Bank/Transaction/AuditLog query filters by `userId: req.user!.userId` (verified across `routes/`)
- **B3** `DELETE /api/plaid/items/:id` does `findFirst({ where: { id, userId, deletedAt: null }})` before Plaid `removeItem` — `routes/plaid.ts:366-372`
- **B4** `POST /:id/sync` same scoping + `plaidSyncLimiter` (1/min/itemId) — `routes/plaid.ts:418-438`
- **B5** Cross-user IDOR mitigated via `userId` filter in every `findFirst` / `findMany`
- **B6** Webhook handler resolves internal `PlaidItem` via `findUnique({ plaidItemId: payload.item_id })`, never trusts `userId` from payload — `routes/plaid.ts:144-146`
- **C1** All authed routes Zod-validate request body (except webhook — see F3)
- **C2** `limit` clamped `min(1).max(200)` — `routes/transactions.ts:25`
- **C3** `.strict()` Zod on `Bill`, `Subscription` create/update blocks `autoDetected`, `detectedFromTxnId` mass-assignment — `routes/bills.ts:33-50`, `subscriptions.ts:33-51`
- **C5** No `$queryRawUnsafe` / `$executeRawUnsafe` / `$queryRaw` / `$executeRaw` anywhere in `apps/api/src/`
- **D1, D2** No `accessToken` plaintext or `accessTokenCiphertext` strings in any `console.*` / `logger.*` call
- **D3** Winston `redactFormat` masks `accessToken`, `authorization`, `cookie`, etc. — `config/logger.ts:3-43`
- **D4** Generic `INTERNAL_ERROR` returned in production via `errorHandler` — `middleware/errorHandler.ts:46-53`
- **D5** Audit logs written for: LINK (`routes/plaid.ts:226`), UNLINK (404), exchange/LINK (321-329), SYNC (`transaction-sync.ts:155-167`), READ Transaction/BankAccount on dashboard (`routes/dashboard.ts:206-225`), READ on bills/subs `?includeTransactions=true`
- **E1** `app.post('/api/plaid/webhook', express.raw(...), ...)` mounted BEFORE `app.use(express.json(...))` — `index.ts:55-63`
- **E2** Webhook returns 200 within 10s; actual sync enqueued via BullMQ — `routes/plaid.ts:194, 332`
- **E3** Dedup via `PlaidWebhookEvent.externalEventId @unique` and P2002 catch — `routes/plaid.ts:170-180`
- **E4** `webhookLimiter` 600/min applied — `routes/plaid.ts:107`, `middleware/rateLimiter.ts:37-49`
- **E5** Signature failure returns 401 (Plaid retries non-2xx)
- **F1** `webhookLimiter` registered
- **F2** `plaidSyncLimiter` registered (1/min/itemId, validate:false to allow non-IP key)
- **F3** Plaid routes inherit `globalLimiter` (100/15min) since mounted after `app.use(globalLimiter)` — `index.ts:67, 85`
- **G1** No `dangerouslySetInnerHTML` in any new web component (grep clean)
- **G2** Web uses `sessionStorage` not `localStorage` for the auth token — `apps/web/src/lib/api.ts:6-33`
- **G3** `link_token` dropped immediately after use (`setLinkToken(null)` in `onSuccess` and `onExit`)
- **G4** `public_token` only passed to `exchangePublicToken` — never stored
- **G5** Mobile uses `expo-secure-store` (Keychain/Keystore) — `apps/mobile/src/lib/api.ts:1-28`
- **G6** Mobile scheme namespaced `lifeadminai://plaid-oauth` with Android `autoVerify` — `app.json:7,25-36`
- **I1** `.env` listed in root `.gitignore:6` (and never tracked)
- **I3** No hardcoded `sk_`, `secret_`, `pk_` in source (greps clean; only test fixtures use placeholder strings)
- **I4** `ENCRYPTION_KEY` not committed (only referenced via `env.ENCRYPTION_KEY`)
- **J1** `algorithms: ['ES256']` is explicit in `jwtVerify` — `alg:none` rejected — `services/plaid.ts:280`
- **J2** Header parse rejects missing `kid` and non-ES256 alg — `services/plaid.ts:269`
- **J3** `iat` 5-minute skew check — `services/plaid.ts:286-288`
- **J4** Webhook handler is unreachable without valid signed JWT (verifyWebhook gates everything)
- **K1** No `bankDataAccessLog.update` or `.delete` calls anywhere — append-only
- **K2** `writeAccessLog` swallows errors — does not block user request — `services/audit-log.ts:35-44`
- **K3** `actorUserId` distinguishable: defaults to `userId` for user actions, set to `'system:generateDailyInsights'` for system jobs — `handlers.ts:368`

---

## 5. Top 5 prioritized fixes for Phase 4

1. **(BLOCKER) F1** — Wire web auth-context to real `/api/auth/login` JWT flow. Without this the entire bank-data API surface is reachable via a one-line bypass. **Owner:** Web engineer.
2. **(BLOCKER) F2** — Migrate `BankDataAccessLog.user` to `onDelete: SetNull` + `userId String?` so audit trail outlives users. **Owner:** DBA. Add migration `20260429_audit_log_retain_after_user_delete`.
3. **(HIGH) F3** — Add Zod schema for webhook payload (`webhook_type`, `webhook_code`, `item_id`, `request_id`) with `.strict()` or explicit field allowlist. **Owner:** Backend.
4. **(MEDIUM) F4 + F7** — Pair fix: extend `.env.example` with Plaid vars AND add `writeAccessLog` calls inside `plaidRebalance`. Both 30-minute changes. **Owner:** Backend.
5. **(MEDIUM) F9 + F10** — Validation hardening on `/api/transactions` query params and Plaid error message sanitisation in `routes/plaid.ts:237-243, 268-271`. Closes the two largest authenticated DoS / info-leak vectors. **Owner:** Backend.

---

## 6. Notes on audit limitations

- `npm audit --omit=dev` could not be executed in this sandboxed environment (permission denied). Recommend running it manually before Phase 4 merge:
  ```
  cd /Users/ashiks/Desktop/myai/laylo && npm audit --omit=dev --json > audit.json
  ```
  and triaging any HIGH/CRITICAL beyond the existing 37-vuln baseline (mostly transitive Expo/React-Native issues from Phase 2b).
- ZAP baseline scan and JWT bypass attempt are listed in spec §11 as Security Analyst owned — recommend running once Phase 4 staging URL is up.
- This review is static-analysis only; a follow-up dynamic test (cross-user IDOR via real JWT pair) is recommended after F1 is fixed.

---

**Recommendation:** **NO-GO** for Phase 4 production merge until F1, F2, F3 are addressed. **GO** for Phase 4 *sandbox-only* merge (current `PLAID_ENV=sandbox` lock makes the F1 risk theoretical for now).
