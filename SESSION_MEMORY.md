# SESSION_MEMORY.md — Life Admin AI

## Current State
- **Session number:** 1
- **Last session ended:** 2026-03-15
- **Last completed:** Item 10 — Web: Dashboard
- **Last approved:** Item 10 — Web: Dashboard
- **Next item:** Item 11 — Web: Tasks, Bills, Subscriptions
- **Current branch:** main

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
| 11 | Web: Tasks, Bills, Subscriptions      | 🔨 IN PROGRESS                     |
| 12 | Web: Documents, Appointments, Reminders | ⬜ NOT STARTED                    |
| 13 | Web: AI Assistant chat                | ⬜ NOT STARTED                      |
| 14 | Web: Settings                         | ⬜ NOT STARTED                      |
| 15 | Mobile: Onboarding flow               | ⬜ NOT STARTED                      |
| 16 | Mobile: Auth flow                     | ⬜ NOT STARTED                      |
| 17 | Mobile: Tab navigation + Home         | ⬜ NOT STARTED                      |
| 18 | Mobile: Tasks + Bills + Subs          | ⬜ NOT STARTED                      |
| 19 | Mobile: Docs + Appts + Reminders      | ⬜ NOT STARTED                      |
| 20 | Mobile: AI Assistant                  | ⬜ NOT STARTED                      |
| 21 | Mobile: Settings                      | ⬜ NOT STARTED                      |
| 22 | Tests: Unit + Integration             | ⬜ NOT STARTED                      |
| 23 | Tests: E2E (Playwright)               | ⬜ NOT STARTED                      |
| 24 | CI/CD: GitHub Actions workflows       | ⬜ NOT STARTED                      |
| 25 | README + EAS preview setup guide      | ⬜ NOT STARTED                      |

## Progress Summary
```
████████████████████░░░░░░░░░░░░░░░░░░░░ 10/25 (40%)
```

## Decisions Log
- [Session 1 — 2026-03-15] DECISION: Used Express + REST routes instead of tRPC for API (simpler initial setup; tRPC can be layered on later)
- [Session 1 — 2026-03-15] DECISION: Used raw fetch for Resend email API instead of adding resend package
- [Session 1 — 2026-03-15] DECISION: IORedis type mismatch with BullMQ fixed via `as unknown as ConnectionOptions` cast
- [Session 1 — 2026-03-15] DECISION: Next.js dev script uses `./node_modules/.bin/next` to fix monorepo binary resolution
- [Session 1 — 2026-03-15] DECISION: React hoisted to root package.json with overrides to prevent duplicate React in monorepo
- [Session 1 — 2026-03-15] NOTE: expo-dev-client added to mobile app for development builds (no Expo Go)

## Open Items
- Mobile dev build needs `expo-dev-client` — installed but not tested
- Next.js SWC lockfile patching warning is cosmetic — does not affect builds
- Dev server must be started via `./node_modules/.bin/next dev -p 3000` from apps/web dir

## Session History

### Session 1 — 2026-03-15
- **Completed:** Items 1–8 (monorepo, design system, DB schema, auth, API, AI, jobs, landing page)
- **Approved:** Items 1–9 (auth pages approved, code written)
- **Pushed:** PRs #1–#8 merged to main
- **Ended at:** Item 9 approved, code written, not yet pushed. User requested CLAUDE.md/SESSION_MEMORY.md/PROMPT.md setup.
- Items 9-10 pushed after CLAUDE.md setup. Dashboard iterated: mobile layout improved — all sections now full-width card-based instead of cramped 2-column grid.

## How To Use

### Resuming a session
Say: "Let's continue" or "Resume" — Claude will read this file and show the resume card.

### Committing this file
After each session:
```bash
git add SESSION_MEMORY.md
git commit -m "chore: update session memory"
git push origin main
```

### If context is lost mid-session
Say: "Read SESSION_MEMORY.md and resume from where we left off"
