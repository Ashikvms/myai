# SESSION_MEMORY.md — Life Admin AI

> **THIS FILE IS THE SESSION RESUME PROTOCOL.** CLAUDE.md Step 0 instructs every Claude session to read this file first. Update it after every meaningful state change so a fresh Claude (or even a different person) can pick up exactly where we left off — even if all session tokens were used mid-task.

---

## 🔄 Current State (read this first, every session)
- **Session:** 3 (resumed after session-limit reset on 2026-05-10)
- **Active item:** Item 27 — Black/Yellow Redesign
- **Phase status:**
  - Phase 0 ✅ (Strategist) — `REDESIGN_BRIEF.md` saved
  - Phase 1 ✅ (UI Designer) — `DESIGN_SYSTEM.md` saved + 14 packages/ui components migrated
  - Phase 2 partial ✅ — bee mascot (5 poses) and web `<AskAi>` component built
  - Phase 3a ✅ DONE (Frontend continuation, 13 web pages restyled, 5-item nav, /assistant deleted, theme bugs fixed, ThemeProvider consolidated, web typecheck + build clean — 15 routes incl. /money + /vault hubs)
  - Phase 3b ✅ DONE (Mobile continuation, 14 screens, 5 tabs, 11+ AI touchpoints, all 5 bee poses, typecheck clean)
  - Phase 4 ✅ DONE (QA — REDESIGN_QA_REPORT.md, 0H/1M/2L/4I findings, GO recommendation; F1 copy-parity fix + F2 132/132 API test verification both done before commit)
  - **Phase 5 🟡 IN-FLIGHT** (commit + push + open PR — see top of this file for branch info)
- **Current branch:** `feat/redesign-black-yellow` (off main, NO commits yet — all work is uncommitted in working tree)
- **Item 26 (Plaid):** ✅ PR #15 MERGED to main on 2026-04-29

## 🚦 RESUME RUNBOOK (if a fresh session needs to pick this up)

### If background agents are still claimed to be in-flight when you arrive
1. Check the task notification system: any `<task-notification>` for agentIds `a703c876fec5d728b` (web) or `a69f02113e1acfcda` (mobile)? If yes, read their `<result>` to see what they completed.
2. If you don't see a notification, the agents likely died with the prior session. Verify by running:
   ```bash
   cd /Users/ashiks/Desktop/myai/laylo && git status --short | wc -l
   ```
   If the count is roughly 26 files (just packages/ui + design tokens + 2 stub components), Phase 3a/3b never finished. Re-spawn them — prompt scaffolding is in `SESSION_MEMORY.md` Session History entries below, OR just re-read `REDESIGN_BRIEF.md` §8 (Phase handoff matrix) and `DESIGN_SYSTEM.md` and write fresh prompts that note what's already done (see "Already done — do NOT redo" below).

### If Phase 3a/3b ARE done and you're picking up at Phase 4:
1. Run all three typechecks:
   ```bash
   cd /Users/ashiks/Desktop/myai/laylo/apps/api && npx tsc --noEmit
   cd /Users/ashiks/Desktop/myai/laylo/apps/web && npx tsc --noEmit && npm run build
   cd /Users/ashiks/Desktop/myai/laylo/apps/mobile && npx tsc --noEmit
   ```
2. Spawn the QA agent (Phase 4) — prompt template:
   - Read REDESIGN_BRIEF.md, DESIGN_SYSTEM.md
   - Verify: zero `viewState` matches in production pages; zero `/assistant` references; theme toggle works on every route in light AND dark; bee mascot used in empty states; AskAi/ai-bottom-sheet wired to cards; copy bank applied; nav has 5 items only
   - Produce `REDESIGN_QA_REPORT.md`
3. After QA, commit + open PR with title `feat(redesign): black-yellow theme + minimal IA + AI affordances`. Body should reference REDESIGN_BRIEF.md, DESIGN_SYSTEM.md, REDESIGN_QA_REPORT.md.

### Already done — do NOT redo
| Done | File / area |
|---|---|
| ✅ | `REDESIGN_BRIEF.md` — full Strategist audit |
| ✅ | `DESIGN_SYSTEM.md` — full design system spec |
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
| 27 | Black/yellow redesign + AI affordances| 🟡 IN PROGRESS — Phase 3 running    |

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
- **Phase 1 (Design Strategist) ✅** — `/Users/ashiks/Desktop/myai/laylo/REDESIGN_BRIEF.md` saved (3,499 words, 9 sections, 21 copy strings, 15 microinteractions, 32 files identified). Top finding: prototype `viewState` toolbar leaking to production on dashboard/bills/tasks/documents. IA proposal: collapse to 5 nav items (Dashboard/Money/Tasks/Vault/Settings).
- **Phase 2 (UI Designer) ✅** — `/Users/ashiks/Desktop/myai/laylo/DESIGN_SYSTEM.md` saved (4,875 words, 11 sections). 20 color tokens, 15 packages/ui components updated to consume CSS variables. Tailwind configs updated (web modified, mobile created). globals.css migrated. Both typechecks clean. Designer rules: use CSS variables in arbitrary form (`bg-[var(--color-accent)]`); body text never gold; only 2 radii (8px chips/16px cards).
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
| `PROMPT.md` | Reusable prompt templates for the multi-agent workflow | Rare |
| `README.md` | Public-facing overview | Rare |
| `PLAID_INTEGRATION_SPEC.md` | Item 26 architectural spec (post-merge — historical reference) | Frozen |
| `SECURITY_REVIEW_REPORT.md` | Item 26 security audit (post-merge — historical reference) | Frozen |
| `REDESIGN_BRIEF.md` | Item 27 Phase 0 output — Strategist's brief | Frozen during Item 27 |
| `DESIGN_SYSTEM.md` | Item 27 Phase 1 output — UI Designer's tokens + component spec | Frozen during Item 27 |
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
