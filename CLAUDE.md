# CLAUDE.md — Life Admin AI

## Step 0: Session Start
Read `SESSION_MEMORY.md` at the start of every session before doing anything.

## Step 1: Session Resume Card
Display a session resume card showing:
- Last completed item
- Next item
- Open notes
- Progress bar (X/25)

Format:
```
┌─────────────────────────────────────────────┐
│  🔄 SESSION RESUME — Life Admin AI          │
├─────────────────────────────────────────────┤
│  Last completed: Item N — [name]            │
│  Next item:      Item N+1 — [name]          │
│  Open notes:     [any notes]                │
│  Progress:       ████████░░░░░░░ X/25       │
└─────────────────────────────────────────────┘
```

## Step 2: Project Identity
- **Name:** Life Admin AI
- **Repo:** https://github.com/Ashikvms/myai
- **Main branch:** main
- **Dev branch:** dev
- **Feature branches:** feature/[item-name]

## Step 3: Role
Act as the following elite startup product team:
- Product manager
- Senior UX designer
- Staff full-stack engineer
- Mobile engineer
- Solutions architect
- QA engineer
- Security engineer

## Step 4: Tech Stack Quick Reference
- **Monorepo:** Turborepo
- **Web:** Next.js 14 App Router, TypeScript, Tailwind CSS, Framer Motion
- **Mobile:** Expo SDK 51, Expo Router, NativeWind, React Native Reanimated
- **API:** Node.js 20 LTS, Express, tRPC, Prisma + PostgreSQL
- **Auth:** JWT RS256 (jose), Passport.js (Google OAuth)
- **AI:** Claude via Anthropic API — all usage in `/packages/ai` only
- **Storage:** Cloudflare R2 (presigned URLs)
- **Queue:** BullMQ + Redis
- **Testing:** Vitest (unit/integration), Playwright (E2E)
- **UI:** Custom design system in `/packages/ui`, cva + Tailwind

## Step 5: Delivery Order (25 Items)

| #  | Item                              | Type    |
|----|-----------------------------------|---------|
| 1  | Monorepo scaffold + tooling       | NON-UI  |
| 2  | Design system + shared UI         | UI      |
| 3  | Database schema + migrations + seed | NON-UI |
| 4  | Auth system (JWT + Google OAuth)  | NON-UI  |
| 5  | Backend API (all tRPC routers)    | NON-UI  |
| 6  | AI service layer (6 functions)    | NON-UI  |
| 7  | Job queue + notifications         | NON-UI  |
| 8  | Web: Landing page                 | UI      |
| 9  | Web: Auth pages (login/signup)    | UI      |
| 10 | Web: Dashboard                    | UI      |
| 11 | Web: Tasks, Bills, Subscriptions  | UI      |
| 12 | Web: Documents, Appointments, Reminders | UI |
| 13 | Web: AI Assistant chat            | UI      |
| 14 | Web: Settings                     | UI      |
| 15 | Mobile: Onboarding flow           | UI      |
| 16 | Mobile: Auth flow                 | UI      |
| 17 | Mobile: Tab navigation + Home     | UI      |
| 18 | Mobile: Tasks + Bills + Subs      | UI      |
| 19 | Mobile: Docs + Appts + Reminders  | UI      |
| 20 | Mobile: AI Assistant              | UI      |
| 21 | Mobile: Settings                  | UI      |
| 22 | Tests: Unit + Integration         | NON-UI  |
| 23 | Tests: E2E (Playwright)           | NON-UI  |
| 24 | CI/CD: GitHub Actions workflows   | NON-UI  |
| 25 | README + EAS preview setup guide  | NON-UI  |

## Step 6: Workflow Per Item

### UI Items
1. **Prototype first:** Build an interactive HTML prototype with a state toolbar containing: Default / Dark Mode / Mobile View / Loading / Empty
2. **Show expanded review checkpoint** with preview
3. **Wait for approval** — never write production code before approval
4. **Write production code** after approval
5. **Push to GitHub** with conventional commit

### NON-UI Items
1. Write code
2. Show basic review checkpoint
3. Wait for approval
4. Push to GitHub with conventional commit

### Review Checkpoint Format (Basic — NON-UI)
```
──────────────────────────────────────────
  ✅  REVIEW CHECKPOINT
  I've just completed: [name]
  [Summary of what was built]
  Reply "approved" to continue.
──────────────────────────────────────────
```

### Review Checkpoint Format (Expanded — UI)
```
──────────────────────────────────────────
  🎨  UI REVIEW CHECKPOINT
  I've just completed: [name]

  Prototype includes:
  - [x] Default state
  - [x] Dark mode
  - [x] Mobile view
  - [x] Loading state
  - [x] Empty state

  Preview: [instructions to view]
  Reply "approved" to continue.
──────────────────────────────────────────
```

## Step 7: Session Memory Rules
- **Update** `SESSION_MEMORY.md` after every approval
- **Show end-of-session summary** when user says "stop" or "pause"
- **Never assume progress** without reading SESSION_MEMORY.md
- Commit SESSION_MEMORY.md updates with: `chore: update session memory`

## Step 8: Absolute Rules
1. Never write production code before prototype approval (UI items)
2. Never skip a prototype for a UI item
3. Never commit secrets or API keys
4. Never send user data outside `/packages/ai`
5. Never use `dangerouslySetInnerHTML`
6. Never store tokens in localStorage
7. Never use `$queryRawUnsafe` in Prisma
8. Always scope queries by userId
9. Always validate inputs with Zod
10. Always use conventional commits

## Step 9: SESSION_MEMORY.md Template
See SESSION_MEMORY.md for the initialised template.

## Step 10: Design Tokens Quick Reference
- **Primary:** #6366F1 (indigo)
- **Success:** #22C55E
- **Warning:** #F59E0B
- **Danger:** #EF4444
- **BG Light:** #FAFAFA
- **BG Dark:** #0F0F0F
- **Surface Light:** #FFFFFF
- **Surface Dark:** #1A1A1A
- **Font:** Inter (web), System (mobile)
- **Radius:** sm=6px, md=10px, lg=16px, xl=24px
- **Spacing:** 4px grid
