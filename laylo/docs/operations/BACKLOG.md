# BillBee Backlog

Prioritized queue of features + improvements deferred from active work. Each entry includes scope, rationale, and the trigger condition for picking it up.

---

## 🔥 Pre-launch (must do before specific milestones)

### Google integrations — config + Cloud Console setup
**Trigger:** before testing Calendar/Gmail features end-to-end (in dev or prod)
**Added:** 2026-05-25
**Estimated:** ~30 min

- Set in `apps/api/.env` (defaults in `apps/api/.env.example`):
  - `GOOGLE_CALENDAR_SCOPES`
  - `GOOGLE_GMAIL_SCOPES`
  - `GOOGLE_LINK_REDIRECT_URI=http://localhost:3001/api/google/link/callback`
  - `GOOGLE_LINK_SUCCESS_REDIRECT=http://localhost:3000/settings?google=linked`
- In Google Cloud Console (existing project with `GOOGLE_CLIENT_ID`):
  - Add Calendar + Gmail scopes to the OAuth consent screen
  - Add the new authorized redirect URI: `/api/google/link/callback`
  - Set the app to "Internal" testing mode OR add yourself + `test@laylo.app` as test users
- For production: bump `GOOGLE_LINK_REDIRECT_URI` to the prod API URL + same in Cloud Console
- Verify: log in, navigate to Settings → Google, tap Connect → complete OAuth → confirm `linked: true` in `/api/google/status`

### Sprint 2 — Security hardening for public open signup

### Sprint 2 — Security hardening for public open signup
**Trigger:** before flipping signup to public (no invite required)
**From:** `COMPREHENSIVE_SECURITY_AUDIT.md` — Sprint 2 fix list
**Estimated:** ~1 week of focused work

- Refresh-token redesign — replace O(N) bcrypt scan with token-id lookup (CRYPTO C1)
- Sentry install + scrubber across api/web/mobile (INFRA H3, DATA_LEAK §F)
- Frontend OAuth callback page reading `window.location.hash` (handoff from Sprint 1 fix #5)
- Password reset flow (PENTEST P4 — currently no recovery)
- Real deploy workflows in `.github/workflows/` (currently stubs)

### Sprint 3 — Security hardening for Plaid Production
**Trigger:** before applying for Plaid Production access OR flipping `PLAID_ENV=production`
**Estimated:** ~3 days

- Plaid key rotation runbook + working version-prefix decrypt path (CRYPTO C2)
- Register status code uniformity (PENTEST P5) — product/UX call
- Dockerfile digest pin (needs Docker on host)
- Remaining 33 npm vulns triage — most need expo/bullmq major bumps

### Sprint 4 — Compliance (GDPR/CCPA + Plaid contractual)
**Trigger:** before any non-US user OR before Plaid Production goes live
**Estimated:** ~1 week

- `GET /api/account/export` (GDPR Art. 15/20)
- `DELETE /api/account` with R2 cascade-delete (GDPR Art. 17)
- Privacy Policy DPA list (Plaid, Anthropic, Resend, Cloudflare, Railway, Vercel, Upstash, Sentry)
- Plaid breach 72-hour SLA runbook
- TTL purge job for `PlaidWebhookEvent.rawPayload` (data minimisation)
- Consent record for AI processing of bank data

---

## 🚀 New features (deferred per user direction)

### Item 29 — Email order tracking
**Status:** ⏸️ DEFERRED 2026-05-10 (user paused after scoping)
**From:** scoping conversation in chat
**Scope:** Connect Gmail (OAuth) → AI extracts order info from emails → unified `/orders` view with delivery status

Recommended approach when picked up:
- Provider: Gmail-only (covers ~50% of US email)
- Detection: AI extraction via Claude (works for any retailer)
- Tracking: parse-from-email for v1; AfterShip aggregator for v2
- Multi-agent: Architect → DBA → Backend (OAuth + email poller + AI extraction) → Frontend (web + mobile parallel) → Security review → QA
- Estimated: ~60-90 min agent time

### Item 33 — Receipt upload + AI insights
**Status:** ⏸️ DEFERRED 2026-05-12 (user said "put it in the backlog for now")
**From:** chat scoping
**Scope:** User uploads receipt → R2 storage → Claude Vision analyzes → drawer shows merchant/items/total + 5-7 insights (tax %, transaction match, recurring item detection, monthly spending at merchant, anomaly detection)

Recommended approach when picked up:
- Tier B (insights, not just storage)
- Multi-agent: DBA → Backend (R2 presigned URL + Vision API + insights job) → Web + Mobile parallel → QA
- Mock R2 + mock Anthropic fallbacks for local dev (same pattern as transaction-explainer)
- Wire into existing TransactionDetailDrawer "Receipt" placeholder slot
- Estimated: ~30-45 min agent time

---

## 🪙 Quality / cleanup (low-priority, do when bored)

### Mobile Bricolage Grotesque font loading
**Status:** Deferred since Item 27 typography work
**From:** SESSION_MEMORY.md — Phase 7 follow-ups
**Why:** Mobile currently uses System font (San Francisco / Roboto). Web uses Bricolage. For brand consistency on mobile, load Bricolage TTFs via `expo-font` from `apps/mobile/assets/fonts/`. ~30 min.

### Mobile parity for Bento + Honeycomb + Origami layouts
**Status:** Deferred at Item 27 Phase 7 (Designer flagged this needs separate engineering)
**Why:** Current mobile uses simpler layouts. Web has bento grids, hex tiles, origami fold for paid bills. Mobile parity adds polish. ~2-3 hours.

### Mobile iOS Simulator local boot
**Status:** Blocked on Mac dev environment 2026-05-12
**Why:** `expo prebuild` succeeded and `app.json` is rebranded (BillBee + black splash), but `pod install` fails because the user's Homebrew is x86 (`/usr/local/bin`) instead of native arm64 (`/opt/homebrew/bin`). Pod runs under Rosetta and tar fails to extract `boost_1_83_0`. Two ways to unblock: (1) install arm64 Homebrew alongside the existing x86 one, then `arch -arm64 brew install cocoapods`; (2) use `rbenv` to install a native arm64 Ruby and `gem install cocoapods` from there. Either is ~15 min of one-time Mac setup.
Other gotchas already worked around: Podfile had `:privacy_file_aggregation_enabled` (RN 0.75+ feature on a 0.74 project — commented out) and iOS deployment target was 13.4 (Plaid SDK needs 14+ — bumped to 14.0).

### Mobile dark-mode runtime token swap
**Status:** Deferred at Item 27 Phase 6
**Why:** Mobile token map exists in `apps/mobile/src/lib/tokens.ts` but is not wired to `useColorScheme()`. Light mode only on mobile right now. ~1 hour.

### Bills "Mark paid" — actual data mutation
**Status:** Visual-only since Item 27 playfulness boost
**Why:** Currently the gold sweep + 🪙 floater fires but no `paidAt` field is updated. Need schema change (`Bill.paidAt`, `Bill.paidViaTransactionId`) + service layer + UI to show paid bills. ~1 hour.

### Tailwind aliases cleanup
**Status:** Deferred since Item 27
**Why:** `gradient-text` and `primary-*` aliases in `tailwind.config.ts` were kept as transition shims. They're unused in production. Safe to delete. 5 min.

### B8 Toast slide-in animation
**Status:** Skipped during animation rollout (toast lives in `packages/ui` — out of scope)
**Why:** Per LIVE_ANIMATION_PLAN.md §5 — toast variant in packages/ui needs a slide-in + gold border-left treatment. ~15 min.

### Dockerfile base-image digest pin
**Status:** Deferred from Sprint 1 (needs Docker on host to compute SHA)
**Why:** Currently `FROM node:20-alpine` (mutable tag — supply chain risk). Replace with `FROM node:20-alpine@sha256:...` once an ops engineer can run `docker pull && docker inspect`. <2 min once on a host with Docker.

### Login enumeration uniformity
**Status:** Deferred from Sprint 1 — product/UX decision needed
**Why:** Sprint 1 equalised TIMING but the API still returns 409 vs 201 distinguishably. Consider returning 200 "If new, you'll get a confirmation" regardless. ~30 min once decided.

---

## 🧪 Testing / QA

### Full UI smoke test (web + mobile, light + dark)
**Trigger:** before merging PR #16, after Sprint 1 commits
**Why:** Lots of changes accumulated; need someone to click every page in both modes and confirm nothing regressed. ~30 min QA agent time.

### Playwright E2E install + run
**Status:** Scaffolded but `@playwright/test` never installed
**Why:** From Item 26 Phase 3b — `apps/web/tests/e2e/banks.spec.ts.template` exists with the full test code. Just needs `npm install -D @playwright/test && npx playwright install` and rename `.template` → `.ts`.

---

## 📚 Docs (write when relevant)

- `CONTRIBUTING.md` — for when others contribute
- `ARCHITECTURE.md` — high-level system diagram
- `RUNBOOK_INCIDENT_RESPONSE.md` — how to respond to a Plaid/AI/db outage
- `RUNBOOK_KEY_ROTATION.md` — for ENCRYPTION_KEY + JWT keys (currently broken per CRYPTO C2)

---

## How to use this file

- When the user says "let's do X from the backlog", find X here, mark it as in progress, spawn agents per the recommended approach
- When new ideas come up, add them here with status `⏸️ DEFERRED` and the date
- When something ships, REMOVE it from this file (don't keep stale "DONE" entries — that's what `SESSION_MEMORY.md` is for)
- This file is the **forward-looking** queue; SESSION_MEMORY is the **historical** record
