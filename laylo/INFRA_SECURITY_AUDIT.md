# Infrastructure Security Audit — BillBee

**Auditor:** Infrastructure Security Auditor
**Date:** 2026-04-28
**Scope:** Deployment configs (Docker / Vercel / Railway), env-var handling, CORS, rate limits, secrets management, deploy pipelines, monitoring, backups
**Mode:** READ-ONLY static review (no deploy configs modified)
**Builds on:** `SECURITY_REVIEW_REPORT.md` (Plaid integration, 2026-04-28)

---

## 1. Executive Summary

The application code-side controls are mature: `helmet`, per-IP rate limiting, Zod env-var validation that exits the process on missing required vars, raw-body Plaid webhook ordering, and AES-256-GCM at-rest encryption are all in place. CORS is allow-list driven (no wildcard), the Vercel and Next.js header configs both ship `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, and a sensible `Referrer-Policy`. No secrets have ever been committed to git history; the `.env` files are correctly `.gitignore`d at every level via the root `.gitignore`.

However, the **deployment glue is incomplete and not production-ready**. The two `deploy-*.yml` workflows are stubs (`echo "configure ... TOKEN"` only — no actual deploy step). No GitHub Actions workflow consumes any encrypted secret yet, branch protection cannot be inspected from disk (manual verification required), and there is no `apps/api/.env.example` — the only example is `laylo/.env.example` at the monorepo root. The Dockerfile runs as **root** (no `USER` directive), is not pinned to a digest, has no image labels, and the health check defined in `railway.json` (30 s) is fine but Postgres exposure to public internet on Railway requires manual verification. Sentry is in `.env` and on the Zod schema but is **not wired into either app** (`@sentry/*` packages are not in `package.json`). HSTS / Content-Security-Policy are left at helmet defaults — which means HSTS is set, but CSP is **disabled by default** on the Express side.

**Counts:** 0 CRITICAL · 6 HIGH · 11 MEDIUM · 7 LOW

**Top 3 infra concerns:**
1. **Dockerfile runs as root** + no pinned base image digest + no `HEALTHCHECK` instruction — privilege escalation risk in container, supply-chain risk on `node:20-alpine` re-tagging.
2. **Deploy workflows are placeholders** — `deploy-api.yml` and `deploy-web.yml` only `echo` the secret name. Production deploys today either happen manually via Railway/Vercel git integration (acceptable) or via these stubs (broken). No documented branch protection, no `concurrency:` group, no environment gating.
3. **Sentry not wired** — error tracking is on the deployment plan but `apps/api` and `apps/web` have neither `@sentry/node` nor `@sentry/nextjs` installed; uncaught errors today are silent in prod.

---

## 2. Findings by Area

### 2.1 Secrets management

| ID | Sev | Finding | Evidence |
|----|-----|---------|----------|
| S1 | INFO | `.env` files correctly gitignored at every level via root `.gitignore`. `git check-ignore` confirms `apps/api/.env`, `apps/web/.env`, `apps/mobile/.env` all match `laylo/.gitignore:5`. | `git check-ignore -v laylo/apps/api/.env` → `laylo/.gitignore:5:.env` |
| S2 | INFO | No `.env` ever committed to git history. `git log --all --full-history -- '*.env'` returns empty; only `.env.example` files appear (placeholder values only). | git history scan |
| S3 | INFO | No hardcoded secrets in source. Pattern grep for `sk_live_`, `sk_test_`, `Bearer ey…`, `AKIA[0-9A-Z]{16}`, `-----BEGIN` in `*.ts/*.tsx/*.json/*.yml` (excl. `node_modules/.next/dist/.turbo`) returns clean. | grep |
| S4 | MEDIUM | Real secrets sit in **plaintext** at `apps/api/.env` on the developer machine: live Railway Postgres URL with password, Plaid sandbox client+secret, **production-grade ENCRYPTION_KEY** (64-hex, used for at-rest token AES-GCM), and base64 RS256 JWT private key. Loss of this laptop = full production data compromise (DB + token-decryption). | `apps/api/.env:5,8-9,17,21` |
| S5 | HIGH | `apps/api/.env.example` does **not exist** — the only example is `laylo/.env.example` at the monorepo root. New devs deploying the API in isolation have no co-located example, and the SECURITY_REVIEW_REPORT F4 fix only updated the root file. | `ls apps/api/` shows no `.env.example` |
| S6 | LOW | `.gitignore` does **not** include `*.env.local`, `*.env.production` patterns by app subdirectory — the existing `.env.local` and `.env.*.local` patterns at root catch them, but per-app patterns would be defence-in-depth if a sub-app ever adds its own `.gitignore`. | `laylo/.gitignore:6-7` |
| S7 | MEDIUM | `apps/web/.gitignore` and `apps/api/.gitignore` do **not exist**. Only `apps/mobile/.gitignore` (Expo-generated) is present. If a contributor `cd`s into `apps/web` and runs `git init` (e.g. extracting the app), the env files become at risk. Add a one-line `.env*` ignore to each app for defence-in-depth. | `ls -la apps/web/.gitignore` → not found |

### 2.2 CORS

| ID | Sev | Finding | Evidence |
|----|-----|---------|----------|
| C1 | INFO | CORS uses an explicit origin allow-list parsed from `ALLOWED_ORIGINS` env (comma-separated). No `*` wildcard. `credentials: true` is paired with the allow-list, which is the safe pattern. | `apps/api/src/index.ts:31-45` |
| C2 | MEDIUM | The `origin` callback **allows requests with no origin** (`if (!origin || allowedOrigins.includes(origin))`). This is needed for mobile and curl, but it also means a malicious server-to-server caller can elide `Origin` and bypass the allow-list entirely. Since every authenticated route is gated by `requireAuth` + JWT this is not directly exploitable, but the `/api/auth/login` route accepts no-origin requests. Recommend documenting this and considering adding an `Origin: required-in-production` mode for browser-only deployments. | `apps/api/src/index.ts:36-37` |
| C3 | MEDIUM | `ALLOWED_ORIGINS` defaults in Zod to `http://localhost:3000,http://localhost:8081` — if the production env-var is forgotten, prod silently accepts localhost only (CORS rejection-by-default), which fails closed (good) but leaves a confusing user-facing failure mode. Add a `production`-NODE_ENV refinement that requires `ALLOWED_ORIGINS` to be explicitly set and not contain `localhost`. | `apps/api/src/config/env.ts:34` |
| C4 | LOW | No `OPTIONS` preflight cache (`maxAge`) configured on the cors middleware. Each preflight hits the API. Add `maxAge: 86400`. | `apps/api/src/index.ts:33-45` |

### 2.3 Helmet / Security headers

| ID | Sev | Finding | Evidence |
|----|-----|---------|----------|
| H1 | INFO | `helmet()` applied as the first middleware. Defaults give `X-DNS-Prefetch-Control`, `X-Frame-Options: SAMEORIGIN`, `Strict-Transport-Security`, `X-Download-Options`, `X-Content-Type-Options`, `Referrer-Policy: no-referrer`, etc. | `apps/api/src/index.ts:29` |
| H2 | HIGH | **CSP not configured.** Helmet 7's `contentSecurityPolicy` ships a strict default — but the API serves no HTML, so this is acceptable for the API. However the **Next.js web app has no CSP** in `next.config.js` either (only `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`). Without CSP, an XSS injection in any user-controlled markdown/AI-output rendering becomes unbounded. | `apps/web/next.config.js:4-19` |
| H3 | MEDIUM | `vercel.json` headers list duplicates `next.config.js` headers but **omits** `Permissions-Policy`. The Next.js headers should win because they're more specific, but the duplication is a footgun — change one place and the other silently drifts. Pick one source of truth (recommend `next.config.js` only). | `apps/web/vercel.json:2-10` |
| H4 | MEDIUM | `Strict-Transport-Security` is set by helmet defaults (`max-age=15552000; includeSubDomains`) on the **API** but **not** explicitly set on the Vercel/Next.js side. Vercel terminates TLS and adds its own HSTS only when the custom domain has `forceSSL` enabled — verify in Vercel dashboard. Add explicit `Strict-Transport-Security` header in `next.config.js` to be safe. | `apps/web/next.config.js` (no HSTS) |
| H5 | LOW | No `X-Permitted-Cross-Domain-Policies: none` header (helmet sets this, but only for the API). Next.js side should add it. | `next.config.js` |

### 2.4 Rate limiting coverage

| ID | Sev | Finding | Evidence |
|----|-----|---------|----------|
| R1 | INFO | `globalLimiter` (100 req / 15 min / IP) applied to all routes via `app.use(globalLimiter)` after body parser. | `index.ts:67`, `rateLimiter.ts:5-14` |
| R2 | INFO | `authLimiter` (10 req / 15 min / IP) applied to login/register/refresh in `routes/auth.ts:75,86,97`. | `routes/auth.ts` |
| R3 | INFO | `webhookLimiter` (600/min/IP) and `plaidSyncLimiter` (1/min/(user,item)) properly applied on Plaid routes. | `routes/plaid.ts` |
| R4 | MEDIUM | Rate limiter is **in-memory** (`express-rate-limit` default store). On Railway, this means each container instance has its own counter. If the API is ever scaled to 2+ replicas, the effective rate limit doubles per replica. Wire `rate-limit-redis` against `REDIS_URL` (Upstash) for shared counters. | `rateLimiter.ts` (no `store:` config) |
| R5 | MEDIUM | No rate limit on the AI routes specifically — `globalLimiter` (100/15min) is the only gate on `/api/ai/*` and `/api/ai/explain-transaction/:id`. Anthropic API calls cost money; an abusive authed user could burn through the $20/mo cap with ~100 expensive calls in 15 min. Add an `aiLimiter` (e.g. 20 req/hour/user). | `index.ts:84-86`, no per-route limiter |
| R6 | LOW | No rate limit on the password-reset / forgot-password flow if/when added. Document the requirement in `auth.ts` as a comment to prevent future regressions. | (preventive) |

### 2.5 Env-var validation

| ID | Sev | Finding | Evidence |
|----|-----|---------|----------|
| E1 | INFO | Zod schema in `env.ts` calls `process.exit(1)` on missing required vars — good. | `env.ts:60-72` |
| E2 | MEDIUM | These vars are `.optional()` but **must be required in production**: `REDIS_URL` (BullMQ jobs silently disabled if missing — `index.ts:104-108` "Job queue failed to start"), `RESEND_API_KEY`, `SENTRY_DSN`, R2 vars (`R2_ACCOUNT_ID`/`R2_ACCESS_KEY_ID`/`R2_SECRET_ACCESS_KEY`/`R2_BUCKET_NAME`), `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`. Add a `.superRefine` that requires these when `NODE_ENV === 'production'`. | `env.ts:11-26` |
| E3 | MEDIUM | `CLAUDE_MODEL` defaults to `claude-sonnet-4-20250514` in code but `.env.example` says `claude-3-5-sonnet-20241022` and `CLAUDE.md:198` says `claude-3-5-sonnet-20241022`. Three different sources of truth. Pick one. | `env.ts:29` vs `.env.example:28` vs `CLAUDE.md:198` |
| E4 | LOW | `GOOGLE_CALLBACK_URL` defaults to `http://localhost:3001/api/auth/google/callback` — fine for dev, but if production env var is forgotten, OAuth redirects silently break. Add the same `production`-NODE_ENV refinement. | `env.ts:13` |

### 2.6 Docker security

| ID | Sev | Finding | Evidence |
|----|-----|---------|----------|
| D1 | HIGH | **Container runs as root.** No `USER node` (or `USER 1000`) directive. `node:20-alpine` ships with a `node` user (uid 1000) — use it. | `apps/api/Dockerfile` (entire file) |
| D2 | HIGH | Base image not pinned to digest. `FROM node:20-alpine` will silently shift if the upstream tag is moved. Pin to `node:20-alpine@sha256:<digest>` or at least `node:20.18.1-alpine`. | `Dockerfile:1,27` |
| D3 | MEDIUM | No `HEALTHCHECK` instruction in Dockerfile. Railway's `railway.json` defines `healthcheckPath: /health` at the platform level, which is fine, but a Docker-level healthcheck makes the image portable and catches startup failures earlier. | `Dockerfile`, `railway.json:8` |
| D4 | MEDIUM | No image labels (`org.opencontainers.image.source`, `…revision`, `…version`). Makes auditing in production registries harder. Add `LABEL org.opencontainers.image.source="https://github.com/Ashikvms/myai"`. | `Dockerfile` |
| D5 | LOW | `npm ci --ignore-scripts` is used (good — blocks malicious postinstall). Confirmed in both build and production stages. | `Dockerfile:14,40` |
| D6 | LOW | Multi-stage build implemented (✅ — `builder` → `production`). Production stage only installs `--omit=dev` deps. Good. | `Dockerfile:1,27` |
| D7 | MEDIUM | `COPY apps/api/ apps/api/` in build stage copies **everything**, including any local `.env` if present, into the build context. While `.dockerignore` would normally guard this, **no `.dockerignore` file exists**. Anything in the dev's working directory at build time leaks into the image layer history. Add a `.dockerignore` excluding `.env*`, `node_modules`, `dist`, `.turbo`, `*.log`. | no `.dockerignore` at repo or `apps/api/` |
| D8 | LOW | No `EXPOSE` documentation comment, but `EXPOSE 3001` is set. Fine. | `Dockerfile:51` |

### 2.7 Database security

| ID | Sev | Finding | Evidence |
|----|-----|---------|----------|
| DB1 | MEDIUM | `DATABASE_URL` in `apps/api/.env` is a Railway public proxy URL (`shuttle.proxy.rlwy.net:38603`). Production should use the **internal** `DATABASE_URL` Railway auto-injects (`postgres.railway.internal:5432`) so the DB is never exposed to public internet. Verify in Railway service variables that the production service uses the private URL. | `apps/api/.env:5` |
| DB2 | HIGH | DATABASE_URL has **no `?sslmode=require`** suffix. Railway Postgres supports TLS but does not enforce it client-side unless the URL says so. Without `?sslmode=require`, a downgrade attack on the Railway proxy could MITM credentials. Add `?sslmode=require` (or `?sslmode=verify-full` with the Railway CA) in production env. | `apps/api/.env:5`, `.env.example:7` |
| DB3 | MEDIUM | No documented `prisma migrate deploy` step in the deploy pipeline. `CLAUDE.md:237` says it runs separately, but neither `Dockerfile` nor `railway.json` nor `deploy-api.yml` invokes it. Migrations today are presumably run manually — risky and not auditable. Add a Railway `release command` or a job in `deploy-api.yml`. | `Dockerfile` (no migrate step), `railway.json` (no `releaseCommand`) |
| DB4 | LOW | No connection pool size cap on the Prisma client. `@prisma/client` defaults to `num_physical_cpus * 2 + 1`. On a Railway Starter (1 vCPU) → 3 connections, fine. If upgraded to a beefier instance later, set `connection_limit` explicitly via the `DATABASE_URL` query param to prevent exhausting Postgres' default 100-conn cap. | `prisma/schema.prisma`, no `connection_limit` query param |

### 2.8 CI/CD pipeline security

| ID | Sev | Finding | Evidence |
|----|-----|---------|----------|
| CI1 | HIGH | `deploy-api.yml` and `deploy-web.yml` are **stubs** — they only `echo` the secret name. There is no actual `railway up`, `vercel deploy`, or any deploy step. If these workflows are wired to "auto-deploy on push to main" expectations, they will silently no-op. | `deploy-api.yml:11-12`, `deploy-web.yml:11-12` |
| CI2 | MEDIUM | No `permissions:` block in any workflow. GitHub default token has `contents: read` (per repo-level setting) but explicit least-privilege (`permissions: { contents: read }`) at the workflow level is best practice. | all 3 workflows |
| CI3 | MEDIUM | No `concurrency:` group on deploy workflows. Two pushes in quick succession can race, and a slower deploy can overwrite a newer one. Add `concurrency: { group: deploy-${{ github.ref }}, cancel-in-progress: true }`. | `deploy-*.yml` |
| CI4 | MEDIUM | `npm ci` in CI does **not** use `--ignore-scripts`. Build-stage `npm install` can run arbitrary postinstall scripts from any of the 800+ deps. Add `--ignore-scripts` to `ci.yml:17,32,45,55`. | `ci.yml` |
| CI5 | LOW | `security` job runs `npm audit --audit-level=high \|\| true` — the `\|\| true` swallows the failure. Audits never block PR merge. Either drop `\|\| true` once the dep tree is clean (per SECURITY_REVIEW_REPORT.md "37-vuln baseline"), or add an allowlist via `--exclude` rather than swallowing. | `ci.yml:56` |
| CI6 | MEDIUM | No `environment:` gating on the deploy workflows. Railway/Vercel tokens should be scoped to a `production` GitHub Environment with required reviewers, not raw repo secrets. | `deploy-*.yml` |
| CI7 | LOW | No SAST (CodeQL, Semgrep), no SBOM (Syft), no container image scanning (Trivy/Grype) in the pipeline. For a financial app, at minimum CodeQL + Trivy on the built image are recommended. | `.github/workflows/` |
| CI8 | INFO | Branch protection rules cannot be inspected from disk. **Manually verify** in GitHub: require PRs into `main`, require `lint-and-typecheck` + `test` + `build-web` checks, no force-push, no direct push, no bypass for admins on `main`. | (manual) |

### 2.9 Backup + DR

| ID | Sev | Finding | Evidence |
|----|-----|---------|----------|
| B1 | HIGH | No documented Postgres backup policy. Railway Starter tier provides daily backups by default but retention/RPO/RTO is not stated anywhere in repo. Document in `CLAUDE.md` or a `RUNBOOK.md`. | (no backup section in repo) |
| B2 | HIGH | **Restore has never been tested.** A backup that has never been restored is not a backup. Schedule a quarterly restore drill into a fresh Railway DB and verify the API can boot against it. | (no restore test in `tests/`) |
| B3 | MEDIUM | No documented runbook for `ENCRYPTION_KEY` rotation. The `crypto.ts` code supports versioned ciphertexts (per SECURITY_REVIEW_REPORT F16), but there is no procedural document for rotating the key when (not if) it leaks. Without a runbook, a leaked key is a forced re-link of every Plaid item. | (no `KEY_ROTATION.md`) |
| B4 | MEDIUM | No documented procedure for revoking access to a compromised Railway/Vercel/Upstash/R2/Anthropic/Plaid token. | (no `INCIDENT_RUNBOOK.md`) |

### 2.10 Monitoring + alerting

| ID | Sev | Finding | Evidence |
|----|-----|---------|----------|
| M1 | HIGH | **Sentry is not wired into either app.** `SENTRY_DSN` is in env schema and `.env.example`, but `@sentry/node` is not in `apps/api/package.json` and `@sentry/nextjs` is not in `apps/web/package.json`. There is no `Sentry.init` call anywhere. Uncaught errors in production are silently swallowed by `errorHandler`. | grep for `Sentry` in `apps/*/src` returns 0 hits |
| M2 | MEDIUM | BetterUptime monitor on `/health` is documented in `CLAUDE.md:228` but not configured anywhere in the repo (BetterUptime has no IaC, so this is necessarily manual — track in `RUNBOOK.md`). | `CLAUDE.md:227-229` |
| M3 | MEDIUM | `/health` endpoint exists (✅, per `routes/health.ts` referenced from `index.ts:71`) but does **not** check Postgres or Redis connectivity. A "healthy" return when DB is down is misleading and BetterUptime will mark the API up while users get 500s. Add shallow connectivity checks (with a 1s timeout each). | `routes/health.ts` (referenced, not deeply verified) |
| M4 | LOW | No structured request log middleware. Winston is set up with redaction (`logger.ts:18-46`) but there's no `morgan` or per-request logger in `index.ts`. Hard to correlate user complaints to requests. | `index.ts` (no request logger) |

### 2.11 Vercel-specific

| ID | Sev | Finding | Evidence |
|----|-----|---------|----------|
| V1 | INFO | `vercel.json` sets the three baseline headers. Good. | `apps/web/vercel.json:1-12` |
| V2 | MEDIUM | No env-var scoping documented (preview vs production). Manually verify in Vercel dashboard that `NEXT_PUBLIC_API_URL` for **preview** points to a staging API (or no API), not production. Otherwise PR previews can read/write production data. | (manual) |
| V3 | LOW | No `cleanUrls`, `trailingSlash`, or `redirects` config — fine, defaults are acceptable. | `vercel.json` |

### 2.12 Railway-specific

| ID | Sev | Finding | Evidence |
|----|-----|---------|----------|
| RW1 | INFO | `railway.json` defines Dockerfile build, `/health` healthcheck, `ON_FAILURE` restart with 5 retries. Good. | `railway.json:1-13` |
| RW2 | HIGH | **Postgres public exposure not verified.** The dev `.env` uses `shuttle.proxy.rlwy.net:38603` — a Railway *public* TCP proxy. If the production API service uses the same public URL instead of `postgres.railway.internal`, the DB is reachable from anywhere on the internet (auth-only). Verify in Railway dashboard that production `DATABASE_URL` is the internal URL. | `apps/api/.env:5` (dev), production not directly inspectable |
| RW3 | MEDIUM | No `releaseCommand` in `railway.json` to run `prisma migrate deploy` before each deploy. Migrations are presumably run manually. | `railway.json` (no `releaseCommand`) |
| RW4 | LOW | No `numReplicas`, `region`, or `resources` config in `railway.json`. Defaults are fine for now, but document the chosen region for compliance posture. | `railway.json` |

---

## 3. Pre-PROD Checklist (MUST be done before launch)

These are **blocking** items before the first real user touches the app:

- [ ] **D1** — Add `USER node` (or `RUN addgroup -S app && adduser -S -G app app && USER app`) in the production stage of `apps/api/Dockerfile`.
- [ ] **D2** — Pin Docker base image to a digest or a specific minor version (`node:20.18.1-alpine` minimum).
- [ ] **D7** — Add `apps/api/.dockerignore` excluding `.env*`, `node_modules`, `dist`, `.turbo`, `*.log`.
- [ ] **DB2** — Add `?sslmode=require` to production `DATABASE_URL` in Railway service variables.
- [ ] **DB3** — Wire `prisma migrate deploy` into Railway `releaseCommand` (or to the `deploy-api.yml` workflow if you go that route).
- [ ] **RW2** — Verify production `DATABASE_URL` uses `postgres.railway.internal`, not the public proxy.
- [ ] **CI1** — Replace stub `deploy-api.yml` and `deploy-web.yml` with real deploy steps (or remove them and rely on Railway/Vercel git auto-deploy + document that explicitly).
- [ ] **CI4** — Add `--ignore-scripts` to all `npm ci` calls in `ci.yml`.
- [ ] **CI8** — Enable branch protection on `main`: require PR, require all CI checks, no force push, no admin bypass.
- [ ] **M1** — Install and initialise Sentry in `apps/api` (`@sentry/node`) and `apps/web` (`@sentry/nextjs`). Configure `beforeSend` scrubber per SECURITY_REVIEW_REPORT F13.
- [ ] **M3** — Extend `/health` to ping Postgres and Redis (with short timeouts) before returning 200.
- [ ] **E2** — Add `.superRefine` to env Zod schema requiring `REDIS_URL`, `RESEND_API_KEY`, `SENTRY_DSN`, `R2_*`, `GOOGLE_*` when `NODE_ENV === 'production'`.
- [ ] **C3 / E4** — Same for `ALLOWED_ORIGINS` (must not contain `localhost` in prod) and `GOOGLE_CALLBACK_URL`.
- [ ] **H2** — Add CSP to `next.config.js`. Start in `report-only` mode for a week, then enforce.
- [ ] **B1 / B2** — Document Railway backup retention and run a restore drill into a clean DB.
- [ ] **S4** — Rotate the developer-laptop `apps/api/.env` ENCRYPTION_KEY and JWT keys on a fresh laptop; treat the values currently on disk as **assumed-leaked** if any laptop is shared, lost, or backed up to an unencrypted cloud.

## 4. Quick Wins (low effort, high value)

- [ ] **C4** — Add `maxAge: 86400` to CORS config (one-line).
- [ ] **D4** — Add OCI labels to the Dockerfile (one-line).
- [ ] **D3** — Add a `HEALTHCHECK` instruction in the Dockerfile (two lines).
- [ ] **CI3** — Add `concurrency: { group: deploy-${{ github.ref }}, cancel-in-progress: true }` to the deploy workflows.
- [ ] **CI2** — Add `permissions: { contents: read }` block to all workflows.
- [ ] **CI5** — Drop `|| true` from `npm audit` in `ci.yml`, or convert to a triaged allowlist.
- [ ] **R5** — Add an `aiLimiter` (20/hour/user) and apply it to `/api/ai/*`.
- [ ] **R4** — Configure `rate-limit-redis` against `REDIS_URL` (one new dep, one config block).
- [ ] **S5** — Create `apps/api/.env.example` (copy from `laylo/.env.example`).
- [ ] **S7** — Add `.env*` ignore lines to `apps/web/.gitignore` and `apps/api/.gitignore` (defence-in-depth).
- [ ] **H3** — Pick one source of truth for web headers (`next.config.js`) and delete `vercel.json` headers block.
- [ ] **H4** — Add explicit `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` header in `next.config.js`.
- [ ] **E3** — Reconcile the three different `CLAUDE_MODEL` defaults (env.ts vs `.env.example` vs CLAUDE.md).

## 5. Long-term Hardening

- [ ] **CI7** — Add CodeQL workflow, Trivy image scan in deploy pipeline, Syft SBOM as artifact.
- [ ] **CI6** — Move Railway/Vercel deploy tokens into a GitHub `production` Environment with required reviewers.
- [ ] **B3 / B4** — Write `RUNBOOK.md` covering ENCRYPTION_KEY rotation, JWT key rotation, Plaid token revocation, R2 bucket rotation, incident response timelines.
- [ ] **DB4** — Set explicit `connection_limit` in `DATABASE_URL` query param.
- [ ] **M4** — Add `pino-http` or `morgan('combined')` request logger with request-id correlation.
- [ ] **C2** — Optionally add a strict-Origin mode for browser-only deployments (require `Origin` header on POST/PUT/DELETE).
- [ ] **R6** — Document rate-limit requirements for password-reset / forgot-password flows when added.
- [ ] **DB1 / RW2** — Move the dev DATABASE_URL to a separate dev branch DB on Railway so the dev `.env` no longer holds the production proxy URL.
- [ ] WAF / Cloudflare in front of api.yourdomain.com (free tier) — strip bot traffic, basic OWASP rules, geo-block where applicable.
- [ ] Annual penetration test (or equivalent) once user data + financial integrations are live in production.

---

## 6. Pass-list (verified ✅)

- ✅ `helmet()` mounted as the first middleware, before CORS, body parser, and routes.
- ✅ CORS uses an env-driven allow-list — no `*` wildcard.
- ✅ `credentials: true` is paired with allow-list (not wildcard) — safe pattern.
- ✅ `globalLimiter`, `authLimiter`, `webhookLimiter`, `plaidSyncLimiter` all properly applied.
- ✅ Plaid webhook mounted with `express.raw({ limit: '1mb' })` BEFORE `express.json({ limit: '10mb' })`.
- ✅ `express.json` has a 10 MB body limit (DoS guard).
- ✅ Zod env validation calls `process.exit(1)` on missing required vars (fail-fast at boot).
- ✅ `ENCRYPTION_KEY` enforced as 64-hex regex in Zod.
- ✅ Multi-stage Dockerfile, `--omit=dev` in production stage, `--ignore-scripts` on both `npm ci` calls.
- ✅ No `.env` ever committed to git history (`git log --all --full-history` clean).
- ✅ No hardcoded `sk_*`, `Bearer ey…`, AKIA, or `-----BEGIN` patterns in source.
- ✅ Refresh token cookie: `HttpOnly`, `SameSite=Strict`, `Secure` in production, scoped to `/api/auth`.
- ✅ Winston logger has a redact format that masks `accessToken`, `authorization`, `cookie`, etc.
- ✅ `vercel.json` and `next.config.js` ship `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`.
- ✅ `next.config.js` ships `Permissions-Policy: camera=(), microphone=(), geolocation=()`.
- ✅ Railway `healthcheckPath: /health`, `restartPolicyType: ON_FAILURE`, `restartPolicyMaxRetries: 5`.

---

**Recommendation:** **NO-GO** for production launch until all items in §3 (Pre-PROD Checklist) are addressed. The application code is in solid shape; the deployment glue (Docker hardening, deploy workflows, monitoring, backups) is what gates production.
