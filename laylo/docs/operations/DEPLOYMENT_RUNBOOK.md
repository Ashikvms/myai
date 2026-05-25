# BillBee Deployment Runbook — Pre-Launch to Production

**Purpose:** the step-by-step path from "passing tests on localhost" to "live app at billbee.app for real users."

**Audience:** the user (you) executing the launch, plus any future Claude session resuming a half-finished deploy.

**Locked infra (per CLAUDE.md):** Vercel (web) · Railway (API + Postgres) · Upstash (Redis) · Cloudflare R2 (storage) · Resend (email) · Cloudflare Registrar (domain) · Sentry (errors) · Expo Push (mobile notifications) · EAS Build (mobile distribution) · Anthropic API (AI). **NO AWS. NO Firebase. NO SendGrid/Mailgun.**

**Total monthly cost target:** $10–30/mo + $10/yr domain.

---

## ⏱ Estimated time: 2–4 hours focused work

Most of it is waiting for DNS propagation, signup verifications, and Plaid Production approval. Active hands-on time is probably 90 minutes.

---

## 0. Pre-flight checklist (do these BEFORE starting)

- [ ] PR #16 merged to `main` (the redesign + Plaid + auth)
- [ ] `COMPREHENSIVE_SECURITY_AUDIT.md` reviewed; all CRITICAL + HIGH findings resolved
- [ ] All tests passing: `cd apps/api && npm test` → ≥132/132
- [ ] All typechecks clean (web + mobile + api)
- [ ] No `.env` files committed to git (`git log --all -- '*.env'` returns nothing)
- [ ] Local dev server still works against your existing Railway DB

---

## 1. Buy the domain (~10 min, $10/yr)

1. Sign in at [dash.cloudflare.com](https://dash.cloudflare.com) (you already have an account for R2)
2. Top nav → **Domain Registration** → **Register Domains**
3. Search `billbee.app` (or your final pick) — pick `.app` (forces HTTPS) or `.com`
4. Add to cart, pay (~$10 for `.com`, ~$14 for `.app`). Auto-renews.
5. Cloudflare nameservers automatically configured

**Note:** `billbee.io` exists as a German B2B platform. Different category, but if trademark matters to you, do a 5-min search at [USPTO TESS](https://tmsearch.uspto.gov/) before buying.

---

## 2. Sign up for the remaining services (~30 min total)

Do these in any order. Most are 2-min signups.

### Upstash (Redis for queues + rate limiting)
- [ ] Sign up at [console.upstash.com](https://console.upstash.com) (GitHub login)
- [ ] Create database → Region: pick the same region as Railway (US-East default)
- [ ] Type: **Regional** (cheaper than Global)
- [ ] Copy `REDIS_URL` (TLS endpoint, starts with `rediss://`)

### Cloudflare R2 (file storage)
- [ ] In Cloudflare dashboard → R2
- [ ] Create bucket: `billbee-documents`
- [ ] **Settings tab** → enable **Public Access** (only if you want public URLs; otherwise use presigned)
- [ ] **Manage R2 API Tokens** → Create API Token with Object Read+Write scope on this bucket
- [ ] Copy: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME` (= `billbee-documents`)
- [ ] R2 endpoint: `https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com`

### Resend (transactional email)
- [ ] Sign up at [resend.com](https://resend.com)
- [ ] Add domain → enter `billbee.app` (or your domain)
- [ ] Resend gives you 4 DNS records (SPF, DKIM, MX) — paste into Cloudflare DNS
- [ ] Wait for verification (~10 min)
- [ ] Create API key → copy `RESEND_API_KEY`
- [ ] Note: free tier = 3,000 emails/month, 100/day

### Sentry (error tracking)
- [ ] Sign up at [sentry.io](https://sentry.io) (free tier: 5K events/month)
- [ ] Create 3 projects:
  - `billbee-web` (Next.js)
  - `billbee-api` (Node.js)
  - `billbee-mobile` (React Native)
- [ ] Copy 3 DSN URLs → `SENTRY_DSN_WEB`, `SENTRY_DSN_API`, `SENTRY_DSN_MOBILE`

### Anthropic API (real key — replaces placeholder)
- [ ] Already have account at [console.anthropic.com](https://console.anthropic.com)
- [ ] Settings → API Keys → Create Key (production usage)
- [ ] **Set monthly spend limit** to $20 in Settings → Billing → Limits (cap your blast radius)
- [ ] Copy → `ANTHROPIC_API_KEY` (starts with `sk-ant-`)

### Plaid Production (the big one — takes longest)
- [ ] In [dashboard.plaid.com](https://dashboard.plaid.com) → Team Settings → Keys
- [ ] You currently have **Sandbox** keys; you need **Production**
- [ ] Top of page → "Request Production Access"
- [ ] Fill out the application:
  - Company name + use case description
  - Estimated user volume (be honest, low single digits at launch)
  - Products: **Transactions, Auth** (we don't need Identity/Investments/etc.)
  - Country: **US** (start US-only; expand later)
  - Webhook URL: `https://api.billbee.app/api/plaid/webhook` (won't exist yet — that's fine)
  - Privacy policy URL + Terms of Service URL (need to write these; see §6)
- [ ] **Wait for approval** — typically 3–7 business days. Plaid emails you.
- [ ] Once approved, set monthly spend cap at ~$20/mo (Plaid Dashboard → Billing)
- [ ] Copy `PLAID_CLIENT_ID` (same as Sandbox actually) and the new **production** `PLAID_SECRET`

### EAS Build (mobile)
- [ ] Already configured per CLAUDE.md
- [ ] Sign in at [expo.dev](https://expo.dev) with the Expo account that owns the project
- [ ] If you want App Store submission later, you'll also need:
  - Apple Developer Program ($99/yr)
  - Google Play Developer ($25 one-time)

---

## 3. DNS setup in Cloudflare (~15 min + propagation)

In your Cloudflare dashboard for the new domain:

| Type | Name | Content | Proxy |
|---|---|---|---|
| `CNAME` | `@` (root) | `cname.vercel-dns.com` | DNS only (gray cloud) |
| `CNAME` | `www` | `cname.vercel-dns.com` | DNS only |
| `CNAME` | `app` | `cname.vercel-dns.com` | DNS only |
| `CNAME` | `api` | `<your Railway public domain>.up.railway.app` | DNS only |

**Important:** all gray cloud (DNS only). Vercel + Railway both terminate TLS themselves — orange-cloud routing causes issues unless carefully configured.

Plus Resend DNS records (you got them in §2). Add them too.

DNS propagation: 5 min to 1 hour (usually instant on Cloudflare).

---

## 4. Deploy the API (Railway, ~30 min)

You already have the API live in dev mode. Now wire it for production.

1. **Open your existing Railway project** at [railway.app](https://railway.app)
2. Service should already exist (the Postgres). If the API service doesn't exist:
   - **+ New** → **GitHub Repo** → pick `Ashikvms/myai`
   - Branch: `main`
   - Root directory: `laylo/apps/api`
   - It'll detect the Dockerfile and start building
3. **Variables tab** — add all production env vars:
   ```
   NODE_ENV=production
   PORT=3001
   DATABASE_URL=<Railway auto-injects from Postgres service — use ${{Postgres.DATABASE_URL}}>
   REDIS_URL=<from Upstash §2>
   JWT_PRIVATE_KEY=<your existing base64 PEM>
   JWT_PUBLIC_KEY=<your existing base64 PEM>
   ENCRYPTION_KEY=<your existing 64-hex>
   ENCRYPTION_KEY_VERSION=1
   ANTHROPIC_API_KEY=<from Anthropic §2>
   CLAUDE_MODEL=claude-sonnet-4-6
   PLAID_CLIENT_ID=<from Plaid Production §2>
   PLAID_SECRET=<from Plaid Production §2>
   PLAID_ENV=production
   PLAID_PRODUCTS=transactions,auth
   PLAID_COUNTRY_CODES=US
   PLAID_WEBHOOK_URL=https://api.billbee.app/api/plaid/webhook
   PLAID_REDIRECT_URI=https://app.billbee.app/settings/banks/oauth-return
   R2_ACCOUNT_ID=<from R2 §2>
   R2_ACCESS_KEY_ID=<from R2 §2>
   R2_SECRET_ACCESS_KEY=<from R2 §2>
   R2_BUCKET_NAME=billbee-documents
   R2_PUBLIC_URL=https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com
   RESEND_API_KEY=<from Resend §2>
   SENTRY_DSN=<api project DSN from §2>
   ALLOWED_ORIGINS=https://billbee.app,https://app.billbee.app,https://www.billbee.app
   APP_URL=https://app.billbee.app
   ```
4. **Settings tab** → Networking → enable **Public Networking** → copy the public domain (e.g. `myai-production.up.railway.app`)
5. **Settings** → Custom Domains → add `api.billbee.app`
6. Railway auto-issues TLS via Let's Encrypt (~30 sec)
7. **Run migrations once** (Railway CLI or via the UI):
   ```bash
   railway run --service api npx prisma migrate deploy
   ```
8. **Verify health:** `curl https://api.billbee.app/health` → should return `{"status":"ok",...}`

---

## 5. Deploy the web (Vercel, ~15 min)

1. Sign in at [vercel.com](https://vercel.com) with GitHub
2. **Import Project** → pick `Ashikvms/myai`
3. Configuration:
   - Framework Preset: Next.js (auto-detected)
   - Root directory: `laylo/apps/web`
   - Build Command: (default `next build`)
   - Output Directory: (default `.next`)
4. **Environment Variables** (Production scope):
   ```
   NEXT_PUBLIC_API_URL=https://api.billbee.app
   NEXT_PUBLIC_SENTRY_DSN=<web project DSN from §2>
   ```
5. **Deploy** → wait ~2 min for first build
6. **Domains tab** → add `billbee.app`, `www.billbee.app`, `app.billbee.app`
7. Vercel auto-issues TLS (~30 sec each)
8. **Verify:** open `https://app.billbee.app` → should load the landing page

---

## 6. Legal pages (BEFORE launch — required for Plaid + App Store)

You need real Privacy Policy + Terms of Service URLs to:
- Get Plaid Production approval
- Submit mobile app to App Store / Play Store
- Comply with GDPR / CCPA

Quickest path:
1. Use [termly.io](https://termly.io) or [iubenda.com](https://iubenda.com) free generators
2. Fill in: company name, contact email, types of data collected, sub-processors (Plaid, Anthropic, Resend, Vercel, Railway, Cloudflare, Sentry)
3. Generate Privacy Policy + Terms
4. Add to `apps/web/src/app/(marketing)/privacy/page.tsx` and `terms/page.tsx`
5. Link in marketing footer

---

## 7. Plaid configuration (after approval — §2)

Once Plaid emails you "Production Access Granted":

1. **Plaid Dashboard** → Webhooks → Add `https://api.billbee.app/api/plaid/webhook`
2. **OAuth redirect URIs** → Add `https://app.billbee.app/settings/banks/oauth-return`
3. **Verify** webhook by hitting "Send Test Webhook" → check Sentry for the request
4. Update Railway env vars `PLAID_ENV=production` and the new `PLAID_SECRET`
5. Redeploy API

---

## 8. Mobile launch (~variable)

### Option A — TestFlight beta only (cheapest, fastest)
- Apple Developer Program: $99/yr
- `eas build --profile preview --platform ios` (cloud build via EAS)
- Upload to App Store Connect → invite testers via TestFlight (up to 10K)
- No App Store review needed for internal testing

### Option B — Full App Store launch
- Apple Developer + same EAS flow
- Submit for review (~1–7 days)
- Approved → public launch

### Option C — Android via Play Store
- Google Play Developer: $25 one-time
- `eas build --profile production --platform android`
- Submit to Play Console

---

## 9. Smoke test PROD (~15 min)

After everything's deployed, do a manual end-to-end test:

- [ ] Visit `https://billbee.app` — landing page loads, bee mascot visible
- [ ] Click "Join the hive" → `/signup` → create account with real email
- [ ] Receive Welcome email from Resend
- [ ] Log out, log back in
- [ ] Toggle theme (light + dark) — bee mascot looks right in both
- [ ] Click "Connect a bank" → Plaid Link opens with PRODUCTION (your real bank)
- [ ] Authorize a bank
- [ ] Verify accounts + transactions appear
- [ ] Mark a bill paid — gold sweep + coin animation fires
- [ ] Open a transaction → drawer with AI explainer (real Claude response now)
- [ ] Settings → toggle dark mode → entire app flips
- [ ] Check Sentry: any errors fired during the smoke test?
- [ ] Check Railway logs: any unexpected stack traces?

---

## 10. Post-launch checklist

- [ ] **Uptime monitor** — sign up for [BetterUptime](https://betteruptime.com) (free tier) and add `https://api.billbee.app/health` as a monitor with email alerts
- [ ] **Backup verification** — Railway Postgres backups are automatic; do a manual backup → restore drill once before users matter
- [ ] **Error budget** — set Sentry alert: notify on >5 errors/min in `billbee-api`
- [ ] **Plaid budget alert** — Plaid Dashboard → set alert at 80% of $20/mo cap
- [ ] **Anthropic budget alert** — same, at 80% of $20/mo cap
- [ ] **DNS pinning** — once stable, enable Cloudflare's HSTS header (1-year max-age) to force HTTPS
- [ ] **Status page** — `status.billbee.app` via BetterUptime (free)

---

## Total cost summary

| Item | Cost |
|---|---|
| Domain | $10/yr |
| Vercel | Free |
| Railway (API + Postgres) | ~$10/mo |
| Upstash Redis | Free |
| Cloudflare R2 | Free (under 10GB) |
| Resend | Free (under 3K emails) |
| Sentry | Free (under 5K events) |
| Anthropic | $5–20/mo |
| Plaid | $0.30/account/mo (so ~$3/mo for 10 users with 1 account each) |
| Apple Dev Program | $99/yr (only if shipping iOS) |
| Google Play | $25 one-time (only if shipping Android) |
| **Total monthly** | **~$15–35/mo** |
| **Total yearly** | **~$200–400** |

---

## Rollback plan

If a deploy goes wrong:

### Web (Vercel)
- Vercel keeps the last 100 deploys
- Dashboard → Deployments → find the last good one → "Promote to Production"
- Takes 30 seconds

### API (Railway)
- Railway keeps deployment history
- Rollback to previous deploy via UI
- For DB: `npx prisma migrate resolve --rolled-back <migration_name>` — but this is risky; better to ship a forward fix migration

### DNS
- DNS changes propagate in 5 min — most rollbacks just involve reverting CNAME records

---

## Resume from this runbook

If a future session arrives mid-deploy, the resume signal is:
1. Check this file's checkboxes (manually written by user as they go)
2. Look at the GitHub Actions tab for the last successful build
3. Look at Vercel + Railway dashboards for last deploy timestamp
4. Re-run the smoke test (§9) to find what's broken

---

**Last updated:** 2026-05-10. Update this file as the user actually executes the deploy and discovers gotchas.
