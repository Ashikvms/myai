# BillBee — End-to-End Threat Model (STRIDE)

**Author:** Principal Cybersecurity Lead / Threat Model Architect
**Date:** 2026-04-28
**Scope:** All BillBee surfaces: web app (Next.js), mobile app (Expo), API (Express + tRPC), PostgreSQL (Railway), Redis/BullMQ (Upstash), Cloudflare R2, Plaid, Anthropic, Resend, Google OAuth.
**Prior work referenced:** `SECURITY_REVIEW_REPORT.md` (Plaid-only, F1–F20). This document is the *system-wide* threat model — Plaid findings are cited but not re-derived.

---

## 1. Asset Inventory

Assets are tiered by blast radius if confidentiality, integrity, or availability is lost.

### TIER 1 — CATASTROPHIC (regulatory, contractual, existential)

| Asset | Storage | Why catastrophic |
|---|---|---|
| Plaid `access_token` (per-item) | `PlaidItem.accessTokenCiphertext` (AES-256-GCM, base64) | Compromise = read-only attacker access to the linked institution's account/transaction data via Plaid until the user re-auths. Plaid contract violation. |
| `ENCRYPTION_KEY` (AES-256, 32 bytes) | Railway env var, hex-encoded | Single key decrypts all Plaid tokens at rest. Loss = total bank-data exposure across the whole tenant. |
| `JWT_PRIVATE_KEY` (RS256, PKCS8 PEM in base64) | Railway env var | Sign-anything: full account takeover for every user with a single forged JWT. |
| Password hashes (bcrypt cost 12) | `User.passwordHash` | Credential stuffing pivot if dumped + cracked. |
| `ANTHROPIC_API_KEY` | Railway env var | Direct cost theft (capped at $20/mo by spend cap, mitigated). Quota DoS. |
| `GOOGLE_CLIENT_SECRET` | Railway env var | Impersonate the BillBee OAuth consumer; phish users into granting consent. |
| Plaid `PLAID_SECRET` + `PLAID_CLIENT_ID` | Railway env var | Impersonate the BillBee Plaid app to mint link tokens / call `/item/exchange` against any item Plaid associates with us. |

### TIER 2 — HIGH (financial / privacy harm to user)

- User PII: `User.email`, `User.name`, `User.avatarUrl`, `User.googleId`.
- Bank account metadata: `BankAccount.{name, officialName, mask, type, subtype, currentBalance, availableBalance, creditLimit, isoCurrencyCode, lastBalanceUpdate}`.
- Transactions: `Transaction.*` (amount, merchant, category, geolocation city/region/country, date, name, plaidTransactionId).
- Bills + Subscriptions: `Bill.*`, `Subscription.*` (cadence, amount, autopay flag, notes — may contain account numbers in `notes`).
- AI conversation history: `AiConversation`, `AiMessage.content`, `AiMessage.metadata`. May contain free-text PII the user typed.
- Push notification tokens: `NotificationPreference.pushToken`.

### TIER 3 — MEDIUM (private, recoverable)

- Appointments: `Appointment.{title, dateTime, location, notes}`.
- Reminders: `Reminder.{title, dateTime, linkedId}`.
- Documents (user-uploaded): `Document.*` metadata + R2 object body (insurance, lease, tax, medical, identity scans, warranties).
- Refresh tokens (stored as bcrypt hashes): `RefreshToken.tokenHash`.
- Plaid webhook raw payloads: `PlaidWebhookEvent.rawPayload` (item_id, account ids, balance metadata).

### TIER 4 — LOW (operational metadata / public)

- Audit logs: `BankDataAccessLog.*` (compliance value but not directly sensitive once PII is scoped).
- System logs: Winston output (already redacted by `config/logger.ts`).
- Public marketing pages: `/`, `/login`, `/signup` (no secrets).
- Health endpoint payload: `{status, timestamp}` only.

---

## 2. Attack Surfaces

### 2.1 Web app (Vercel) — `apps/web/src/`
Public: `/`, `/login`, `/signup`. Authed: `/dashboard`, `/tasks`, `/bills`, `/subscriptions`, `/documents`, `/appointments`, `/reminders`, `/ai`, `/settings`, `/transactions`, `/settings/banks`. Auth gate `apps/web/src/lib/auth-context.tsx` (real `/api/auth/login` flow per F1 fix). State: sessionStorage JWT (rule 6), no `dangerouslySetInnerHTML` (rule 5). OAuth callback `/auth/callback?accessToken=...`.

### 2.2 Mobile app (Expo) — `apps/mobile/src/`
Mirror routes, JWT in Expo SecureStore. Deep link `lifeadminai://plaid-oauth` (F15). Plaid Link SDK sandboxed by Plaid.

### 2.3 API (Railway) — `apps/api/src/routes/`

| Route prefix | Auth | Rate limit | Notes |
|---|---|---|---|
| `POST /api/auth/register|login|refresh|logout` | none | `authLimiter` | Public; password + email accepted. |
| `GET  /api/auth/me` | JWT | `globalLimiter` | Reflects user identity. |
| `GET  /api/auth/google`, `/google/callback` | none | `globalLimiter` | OAuth bounce. |
| `POST /api/plaid/webhook` | Plaid JWT (ES256) | `webhookLimiter` (600/min) | Mounted with `express.raw()` BEFORE `express.json` (correct). |
| `POST /api/plaid/link/token/create|exchange` | JWT | `globalLimiter` | Plaid Link bootstrap. |
| `POST /api/plaid/items/:id/sync` | JWT | `plaidSyncLimiter` (1/min/(user,item)) | Manual sync. |
| `GET  /api/plaid/items`, `DELETE /api/plaid/items/:id` | JWT | `globalLimiter` | Item management. |
| `GET  /api/transactions` (+ filters) | JWT | `globalLimiter` | Spend query — DoS surface (F9). |
| `GET  /api/accounts`, `/api/dashboard` | JWT | `globalLimiter` | Aggregations. |
| `GET|POST|PUT|DELETE /api/{tasks,bills,subscriptions,documents,appointments,reminders}` | JWT | `globalLimiter` | CRUD per-user. |
| `POST /api/documents/:id/presign-upload` | JWT | `globalLimiter` | R2 presigned PUT (5-min TTL). |
| `POST /api/ai/chat`, `/api/ai/conversations*` | JWT | `globalLimiter` | LLM gateway. |
| `POST /api/ai/explain-transaction/:id` | JWT | `globalLimiter` | LLM enrichment. |
| `GET  /api/settings`, `PUT /api/settings/notifications` | JWT | `globalLimiter` | Notification prefs incl. push token. |
| `GET  /health` | none | `globalLimiter` | Liveness. |

### 2.4 Database (Railway PostgreSQL)
`DATABASE_URL` Railway-VPC private. App surface 100% Prisma — no `$queryRawUnsafe` (rule 7, verified C5).

### 2.5 Redis (Upstash) — BullMQ
`REDIS_URL` (TLS). Job payloads carry userIds + itemIds, no plaintext tokens.

### 2.6 Cloudflare R2
Bucket `lifeadmin-documents`. Client direct upload via presigned PUT (5-min TTL), download presigned GET (15-min TTL). Risks: URL leak, MIME spoof, key collision.

### 2.7 Third-party integrations
Plaid (out + signed webhook in), Anthropic (out, prompt-injection risk), Resend (out, enumeration/spoof if DKIM/SPF unset), Google OAuth (callback in), Sentry (not wired — F13), Expo Push (out).

### 2.8 Background jobs (BullMQ)
`plaid-incremental-sync`, `plaid-rebalance` (cron), notifications, AI batch. Workers in API container, share env. Risk: poison-message retry storm.

### 2.9 Admin / internal
None today. Ops via Railway dashboard (trust operator). Risk: future unguarded admin endpoint.

---

## 3. STRIDE Matrix

For every surface, one threat is named per STRIDE category. Explanations follow each row.

### 3.1 Auth surface (`POST /api/auth/login`, `register`, `refresh`)

| Surface | S | T | R | I | D | E |
|---|---|---|---|---|---|---|
| `/api/auth/login` | credential stuffing | unicode confusable in email | no per-attempt audit | bcrypt timing oracle | refresh-table O(N) scan | OAuth account-takeover |

- **S:** breached-password reuse; `authLimiter` IP-keyed → botnet-bypass.
- **T:** Zod shape OK, no unicode normalization on email (Cyrillic `а` vs Latin `a` collision risk).
- **R:** `services/auth.ts:246` `logger.info` only; no immutable login-attempt record.
- **I:** bcrypt skipped on missing-user path → ~50–200ms timing-oracle for user enumeration. Fix: dummy compare.
- **D:** `services/auth.ts:117-132` and `routes/auth.ts:124-137` do O(N) bcrypt compare across ALL non-revoked refresh tokens — algorithmic DoS as table grows.
- **E:** `loginWithGoogle` (`services/auth.ts:273-318`) auto-links Google→existing email user with no re-verification → ATO if attacker registers Google with victim's email.

### 3.2 Plaid webhook (`POST /api/plaid/webhook`)

| Surface | S | T | R | I | D | E |
|---|---|---|---|---|---|---|
| `/api/plaid/webhook` | forged signature | payload tampering | dup-event blind spot | error-code probing | replay flood | item-id spoof |

- **S:** ES256 + kid + body-hash + 5-min iat skew (A6, J1–J3). Closed.
- **T:** Webhook body not Zod-validated (F3 open).
- **R:** `lastWebhookAt` updated optimistically before sync (F8). No per-event actor distinction.
- **I:** 401 vs 400 distinguishability (F5). 200 vs 404 reveals item existence.
- **D:** `webhookLimiter` 600/min/IP — Plaid IP rotation could block legit traffic (coupling risk).
- **E:** Handler resolves `PlaidItem` via `findUnique({plaidItemId})` and never trusts payload `userId` (B6). Closed.

### 3.3 Plaid item exchange (`POST /api/plaid/link/token/exchange`)

| Surface | S | T | R | I | D | E |
|---|---|---|---|---|---|---|
| `/plaid/link/exchange` | session hijack | `accounts[]` bloat | LINK audited ✓ | error-msg leak | unbounded array DoS | mass-assignment |

- F10 (error leak) and F11 (no `.max()` on accounts) open. E closed by `.strict()` Zod (C3).

### 3.4 Transactions query (`GET /api/transactions`)

| Surface | S | T | R | I | D | E |
|---|---|---|---|---|---|---|
| `/api/transactions` | JWT theft | filter injection | READ logged ✓ | cross-user category leak | ILIKE wildcard DoS | IDOR via cursor |

- **S:** sessionStorage XSS-resistant vs localStorage but in-process; no CSP yet.
- **T:** Prisma parameterized; closed.
- **R:** READ writes `BankDataAccessLog` (Pass D5).
- **I:** All filters scoped by `userId` (Pass B2); closed.
- **D:** Unbounded `q`/`merchant`/`category` → `ILIKE` seq scan (F9 open).
- **E:** Cursor not user-bound but used inside `where:{id,userId}`; closed.

### 3.5 Documents — upload/download (`POST /api/documents/:id/presign-upload`, R2)

| Surface | S | T | R | I | D | E |
|---|---|---|---|---|---|---|
| Document presign + R2 | URL theft | MIME spoof | no upload audit | key bruteforce | upload-bomb | object-key takeover |

- **S — URL theft:** Presigned PUT leak (logs/history) → 5-min window for arbitrary upload over user's slot. Short TTL helps; `Content-MD5` not enforced.
- **T — MIME spoof:** `mimeType` is client-supplied to `getPresignedUploadUrl`; HTML-as-image upload could XSS if R2 ever served from `*.billbee.com` custom domain. Today on `*.r2.cloudflarestorage.com` so mitigated by Cloudflare headers.
- **R — repudiation:** No `DocumentAccessLog` model; document ops not in `BankDataAccessLog` scope.
- **I — disclosure:** Verify object keys are always derived server-side as `documents/${userId}/${docId}/...`; if any download endpoint accepts a raw `key` without re-checking `Document.userId`, IDOR opens.
- **D — upload bomb:** `fileSize: z.number().int().positive()` has **no `.max()`** → 10GB declared upload allowed → R2 cost blowout.
- **E — key takeover:** If `key` is derived from `fileName` without sanitization, `../../` path-traversal could overwrite cross-user objects. Server-side key derivation required.

### 3.6 AI chat (`POST /api/ai/chat`, `/api/ai/explain-transaction/:id`)

| Surface | S | T | R | I | D | E |
|---|---|---|---|---|---|---|
| `/api/ai/chat` | session hijack | prompt injection | conversation logged ✓ | bank data → Anthropic | token-cost DoS | role-spoof |

- **T — prompt injection:** `chatSchema` is `z.string().min(1)` (no `.max()`, no filter). `/api/ai/explain-transaction/:id` flows Plaid-sourced `merchantName` and user-controlled `Transaction.userNote @db.Text` directly into prompts — a merchant or note literally named "Ignore previous instructions" is the textbook vector.
- **I:** Currently mock (`routes/ai.ts:134`); when Anthropic is wired, account masks/balances spill into Anthropic logs unless redacted.
- **D:** $20/mo Anthropic cap; one user looping 10MB messages drains it for everyone. No per-user budget.
- **E:** `AiMessageRole` is `USER|ASSISTANT` only; if API ever accepts client-set role, attacker can spoof prior "assistant" confirmations.

### 3.7 Web client (Vercel-hosted Next.js)

| Surface | S | T | R | I | D | E |
|---|---|---|---|---|---|---|
| Web SPA | XSS → sessionStorage steal | dep-injected JS | client-only guard bypass | JWT in callback URL | SSR DoS | stale role privilege |

- **S — XSS → JWT exfil:** sessionStorage readable from any same-origin script. CSP not configured.
- **T — supply chain:** `npm audit` baseline 37 vulns (mostly transitive Expo).
- **R — guard bypass:** `auth-context.tsx` redirects client-side; SSR could leak placeholder content if data is fetched server-side.
- **I — JWT in URL:** `/api/auth/google/callback` → `/auth/callback?accessToken=...` (`routes/auth.ts:222-224`) lands in browser history, Vercel logs, Referer.
- **D — Vercel free-tier:** 100GB / 100k SSR invocations cap can be intentionally exhausted.
- **E — stale `User.plan`:** UI uses cached snapshot; downgrade not reflected until next `/api/auth/me`.

### 3.8 Mobile app (Expo)

| Surface | S | T | R | I | D | E |
|---|---|---|---|---|---|---|
| Mobile | rooted token extraction | OTA tamper | crash-log audit gap | offline cache snoop | offline replay | iOS deep-link hijack |

- SecureStore extractable on rooted device (no JailMonkey). Expo Updates EAS-signed (trust Expo). Sentry not wired (F13). Cached data readable on stolen+unlocked device until refresh token rotation. F15 deep-link namespace acceptable.

### 3.9 Database direct (PostgreSQL)

| Surface | S | T | R | I | D | E |
|---|---|---|---|---|---|---|
| Postgres | DATABASE_URL leak | direct passwordHash UPDATE | no DB audit trail | backup theft | pool exhaustion | superuser via migration |

- `DATABASE_URL` env-only, Railway-VPC. No DB-level RLS. Prisma default pool ~10 — slow `ILIKE` (3.4 D) blocks connections. `prisma migrate deploy` runs as superuser; PR review is the only safeguard.

### 3.10 Redis / BullMQ (Upstash)

| Surface | S | T | R | I | D | E |
|---|---|---|---|---|---|---|
| Redis | REDIS_URL leak | job payload tamper | no per-job audit | userId in keys | queue flood | consumer = API privilege |

- Redis scoped to workers in API container. No global concurrency cap verified in `handlers.ts`. Worker decrypts tokens → same blast radius as API process.

### 3.11 R2 storage (Cloudflare)

| Surface | S | T | R | I | D | E |
|---|---|---|---|---|---|---|
| R2 | account-key leak | object overwrite | no R2 audit (free tier) | key bruteforce | upload bomb | bucket-policy escalation |

- `R2_SECRET_ACCESS_KEY` leak = full bucket r/w/d. Overwrites possible with predictable keys → require user-scoped prefixes.

### 3.12 Health endpoint (`GET /health`)
Returns `{status, timestamp}` per rule 21. Trivial; only DoS via uptime-check abuse.

---

## 4. Trust Boundaries

```
┌──────────────────────────────────────────────────────────────────┐
│                          PUBLIC INTERNET                         │
└──────────────────────────────────────────────────────────────────┘
   │                  │                       │
   │ HTTPS            │ HTTPS                 │ HTTPS + signed JWT
   │ (TLS 1.3)        │ (TLS 1.3 + JWT RS256) │ (Plaid ES256)
   ▼                  ▼                       ▼
┌──────────┐    ┌──────────────┐    ┌──────────────────────┐
│  Vercel  │───▶│   Railway    │◀───│  Plaid (webhook in)  │
│   (web)  │    │   (API)      │    └──────────────────────┘
└──────────┘    │              │              ▲
                │   Express    │              │ HTTPS + Plaid auth
                │   + tRPC     │──────────────┘
                │   + Prisma   │
                │              │      ┌─────────────────┐
                │              │─────▶│  Anthropic API  │
                │              │ TLS  └─────────────────┘
                │              │      ┌─────────────────┐
                │              │─────▶│  Resend (email) │
                │              │ TLS  └─────────────────┘
                │              │      ┌─────────────────┐
                │              │─────▶│  Cloudflare R2  │ ◀── browser direct (presigned)
                │              │ TLS  └─────────────────┘
                └──────┬───────┘
                       │ TLS (Railway VPC)
                       ▼
                ┌──────────────┐    ┌──────────────┐
                │  Postgres    │    │ Upstash Redis│
                │  (Railway)   │    │ (BullMQ)     │
                └──────────────┘    └──────────────┘

Browser ──── sessionStorage (JWT) ─── XSS-trust boundary
Mobile  ──── Expo SecureStore (JWT) ── OS-keychain trust boundary
```

### Boundary controls

| Boundary | Flows across | Controls |
|---|---|---|
| Internet ↔ Vercel | HTTPS (HTML/JS bundles, API responses to browser) | Vercel TLS termination, no server-side secrets in bundles, `Helmet`-style defaults via Next.js, no CSP yet (gap). |
| Vercel ↔ Railway API | JWT-bearing fetch calls | CORS allowlist (`env.ALLOWED_ORIGINS`), `helmet()` on API, JWT RS256 verification, rate limiting (`globalLimiter`/`authLimiter`). |
| Railway API ↔ Plaid (out) | `access_token` (decrypted server-side, in-process), institution lookups | TLS 1.3, Plaid SDK, `PLAID_SECRET` env-only, ENCRYPTION_KEY for at-rest token encryption. |
| Plaid ↔ Railway API (webhook in) | Signed webhook payloads | ES256 signature verification, body-hash check, 5-min `iat` skew, raw-body parser mounted before JSON, dedup via `externalEventId @unique`. |
| Railway API ↔ Anthropic | Conversation messages, transaction enrichment context | TLS 1.3, `ANTHROPIC_API_KEY` env-only, $20/mo spend cap. **Gap: no per-user token budget, no PII redaction.** |
| Railway API ↔ Resend | Email (verification, reset, notification) | TLS 1.3, `RESEND_API_KEY`, DKIM/SPF/DMARC on sending domain (verify Cloudflare DNS records). |
| Railway API ↔ Postgres | All persistent reads/writes | Railway-private network, TLS, connection-pool cap, Prisma parameterized queries. |
| Railway API ↔ Upstash Redis | Job payloads, rate-limit counters | TLS, Upstash token. |
| Browser ↔ R2 | File body bytes (PUT/GET) | Presigned URL (5/15 min TTL), `Content-Length` enforced, MIME provided by client (gap on validation). |
| Browser ↔ sessionStorage | JWT, `User` object | Same-origin policy, sessionStorage cleared on tab close. **No CSP — XSS would defeat this entirely.** |
| Mobile ↔ SecureStore | JWT, refresh token | iOS Keychain / Android Keystore, biometric gate optional (not implemented). |

---

## 5. Top 20 Threats — Ranked

Likelihood: L=Low, M=Medium, H=High. Impact: L/M/H/CAT (catastrophic).
Status: ✅ mitigated · ⚠️ partial · ❌ open · 🔁 prior-review F-ID.

| Rank | ID | Threat | Likelihood | Impact | Surface | Mitigation status |
|---:|---|---|---|---|---|---|
| 1 | T01 | `JWT_PRIVATE_KEY` leak via Railway env, Sentry breadcrumb, or PR commit | M | CAT | API process | ⚠️ env-only, no Sentry scrubber yet (F13) |
| 2 | T02 | `ENCRYPTION_KEY` leak → all Plaid tokens decryptable offline | L | CAT | API process / backup | ⚠️ env-only, no key rotation map (F16) |
| 3 | T03 | XSS in web client → sessionStorage JWT exfil | M | CAT | Web SPA | ❌ no CSP, no SRI on third-party scripts |
| 4 | T04 | Google OAuth account-link without re-verification → ATO | L | CAT | `/api/auth/google/callback` | ❌ link-on-email-match logic in `services/auth.ts:273-318` |
| 5 | T05 | Prompt injection via `merchantName`/`userNote` → leak system prompt or other-user data via shared LLM cache | H | H | `/api/ai/explain-transaction` | ❌ no sanitization, no length cap |
| 6 | T06 | Refresh-token bcrypt-scan algorithmic DoS as `RefreshToken` table grows | M | H | `/api/auth/refresh`, `/logout` | ❌ O(N) compare in `services/auth.ts:117-132` |
| 7 | T07 | OAuth callback exposes JWT in URL query → browser history / Referer leak | H | H | `/api/auth/google/callback` | ❌ query-string token in `routes/auth.ts:222-224` |
| 8 | T08 | Document upload-bomb (no `fileSize` max) → R2 cost amplification | M | H | `/api/documents/:id/presign-upload` | ❌ no `.max()` on `fileSize` |
| 9 | T09 | Plaid webhook payload not Zod-validated | M | H | `/api/plaid/webhook` | 🔁 F3 open |
| 10 | T10 | `BankDataAccessLog` cascade-delete on user removal (compliance break) | M | H | DB schema | 🔁 F2 — fixed per current schema (`onDelete: SetNull`) ✅ |
| 11 | T11 | Login user-enumeration via bcrypt timing oracle | M | M | `/api/auth/login` | ❌ no dummy-hash on missing-user path |
| 12 | T12 | `ILIKE %merchant%` DoS via unbounded query string | M | M | `/api/transactions` | 🔁 F9 open |
| 13 | T13 | LLM token-cost DoS exhausts $20/mo cap → AI outage | M | M | `/api/ai/chat` | ❌ no per-user budget |
| 14 | T14 | Plaid error message verbatim leak (institution names, ids) | M | M | `/api/plaid/*` | 🔁 F10 open |
| 15 | T15 | R2 presigned URL leak (logs, browser history) → unauthorized upload/download | L | M | R2 surface | ⚠️ short TTL helps; no audit |
| 16 | T16 | MIME-spoof + future custom-domain R2 → stored XSS via "image" upload | L | H | R2 surface | ⚠️ acceptable today, gap for future custom domain |
| 17 | T17 | Credential stuffing on `/api/auth/login` (IP-based limiter bypass) | H | M | `/api/auth/login` | ⚠️ `authLimiter` only |
| 18 | T18 | Transaction `userNote` reflected into AI prompt → privilege escalation via prompt-injected tool calls (when AI gains tools) | L | H | `/api/ai/*` | ❌ future risk; no allow-list |
| 19 | T19 | OAuth callback CSRF (no `state` param verification confirmed) | L | H | `/api/auth/google/callback` | ⚠️ Passport handles `state` by default; verify `session: false` config does not bypass |
| 20 | T20 | Webhook 401 vs 400 distinguishability oracle | L | L | `/api/plaid/webhook` | 🔁 F5 open |

Threats already covered and verified mitigated by SECURITY_REVIEW_REPORT.md (do not re-evaluate): all "Pass list" items A1–K3 (crypto, JWT signature, query scoping, no `dangerouslySetInnerHTML`, sessionStorage, no `localStorage`, no `$queryRawUnsafe`, raw-body webhook ordering, dedup, etc.).

---

## 6. Compliance Considerations

### 6.1 GDPR (EU users)
- **Access (Art. 15) / Portability (Art. 20):** No `/api/account/export` exists. Gap — need JSON export of all per-user models.
- **Erasure (Art. 17):** Most models cascade-delete; `BankDataAccessLog` correctly retains via `onDelete: SetNull` (schema:502 — F2 closed). R2 objects are NOT cascade-deleted — gap; need enumerate-and-`deleteFile`.
- **Sub-processor DPAs:** Plaid, Anthropic, Resend, Cloudflare, Railway, Vercel, Upstash, Sentry. List in Privacy Policy.
- **Data residency:** Railway US-east default; EU→US transfer requires SCCs. Gap unless EU region added.
- **Lawful basis for AI bank-data processing:** Consent at link time — not stored in DB. Gap.
- **Retention:** No automatic purge job. F6 (webhook raw payloads forever) is the worst exposure.

### 6.2 CCPA — "Do Not Sell" N/A; right-to-know / delete same gaps as GDPR.
### 6.3 PCI DSS — Out of scope. No PAN/CVV; Plaid handles institution auth.
### 6.4 SOC 2 — Not in scope today. Type 1 readiness gaps: no CAB, no IR runbook, no vendor risk inventory, no access reviews.
### 6.5 Plaid contractual obligations
- AES-256-GCM at rest ✅ (A1). Tokens least-privileged ✅. ES256 webhook verification ✅ (A6). 30-day post-closure data deletion ⚠️ no SLA. 72hr breach notification ⚠️ no IR runbook. 1-year audit retention ⚠️ TBD. `removeItem` on disconnect ✅ (B3).

---

## 7. Out-of-Scope Items (Explicit)

The following are accepted risks and not addressed in this model:

1. Physical security of the user's device (laptop, phone) — out of our control.
2. Compromise of upstream services (Anthropic, Plaid, Resend, Cloudflare, Vercel, Railway, Upstash, Google, Expo) — accept their stated security posture.
3. Zero-day vulnerabilities in Node.js, Express, Next.js, Expo, jose, Prisma, bcrypt, ioredis — covered by upstream patches; our duty is `npm audit` + Dependabot.
4. Side-channel attacks against Railway shared-tenant infrastructure (Spectre/Meltdown class).
5. Network-level attacks on Cloudflare/Vercel/Railway BGP, DNS root, or ISP — accept platform controls.
6. Insider threats by Railway / Cloudflare / Vercel staff with infrastructure access.
7. Quantum-resistant cryptography migration — RSA-2048 / ECDSA / AES-256 acceptable for current threat horizon.
8. Multi-currency reporting fairness (PLAID_SPEC out-of-scope).
9. Mobile rooting / jailbreaking detection (no JailMonkey, no SafetyNet).
10. Adversarial machine learning against future Anthropic-powered features beyond prompt-injection (data poisoning, model inversion).

---

## 8. Recommendations for Downstream Agents

The Top 20 threats above are routed to specialist agents. Each agent should re-derive specific exploits and propose mitigations.

### B1 — Penetration Tester
Owns: **T03, T07, T11, T17, T19, T20.**
Run: ZAP baseline against staging URL, JWT bypass attempt, OAuth state-CSRF test, login-timing measurement (>= 1000 samples per branch), credential-stuffing simulation against `authLimiter`.

### B2 — Data Leak Auditor
Owns: **T04, T07, T14, T15, T16.**
Run: regex sweep of all `console.log`/`logger.*`/`res.json` for token fragments, OAuth-redirect leakage test, R2 presigned-URL TTL audit, MIME-spoof upload + download test, Plaid error message exposure inventory.

### B3 — Cryptographer
Owns: **T01, T02, T10 (closure verification).**
Run: verify AES-256-GCM IV randomness, key-rotation runbook drafting (`Map<version, key>`), confirm `BankDataAccessLog` retention truly survives user delete, verify JWT `kid` and algorithm pinning matches Plaid JWKS rotation.

### B4 — Dependency Auditor
Owns: **T03 (CSP/SRI as well), supply-chain risk underlying T01–T20.**
Run: `npm audit --omit=dev --json`, Snyk scan, lockfile diff review, Expo SDK 51 CVE check, transitive `node_modules` provenance.

### B5 — Infrastructure / DoS
Owns: **T05, T06, T08, T12, T13, T18.**
Run: load-test `/api/transactions?merchant=<1MB>` for ILIKE blowup, simulate AI-cost exhaustion with looping `/api/ai/chat`, queue-flood Plaid webhook → measure BullMQ latency, RefreshToken table growth simulation (1M rows × refresh/min), document upload-bomb test (10GB declared).

### Cross-cutting work for the Engineering Lead
- Wire Sentry with `beforeSend` scrubber (T01 mitigation).
- Add CSP `default-src 'self'; script-src 'self' 'nonce-...'` to Next.js (T03).
- Add per-user AI token budget table + middleware (T13).
- Add `state` param verification audit on Google OAuth (T19).
- Replace OAuth-callback `?accessToken=` with fragment or POST-back (T07).
- Add dummy-bcrypt on missing-user login path (T11).
- Add `fileSize.max(50_000_000)` (50MB) on document presign (T08).
- Add prompt-injection mitigation: redact transaction `name`/`merchantName`/`userNote` to safe-list before AI calls (T05, T18).
- Define data-export endpoint (`POST /api/account/export`) and erasure endpoint (`POST /api/account/delete`) for GDPR/CCPA.

---

**End of Threat Model.**
