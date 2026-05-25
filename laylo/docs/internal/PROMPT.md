# PROMPT.md — BillBee Full Specification

---

## Role & Team Composition

Act as an elite startup product team:
- Product manager
- Senior UX designer
- Staff full-stack engineer
- Mobile engineer
- Solutions architect
- QA engineer
- Security engineer

Make strong product decisions. Optimize for correctness, security, testability, and a premium user experience.

---

## Session Memory Protocol

1. Read `SESSION_MEMORY.md` at the start of every session
2. Display a session resume card with progress
3. Update `SESSION_MEMORY.md` after every approval
4. Show end-of-session summary when user says "stop" or "pause"
5. Never assume progress without reading the file

---

## Iterative Review Protocol

After completing any section, show a review checkpoint:

### Basic Checkpoint (NON-UI items)
```
──────────────────────────────────────────
  ✅  REVIEW CHECKPOINT
  I've just completed: [name]
  [Summary of what was built]
  Reply "approved" to continue.
──────────────────────────────────────────
```

### Expanded Checkpoint (UI items)
```
──────────────────────────────────────────
  🎨  UI REVIEW CHECKPOINT
  I've just completed: [name]

  State Toolbar:
  [Default] [Dark Mode] [Mobile View] [Loading] [Empty]

  Prototype Fidelity:
  - Uses actual design tokens (#6366F1, Inter, 4px grid)
  - Mobile view rendered in iPhone frame (375×812)
  - All interactive elements functional
  - Animations represented

  Reply "approved" to write production code.
──────────────────────────────────────────
```

### UI Preview Protocol
For UI items, build an interactive HTML prototype FIRST:
- Include a state toolbar: Default / Dark Mode / Mobile View / Loading / Empty
- Use actual design tokens (colors, fonts, spacing, radius)
- Mobile view in iPhone frame (375×812)
- Interactive elements must be functional (clicks, toggles, inputs)
- Animations represented with CSS transitions
- Iterate until approved, then write production code

---

## GitHub Integration

### Branch Strategy
- `main` — stable, approved code only
- `dev` — active development branch
- `feature/*` — one branch per delivery item

### Workflow per approved item
```bash
git checkout -b feature/[item-name]
git add .
git commit -m "feat([section]): [what was built]"
git push origin feature/[item-name]
# Create PR: feature/* → dev (or main)
# Merge after approval
```

### .gitignore
```
node_modules, .env, .env.local, dist, .next, .expo,
*.log, coverage, .turbo, prisma/migrations
```

---

## Local App Preview

### Web
```bash
cd apps/web && npm run dev
# → http://localhost:3000
```

### Mobile (WITHOUT Expo Go — use EAS Development Builds)
```bash
# Step 1: Install EAS CLI
npm install -g eas-cli && eas login

# Step 2: Build development client (once)
eas build --profile development --platform ios
eas build --profile development --platform android

# Step 3: Run dev server
npx expo start --dev-client

# iOS Simulator: press 'i'
# Android Emulator: press 'a'
```

### EAS Config (apps/mobile/eas.json)
```json
{
  "cli": { "version": ">= 5.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": { "simulator": true },
      "android": { "buildType": "apk" }
    },
    "preview": { "distribution": "internal" }
  }
}
```

---

## Section 1: Monorepo Structure

Turborepo layout:
```
/apps
  /web        → Next.js 14 App Router, TypeScript
  /mobile     → React Native, Expo SDK 51, TypeScript
  /api        → Node.js, Express, TypeScript

/packages
  /shared     → TypeScript types, Zod schemas, constants, utils
  /ui         → Shared React component primitives (web)
  /ai         → Claude AI service layer
  /config     → Shared eslint, tsconfig, prettier, design tokens

Root: turbo.json, package.json (workspaces), .env.example,
      .gitignore, README.md, docker-compose.yml
```

---

## Section 2: Tech Stack

### Frontend Web (/apps/web)
Next.js 14 App Router, TypeScript, Tailwind CSS, Framer Motion,
React Hook Form + Zod, next-themes, date-fns, Lucide React

### Frontend Mobile (/apps/mobile)
Expo SDK 51, Expo Router, NativeWind, Expo Notifications,
Expo DocumentPicker, React Native Reanimated, Expo SecureStore

### Backend (/apps/api)
Node.js 20 LTS, Express, Prisma + PostgreSQL, Zod,
BullMQ + Redis, Winston, Helmet, cors, express-rate-limit,
jose (JWT RS256), Passport.js (Google OAuth), bcryptjs

### Infrastructure (LOCKED — do not change)
| Service | Provider | Tier |
|---------|----------|------|
| Web hosting | Vercel | Free hobby |
| API hosting | Railway | Starter ~$5/mo |
| Database | Railway PostgreSQL | ~$5/mo |
| Cache + Queue | Upstash Redis | Free |
| File storage | Cloudflare R2 | Free |
| AI | Anthropic API | Pay-as-you-go ($20/mo cap) |
| Auth | Custom JWT RS256 + Google OAuth | — |
| Email | Resend | Free (3,000/mo) |
| Push | Expo Push Notification Service | Free |
| Mobile builds | EAS Build | Free (30 builds/mo) |
| Domain | Cloudflare Registrar | ~$10/yr |
| Error tracking | Sentry | Free |
| Uptime | BetterUptime | Free |

---

## Section 3: Testing & QA Strategy

### Test Runner
- Vitest for unit + integration tests
- Playwright for E2E (web)
- React Native Testing Library for mobile

### Unit Tests — /packages/ai
Cover every AI function:
- Happy path with mocked Anthropic SDK
- API error (500), malformed JSON, Zod validation failure
- Rate limit (429), timeout (>30s)
- Empty/null user context
- Prompt construction correctness (snapshot tests)

### Integration Tests — /apps/api
Cover every router:
- **Auth:** register, login, token refresh, Google OAuth, logout, unauthorized access
- **Data routers:** CRUD success, validation failures, auth scoping (User A cannot access User B's data — test explicitly), soft delete, pagination
- **AI router:** plan enforcement, rate limiting, streaming
- **Jobs:** idempotency, schedule correctness, failure handling

### E2E Tests — Playwright
8 critical paths:
1. Signup → onboarding → dashboard
2. Add bill → appears on dashboard
3. Upload document → AI summary → confirm dates
4. AI chat: ask about bills → references real data
5. AI chat: create reminder → confirm → reminder created
6. Settings: toggle dark mode → persists on reload
7. Access /dashboard without auth → redirect to login
8. API call for another user's task → 403

### QA Checklist (PR template)
- [ ] All tests pass
- [ ] TypeScript compiles (tsc --noEmit)
- [ ] ESLint passes
- [ ] No console.log in production code
- [ ] No hardcoded secrets
- [ ] Empty/loading states verified
- [ ] Dark mode verified
- [ ] Mobile layout verified
- [ ] API errors follow standard envelope
- [ ] New routes are auth-protected
- [ ] Accessibility: keyboard nav + ARIA

---

## Section 4: Security

### Authentication
- JWT RS256: 15min access token, 30-day refresh token
- Refresh token rotation, stored hashed (bcrypt 10 rounds) in DB
- Web: access token in memory, refresh token in HttpOnly/Secure/SameSite=Strict cookie
- Mobile: access token in memory, refresh token in Expo SecureStore
- Account lockout: 5 failed attempts → 15min lockout via Redis
- Password: min 8 chars, 1 uppercase, 1 number (Zod enforced)
- Passwords hashed with bcrypt (12 rounds)

### API Security
Middleware stack (in order):
1. helmet() — secure HTTP headers
2. cors({ origin: ALLOWED }) — whitelist origins
3. express-rate-limit — 100 req/15min globally
4. auth rate limit — 10 req/15min on /auth/*
5. requireAuth — verify JWT, attach user context
6. Zod input validation

### Prisma Row-Level Scoping
Prisma middleware injects `{ userId: ctx.user.id }` into every query.
Integration tests explicitly verify cross-user data isolation.

### File Upload Security
- Validate MIME type via magic bytes (file-type library)
- Max 20MB
- Presigned URLs for R2 (API never receives file content)
- 15-minute TTL on download URLs
- Accepted: PDF, JPEG, PNG, HEIC, DOCX

### Frontend Security
- CSP in next.config.js headers
- No dangerouslySetInnerHTML
- AI content rendered as plain text
- No PII in URL query strings
- TanStack Query cache cleared on logout

### AI Security
- User data scoped to authenticated user only
- No raw file content sent to Claude (parsed server-side)
- Prompt injection: user text in `<user_input>` XML tags
- Claude responses validated with Zod before returning
- All AI actions require explicit user confirmation
- Log AI call intent + token count, never prompt content

---

## Section 5: AI Service Layer (/packages/ai)

All Anthropic SDK usage lives exclusively in /packages/ai.

### Config
- `CLAUDE_MODEL` constant (never referenced elsewhere)
- Prompts in `/packages/ai/prompts/` as versioned templates
- Each exports: system prompt, message builder, output Zod schema

### Functions

| Function | I/O | Mode |
|----------|-----|------|
| summarizeDocument | documentText, category → summary, keyPoints | Non-streaming, JSON |
| extractDatesFromDocument | documentText → dates[] with confidence | Non-streaming, JSON |
| answerLifeAdminQuestion | question, userContext → token stream | Streaming (SSE) |
| suggestTasksAndReminders | userContext → suggestions[] | Non-streaming, JSON |
| convertNaturalLanguageToStructuredAction | text, userContext → action, payload, confidence | Non-streaming, JSON (reject <0.7) |
| generateDashboardInsights | userContext → insights[] | Non-streaming, JSON |

### Rules
- Max 2 retries, exponential backoff
- 30-second timeout
- Structured JSON required, Zod-validated
- Per-user rate limits via Redis
- Token budgets per function

---

## Section 6: Database Schema

Prisma with PostgreSQL. All IDs: cuid2. All timestamps: UTC.
Soft deletes on: Task, Bill, Subscription, Document.

### Models
User, RefreshToken, Task, Bill, Subscription, Document,
Appointment, Reminder, AiConversation, AiMessage, NotificationPreference

### Indexes
userId (all user-owned tables), nextDueDate, dateTime, expirationDate, tokenHash, status

---

## Section 7: Notifications & Jobs

### Queue: BullMQ + Redis

| Job | Schedule |
|-----|----------|
| checkDueBills | daily 8am UTC |
| checkExpiringDocs | daily 8am UTC |
| checkDueReminders | every 15 minutes |
| generateDailyInsights | daily 7am UTC |

- **Email:** Resend + HTML templates
- **Push:** Expo Push Notification Service
- Push tokens stored in NotificationPreference, invalidated after 3 failures

---

## Section 8: Environment Variables

All vars in `.env.example`, annotated, grouped:
- App (NODE_ENV, APP_URL, API_URL)
- Database (DATABASE_URL)
- Auth (JWT_PRIVATE_KEY, JWT_PUBLIC_KEY, Google OAuth)
- Redis (REDIS_URL)
- Storage (R2 config)
- AI (ANTHROPIC_API_KEY, CLAUDE_MODEL)
- Notifications (RESEND_API_KEY, EXPO_ACCESS_TOKEN)
- Observability (SENTRY_DSN)
- Security (ALLOWED_ORIGINS, rate limit config)

Runtime validation via Zod at startup — app refuses to start if misconfigured.

---

## Section 9: CI/CD & Deployment

### GitHub Actions
- **ci.yml** (on PR): lint, typecheck, tests, npm audit, secrets scan
- **deploy-api.yml** (merge to main): Docker build → Railway
- **deploy-web.yml** (merge to main): Vercel CLI
- **deploy-mobile.yml** (manual): EAS Build + Submit

### Targets
Web: Vercel | API: Railway | DB: Railway PostgreSQL | Redis: Upstash | Storage: R2 | Mobile: EAS

---

## Section 10: Seed Data

Demo user: demo@lifeadmin.app / Demo1234!
Idempotent (upsert). Dates relative to seed execution.

- Bills: Rent $1,850/mo, Internet $79.99/mo, Electric $120/mo
- Subscriptions: Netflix $15.49, Spotify $10.99, Gym $49, iCloud $2.99
- Documents: Passport (14mo), Car insurance (2mo), Lease (8mo)
- Appointments: Dentist (3wk), Car service (6wk)
- Reminders: Vehicle registration (60d), Gym renewal (30d)
- Tasks: File taxes, Call landlord, Compare car insurance
- AI Conversation: 3 seeded messages

---

## Section 11: Design System

### Colors
| Token | Light | Dark |
|-------|-------|------|
| Background | #FAFAFA | #0F0F0F |
| Surface | #FFFFFF | #1A1A1A |
| Primary | #6366F1 | #6366F1 |
| Success | #22C55E | #22C55E |
| Warning | #F59E0B | #F59E0B |
| Danger | #EF4444 | #EF4444 |

### Typography
Inter (web), system font (mobile). Scale: 12–40px.

### Spacing
4px grid.

### Radius
sm=6px, md=10px, lg=16px, xl=24px.

### Shared Components (in /packages/ui)
Button, Card, Input, Select, Badge, Avatar, Modal, EmptyState,
LoadingSpinner, SkeletonLoader, Toast, Toggle, Textarea, DatePicker,
UpgradePrompt — all with dark mode, keyboard nav, ARIA, loading state.

---

## Section 12: Monetization Scaffolding

- User.plan enum: FREE | PREMIUM
- `usePlan()` hook → `canUseFeature(feature: PlanFeature): boolean`
- PlanFeature enum with all premium gates
- Middleware on AI router enforcing plan + rate limit
- `<UpgradePrompt />` component for locked features
- Placeholder /settings/billing page

---

## Section 13: README

Must include:
- Project overview + architecture diagram (ASCII)
- Prerequisites (Node 20, PostgreSQL, Redis, R2, EAS CLI)
- Local setup: clone → install → env → db → seed → run
- How to run web, API, mobile (with EAS dev build steps)
- How to run tests
- GitHub flow and branch strategy
- Environment variable reference
- V2/V3 roadmap

---

## Section 14: V2 / V3 Roadmap

### V2
- Stripe payments
- Gmail email parsing
- Google Calendar sync (two-way)
- Apple Calendar sync
- OCR for scanned documents
- Biometric app lock
- Family/shared household mode
- Certificate pinning on mobile

### V3
- Plaid integration (auto-detect bills)
- Subscription detection from email
- AI contract review
- WhatsApp/SMS reminders
- Browser extension
- Multi-language support
- Apple Watch / Wear OS companion

---

## Delivery Order (25 Items)

Follow this order exactly. Checkpoint after each item.

| #  | Item                                  | Type    |
|----|---------------------------------------|---------|
| 1  | Monorepo scaffold + tooling           | NON-UI  |
| 2  | Design system + shared UI             | UI      |
| 3  | Database schema + migrations + seed   | NON-UI  |
| 4  | Auth system (JWT + Google OAuth)      | NON-UI  |
| 5  | Backend API (all tRPC routers)        | NON-UI  |
| 6  | AI service layer (6 functions)        | NON-UI  |
| 7  | Job queue + notifications             | NON-UI  |
| 8  | Web: Landing page                     | UI      |
| 9  | Web: Auth pages (login/signup)        | UI      |
| 10 | Web: Dashboard                        | UI      |
| 11 | Web: Tasks, Bills, Subscriptions      | UI      |
| 12 | Web: Documents, Appointments, Reminders | UI    |
| 13 | Web: AI Assistant chat                | UI      |
| 14 | Web: Settings                         | UI      |
| 15 | Mobile: Onboarding flow               | UI      |
| 16 | Mobile: Auth flow                     | UI      |
| 17 | Mobile: Tab navigation + Home         | UI      |
| 18 | Mobile: Tasks + Bills + Subs          | UI      |
| 19 | Mobile: Docs + Appts + Reminders      | UI      |
| 20 | Mobile: AI Assistant                  | UI      |
| 21 | Mobile: Settings                      | UI      |
| 22 | Tests: Unit + Integration             | NON-UI  |
| 23 | Tests: E2E (Playwright)               | NON-UI  |
| 24 | CI/CD: GitHub Actions workflows       | NON-UI  |
| 25 | README + EAS preview setup guide      | NON-UI  |

### Workflow
- **UI items:** Build HTML prototype with state toolbar → show expanded checkpoint → wait for approval → write production code → push
- **NON-UI items:** Write code → show basic checkpoint → wait for approval → push
