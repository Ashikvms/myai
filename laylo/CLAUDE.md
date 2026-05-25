# CLAUDE.md — BillBee

> **Global plugin: `andrej-karpathy-skills`** is installed globally. Its general principles
> (think before coding, surgical changes, simple > clever, verify don't assume) apply by
> default to all work. The project-specific rules below **ALWAYS take precedence** when
> they conflict — especially the LOCKED infrastructure in Step 12 (NO AWS, NO Firebase,
> etc.) and the 21 absolute rules in Step 8.

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
│  🔄 SESSION RESUME — BillBee          │
├─────────────────────────────────────────────┤
│  Last completed: Item N — [name]            │
│  Next item:      Item N+1 — [name]          │
│  Open notes:     [any notes]                │
│  Progress:       ████████░░░░░░░ X/25       │
└─────────────────────────────────────────────┘
```

## Step 2: Project Identity
- **Name:** BillBee
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
11. **Infrastructure locks (11–21 below are FINAL — no alternatives):**
12. NEVER use AWS — no S3, RDS, ElastiCache, Lambda, or any AWS service
13. NEVER use Firebase — use Expo Push for notifications
14. NEVER use SendGrid or Mailgun — use Resend
15. NEVER use AWS S3 — use Cloudflare R2
16. NEVER use AWS RDS — use Railway PostgreSQL
17. NEVER use AWS ElastiCache — use Upstash Redis
18. NEVER use SendGrid or Mailgun — use Resend
19. NEVER use Firebase — use Expo Push for notifications
20. NEVER suggest paid tiers unless free tier limit is actually hit
21. ALWAYS add a GET /health endpoint to the API that returns `{ status: "ok", timestamp: Date.now() }`

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

## Step 12: Infrastructure (LOCKED)

These are final decisions. Do not suggest alternatives or ask about them.

### Web hosting: Vercel (free hobby tier)
- Auto-deploys from GitHub main branch
- Set `NEXT_PUBLIC_API_URL` env var in Vercel dashboard

### API hosting: Railway (Starter ~$5/mo)
- Deploy from `/apps/api` using the Dockerfile
- Set all API env vars in Railway dashboard

### Database: Railway PostgreSQL (~$5/mo)
- Same Railway project as the API
- `DATABASE_URL` provided automatically by Railway

### Cache + Queue: Upstash Redis (free tier)
- Used for BullMQ jobs and rate limiting
- `REDIS_URL` from Upstash dashboard

### File storage: Cloudflare R2 (free tier)
- Bucket name: `lifeadmin-documents`
- Presigned URL upload flow (client uploads directly)
- Variables: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`

### AI: Anthropic API (pay as you go)
- Model: `claude-3-5-sonnet-20241022`
- $20/mo spend cap set in Anthropic console
- Variables: `ANTHROPIC_API_KEY`, `CLAUDE_MODEL`

### Auth: Custom JWT RS256 + Google OAuth
- Google Cloud Console OAuth 2.0 credentials
- Variables: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `JWT_PRIVATE_KEY`, `JWT_PUBLIC_KEY`

### Email: Resend (free tier — 3,000 emails/mo)
- Domain verified via Cloudflare DNS
- Variable: `RESEND_API_KEY`

### Push notifications: Expo Push Notification Service (free)
- No Firebase or APNs setup required
- Variable: `EXPO_ACCESS_TOKEN`

### Mobile builds: EAS Build (free tier — 30 builds/mo)
- Internal distribution (no App Store needed yet)
- `eas build --profile development` for local testing
- `eas build --profile preview` for sharing

### Domain: Cloudflare Registrar (~$10/yr)
- `yourdomain.com` → CNAME to Vercel (web)
- `api.yourdomain.com` → CNAME to Railway (API)

### Error tracking: Sentry (free tier)
- Three projects: web, api, mobile
- Variable: `SENTRY_DSN`

### Uptime: BetterUptime (free tier)
- Monitor: `https://api.yourdomain.com/health`
- Alert via email if API goes down

## Step 13: Deployment Checklist

Before writing any deployment config, verify:
1. Dockerfile exists in `/apps/api` (multi-stage build)
2. `.env.example` is complete and committed
3. All secrets are in environment variables — nothing hardcoded
4. Database migrations run via: `npx prisma migrate deploy`
5. Seed data runs via: `npx prisma db seed`

### Vercel deployment (web)
- `vercel.json` in `/apps/web` if custom config needed
- Set `NEXT_PUBLIC_API_URL` in Vercel dashboard
- Connect GitHub repo — auto-deploys on push to main

### Railway deployment (API)
- Dockerfile in `/apps/api`
- `railway.json` or nixpacks config if needed
- All env vars added in Railway dashboard before first deploy
- Health check endpoint: `GET /health` → returns `{ status: "ok" }`

### Cloudflare R2 (storage)
- Use `@aws-sdk/client-s3` with custom endpoint for R2
- Presigned URL generation in `/apps/api/src/services/storage.ts`
- Never proxy file uploads through the API — client uploads direct

### Upstash Redis (queue)
- Use ioredis with `REDIS_URL` from Upstash
- BullMQ workers run inside the Railway API container

### EAS Mobile builds
- `eas.json` already configured with development + preview profiles
- `eas build --profile development --platform all` (first time)
- `eas update` for JS-only changes (no rebuild needed)
