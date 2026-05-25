# BillBee

An AI-powered life administration assistant that helps you manage tasks, appointments, finances, and daily logistics through natural language conversations. Built as a full-stack monorepo with a Next.js web app, Express API, React Native mobile app, and shared AI/UI packages.

---

## Architecture

```
life-admin-ai/
|
|-- apps/
|   |-- web/          Next.js 14 (App Router) -- dashboard, chat, settings
|   |-- api/          Express + Prisma + PostgreSQL -- REST API, auth, jobs
|   |-- mobile/       React Native (Expo) -- iOS/Android companion app
|
|-- packages/
|   |-- ai/           Anthropic Claude SDK, prompt templates, tool definitions
|   |-- shared/       TypeScript types, validators (Zod), constants
|   |-- ui/           Shared React components (web + mobile via RNW)
|   |-- config/       ESLint, Tailwind, and TypeScript base configs
|
|-- .github/
|   |-- workflows/    CI, deploy-web, deploy-api
|   |-- pull_request_template.md
|
|-- docker-compose.yml   PostgreSQL + Redis for local dev
|-- turbo.json           Turborepo pipeline configuration
|-- package.json         Workspace root
```

---

## Prerequisites

| Tool               | Version | Notes                              |
| ------------------- | ------- | ---------------------------------- |
| Node.js             | >= 20   | LTS recommended                    |
| npm                 | >= 10   | Ships with Node 20                 |
| PostgreSQL          | >= 15   | Or use Docker Compose              |
| Redis               | >= 7    | Optional -- used for caching/jobs  |
| Anthropic API key   | --      | Required for AI features           |

---

## Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/your-org/life-admin-ai.git
cd life-admin-ai

# 2. Install dependencies
npm install

# 3. Start infrastructure (PostgreSQL + Redis)
docker compose up -d

# 4. Set up environment variables
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
# Edit both .env files with your database URL, Anthropic key, etc.

# 5. Generate Prisma client and run migrations
npx prisma generate --schema=apps/api/prisma/schema.prisma
npx prisma migrate dev --schema=apps/api/prisma/schema.prisma

# 6. Seed the database (optional)
npx prisma db seed --schema=apps/api/prisma/schema.prisma

# 7. Start development servers (see below)
```

---

## Running the Apps

### Web (Next.js)

```bash
cd apps/web && ./node_modules/.bin/next dev -p 3000
```

Open [http://localhost:3000](http://localhost:3000).

### API (Express)

```bash
cd apps/api && npx tsx watch src/index.ts
```

API available at [http://localhost:4000](http://localhost:4000).

### Mobile (React Native / Expo)

The mobile app uses a **development client** (not Expo Go) for native module support.

```bash
# Build the development client (first time only)
cd apps/mobile
npx eas build --profile development --platform ios
# or
npx eas build --profile development --platform android

# Install the dev client on your device/simulator, then:
npx expo start --dev-client
```

---

## Running Tests

```bash
# Unit tests (AI package)
npx vitest run --config packages/ai/vitest.config.ts

# Unit tests (API)
npx vitest run --config apps/api/vitest.config.ts

# All unit tests
npx vitest run

# E2E tests (requires web app running on port 3001)
cd apps/web && npx playwright test

# Type checking
npx tsc --noEmit -p packages/shared/tsconfig.json
npx tsc --noEmit -p packages/ai/tsconfig.json
npx tsc --noEmit -p apps/api/tsconfig.json
```

---

## Environment Variables

### apps/api/.env

| Variable              | Description                          | Example                                      |
| --------------------- | ------------------------------------ | -------------------------------------------- |
| `DATABASE_URL`        | PostgreSQL connection string         | `postgresql://user:pass@localhost:5432/myai`  |
| `REDIS_URL`           | Redis connection string              | `redis://localhost:6379`                      |
| `ANTHROPIC_API_KEY`   | Anthropic API key for Claude         | `sk-ant-...`                                 |
| `JWT_SECRET`          | Secret for signing JWTs              | `your-secret-here`                           |
| `PORT`                | API server port                      | `4000`                                       |
| `NODE_ENV`            | Environment                          | `development`                                |

### apps/web/.env

| Variable                    | Description                  | Example                       |
| --------------------------- | ---------------------------- | ----------------------------- |
| `NEXT_PUBLIC_API_URL`       | API base URL                 | `http://localhost:4000`       |
| `NEXTAUTH_SECRET`           | NextAuth.js secret           | `your-secret-here`            |
| `NEXTAUTH_URL`              | Canonical app URL            | `http://localhost:3000`       |

---

## Tech Stack

| Layer         | Technology                                         |
| ------------- | -------------------------------------------------- |
| Frontend      | Next.js 14, React 18, Tailwind CSS, shadcn/ui      |
| API           | Express, Prisma ORM, PostgreSQL, Redis              |
| AI            | Anthropic Claude SDK, tool-use, structured prompts  |
| Mobile        | React Native, Expo, EAS Build                       |
| Testing       | Vitest (unit), Playwright (E2E)                     |
| CI/CD         | GitHub Actions, Vercel (web), Railway (API)         |
| Monorepo      | npm workspaces, Turborepo                           |

---

## Branch Strategy

| Branch        | Purpose                                    |
| ------------- | ------------------------------------------ |
| `main`        | Production -- deploys automatically        |
| `dev`         | Integration branch -- PR target for features |
| `feature/*`   | Feature branches -- branch from `dev`      |
| `fix/*`       | Bug fix branches -- branch from `dev`      |
| `hotfix/*`    | Urgent fixes -- branch from `main`         |

All PRs require passing CI checks before merge.

---

## Roadmap

### V2

- Google Calendar and Gmail integration
- Recurring task automation
- Voice input (Whisper) for mobile
- Multi-user households with shared tasks
- Push notifications (Expo + FCM/APNs)
- Budget tracking with bank feed sync

### V3

- Proactive AI suggestions ("You have a dentist appointment tomorrow -- want me to set a reminder?")
- Habit tracking and streaks
- Document scanning and OCR for receipts/bills
- Third-party integrations (Slack, Notion, Todoist)
- On-device AI for offline mobile support
- Admin dashboard for analytics

---

## License

MIT
