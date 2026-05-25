# BillBee — Comprehensive Security Audit (Consolidated)

**Coordinator:** Security Coordinator
**Date:** 2026-04-28
**Inputs:** `THREAT_MODEL.md`, `PENTEST_REPORT.md`, `DATA_LEAK_AUDIT.md`, `CRYPTO_AUDIT.md`, `DEPENDENCY_AUDIT.md`, `INFRA_SECURITY_AUDIT.md`, `SECURITY_REVIEW_REPORT.md` (Plaid F-series, already remediated).

---

## 1. Executive Summary

BillBee's application code is in **strong shape**: Plaid is near-financial-grade (AES-256-GCM correct, ES256 webhook verification body-bound, IDOR discipline clean, Prisma parameterized). Six parallel audits surfaced **0 CRITICAL**.

After deduplication: **15 HIGH · ~40 MEDIUM · ~25 LOW · ~12 INFO** (down from 63 raw HIGHs once cross-cutting dupes merge — JWT-in-OAuth-URL and the O(N) refresh-token bcrypt scan each flagged by 3+ audits).

**Top 3 risks:**
1. **Auth surface gaps outside Plaid** — Passport never `initialize()`d (OAuth 500s in prod), JWT in OAuth callback URL, no lockout, no password reset, no failed-auth logging, O(N·bcrypt) refresh-token verify.
2. **Deployment glue not production-ready** — Dockerfile runs as root, no `.dockerignore`, deploy workflows are stubs, Sentry not wired, no `?sslmode=require`, prod env-var schema doesn't enforce required-in-production.
3. **Crypto lifecycle holes** — `accessTokenKeyVersion` declared but never written/read (rotation non-functional), no refresh-token reuse detection, no AAD on AES-GCM.

**Estimated effort to clear all HIGH-tier findings:** **~5–7 engineering days** (most HIGHs <1 hr; refresh-token redesign is the only multi-day item).

---

## 2. Verdict matrix

| Launch tier | GO/NO-GO | Reason |
|---|---|---|
| Local dev / personal use | **GO** | Already shipping; no real users at risk. |
| Closed beta (≤10 invited users) | **CONDITIONAL GO** | After Sprint 1 quick-wins (P1 Passport init, L02 OAuth-URL token, S5/S7/D1/D2/D7 Docker hardening, CI4 `--ignore-scripts`). 1 day of work. |
| Public open signup | **NO-GO** | P2 (registration enumeration), P4 (no password reset), P5 (no lockout), M1 (no Sentry), DB2 (no SSL enforcement), C1+C3 (refresh-token DoS + no reuse detection) must close first. |
| Plaid Production (real banks) | **NO-GO** | All of "public" plus C2 (key rotation non-functional), B1/B2 (untested backups), B3 (no key-rotation runbook), B4 (no incident runbook). Plaid contract requires 72hr breach notification + key rotation capability. |

---

## 3. Deduplicated finding table — All HIGH severity

15 HIGH findings after deduplication (raw total: 25 HIGH from npm audit + 16 from the other five audits = 41 → 15 unique vulnerabilities once npm-audit families are collapsed and cross-report dupes merged).

| ID | Severity | Title | Source reports | Fix effort | Pre-PROD blocker? |
|---|---|---|---|---|---|
| H01 | HIGH | Passport never `initialize()`d → `/api/auth/google` 500s in prod | PENTEST P1 | 30 min | YES |
| H02 | HIGH | JWT access token in Google OAuth callback URL (`?accessToken=…`) | PENTEST P3, DATA_LEAK L02, CRYPTO C6, THREAT_MODEL T07 | 30 min – 4 hr | YES |
| H03 | HIGH | Refresh-token verify is unscoped O(N·bcrypt) scan — DoS + timing oracle | PENTEST P6, CRYPTO C1, CRYPTO C4, THREAT_MODEL T06 | 1 day | YES (public launch) |
| H04 | HIGH | `accessTokenKeyVersion` schema field never written/read — key rotation non-functional | CRYPTO C2, THREAT_MODEL T02 | 2 hr (remove) / 1 day (implement) | YES (Plaid prod) |
| H05 | HIGH | No refresh-token reuse detection / session-family revocation; 30-day TTL | CRYPTO C3 | 1 day | YES (public launch) |
| H06 | HIGH | `loginWithGoogle` `findUnique` returns full User row (incl. `passwordHash`) into memory | DATA_LEAK L03 | 5 min | NO (latent) |
| H07 | HIGH | `pushToken` logged by name (substring-redacted, but explicit-listing required) | DATA_LEAK L01, DATA_LEAK L04 | 5 min | NO |
| H08 | HIGH | No CSP on Next.js web app (sessionStorage XSS exfil path open) | INFRA H2, THREAT_MODEL T03 | 2 hr | YES (public launch) |
| H09 | HIGH | Dockerfile runs as root + base image not pinned to digest | INFRA D1, INFRA D2 | 15 min | YES |
| H10 | HIGH | `DATABASE_URL` has no `?sslmode=require` — TLS not enforced | INFRA DB2 | 5 min | YES |
| H11 | HIGH | Postgres public-proxy URL in dev `.env`; prod not verified to use internal URL | INFRA RW2 | 15 min (verify) | YES |
| H12 | HIGH | Deploy workflows are stubs (`echo` only) — auto-deploy expectations broken | INFRA CI1 | 1 hr | YES |
| H13 | HIGH | Sentry not wired in any app → uncaught errors silent in prod | INFRA M1, DATA_LEAK L15, THREAT_MODEL T01 | 2 hr | YES |
| H14 | HIGH | No documented Postgres backup / restore drill (RPO/RTO undefined) | INFRA B1, INFRA B2 | 4 hr (doc + test) | YES (Plaid prod) |
| H15 | HIGH | `next@14.2.33` — 7 advisories incl. HTTP request smuggling in rewrites; trivial patch to `14.2.35` | DEPENDENCY (npm audit) | 5 min | YES |

**Dependency-audit HIGH families (collapsed into H15 + tracked separately):** 25 npm-audit HIGHs distill to **3 fix actions**: (a) `npm audit fix` patch wave (closes ~15 transitive HIGHs incl. `node-forge`, `path-to-regexp`, `lodash`, `fast-uri`, `picomatch`, `tar`); (b) `next` patch bump (closes 7); (c) `expo@51 → 55` major migration (closes 7 build-time-only Expo-chain HIGHs — non-blocking).

---

## 4. Top 10 prioritized fixes

Ordered by `severity × likelihood × ease-of-fix`.

### #1 — Add `app.use(passport.initialize())`
Without this, every `/api/auth/google` request 500s in production, forcing users onto the password flow that lacks lockout, reset, and failed-auth logging. One-line fix.
- **Files:** `apps/api/src/index.ts` · **Effort:** 15 min · **Source:** PENTEST P1
- **Fix:** `import passport from 'passport'; app.use(passport.initialize());` + integration test asserting `/api/auth/google` returns 302.

### #2 — Run `npm audit fix` + bump `next` to 14.2.35
Closes ~15 transitive HIGH advisories plus 7 Next.js HIGHs (incl. HTTP request smuggling GHSA-ggv3-7p47-pfv8). Patch-level only.
- **Files:** `package.json`, `package-lock.json` · **Effort:** 15 min · **Source:** DEPENDENCY §9
- **Fix:** `npm audit fix --omit=dev`; verify `next@14.2.35`; `npm test`.

### #3 — Add `select` to `loginWithGoogle` `findUnique`
Prevents `passwordHash` from sitting in memory. Only un-`select`ed User read in the codebase.
- **Files:** `apps/api/src/services/auth.ts:275-277` · **Effort:** 5 min · **Source:** DATA_LEAK L03
- **Fix:** Add `select: { id: true, avatarUrl: true, email: true }`.

### #4 — Move JWT out of OAuth callback URL
Replace `?accessToken=…` with `#fragment` (not sent to server/proxies/Referer) or single-use 60-sec exchange code. Prevents JWT leak via history, Referer, Vercel/Cloudflare logs.
- **Files:** `apps/api/src/routes/auth.ts:222-224` + web `/auth/callback` page · **Effort:** 30 min (fragment) / 2 hr (exchange-code) · **Source:** PENTEST P3, DATA_LEAK L02, CRYPTO C6, THREAT_MODEL T07
- **Fix:** `redirectUrl.hash = `accessToken=${accessToken}``; web reads `window.location.hash`, stores, then `history.replaceState`.

### #5 — Harden Dockerfile (non-root, pin digest, `.dockerignore`)
Prevents container privilege escalation, image drift, and accidental `.env` leak into image layers.
- **Files:** `apps/api/Dockerfile`, new `apps/api/.dockerignore` · **Effort:** 30 min · **Source:** INFRA D1+D2+D7
- **Fix:** `USER node` in production stage; `FROM node:20.18.1-alpine@sha256:<digest>`; `.dockerignore` excludes `.env*`, `node_modules`, `dist`, `.turbo`, `*.log`.

### #6 — Enforce TLS on DATABASE_URL + verify Railway internal URL
Append `?sslmode=require` to prod `DATABASE_URL`; verify Railway prod uses `postgres.railway.internal`, not the public proxy. Prevents proxy-hop MITM.
- **Files:** Railway env vars; `apps/api/src/config/env.ts` `.superRefine` · **Effort:** 30 min · **Source:** INFRA DB2+RW2
- **Fix:** Zod refinement: `if (NODE_ENV==='production' && !DATABASE_URL.includes('sslmode=require')) throw`.

### #7 — Wire Sentry with `beforeSend` scrubber
Without Sentry, uncaught errors are swallowed in production. Scrubber strips all token/secret/auth/cookie/key fields per DATA_LEAK §F. `tracesSampleRate: 0.1`, `sendDefaultPii: false`.
- **Files:** `apps/api/src/index.ts`, `apps/web/sentry.{client,server}.config.ts` · **Effort:** 2 hr · **Source:** INFRA M1, DATA_LEAK L15, THREAT_MODEL T01

### #8 — Replace deploy-workflow stubs OR remove them
`deploy-api.yml` / `deploy-web.yml` only `echo` a secret name — silent no-op. Either implement real `railway up`/`vercel deploy` or delete + document Railway/Vercel git auto-deploy. Add `permissions: { contents: read }`, `concurrency:` group, GitHub `production` Environment.
- **Files:** `.github/workflows/{deploy-api,deploy-web,ci}.yml` · **Effort:** 1 hr · **Source:** INFRA CI1+CI2+CI3+CI4+CI6

### #9 — Refresh-token redesign: `<lookupId>.<secret>` format
Today `/refresh` and `/logout` load **every** non-revoked refresh token and bcrypt-compare against each. At 10k active sessions = 17min per refresh + timing oracle. HMAC-derived `lookupId` → O(1) lookup → single `bcrypt.compare`. Add `parentTokenId` for session-family reuse detection (RFC 6819 §5.2.2.3); `requireAuth` on `POST /logout`.
- **Files:** `prisma/schema.prisma`, `services/auth.ts:81,117-132`, `routes/auth.ts:113-148` · **Effort:** 1 day · **Source:** PENTEST P6+P15, CRYPTO C1+C3+C4+C7, THREAT_MODEL T06

### #10 — Account lockout + failed-auth logging + dummy-bcrypt
Three fixes share one touch site. Add `failedLoginCount` + `lockedUntil` columns; on missing-user branch run `bcrypt.compare(password, FAKE_HASH)`; log every failed attempt. Closes credential-stuffing and timing-oracle vectors.
- **Files:** `prisma/schema.prisma`, `services/auth.ts:217-249` · **Effort:** 4 hr · **Source:** PENTEST P5+P10+P12, THREAT_MODEL T11+T17
- **Fix:** Migration adds two columns; service increments on fail / resets on success / rejects if `lockedUntil > now`; exponential `2^count` capped at 30 min.

---

## 5. Quick-wins (sub-30-min — batch into ONE PR)

Single PR, ~2 hours, closes 17 findings across 5 audits:

1. **P1** — `app.use(passport.initialize())` in `index.ts` (15m).
2. **L03** — `select` on `loginWithGoogle` `findUnique` (5m).
3. **L01+L04** — Add `pushToken`, `ENCRYPTION_KEY`, `accessTokenCiphertext`, `clientSecret`, `privateKey`, `signature` to `SENSITIVE_FIELDS` (`config/logger.ts`) (5m).
4. **L05+L08** — Stop logging `to`/Resend `body` in `notifications.ts:30-40` (10m).
5. **C5** — Pin `algorithms: ['RS256']` + `clockTolerance: '5s'` on `jwtVerify` (5m).
6. **C9** — Helmet HSTS `maxAge: 63072000, preload: true` + API CSP `default-src 'none'; frame-ancestors 'none'` (10m).
7. **C12** — Refresh cookie `SameSite=Lax` (5m).
8. **C4** — CORS `maxAge: 86400` (1m).
9. **D3+D4** — Dockerfile `HEALTHCHECK` + OCI labels (10m).
10. **CI2+CI3+CI4** — `permissions: { contents: read }`, `concurrency:` group, `--ignore-scripts` on all `npm ci` (15m).
11. **S5+S7** — Create `apps/api/.env.example`; add `.env*` ignore to `apps/{web,api}/.gitignore` (10m).
12. **L02 (fragment)** — Move OAuth callback token to `#fragment` (15m).
13. **H10/DB2** — Append `?sslmode=require` to prod `DATABASE_URL` (5m).
14. **DEPENDENCY** — `npm audit fix --omit=dev` + verify `next@14.2.35` (15m).

---

## 6. PROD launch blockers

Decisive list. MUST close before any real user with real bank credentials:

1. **H01/P1** — Passport `initialize()` (OAuth broken in prod today).
2. **H02/L02** — JWT out of OAuth callback URL.
3. **H08/H2** — CSP on Next.js web app.
4. **H09/D1+D2+D7** — Dockerfile non-root, pinned digest, `.dockerignore`.
5. **H10/DB2** — `?sslmode=require` on prod `DATABASE_URL`.
6. **H11/RW2** — Prod uses `postgres.railway.internal`.
7. **H12/CI1** — Real deploy workflows OR explicit removal + auto-deploy doc.
8. **H13/M1** — Sentry wired with PII scrubber.
9. **H14/B1+B2** — Documented backup retention + first restore drill.
10. **DEPENDENCY** — `next@14.2.35` + `npm audit fix` clean.
11. **E2** — Zod `.superRefine` requiring prod env vars.
12. **CI8** — Branch protection on `main`.

**Plaid Production additionally:** H03 (refresh-token redesign), H04 (key rotation), H05 (reuse detection), C8 (decrypt alerting), B3+B4 (runbooks), Anthropic zero-data-retention (L06/L07).

---

## 7. Long-term hardening (post-launch)

- **C10** — AES-GCM AAD binding (`userId|plaidItemId`).
- **C11** — JWT `jti` + Redis revocation list (force-logout).
- **C17** — Field-level encryption for `BankAccount.{officialName, mask, balances}`.
- **R4 / R5** — `rate-limit-redis` against Upstash; per-user `aiLimiter` (20/hour) for $20/mo cap.
- **L06 + L07** — Coarsen AI prompts; Anthropic workspace zero-data-retention.
- **P2 / P4 / P7** — Always-200 register + email verification + password reset; require currentPassword on email change.
- **P18** — Soft-delete on appointments/reminders.
- **CI7** — CodeQL + Trivy + Syft SBOM in pipeline.
- **Major upgrade sprint:** Expo 51→55, RN 0.74→0.85, Plaid 28→42, Prisma 5→7. Closes ~15 dep advisories.
- **GDPR endpoints** (`/api/account/export`, `/api/account/delete`) + R2 cascade-delete + retention policy + sub-processor DPA list.
- **PQ readiness** — 1-page runbook for hybrid X25519+ML-KEM cutover.

---

## 8. What's already excellent (do NOT break)

- **Plaid integration is "near-financial-grade"** (PENTEST §9): webhook signature verification with body-hash binding, raw-body ordering, ES256 algorithm pinning, key cache, iat skew, ciphertext stripping, dedup with hash fallback, soft-delete on disconnect.
- **AES-256-GCM textbook-correct** (CRYPTO §1): 12-byte random IV from `crypto.randomBytes`, hex-validated key, auth-tag verified, generic errors, dedicated `CryptoError`, format `v<n>:base64(iv‖tag‖ct)`. Unit tests cover tamper / wrong-key / round-trip.
- **IDOR discipline is "rare consistency"** (PENTEST §9): every `findFirst`/`update`/`delete` includes `userId`; cross-user → 404 (correct convention).
- **All prior Plaid F4–F11+F20 remediated** in current code (PENTEST §9).
- **Logger redactor** catches `passwordHash`, `tokenHash`, `accessTokenCiphertext`, `pushToken`, `R2_SECRET_ACCESS_KEY`, `GOOGLE_CLIENT_SECRET`, `EXPO_ACCESS_TOKEN`, `RESEND_API_KEY`, `PLAID_SECRET` via substring match. Only `ENCRYPTION_KEY` slips, never logged (DATA_LEAK §3).
- **Production error envelope** is generic `INTERNAL_ERROR` — no stack, no `err.message`.
- **Mobile** uses Expo SecureStore; **web** uses sessionStorage (not localStorage).
- **Lockfile healthy:** v3, no `git+` URLs, no typosquats, all permissive-licence direct deps.
- **Zero `$queryRawUnsafe`** anywhere; **no SSRF** (all outbound URLs env-pinned); **no `.env` in git history**.

---

## 9. Compliance posture

| Framework | Posture | Gaps |
|---|---|---|
| **GDPR** | NOT READY | No `/api/account/export` (Art. 15/20). R2 not cascade-deleted (Art. 17). No DPA list in privacy policy. US-only residency (EU transfer needs SCCs). AI consent not stored. Webhook payloads nulled at 30d ✓ (F6 fixed). |
| **CCPA** | NOT READY | Same Art. 15/17 gaps as GDPR. "Do Not Sell" N/A. |
| **PCI DSS** | OUT OF SCOPE | No PAN/CVV; Plaid handles institution auth. |
| **SOC 2 Type 1** | NOT READY | No CAB, no IR runbook (B4), no vendor-risk inventory, no access reviews, no key-rotation runbook (B3), Sentry not wired (M1), no SAST (CI7), no backup-restore evidence (B2). |
| **Plaid contractual** | PARTIAL | ✅ AES-256-GCM at rest (A1) · ES256 webhook (A6) · least-privilege tokens · `removeItem` on disconnect (B3). ⚠️ 30d post-closure deletion (no SLA) · 72hr breach notification (no IR runbook) · 1yr audit retention (TBD). ❌ Key rotation non-functional (C2). |

**Bottom line:** Plaid Production requires closing all ⚠️/❌ items + Sprints 1–3 below.

---

## 10. Recommended fix sequence (for the Fix Implementation agent)

### Sprint 1 — Today (~2 hr, ONE PR, 17 findings)
The Quick-wins list from §5. All sub-30-min fixes batched.

### Sprint 2 — Before closed beta (~1 day, 8 items)
1. **D1+D2+D7** — Dockerfile non-root + pinned digest + `.dockerignore` (30m).
2. **H13/M1** — Wire Sentry with `beforeSend` scrubber, API + web (2h).
3. **H12/CI1** — Real deploy steps OR delete stubs + document (1h).
4. **CI8** — Branch protection on `main` (15m, GitHub UI).
5. **H11/RW2** — Verify Railway prod uses internal Postgres URL (15m).
6. **E2/E4/C3** — Zod `.superRefine` requiring prod env vars (1h).
7. **H08/H2** — Add CSP to `next.config.js` in `report-only` (1h; enforce after a week).
8. **M3** — Extend `/health` to ping Postgres + Redis with 1s timeouts (30m).

### Sprint 3 — Before public launch (~1 week)
1. **H03/H05** — Refresh-token redesign + reuse detection + `requireAuth` on `/logout` (1 day).
2. **#10** — Account lockout + failed-auth log + dummy-bcrypt (4h).
3. **P2 + P4** — Always-200 register + email verification + password reset (1 day).
4. **P7** — Email change requires `currentPassword` + confirmation (2h).
5. **R4 + R5** — `rate-limit-redis` + per-user `aiLimiter` (3h).
6. **B1 + B2** — Backup retention doc + first restore drill (4h).
7. **L06 + L07** — Anthropic zero-data-retention + coarsen prompts + deny PAN/SSN in `extraContext` (3h).
8. **DB3** — Wire `prisma migrate deploy` into Railway `releaseCommand` (30m).

### Sprint 4 — Before Plaid Production (~3 days)
1. **H04/C2** — Implement real key rotation map OR remove scaffolding (1 day).
2. **B3 + B4** — `RUNBOOK.md` covering key rotation, token revocation, incident response (4h).
3. **C8** — Sentry alerts on `TAMPER_SUSPECTED` + decrypt-failure metric + threshold (2h).
4. **C10** — Bind `userId|plaidItemId` as AAD on AES-GCM (couple with C2; 2h).
5. **GDPR endpoints** — `/api/account/export` + `/api/account/delete` + R2 cascade-delete (1 day).

### Sprint 5+ — Post-launch
C11 (JWT `jti`), C17 (field encryption), CI7 (CodeQL+Trivy+Syft), Expo 51→55 + RN 0.74→0.85 + Plaid 28→42 + Prisma 5→7 upgrade sprint, P18 (soft-delete), WAF, annual pentest, PQ runbook.

---

**End of consolidated audit.** All Sprint 1 fixes can land in a single PR today; Sprints 2–4 are the path to public + Plaid Production launch.
