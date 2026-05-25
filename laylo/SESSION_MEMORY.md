# SESSION_MEMORY.md — BillBee (formerly Laylo / Life Admin AI)

> **THIS FILE IS THE SESSION RESUME PROTOCOL.** CLAUDE.md Step 0 instructs every Claude session to read this file first. Update it after every meaningful state change so a fresh Claude (or even a different person) can pick up exactly where we left off — even if all session tokens were used mid-task.

---

## 🔄 Current State (read this first, every session) — UPDATED 2026-05-25 (PHASE 1 SHIP)

**Mobile iOS app boots in DARK mode on the simulator with centered bee + gold halo + gradient indicators. Repo docs reorganized into `docs/`.**

### Where we are
- **Branch:** `feat/ios-app-polish` (off `feat/redesign-black-yellow`); both pushed to GitHub
- **Latest commits:** `chore(docs)` (reorg + auth migration), `feat(mobile+brand)` (theme migration + brand guide + gradient indicators), `feat(mobile)` (Reanimated worklet fix + bee animations + theme switcher)
- **Item 26 (Plaid):** ✅ MERGED to main (PR #15)
- **Item 27 (Redesign + mobile parity):** PR #16 open (`feat/redesign-black-yellow`)
- **iOS polish (this session):** `feat/ios-app-polish` open — needs PR created on GitHub

### Phase 1 outcomes (this session)
- **Brand Guide** — `BRAND_GUIDE.md` at repo root (15 sections, canonical, supersedes design briefs for current hexes/tokens)
- **Theme reactivity** — 21 mobile files migrated from static `tokens` → reactive `useTokens()`. App defaults to dark mode for new installs. Theme toggle in Settings actually works now.
- **Auth screen polish** — Bee centered with gold RadialGradient halo; speech bubble below pointing UP at bee; gradient pill indicator on active tab (no more flat solid fill). Both antennae clear of Dynamic Island.
- **Gradient indicators** — new `GradientPill` primitive (`expo-linear-gradient`) shared by bottom tab bar, auth tabs, settings theme toggle, tasks filter chips.
- **Reanimated worklet crash** — `animated-number.tsx`: rounding moved to worklet, `format()` bounced to JS via `runOnJS`. Dashboard mounts cleanly post-login.
- **Bee animations** — new `FloatingBee` (Y bob) + `BeeEntrance` (scale-in spring). Applied to splash, auth, dashboard empty/footer bees.
- **iOS native** — Info.plist (BillBee display name, light status bar), Podfile.properties.json (`newArchEnabled: true`), full AppIcon size matrix regenerated.
- **Theme switcher** — `ThemeProvider` + 3-segment Light/Dark/System toggle in Settings, persists via expo-secure-store, ThemedStatusBar flips with theme.
- **Docs reorg** — root keeps `README.md`, `CLAUDE.md`, `SESSION_MEMORY.md`, `BRAND_GUIDE.md`. Everything else under `docs/{design,security,architecture,operations,internal}` + `docs/README.md` index.

### Phase 2 COMPLETE + polish landed (commit `87d5fd0` on `feat/google-integrations`)

All 4 Phase 2 agents shipped + 2 polish agents shipped + flying-bee design fix:
- **Backend** (`apps/api/`): Google OAuth with refresh_token capture, AES-256-GCM token encryption mirroring Plaid pattern, Calendar two-way sync, Gmail polling + AI extraction bridge, BullMQ jobs (`GOOGLE_CALENDAR_SYNC` daily, `GMAIL_POLLING_SYNC` hourly, `INBOX_TRIAGE` daily), `GoogleDataAccessLog` audit, HMAC-signed state, `SAFE_GOOGLE_ERRORS` allowlist, rate limiters. **Migration `20260525222334_add_google_integrations` applied to live Railway DB.** 28 new tests, 169 total passing.
- **AI prompts** (`packages/ai/`): `extractBillFromEmail`, `extractAppointmentFromEmail`, `summarizeInboxTriage` with prompt caching (`anthropic.beta.promptCaching`). 19 new tests, all passing.
- **Web UI** (`apps/web/`): `GoogleConnectCard` (Settings), `InboxTriageCard` (Dashboard), `CalendarEventsList`, `GmailBillsList`, `SourceBadge`, typed API client at `apps/web/src/lib/api/google.ts`. Playwright spec (note: `@playwright/test` not yet installed).
- **Mobile UI** (`apps/mobile/`): `GoogleConnectCard`, `InboxTriageCard`, `CalendarEventsList`, OAuth state machine + 10 tests at `src/lib/google-oauth.ts`. Uses `expo-auth-session` + `expo-web-browser` + `expo-crypto` (installed + pod-linked). Deep-link scheme: `lifeadminai://google-oauth?code=...&state=...`.
- **Animation polish**: ambient `BeeFlyBy` (4 instances on auth pages, web + mobile), smoother `BreathingBee` (6s cycle, ±2.5% scale, sin easing), `BreathingBee` "Missed you 🐝" removed from login on both platforms (signup keeps "Let's get you set up 🐝").
- **Subtle gradient backgrounds**: web `body::before` radial gradient layer; mobile `GradientBackground` (expo-linear-gradient, Reanimated opacity crossfade between light/dark layers). 220-300ms ease-out softens theme flip flash. No new colors.
- **New `BeeFlying` illustration**: separate from logo `BeeStanding` — small cartoon bee (yellow body + 2 stripes + grey wings + 1 eye). Used in both web + mobile `BeeFlyBy`. Theme-independent fixed brand hexes.

### Phase 2 user-required next steps
- Moved to `docs/operations/BACKLOG.md` → "Google integrations — config + Cloud Console setup". User direction 2026-05-25: defer.
- App Store deferred per user direction ("bare minimum").

### Phase 2 NEXT (was-pending — original handoff, preserved below)
Original handoff plan below kept for reference; all items above are now SHIPPED.

### Phase 2 IN FLIGHT (HISTORICAL — all 4 agents on `feat/google-integrations` finished)
Launched 2026-05-25 ~17:25 PT. Agents work in parallel; check back via the agent IDs OR look at git log on `feat/google-integrations` for landed commits.

| Agent | Scope | ID |
|---|---|---|
| Backend Senior | OAuth scopes + token encryption + Calendar sync (two-way) + Gmail polling + AI extraction calls + BullMQ jobs + audit log + IDOR tests | `acca33a8999d01a1b` |
| AI Prompts Senior | `extractBillFromEmail`, `extractAppointmentFromEmail`, `summarizeInboxTriage` in `packages/ai/` | `a0015c9bb4ee53fdc` |
| Web UI Senior | Settings Google Connect card, Dashboard Inbox Triage card, badges on bills/appts, typed API client | `ac873ea7d2ce31ab6` |
| Mobile UI Senior | expo-auth-session OAuth flow, Settings + Dashboard + Tasks CTA + badges | `a1363add96d39c20e` |

**Branch base:** `feat/google-integrations` was branched off `feat/ios-app-polish` so it includes Phase 1 work. To split for PR, rebase onto `main` after merging Phase 1, OR cherry-pick the Google commits onto a fresh branch off `main`.

**To resume Phase 2:** check `git log feat/google-integrations` for what landed. If agents stalled, read their prompts in this session's history. Critical contracts the agents are coding against:
- DB: new `googleAccessTokenCiphertext`/`googleRefreshTokenCiphertext`/`googleScopes` fields on User; new `GoogleCalendarEvent` + `GmailMessage` + `GoogleDataAccessLog` models; `source`+`sourceRef` columns added to Appointment/Bill/Reminder
- API endpoints: `GET /api/google/status`, `POST /api/google/{link,unlink,calendar/sync,gmail/poll}`, `GET /api/google/{calendar/events,gmail/messages}`
- AI functions: 3 new functions in `packages/ai/src/service.ts`
- New env vars in `apps/api/.env.example`: `GOOGLE_CALENDAR_SCOPES`, `GOOGLE_GMAIL_SCOPES`, `GOOGLE_REDIRECT_URI`, `GOOGLE_LINK_REDIRECT_URI`
- Mobile: new `expo-auth-session` flow using deep-link scheme `lifeadminai://google-oauth?code=...&state=...`

### Phase 2 NEXT (was-pending — for reference if agents need redo)
Per user direction:
- **Google Calendar = TWO-WAY sync** with Tasks/Appointments
- **Gmail = auto-detect bills/receipts + appointment confirmations + inbox triage** (3 of 3 use cases)
- **App Store compliance: SKIPPED** ("bare minimum, just don't crash")
- **Branch strategy: phased PRs** — Phase 2 should be its own branch off main: `feat/google-integrations`

### Phase 2 plan (kick off agents on this)
Senior team:
1. **Backend OAuth + token storage** — extend OAuth scopes to Calendar + Gmail; encrypt googleAccessToken + googleRefreshToken in Prisma User model (mirror the AES-256-GCM pattern from `apps/api/src/services/crypto.ts`); install `@googleapis/calendar` + `@googleapis/gmail`. Refresh token currently NOT captured — passport-google-oauth20 strategy in `apps/api/src/routes/auth.ts:186-251` discards `_refreshToken`.
2. **Google Calendar sync (two-way)** — new BullMQ jobs `GOOGLE_CALENDAR_SYNC` (daily + on-demand). Mirror cursor pattern from `apps/api/src/services/transaction-sync.ts:22-100`. Tasks with `dueAt` push to Calendar as events; new Calendar events appear in `/api/appointments`. Conflict resolution: last-write-wins on `updatedAt`; user can re-link to reset.
3. **Gmail integrations**:
   - Auto-detect bills/receipts — new AI prompt in `packages/ai/src/prompts/` for bill extraction; surface in `/api/bills?autoDetected=true` (same flow as Plaid auto-detect).
   - Appointment confirmations — extract date/time/place from confirmation emails, surface as `/api/appointments?source=gmail`.
   - Inbox triage — daily AI summary on Dashboard ("3 emails worth your attention today").
4. **Web UI** — Settings page: "Connect Google" button + scope-aware permission flow + per-scope unlink. Dashboard inserts "Google Calendar" + "Gmail" cards next to Plaid Banks.
5. **Mobile UI** — Use `expo-auth-session` (NOT native Google SignIn — App Store config overhead deferred). Same Settings flow as web. Tasks tab gets "Import from Google Calendar" CTA.
6. **AI engineer** — bill extraction prompt, appointment extraction prompt, daily inbox triage prompt. Cache aggressively (one extraction per email, never re-extract).

### How to resume mobile dev
```bash
# API (currently running)
cd apps/api && (set -a && source .env && set +a && exec npx tsx watch src/index.ts)
# Metro
cd apps/mobile && PATH="/opt/homebrew/bin:$PATH" npx expo start --dev-client
# Launch
xcrun simctl launch booted com.lifeadminai.app
# Full rebuild if native deps change:
cd apps/mobile && PATH="/opt/homebrew/bin:$PATH" npx expo run:ios
```

### Persistent gotchas (don't get bitten again)
- **React duplication**: `apps/mobile/node_modules/react` must NOT exist. Root has React 18.3.1 (Next.js); mobile peer of Expo 51 was 18.2.0 but workspace `overrides.react: ^18.3.0` upgrades it. Two copies → `Cannot read property 'useMemo' of null` crash. `npx expo install` sometimes recreates it; delete after any install.
- **expo-router symlink**: `apps/mobile/node_modules/expo-router → ../../../node_modules/expo-router` must exist for Metro HmrServer (treats `main: expo-router/entry` as a literal relative path). Recreate after any install.
- **Native module install workflow**: every new native dep needs `cd ios && pod install && cd .. && npx expo run:ios` to link. JS-only hot-reload won't pick up native modules.
- **iOS native edits** (`Info.plist`, `Podfile.properties.json`, `AppIcon` PNGs) live in gitignored `apps/mobile/ios/` — they survive locally but a fresh `expo prebuild` would lose them. Port to `app.json` plugins before EAS Build.
- **Test creds (live in Railway DB)**: `test@laylo.app` / `Test1234!` AND `demo@lifeadmin.app` / `Test1234!`.

### What just shipped (2026-05-25 — mobile parity session)
4 parallel agents + 1 debug specialist + 2 test engineers landed the following:
- **Visual parity (web↔mobile):** elaborate bee ported via `react-native-svg` (5 poses + BeeLogoMark), `HoneycombPattern` + `HexFrame` primitives, light/dark `tokensLight`+`tokensDark` maps + `useTokens()` hook, Bricolage Grotesque via `@expo-google-fonts/bricolage-grotesque`, splash route (`app/index.tsx`) redesigned, `app.json` updated for icon+splash+font plugin
- **Liveliness:** `BeeSpeechBubble`, `WelcomeBeeBubble`, `PokeBee` (5-tap easter egg), `FallIntoPlace` + `ListStagger` + `MotionButton`, `copy.ts` conversational bank
- **Functionality:** real JWT auth (`src/context/auth.tsx` — was mock!), all `(tabs)` screens fetch real API data via react-query, `AskAi` wired to `/api/ai/chat`, `AuthRedirect` segment-gate in `_layout.tsx`
- **iOS native:** Info.plist (CFBundleDisplayName=BillBee, light status bar, NSAllowsLocalNetworking), Podfile.properties.json (`newArchEnabled: true` — was MISSING), full AppIcon size matrix regenerated via `sips`
- **Tests:** 45 Jest tests passing (~1.2s), jest-expo preset + RTL, covers `copy`, `api`, `tokens`, `auth` context, dashboard integration, bee snapshots
- **QA fixes:** added `WelcomeBeeBubble` + `HoneycombPattern` to auth screen, fixed `&apos;` literal on splash

### Critical fixes during integration
- **React duplication crash** (`Cannot read property 'useMemo' of null`): root override pins React to 18.3.1 but mobile's `package.json` had its own 18.2.0 → two React copies in the bundle → hook dispatcher returned null. Fixed by **deleting `apps/mobile/node_modules/react`** so the workspace root copy is the only one. Metro config also updated: `extraNodeModules.react → workspace root`.
- **Metro HmrServer crash** on `expo-router/entry`: HmrServer treats `"main": "expo-router/entry"` as a literal `./node_modules/expo-router/entry` path. `extraNodeModules` doesn't help because it only intercepts bare specifiers. Fixed by **symlinking** `apps/mobile/node_modules/expo-router → ../../../node_modules/expo-router`.

### How to resume mobile dev
```bash
# API
cd apps/api && (set -a && source .env && set +a && exec npx tsx watch src/index.ts)
# Metro (mobile)
cd apps/mobile && PATH="/opt/homebrew/bin:$PATH" npx expo start --dev-client
# Launch on simulator (already installed)
xcrun simctl launch booted com.lifeadminai.app
# OR full rebuild if native changes:
cd apps/mobile && PATH="/opt/homebrew/bin:$PATH" npx expo run:ios
```

### Known follow-ups
- iOS native engineer's Info.plist edits live in gitignored `apps/mobile/ios/` — they survive locally but a fresh `expo prebuild` would lose `CFBundleDisplayName`, status bar style, etc. If switching to EAS Build / fresh checkout, port those edits into `app.json` via Expo's plugin/extra config (or use `app.config.ts` and `expo-build-properties`).
- Plaid Link flow on mobile (banks screen) was wired by functionality engineer but not manually verified in sim — pending real test.
- `react-test-renderer` is at 18.2.0; the single React in workspace is now 18.3.1. Jest tests passed at install time but a `npm install` from a clean state may surface a mismatch — pin if it bites.

### Active blocker (now-RESOLVED archive)
~~Mobile iOS Simulator boot — blocked on disk space.~~ Resolved 2026-05-25 (laptop restart freed 710GB; build + Pods succeeded; React + Metro issues debugged through).
- All prerequisite work complete: arm64 Homebrew installed, arm64 CocoaPods installed, `pod install` succeeded with 74 deps, `app.json` rebranded (BillBee + black splash), Podfile patched (RN 0.74 + iOS 14.0 + use_modular_headers + privacy_file_aggregation removed)
- Xcode build via `expo run:ios` failed twice with "No space left on device" — disk is at 100% (1.4GB free; need ~5-10GB for DerivedData + Hermes engine + RCT-Folly compile)
- User said they will restart the laptop and resume later — restart frees temp + macOS recovers some space

### To resume after restart
1. `df -h /Users` — verify ≥8GB free
2. If still tight: clear browser caches manually (`~/Library/Caches/Google`, `~/Library/Caches/Mozilla`, `~/Library/Caches/Firefox`, `~/Library/Caches/com.microsoft.VSCode.ShipIt`, `~/Library/Caches/com.anthropic.claudefordesktop.ShipIt`, `~/Library/Caches/Comet`) + empty Trash
3. `cd /Users/ashiks/Documents/myai/laylo/apps/mobile && PATH="/opt/homebrew/bin:$PATH" npx expo run:ios` (foreground, ~5 min first build) — Simulator should pop with BillBee installed
4. If localhost:3001 isn't reachable from sim, the API URL in `apps/mobile/src/lib/api.ts` may need to be `http://<Mac LAN IP>:3001` instead of `http://localhost:3001` (Simulator can usually reach localhost but device cannot)

### What's shipped + working RIGHT NOW (visit http://localhost:3000 after restart)
| Area | Status |
|---|---|
| Plaid (Item 26) | Merged, production-grade after F1 fix |
| Item 27 redesign (palette, layouts, typography, AI affordances) | All shipped, PR #16 |
| Animation rollout (transitions, route progress, ambient bees, page choreography) | Shipped commits 2784287 + 6f93b48 |
| Hive theme (HoneycombPattern + HexFrame) | Shipped commit df1ff6b |
| Liveliness + personality (CursorBee, BeeSpeechBubble, easter egg, conversational copy) | Shipped commit df1ff6b |
| Motion polish (gentler springs, FallIntoPlace, first-login welcome bee) | Shipped commit 6f93b48 |
| Comprehensive security audit (6 specialists + coordinator) | Shipped commit a69c4d2 — `docs/security/COMPREHENSIVE_SECURITY_AUDIT.md` |
| Sprint 1 security quick-wins (12 fixes) | Shipped commit e188820 |
| `docs/operations/BACKLOG.md` (forward-looking work queue) | Shipped commit 6d8d384 |
| `docs/operations/DEPLOYMENT_RUNBOOK.md` (prod launch instructions, NO AWS) | Shipped commit b60e090 |

### Last user request (2026-05-12 before pause)
"Make tab transitions less jittery + dashboard elements fall into place when logged in" — ✅ shipped in commit `6f93b48`. User can verify on refresh.

### Verdict matrix (per `docs/security/COMPREHENSIVE_SECURITY_AUDIT.md`)
- Local dev / personal use: **GO** ✅
- Closed beta (≤10 invited users): **GO** after Sprint 1 (already done) ✅
- Public open signup: **NO-GO** until Sprint 2+3 (~2 weeks of work)
- Plaid Production: **NO-GO** until Sprint 1-4 (~3 weeks of work)

### Servers (will need restart after laptop reboot)
- API: `cd apps/api && (set -a && source .env && set +a && exec npx tsx watch src/index.ts)` — port 3001
- Web: `cd apps/web && /Users/ashiks/Documents/myai/laylo/node_modules/.bin/next dev --port 3000` (NOT `npm run dev` — workspace bin link is broken; use root node_modules)
- Test creds (live in Railway DB): `test@laylo.app` / `Test1234!` AND `demo@lifeadmin.app` / `Test1234!`

## Session 4 — 2026-05-12 — Hive theme, liveliness, security audit, motion polish, mobile blocked
Picked up from Session 3 (which paused after the redesign + Plaid integration shipped). Added a lot of polish + a full end-to-end security audit + tried to boot iOS sim.

**Logo iteration spiral (rounds 1→4) — finally landed on user's reference image**
- Rounds 1-3 of graphic design (cartoon mascots, polite tech marks, edgy startup marks) all rejected
- User picked their original reference image: round-faced bee with angled eyebrows + solid mouth bar + outlined wings + chunky antenna dots
- Bee uses fixed colors (highlight yellow #F8E71C body + black 4px outline + black eyebrows/mouth + chunky yellow antenna dots) so it works in BOTH light and dark mode without theme-flipping
- Both `<BeeStanding>` (large hero) and `<BeeLogoMark>` (small brand mark) match the design
- Removed gold-square wrapper; bee floats free in nav/header/footer

**Palette change (commit b4a9594)** — gold #FFD700 → highlight yellow #F8E71C across web + mobile tokens. Brighter, more "highlighter pen" feel.

**Hive theme rollout (commit df1ff6b — Hive Theme Engineer)**
- New `<HexFrame>` primitive — reusable hexagonal clip wrapper
- Subtle 4% honeycomb pattern background on 7 pages (dashboard, money, bills, tasks, transactions header, reminders, appointments). Settings stays calm.
- Hex-clipped containers everywhere: top-bar avatar, settings profile avatar, every page-header icon, dashboard bill stat, money hub icons, every Bill category icon + subscription tile/row icons, every appointment card category icon, calendar ribbon today indicator
- Tasks: gold-hex priority indicators + gold hex-burst on completion
- Reminders: bell hex-clipped + per-row gold-hex bullets

**Liveliness + Personality (commit df1ff6b — Liveliness Engineer)**
- New `<CursorBee>` — Pokémon-trail bee following cursor on marketing landing only
- New `<BeeSpeechBubble>` — gold-bordered speech bubble with positional tail
- Easter egg: poke dashboard bee 5× in 2.5s → "Stop poking me!"
- Random one-liner toast on task complete (7 variants)
- Login speech bubble "Missed you 🐝", signup "Let's get you set up 🐝"
- Avatar tooltip "That's you 🐝"
- 18 system messages rewritten conversational: "Got it, saved! 🐝", "Add it to the hive", "Lock it in", "Send it", "Hmm, sync stalled. Try again?"
- All zod validation errors humanized

**Comprehensive security audit (commit a69c4d2 — 6 parallel agents + coordinator)**
- THREAT_MODEL.md (Cybersecurity Lead, 3,845 words, STRIDE matrix, top-20 threats, GDPR/CCPA gaps)
- PENTEST_REPORT.md (0 CRIT, 1 HIGH, 9 MED, 8 LOW). Verdict: "Plaid integration is at near-financial-grade hardening. IDOR discipline is exceptionally consistent."
- DATA_LEAK_AUDIT.md (0 CRIT, 3 HIGH, 6 MED, 5 LOW)
- CRYPTO_AUDIT.md (0 CRIT, 3 HIGH, 6 MED, 5 LOW). Verdict: "AES impl is textbook. ES256 webhook verification is reference quality."
- DEPENDENCY_AUDIT.md (0 CRIT, 25 HIGH transitive, 13 MOD)
- INFRA_SECURITY_AUDIT.md (0 CRIT, 6 HIGH, 11 MED, 7 LOW). **Zero secrets in git history.**
- COMPREHENSIVE_SECURITY_AUDIT.md (Coordinator) — 15 unique HIGHs after dedup. Verdict matrix per launch tier.

**Sprint 1 security quick-wins (commit e188820 — 12 fixes)**
- `passport.initialize()` (Google OAuth was 500-ing in prod)
- `npm audit fix` (-10 transitive vulns)
- `next@14.2.35` (-7 next.js HIGH advisories)
- `select` on `loginWithGoogle` `findUnique`
- JWT in OAuth `#fragment` not `?query`
- `pushToken` to SENSITIVE_FIELDS
- Login + register dummy bcrypt (timing fixes)
- `writeAuthFailureLog()` for breach detection
- Dockerfile USER node + HEALTHCHECK + .dockerignore
- Production env `.superRefine`
- Database SSL enforcement
- npm audit: 43 → 33 vulns

**DEPLOYMENT_RUNBOOK.md (commit b60e090)** — 10 sections covering NO-AWS path to PROD. Domain → service signups (Upstash, R2, Resend, Sentry, Anthropic prod, Plaid Production) → DNS → Railway/Vercel deploy → Plaid config → mobile launch → smoke test → monitoring. Total cost: ~$15-35/mo + $10/yr domain.

**BACKLOG.md (commit 6d8d384)** — forward-looking queue. Item 29 (email order tracking), Item 33 (receipt analysis with AI insights), Sprint 2/3/4 security, mobile parity items, etc. Documents iOS Simulator blocker too.

**Motion polish (commit 6f93b48)** — fixed user's "jittery" feedback
- Page transition: dropped directional slide (was the jitter source), softened spring (380→220), switched to mode="wait" with 80ms exit
- Bee delivery: corner-settle (top-right) instead of viewport fly-through
- New `<FallIntoPlace>` orchestrator (settling spring, weighted, no overshoot)
- Dashboard: hero drops from top → stat tiles cascade → bills + tasks rise from bottom → AmbientBees fade in last (1.2s total)
- First-login session: slower stagger + welcome bee speech bubble
- Money/Vault/Bills/Tasks pages all got FallIntoPlace too

**Mobile iOS Simulator (BLOCKED)**
- arm64 Homebrew installed (alongside existing x86)
- arm64 CocoaPods installed
- pod install succeeded with 74 deps
- Podfile patches: removed `:privacy_file_aggregation_enabled` (RN 0.74 doesn't have it), bumped iOS deployment target 13.4 → 14.0 (Plaid SDK requirement), added `use_modular_headers!` (ExpoModulesCore Swift requirement)
- App.json rebranded to BillBee + black splash
- Xcode build fails with "No space left on device" twice. Disk at 100%, 1.4GB free. Need ~8-10GB free.
- User restarting laptop to free temp + retry later

## Item 27 Phase 7 — Layout redesign + Bricolage Grotesque + droplet choreography (2026-05-10)
User rejected Fraunces ("not a fan of the font"), asked for joyful page layouts ("user should FEEL like using it"), and a login droplet animation. Spawned a Design Expert (Phase A) → 3 implementation agents in parallel (C1 typography, C2 layouts, C3 auth+droplet).

**Phase A (Design Expert):** `/Users/ashiks/Documents/myai/laylo/LAYOUT_REDESIGN_BRIEF.md` saved (4,014 words, 8 sections, 13 sub-sections). Picked **Bricolage Grotesque** (grotesque with opsz+wdth axes, free, near-Inter at body sizes). Three named layout patterns: **Bento Grid** (Dashboard, Money), **Honeycomb Tile Grid** (Vault, Documents), **Origami Card** (Bills). Plus Conversational Stack (Reminders), Calendar Ribbon (Appointments), Story Strip (Tasks), Settings Hub Grid. 1.8s droplet choreography for login (fall→impact→3 ripples→form cascade), once-per-session.

**Phase C1 (typography ✅ done):** Bricolage Grotesque via `next/font/google` with axes `['opsz','wdth']`. globals.css rewritten with axis settings per heading level + OpenType features `cv11` (circular zero), `cv05` (straight l), `ss01` (single-storey a on display ≥22px), `tnum` on `.tabular-nums`. DESIGN_SYSTEM.md §2 fully rewritten. Build clean, 17 routes.

**Phase C2 (layouts ⚠️ partial):** 8 of 10 (app) pages overhauled (dashboard Bento, bills Origami, tasks Story Strip, documents Honeycomb, reminders Conversational Stack, appointments Calendar Ribbon, transactions, money Bento). 4 new layout primitives shipped (`hex-tile.tsx`, `hive-header.tsx`, `progress-hive.tsx`, `sparkline.tsx`). Cross-cutting delights: time-of-day greeting (`lib/greeting.ts`), bee fly-by (`motion/bee-fly-by.tsx`), milestone toast (`celebrations/milestone-toast.tsx`). **Stream-timeout at minute 27 — vault + settings did NOT receive the new layout patterns (still have the Phase 3a + playfulness treatment, functional but not the Designer's Honeycomb Tile Grid / Settings Hub Grid).** Two typecheck regressions from C2 partial output were fixed manually: `IdCard` import → `Contact as IdCard` (lucide-react has no `IdCard`); `Map<string, HTMLDivElement>` → `Map<string, HTMLElement>` for `<section>` ref.

**Phase C3 (auth+droplet ✅ done):** `<DropletChoreography>` reusable component built at `apps/web/src/components/motion/droplet-choreography.tsx` with named slots (Logo, Subtitle, EmailField, PasswordField, Submit, Divider, Google, Footer). Login: 3 ripples + 1× droplet. Signup: 4 ripples + 1.2× droplet. Once-per-session via `sessionStorage:laylo:authDropletPlayed` (shared across login↔signup). `useReducedMotion()` short-circuits to instant render. Both build clean (login 2.68KB, signup 3.58KB).

**Verification:** web typecheck clean, build clean (17 routes prerendered). No mobile changes this round.

**Known follow-ups (deferred to next iteration):**
- Vault + Settings layout patterns (Honeycomb Tile Grid, Settings Hub Grid) — C2 timed out before reaching them
- Mobile parity for Bento + Honeycomb tiles + droplet choreography (Designer flagged this needs separate engineering)
- Mobile Bricolage TTF loading via expo-font

## Item 27 Phase 6 — Playfulness boost B+D + Fraunces typography (2026-05-10)
User chose options B (more motion) + D (bigger illustrations + color moments) after testing the initial redesign locally. Two parallel agents (web + mobile) spent ~16 min each implementing.

**Web playfulness (apps/web):** 7 new components (`motion/list-stagger.tsx`, `motion/motion-button.tsx`, `motion/sparkle-burst.tsx`, `motion/animated-number.tsx`, `motion/page-transition.tsx`, `illustrations/honeycomb-pattern.tsx`, `celebrations/inbox-zero-overlay.tsx`). 12 pages enhanced. All 13 of 14 B+D items implemented (B8 toast skipped — toast lives in packages/ui which was out of scope).

**Mobile playfulness (apps/mobile):** 9 new components (motion + celebrations + honeycomb). 11 screens enhanced. All 13 B+D items implemented with hand-rolled workarounds for the no-new-deps constraint: tiled View hexagons for honeycomb (no react-native-svg), layered translucent ellipses for the gold glow (no native blur), in-memory module-level flag for inbox-zero detection (no AsyncStorage).

**Typography (Fraunces):** Replaced Inter on web with Fraunces variable font via `next/font/google` (axes: opsz, SOFT, WONK). Body uses sharp+clean axes; h1–h6 inherit warm+wonky display axes via globals.css cascade. ONE typeface, infinite hierarchy. DESIGN_SYSTEM.md §2 fully rewritten. Mobile font loading deferred (System fallback for now; intent in tokens.ts).

**Verification:** web typecheck + build clean (17 routes), mobile typecheck clean.

**Known follow-ups (non-blocking):**
- Mobile Fraunces TTF loading via expo-font (currently System fallback)
- 1 missed item: B8 toast slide-in (lives in packages/ui)
- Bills "Mark paid" is currently a visual celebration without state mutation (real paidAt field is data-shape work)
- Documented mobile-tech limitations: hand-rolled honeycomb texture, layered ellipse glow (no native blur primitive in core RN)
- **Current branch:** `feat/redesign-black-yellow` (off main, NO commits yet — all work is uncommitted in working tree)
- **Item 26 (Plaid):** ✅ PR #15 MERGED to main on 2026-04-29

## 🚦 RESUME RUNBOOK (if a fresh session needs to pick this up)

### If background agents are still claimed to be in-flight when you arrive
1. Check the task notification system: any `<task-notification>` for agentIds `a703c876fec5d728b` (web) or `a69f02113e1acfcda` (mobile)? If yes, read their `<result>` to see what they completed.
2. If you don't see a notification, the agents likely died with the prior session. Verify by running:
   ```bash
   cd /Users/ashiks/Documents/myai/laylo && git status --short | wc -l
   ```
   If the count is roughly 26 files (just packages/ui + design tokens + 2 stub components), Phase 3a/3b never finished. Re-spawn them — prompt scaffolding is in `SESSION_MEMORY.md` Session History entries below, OR just re-read `docs/design/REDESIGN_BRIEF.md` §8 (Phase handoff matrix) and `docs/design/DESIGN_SYSTEM.md` and write fresh prompts that note what's already done (see "Already done — do NOT redo" below).

### If Phase 3a/3b ARE done and you're picking up at Phase 4:
1. Run all three typechecks:
   ```bash
   cd /Users/ashiks/Documents/myai/laylo/apps/api && npx tsc --noEmit
   cd /Users/ashiks/Documents/myai/laylo/apps/web && npx tsc --noEmit && npm run build
   cd /Users/ashiks/Documents/myai/laylo/apps/mobile && npx tsc --noEmit
   ```
2. Spawn the QA agent (Phase 4) — prompt template:
   - Read REDESIGN_BRIEF.md, DESIGN_SYSTEM.md
   - Verify: zero `viewState` matches in production pages; zero `/assistant` references; theme toggle works on every route in light AND dark; bee mascot used in empty states; AskAi/ai-bottom-sheet wired to cards; copy bank applied; nav has 5 items only
   - Produce `docs/design/REDESIGN_QA_REPORT.md`
3. After QA, commit + open PR with title `feat(redesign): black-yellow theme + minimal IA + AI affordances`. Body should reference REDESIGN_BRIEF.md, DESIGN_SYSTEM.md, REDESIGN_QA_REPORT.md.

### Already done — do NOT redo
| Done | File / area |
|---|---|
| ✅ | `docs/design/REDESIGN_BRIEF.md` — full Strategist audit |
| ✅ | `docs/design/DESIGN_SYSTEM.md` — full design system spec |
| ✅ | `packages/ui/src/components/*` (14 components) — migrated to CSS variable tokens |
| ✅ | `apps/web/tailwind.config.ts` — gold + black tokens, legacy aliases preserved |
| ✅ | `apps/web/src/styles/globals.css` — CSS variables for `:root` + `.dark`, gold theme-fade overlay |
| ✅ | `apps/mobile/tailwind.config.js` — created by Phase 2 (didn't exist) |
| ✅ | `apps/mobile/global.css` — created by Phase 2 |
| ✅ | `apps/web/src/components/illustrations/bee.tsx` — 5 bee mascot poses (BeeStanding, BeeLooking, BeeMagnifying, BeeSleeping, BeeMail), 447 lines |
| ✅ | `apps/web/src/components/ai/ask-ai.tsx` — AI affordance component, 260 lines |
| ✅ | `apps/mobile/src/components/illustrations/bee.tsx` — mobile bee mascot |

### Phase 3a ✅ DONE (2026-05-10)
13 web pages + 2 layouts + banking widgets restyled. Nav reduced 8 → 5 (Dashboard · Money · Tasks · Vault · Settings). `/assistant` directory deleted. `viewState` removed from dashboard/bills/tasks. Theme bug fixed on `/reminders` (line 77) + `/documents` (line 76) using `useTheme()` from `next-themes`. ThemeProvider consolidated to ONE instance in `providers.tsx` (root layout). `CATEGORY_COLORS` 10-gradient table in `/bills` replaced with flat semantic palette + Lucide icons in gold. 8 AskAi affordance surfaces (`AskLayloHero` + per-card `AskAiChip`s). Bee mascot used across empty states. ~10 of 15 microinteractions present, all gated on `useReducedMotion()`. Web typecheck + build clean (15 routes prerendered).

**Phase 3a known issues (don't surprise the QA agent):**
- 2 microinteractions deferred for follow-up: bee+dots loader variant (#14), empty-state CTA stroke-draw animation (#15). Plaid confetti (#13) intentionally skipped (Plaid recolor only).
- Mobile FAB (#11) was always mobile-only.
- Bee export naming difference noted in original brief is benign — actual exports are `BeeLookingAround`/`BeeEnvelope` (not `BeeLooking`/`BeeMail`); web only used `BeeStanding`/`BeeMagnifying`/`BeeSleeping` so no impact.
- Tailwind `gradient-text` and `primary-*` aliases kept as transition shims (unused in production, safe to remove later).

### Phase 3b ✅ DONE (2026-05-10)
14 mobile screens restyled. 5 tabs final: Home (HomeIcon) · Money (WalletIcon) · Tasks (CheckSquareIcon) · Vault (ArchiveIcon) · Settings. Animated 3px gold underline on active tab. AskAi bottom sheet + button + sparkle icon + use-ai-sheet hook + barrel export all built. Money + Vault hubs created. Assistant tab deleted. 7 microinteractions (card press-scale, tab underline, checkbox sweep, AskAi pulse, sheet slide, suggestion chips, gold refresh tint). 11+ AI touchpoints. All 5 bee poses used in empty states. typecheck clean.

**Phase 3b known issues (don't surprise the QA agent):**
- `apps/mobile/global.css` exists on disk but isn't imported — NativeWind 4 babel/metro plugin isn't configured. Mobile reads tokens from `apps/mobile/src/lib/tokens.ts` (TS mirror) instead. Deliberate trade-off, kept typecheck clean.
- `lucide-react-native` + `react-native-svg` NOT installed (brief forbade adding deps). Tab icons + sparkle hand-rolled from `<View>` primitives matching bee's geometric style.
- Dark-mode runtime token swap is out of Phase 3b scope — token map exists in `tokens.ts` but `useColorScheme()` wiring is a follow-up.

## 🟡 Active background agents
| Phase | Agent ID | Started | Status |
|---|---|---|---|
| 3a (Frontend continuation) | `a703c876fec5d728b` | 2026-05-10 session 3 | ✅ Completed 2026-05-10 — see "Phase 3a ✅ DONE" entry above |
| 3b (Mobile continuation) | `a69f02113e1acfcda` | 2026-05-10 session 3 | ✅ Completed 2026-05-10 — see "Phase 3b ✅ DONE" entry above |

If you arrive in a new session and an in-flight agentId isn't in any task-notification result, it died with the session that spawned it. Re-spawn a fresh agent using the TODO list above.

## Locked redesign decisions (from user — DO NOT revisit)
- **Theme:** Pure black `#000000` + bumblebee gold `#FFD700`. Body text NEVER gold (gold = accents/CTAs/focus only). Light mode = inverse.
- **AI chat:** REMOVED as standalone route (`/assistant` deleted). Contextual "Ask AI" buttons embedded in Bill/Transaction/Task cards + dashboard hero "Ask anything" input.
- **Style:** Minimal + FUN — microinteractions + personality copy + playful bee illustrations.
- **Nav consolidation (proposed by Strategist, no objection from user):** Dashboard · Money (Bills+Subs+Transactions+Banks) · Tasks · Vault (Documents+Reminders+Appointments) · Settings = 5 nav items / 5 mobile tabs.
- **PR strategy:** Item 26 already merged. Item 27 redesign on its own branch + PR.

## Local dev environment state (paused)
- API server was running on `http://localhost:3001`
- Web server was running on `http://localhost:3000`
- Both may have been killed when session paused — restart with: API: `cd apps/api && (set -a && source .env && set +a && exec npx tsx watch src/index.ts)`. Web: `cd apps/web && npm run dev`
- DB: live Railway Postgres, 3 migrations applied
- Test creds (verified working): `test@laylo.app` / `Test1234!` AND `demo@lifeadmin.app` / `Test1234!`

## Item Tracker

| #  | Item                                  | Status                              |
|----|---------------------------------------|-------------------------------------|
| 1  | Monorepo scaffold + tooling           | 🚀 PUSHED TO GITHUB (PR #1)        |
| 2  | Design system + shared UI             | 🚀 PUSHED TO GITHUB (PR #2)        |
| 3  | Database schema + migrations + seed   | 🚀 PUSHED TO GITHUB (PR #3)        |
| 4  | Auth system (JWT + Google OAuth)      | 🚀 PUSHED TO GITHUB (PR #4)        |
| 5  | Backend API (all tRPC routers)        | 🚀 PUSHED TO GITHUB (PR #5)        |
| 6  | AI service layer (6 functions)        | 🚀 PUSHED TO GITHUB (PR #6)        |
| 7  | Job queue + notifications             | 🚀 PUSHED TO GITHUB (PR #7)        |
| 8  | Web: Landing page                     | 🚀 PUSHED TO GITHUB (PR #8)        |
| 9  | Web: Auth pages (login/signup)        | 🚀 PUSHED TO GITHUB (PR #9)        |
| 10 | Web: Dashboard                        | 🚀 PUSHED TO GITHUB (PR #10)       |
| 11 | Web: Tasks, Bills, Subscriptions      | 🚀 PUSHED TO GITHUB (PR #11)       |
| 12 | Web: Documents, Appointments, Reminders | 🚀 PUSHED TO GITHUB (PR #12)     |
| 13 | Web: AI Assistant chat                | 🚀 PUSHED TO GITHUB (PR #12)       |
| 14 | Web: Settings                         | 🚀 PUSHED TO GITHUB (PR #12)       |
| 15 | Mobile: Onboarding flow               | 🚀 PUSHED TO GITHUB (PR #13)       |
| 16 | Mobile: Auth flow                     | 🚀 PUSHED TO GITHUB (PR #13)       |
| 17 | Mobile: Tab navigation + Home         | 🚀 PUSHED TO GITHUB (PR #13)       |
| 18 | Mobile: Tasks + Bills + Subs          | 🚀 PUSHED TO GITHUB (PR #13)       |
| 19 | Mobile: Docs + Appts + Reminders      | 🚀 PUSHED TO GITHUB (PR #13)       |
| 20 | Mobile: AI Assistant                  | 🚀 PUSHED TO GITHUB (PR #13)       |
| 21 | Mobile: Settings                      | 🚀 PUSHED TO GITHUB (PR #13)       |
| 22 | Tests: Unit + Integration             | 🚀 PUSHED TO GITHUB (PR #14)       |
| 23 | Tests: E2E (Playwright)               | 🚀 PUSHED TO GITHUB (PR #14)       |
| 24 | CI/CD: GitHub Actions workflows       | 🚀 PUSHED TO GITHUB (PR #14)       |
| 25 | README + EAS preview setup guide      | 🚀 PUSHED TO GITHUB (PR #14)       |
| 26 | Plaid integration (production-grade)  | 🚀 MERGED TO MAIN (PR #15)         |
| 27 | Black/yellow redesign + AI affordances| 🚀 PR #16 OPEN (awaiting merge)    |
| 28 | Transaction detail drawer + AI explainer| 🚀 PR #16 OPEN (layered onto #27) |
| 29 | Email order tracking                  | ⏸️ DEFERRED (user paused 2026-05-10) |
| 30 | Rebrand Laylo → BillBee                 | 🚀 PR #16 (commit pending)          |

## Progress Summary
```
████████████████████████████████████████ 26/27 (96%) ✅
+ Item 27 redesign at Phase 3 (Engineering) — paused at session limit
```

## Decisions Log
- [Session 1 — 2026-03-15] DECISION: Used Express + REST routes instead of tRPC for API (simpler initial setup; tRPC can be layered on later)
- [Session 1 — 2026-03-15] DECISION: Used raw fetch for Resend email API instead of adding resend package
- [Session 1 — 2026-03-15] DECISION: IORedis type mismatch with BullMQ fixed via `as unknown as ConnectionOptions` cast
- [Session 1 — 2026-03-15] DECISION: Next.js dev script uses `./node_modules/.bin/next` to fix monorepo binary resolution
- [Session 1 — 2026-03-15] DECISION: React hoisted to root package.json with overrides to prevent duplicate React in monorepo
- [Session 1 — 2026-03-15] NOTE: expo-dev-client added to mobile app for development builds (no Expo Go)
- [Session 1 — 2026-03-15] DECISION: Auth uses sessionStorage demo mode — accepts demo@lifeadmin.app/Demo1234! or any valid email/8+ char password
- [Session 1 — 2026-03-15] DECISION: ThemeProvider in root layout so theme persists across sign-in/sign-out
- [Session 1 — 2026-03-15] DECISION: Dark/light toggle uses gradient fade overlay transition
- [Session 2 — 2026-04-28] DECISION: Plaid integration is read-only (Transactions + Accounts + Auth); NO payment initiation, NO Plaid Transfer
- [Session 2 — 2026-04-28] DECISION: Plaid access_token encrypted at rest with AES-256-GCM (key in env, version-prefixed for rotation)
- [Session 2 — 2026-04-28] DECISION: Webhook ingestion uses /transactions/sync cursor pattern, not /transactions/get polling
- [Session 2 — 2026-04-28] DECISION: BankDataAccessLog uses onDelete:SetNull (audit trail outlives users for compliance)
- [Session 2 — 2026-04-28] DECISION: Auto-detected bills/subscriptions surface for user confirmation (autoDetected=true), do not auto-create silently
- [Session 2 — 2026-04-28] DECISION: Plaid error messages sanitised via SAFE_PLAID_ERRORS allowlist; raw err.message never returned to client
- [Session 2 — 2026-04-28] DECISION: Webhook returns 401 for both signature and parse failures (avoid distinguishing-fail oracle)
- [Session 2 — 2026-04-28] DECISION: Multi-agent build process — Architect → DBA → Backend/Frontend/Refactor in parallel → Security/QA in parallel → Fix Engineer

## Open Items
- Mobile dev build needs `expo-dev-client` — installed but not tested
- Next.js SWC lockfile patching warning is cosmetic — does not affect builds
- Dev server must be started via `./node_modules/.bin/next dev -p 3000` from apps/web dir
- **F1 (CRITICAL deferred):** apps/web/src/lib/auth-context.tsx is still demo-only. Must wire to real /api/auth/login JWT flow before flipping PLAID_ENV to production. Sandbox merge is safe (Plaid Sandbox can't touch real money).
- Plaid Production budget cap ($20/mo) not yet set — only required when promoting from sandbox
- Local dev webhook tunnel (ngrok / cloudflared / Plaid "fire test webhook") not yet picked
- 37 npm audit vulns are pre-existing (transitive Expo/RN deps); audit baseline unchanged by Item 26
- Domain not yet purchased (~$10/yr Cloudflare); needed for Plaid Production OAuth banks

## Session History

### Session 1 — 2026-03-15
- **Completed:** Items 1–8 (monorepo, design system, DB schema, auth, API, AI, jobs, landing page)
- **Approved:** Items 1–9 (auth pages approved, code written)
- **Pushed:** PRs #1–#8 merged to main
- **Ended at:** Item 9 approved, code written, not yet pushed. User requested CLAUDE.md/SESSION_MEMORY.md/PROMPT.md setup.
- Items 9-10 pushed after CLAUDE.md setup. Dashboard iterated: mobile layout improved — all sections now full-width card-based instead of cramped 2-column grid.

### Session 2 part 2 — 2026-04-29 — Item 27 Black/Yellow Redesign (paused at Phase 3)
- Item 26 Plaid PR #15 MERGED to main (squash merge `afcb54c..3c68abb`). Three follow-up commits added to the PR before merge: `fix(auth)` — wired auth-context to real JWT flow, closing CRITICAL F1; `fix(api)` — winston logger Symbol preservation; `chore(tsconfig)` — explicit rootDir for ai/shared/ui packages. Final PR description updated to "production-grade".
- Branch `feat/redesign-black-yellow` created off main.
- **Phase 1 (Design Strategist) ✅** — `/Users/ashiks/Documents/myai/laylo/REDESIGN_BRIEF.md` saved (3,499 words, 9 sections, 21 copy strings, 15 microinteractions, 32 files identified). Top finding: prototype `viewState` toolbar leaking to production on dashboard/bills/tasks/documents. IA proposal: collapse to 5 nav items (Dashboard/Money/Tasks/Vault/Settings).
- **Phase 2 (UI Designer) ✅** — `/Users/ashiks/Documents/myai/laylo/DESIGN_SYSTEM.md` saved (4,875 words, 11 sections). 20 color tokens, 15 packages/ui components updated to consume CSS variables. Tailwind configs updated (web modified, mobile created). globals.css migrated. Both typechecks clean. Designer rules: use CSS variables in arbitrary form (`bg-[var(--color-accent)]`); body text never gold; only 2 radii (8px chips/16px cards).
- **Phase 3a (Frontend, web) 🟡 RUNNING** — backgrounded. Scope: remove viewState toolbar; fix theme bug on /reminders + /documents (switch to `useTheme()`); delete /assistant route; create Money + Vault hub pages; restyle 9+ pages with new tokens; reduce CATEGORY_COLORS gradient noise in /bills; embed contextual "Ask AI" buttons; ship 5 bee mascot SVG poses; Framer Motion microinteractions.
- **Phase 3b (Mobile) 🟡 RUNNING** — backgrounded. Scope: restructure tab bar to 5 tabs (Home/Money/Tasks/Vault/Settings); delete assistant tab; restyle all screens; embed mobile AI affordances (long-press + bottom sheet); Reanimated microinteractions; bee mascot parity.
- **Phase 4 (QA) ⏳ pending** — should verify theme parity across all routes (light + dark), microinteraction smoke test, copy bank applied, no /assistant references, no viewState toolbar.
- **Phase 5 (commit + PR) ⏳ pending** — single PR `feat(redesign): black-yellow theme + minimal IA + AI affordances`.

### Session 2 part 1 — 2026-04-28 — Item 26 Plaid Integration (sandbox-clean, branch ready)
- **Phase 0 (Architect):** PLAID_INTEGRATION_SPEC.md saved with 13 sections
- **Phase 1 (DBA):** init + add_plaid_integration migrations applied to Railway Postgres. Tables: plaid_items, bank_accounts, transactions, plaid_webhook_events, bank_data_access_logs. 5 new enums. Modifications to User, Bill, Subscription.
- **Phase 2a (Backend):** 11 files created (services/{crypto,plaid,audit-log,transaction-sync}, routes/{plaid,transactions,accounts}, 4 test files). 6 files modified. AES-256-GCM token encryption, ES256 webhook JWT verification, BullMQ jobs (initial sync, incremental sync, daily rebalance @ 06:00 UTC).
- **Phase 2b (Frontend):** Web (`/settings/banks`, `/transactions`, dashboard widgets) + Mobile (Expo Router screens + react-native-plaid-link-sdk v11). Auth header plumbing added (was missing). Mobile app.json updated with iOS LSApplicationQueriesSchemes + Android intent filter for OAuth re-entry.
- **Phase 2c (Refactor):** Dashboard payload extended with connectedAccounts + recentTransactions. Bills/Subs `?includeTransactions=true` and `autoDetected` exposure. Daily AI insights enriched with 7-day spending context (top categories, totals, pending count, new auto-detected bills).
- **Phase 3a (Security):** SECURITY_REVIEW_REPORT.md with 1 CRITICAL + 2 HIGH + 7 MEDIUM + 5 LOW + 4 INFO findings. Verdict: NO-GO for production, GO for sandbox.
- **Phase 3b (QA):** 42 new tests written (132 total). Cross-user IDOR coverage, webhook contract tests, rate-limit tests, integration tests. Reported 5 implementation findings overlapping Phase 3a.
- **Phase 4 (Fix):** All 16 Option B fixes applied. HIGH+MEDIUM security findings resolved. Audit-log onDelete:Cascade → SetNull (3rd migration: audit_log_retain_after_user_delete). Webhook payload Zod-validated. SAFE_PLAID_ERRORS sanitisation. Per-page audit log in syncItem. plaidSyncLimiter scoped by userId+itemId. ITEM-level webhook codes (LOGIN_REQUIRED, USER_PERMISSION_REVOKED, etc.) now actioned. Daily TTL purge job for old webhook payloads. plaidRebalance now writes audit logs. Webhook event+enqueue made transactional. Mobile pre-existing TS errors (12) cleaned up. .env.example finally documents Plaid+Encryption.
- **Final state:** 132/132 tests passing, 3 migrations applied, api/web/mobile typechecks clean, web build clean. 52 files changed (24 modified + 28 new).
- **Deferred:** F1 (web auth context demo stub) — Option C scope, blocks Plaid Production but not sandbox.

## How To Use

### Resuming a session (the canonical phrase)
Say: **"resume from SESSION_MEMORY"** or just "let's continue".
Claude reads this file first (per CLAUDE.md Step 0), then orients.

### What lives where (file map for resume)
| File | Purpose | Edit cadence |
|---|---|---|
| `CLAUDE.md` | Project rules, infra locks, protocol, design tokens | Rare — only when rules change |
| `SESSION_MEMORY.md` (this) | Session-by-session progress, in-flight phases, resume runbook | After every meaningful state change |
| `BRAND_GUIDE.md` | Canonical brand + style doc (web ↔ mobile parity contract) | When tokens, copy, motion vocab change |
| `README.md` | Public-facing overview | Rare |
| `docs/` | All other docs — see `docs/README.md` for the full index | — |
| `docs/design/*` | Design briefs (DESIGN_SYSTEM, REDESIGN_BRIEF, LAYOUT_REDESIGN_BRIEF, etc.) — conceptual references; BRAND_GUIDE.md wins on current values | Frozen post-rebrand |
| `docs/security/*` | Audits + threat model (start with COMPREHENSIVE_SECURITY_AUDIT.md) | Frozen unless reaudit |
| `docs/architecture/*` | Per-integration specs (e.g., PLAID_INTEGRATION_SPEC.md) | Frozen post-merge |
| `docs/operations/*` | DEPLOYMENT_RUNBOOK.md, BACKLOG.md | BACKLOG updates monthly |
| `docs/internal/*` | PROMPT.md and other agent-workflow scaffolding | Rare |
| `apps/api/.env` | Local-only secrets (gitignored) — DATABASE_URL, JWT keys, Plaid creds, ENCRYPTION_KEY | Edit when secrets rotate |
| `~/.claude/projects/-Users-ashiks-Desktop-myai/memory/` | Auto-memory: user prefs + project context for cross-session Claude continuity | Update when learning new prefs |

### Update protocol (ENFORCE THIS — keeps resume working)
**After every meaningful state change** (phase done, bug fixed, decision made, item shipped), edit `SESSION_MEMORY.md`:
1. Update **🔄 Current State** block at the top — phase status, branch, in-flight notes
2. Add an entry to **Decisions Log** (with absolute date, not "today")
3. Append to the latest **Session History** entry, or start a new one with header `### Session N — YYYY-MM-DD — <topic>`
4. Move items between **Open Items** as they're resolved or new ones surface
5. If background agents are spawned: add them to the **🟡 Active background agents** table with their ID
6. If a phase completes: update the **Phase status** line and the **Already done — do NOT redo** table

### Committing
```bash
git add SESSION_MEMORY.md
git commit -m "chore: update session memory"
```
Don't push standalone — it'll go up with the next feature push. Only push immediately if main has been updated and the next session needs the latest.

### If context is lost mid-session
Say: "Read SESSION_MEMORY.md and resume from where we left off"
