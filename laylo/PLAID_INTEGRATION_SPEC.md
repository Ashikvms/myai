# PLAID_INTEGRATION_SPEC.md (Item 26)

## 1. Executive Summary

We are adding read-only Plaid bank-account integration to Laylo so users can link checking, savings, credit-card, and loan accounts and have transactions, balances, and (eventually) auto-detected bills synced into the existing data model. The goal is to enrich the dashboard, the Bills/Subscriptions modules, and the AI assistant with real spending data without taking on payment-initiation liability. Scope **in**: Plaid Link (web + mobile), Items + Accounts + Transactions sync (`/transactions/sync` cursor pattern), webhook ingestion, daily balance refresh, AES-256-GCM encryption of access tokens, audit logging, and UI for `/settings/banks` + `/transactions`. Scope **out**: payment initiation, Plaid Transfer, Income, Investments, Identity, Liabilities, manual CSV upload, multi-currency reporting (we store ISO currency but display USD only initially). Environment: Plaid **Sandbox** only until full security review passes.

## 2. Data Flow

### Link & exchange (initial connect)

```
User                Web / Mobile             API (Express)              Plaid API                  DB
  |                    |                         |                          |                       |
  |  Click "Connect"   |                         |                          |                       |
  |------------------->|                         |                          |                       |
  |                    | POST /plaid/link/token/create                       |                      |
  |                    |------------------------>|                          |                       |
  |                    |                         | /link/token/create        |                      |
  |                    |                         |------------------------->|                       |
  |                    |                         |<----- link_token --------|                       |
  |                    |<--- { link_token } -----|                          |                       |
  |  Plaid Link UI     |                         |                          |                       |
  |<-- onSuccess(public_token, metadata) --------|                          |                       |
  |                    | POST /plaid/link/token/exchange                     |                      |
  |                    |------------------------>|                          |                       |
  |                    |                         | /item/public_token/exchange                      |
  |                    |                         |------------------------->|                       |
  |                    |                         |<-- access_token,item_id--|                       |
  |                    |                         | encrypt(access_token)    |                       |
  |                    |                         | INSERT PlaidItem ------->|---------------------->|
  |                    |                         | enqueue plaid-initial-sync|                      |
  |                    |<--- { item, accounts }--|                          |                       |
```

### Webhook → incremental sync

```
Plaid -- POST /api/plaid/webhook --> API
   |                                  |-- verify JWT (Plaid JWKS) --
   |                                  |-- INSERT PlaidWebhookEvent (raw) -->
   |                                  |-- enqueue plaid-incremental-sync(itemId) -->
   |                                  |-- 200 OK (within 10s) --
                                            |
                                  Worker picks up:
                                            | /transactions/sync (cursor)
                                            | upsert added/modified
                                            | delete removed
                                            | persist new cursor
                                            | INSERT BankDataAccessLog
```

### Daily balance rebalance

```
cron (0 6 * * *) -> queue plaid-rebalance for every active PlaidItem
                 -> /accounts/balance/get -> update BankAccount balances
```

## 3. Database Schema Additions

All new models go in `apps/api/prisma/schema.prisma`. Migration name: `20260428_plaid_integration`.

### New enums

```prisma
enum PlaidItemStatus { ACTIVE LOGIN_REQUIRED ERROR DISCONNECTED }
enum BankAccountType { DEPOSITORY CREDIT LOAN INVESTMENT OTHER }
enum BankAccountSubtype {
  CHECKING SAVINGS HSA CD MONEY_MARKET PAYPAL PREPAID
  CREDIT_CARD AUTO MORTGAGE STUDENT PERSONAL OTHER
}
enum PlaidWebhookStatus { PENDING PROCESSED FAILED IGNORED }
enum BankDataAccessAction { READ WRITE SYNC EXPORT DELETE LINK UNLINK }
```

### New models

```prisma
model PlaidItem {
  id                    String           @id @default(cuid())
  userId                String
  plaidItemId           String           @unique               // Plaid's item_id
  accessTokenCiphertext String           @db.Text              // base64(iv|tag|ct) — AES-256-GCM
  accessTokenKeyVersion Int              @default(1)           // for rotation
  institutionId         String                                  // Plaid institution_id
  institutionName       String           @db.VarChar(200)
  institutionLogo       String?                                  // base64 PNG (small) or URL
  status                PlaidItemStatus  @default(ACTIVE)
  errorCode             String?                                  // Plaid error_code if any
  errorMessage          String?          @db.Text
  cursor                String?          @db.Text               // /transactions/sync cursor
  consentExpiresAt      DateTime?                                // for OAuth-required institutions
  lastSyncAt            DateTime?
  lastWebhookAt         DateTime?
  deletedAt             DateTime?
  createdAt             DateTime         @default(now())
  updatedAt             DateTime         @updatedAt

  user                  User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  accounts              BankAccount[]
  webhookEvents         PlaidWebhookEvent[]

  @@index([userId])
  @@index([userId, status])
  @@index([plaidItemId])
  @@map("plaid_items")
}

model BankAccount {
  id                String              @id @default(cuid())
  userId            String                                       // denormalised for fast scoping
  plaidItemId       String
  plaidAccountId    String              @unique                  // Plaid account_id
  name              String              @db.VarChar(200)
  officialName      String?             @db.VarChar(200)
  mask              String?             @db.VarChar(8)           // last 4 digits
  type              BankAccountType
  subtype           BankAccountSubtype?
  isoCurrencyCode   String              @default("USD") @db.VarChar(3)
  currentBalance    Decimal?            @db.Decimal(14, 2)
  availableBalance  Decimal?            @db.Decimal(14, 2)
  creditLimit       Decimal?            @db.Decimal(14, 2)
  isHidden          Boolean             @default(false)          // user can hide from dashboard
  lastBalanceUpdate DateTime?
  deletedAt         DateTime?
  createdAt         DateTime            @default(now())
  updatedAt         DateTime            @updatedAt

  user              User                @relation(fields: [userId], references: [id], onDelete: Cascade)
  plaidItem         PlaidItem           @relation(fields: [plaidItemId], references: [id], onDelete: Cascade)
  transactions      Transaction[]

  @@index([userId])
  @@index([userId, deletedAt])
  @@index([plaidItemId])
  @@map("bank_accounts")
}

model Transaction {
  id                   String       @id @default(cuid())
  userId               String                                    // denormalised
  bankAccountId        String
  plaidTransactionId   String       @unique
  plaidPendingId       String?                                    // for pending->posted reconciliation
  amount               Decimal      @db.Decimal(14, 2)            // Plaid: positive = outflow
  isoCurrencyCode      String       @default("USD") @db.VarChar(3)
  date                 DateTime     @db.Date                       // posted date
  authorizedDate       DateTime?    @db.Date
  name                 String       @db.VarChar(500)
  merchantName         String?      @db.VarChar(200)
  merchantLogoUrl      String?
  category             String?      @db.VarChar(80)                // primary category (PFC)
  categoryDetailed     String?      @db.VarChar(120)               // detailed PFC
  paymentChannel       String?      @db.VarChar(40)                // online/in store/other
  pending              Boolean      @default(false)
  isoLocationCity      String?      @db.VarChar(100)
  isoLocationRegion    String?      @db.VarChar(100)
  isoLocationCountry   String?      @db.VarChar(2)
  billId               String?                                     // optional auto-match
  subscriptionId       String?                                     // optional auto-match
  matchConfidence      Decimal?     @db.Decimal(4, 3)              // 0.000 - 1.000
  userVerifiedMatch    Boolean      @default(false)
  deletedAt            DateTime?
  createdAt            DateTime     @default(now())
  updatedAt            DateTime     @updatedAt

  user                 User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  bankAccount          BankAccount  @relation(fields: [bankAccountId], references: [id], onDelete: Cascade)
  bill                 Bill?        @relation(fields: [billId], references: [id], onDelete: SetNull)
  subscription         Subscription? @relation(fields: [subscriptionId], references: [id], onDelete: SetNull)

  @@index([userId, date(sort: Desc)])
  @@index([userId, bankAccountId, date(sort: Desc)])
  @@index([userId, category])
  @@index([userId, merchantName])
  @@index([billId])
  @@index([subscriptionId])
  @@map("transactions")
}

model PlaidWebhookEvent {
  id                String              @id @default(cuid())
  plaidItemId       String?                                       // resolved if known
  webhookType       String              @db.VarChar(60)            // TRANSACTIONS, ITEM, etc
  webhookCode       String              @db.VarChar(60)            // SYNC_UPDATES_AVAILABLE, etc
  externalEventId   String?             @unique                    // Plaid request_id for dedupe
  rawPayload        Json
  status            PlaidWebhookStatus  @default(PENDING)
  processingError   String?             @db.Text
  receivedAt        DateTime            @default(now())
  processedAt       DateTime?

  plaidItem         PlaidItem?          @relation(fields: [plaidItemId], references: [id], onDelete: SetNull)

  @@index([plaidItemId])
  @@index([status, receivedAt])
  @@index([webhookType, webhookCode])
  @@map("plaid_webhook_events")
}

model BankDataAccessLog {
  id          String                @id @default(cuid())
  userId      String
  actorUserId String                                                // who initiated; equals userId for user actions, may differ for system jobs
  action      BankDataAccessAction
  resource    String                @db.VarChar(80)                  // e.g. "Transaction", "PlaidItem"
  resourceId  String?               @db.VarChar(80)
  ipAddress   String?               @db.VarChar(64)
  userAgent   String?               @db.VarChar(400)
  context     Json?                                                   // route, jobName, count, etc
  createdAt   DateTime              @default(now())

  user        User                  @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, createdAt(sort: Desc)])
  @@index([action, createdAt(sort: Desc)])
  @@map("bank_data_access_logs")
}
```

### Migrations to existing models

Add to `User`:
```prisma
plaidItems         PlaidItem[]
bankAccounts       BankAccount[]
transactions       Transaction[]
bankDataAccessLogs BankDataAccessLog[]
```

Add to `Bill`:
```prisma
detectedTransactions Transaction[]
detectedFromTxnId   String?    @db.VarChar(80)
autoDetected        Boolean    @default(false)
```

Add to `Subscription`:
```prisma
detectedTransactions Transaction[]
detectedFromTxnId   String?    @db.VarChar(80)
autoDetected        Boolean    @default(false)
```

### Encryption strategy

| Column | At rest | Notes |
|--------|---------|-------|
| `PlaidItem.accessTokenCiphertext` | **AES-256-GCM (app-level)** | Format `base64(iv ‖ authTag ‖ ciphertext)`. Key from `ENCRYPTION_KEY` env (32-byte hex). `accessTokenKeyVersion` enables rotation without downtime. |
| `BankAccount.mask` | Plaintext (last 4 only) | Plaid never returns full account numbers via Transactions; full numbers (Auth) are out of scope. |
| All other PII | Plaintext | Standard Postgres at-rest encryption (Railway) is acceptable for non-token fields. |

## 4. API Routes

All mounted at `/api/plaid/*`, `/api/transactions`, `/api/accounts`. All require `requireAuth` except the webhook.

### `POST /api/plaid/link/token/create`
- Auth: required
- Input: `z.object({ products: z.array(z.enum(['transactions','auth'])).optional(), redirectUri: z.string().url().optional() })`
- Response: `{ success: true, data: { linkToken: string, expiration: string } }`
- Side effects: writes `BankDataAccessLog{action: LINK}`
- Errors: 502 if Plaid down

### `POST /api/plaid/link/token/exchange`
- Auth: required
- Input: `z.object({ publicToken: z.string().min(1), institutionId: z.string(), institutionName: z.string(), accounts: z.array(z.object({ id: z.string(), name: z.string(), mask: z.string().nullable(), type: z.string(), subtype: z.string().nullable() })) })`
- Response: `{ success: true, data: { plaidItemId: string, accountsLinked: number } }`
- Side effects: encrypts and stores access_token; creates `PlaidItem` + `BankAccount[]`; enqueues `plaid-initial-sync`; writes `BankDataAccessLog{action: LINK}`
- Errors: 409 if itemId already exists for any user (Plaid duplicate-item)

### `POST /api/plaid/webhook`
- Auth: **none** — verified via Plaid JWT (`Plaid-Verification` header) against JWKS
- Body: raw JSON (Plaid signs the body)
- Response: `200` always within 10 s — actual processing is async
- Side effects: dedupe by `request_id` → `PlaidWebhookEvent` insert → enqueue corresponding job
- Errors: 401 only on signature failure
- **Important:** must read body as `express.raw({ type: 'application/json' })` BEFORE the global `express.json()` parser, OR mount before `app.use(express.json())` in `apps/api/src/index.ts`

### `GET /api/plaid/items`
- Auth: required
- Response: `{ success: true, data: PlaidItem[] }` (without ciphertext field)

### `DELETE /api/plaid/items/:id`
- Auth: required, scoped by `userId`
- Side effects: calls Plaid `/item/remove`, sets `status = DISCONNECTED` and `deletedAt` (soft delete to retain audit), cascades soft-delete `BankAccount` and `Transaction`. Writes `BankDataAccessLog{action: UNLINK}`.

### `POST /api/plaid/items/:id/sync`
- Auth: required, scoped
- Rate-limited: 1 / minute / item
- Side effects: enqueues `plaid-incremental-sync`
- Response: `{ success: true, data: { jobId: string } }`

### `GET /api/transactions`
- Auth: required
- Query: `from` (ISO date), `to`, `accountId?`, `category?`, `merchant?`, `q?`, `cursor?`, `limit?` (default 50, max 200)
- Response: paginated `{ items, nextCursor }`. Always filtered by `userId`.
- Side effects: `BankDataAccessLog{action: READ, resource: 'Transaction', context: { count }}`

### `GET /api/accounts`
- Auth: required
- Response: list of `BankAccount` (current/available balance, mask, type/subtype, institution name).

## 5. Service Layer (`apps/api/src/services/`)

### `crypto.ts`
- Exports `encryptAccessToken(plaintext, version=1): string` and `decryptAccessToken(ciphertext): string`
- Uses `node:crypto` `createCipheriv('aes-256-gcm', key, iv)` with random 12-byte IV; output `base64(iv ‖ authTag ‖ ct)`
- Key sourced from `env.ENCRYPTION_KEY` (validated as 64-char hex in `apps/api/src/config/env.ts`)
- Throws `CryptoError` on auth-tag failure (never log ciphertext or plaintext)
- Unit tests required (round-trip, tampered ciphertext, wrong key)

### `plaid.ts`
- Wraps `plaid` npm SDK (`PlaidApi`, `Configuration`)
- Exports: `createLinkToken(userId)`, `exchangePublicToken(publicToken)`, `removeItem(accessToken)`, `getAccounts(accessToken)`, `getBalances(accessToken)`, `transactionsSync(accessToken, cursor?)`, `verifyWebhook(headers, rawBody)`
- Reads `PLAID_CLIENT_ID`, `PLAID_SECRET`, `PLAID_ENV`
- All Plaid errors wrapped as `PlaidError` (no leaking of access tokens in logs)

### `transaction-sync.ts`
- `syncItem(plaidItemId)` — loads item, decrypts token, calls `transactionsSync` in a loop with `has_more`, upserts `added`/`modified`, hard-deletes `removed`, persists new `cursor` in a transaction
- Maps Plaid `personal_finance_category` → our `category`/`categoryDetailed`
- Increments retry counter and sets `PlaidItem.status = ERROR` on `ITEM_LOGIN_REQUIRED`
- Calls `auditLog.write(...)` with `action: SYNC, count: N`

### `audit-log.ts`
- `writeAccessLog(params)` — single insert into `BankDataAccessLog`
- `withAuditedRequest(req, action, resource, fn)` — convenience wrapper for routes
- Never throws (audit failure is logged but does not break the user request)

## 6. BullMQ Jobs (`apps/api/src/jobs/`)

Extend `JobType` enum in `apps/api/src/jobs/queue.ts`:

```ts
PLAID_INITIAL_SYNC = 'PLAID_INITIAL_SYNC',
PLAID_INCREMENTAL_SYNC = 'PLAID_INCREMENTAL_SYNC',
PLAID_REBALANCE = 'PLAID_REBALANCE',
```

Add handlers in `apps/api/src/jobs/handlers.ts`:

- `plaidInitialSync(plaidItemId)` — runs `transactionSync.syncItem` until `has_more=false`
- `plaidIncrementalSync(plaidItemId)` — same function, picks up where cursor left off
- `plaidRebalance()` — recurring 06:00 UTC; iterates all active items, calls `/accounts/balance/get`, updates `BankAccount.currentBalance`/`availableBalance`/`lastBalanceUpdate`

Scheduler:
```ts
await queue.upsertJobScheduler('plaid-rebalance', { pattern: '0 6 * * *' }, { name: JobType.PLAID_REBALANCE });
```

Worker concurrency: bump to 3.

## 7. Frontend Additions

### Web (`apps/web`)

Install: `react-plaid-link@^3.6.0`.

- New page `apps/web/src/app/(app)/settings/banks/page.tsx` — list connected institutions, "Connect a bank" button using `usePlaidLink({ token })`
- New page `apps/web/src/app/(app)/transactions/page.tsx` — table with date / merchant / category / amount / account filter + search
- Dashboard widget update — "Connected accounts" card and "Recent transactions" list (last 10)
- API client helpers under `apps/web/src/lib/api/plaid.ts` and `apps/web/src/lib/api/transactions.ts`

### Mobile (`apps/mobile`)

Install: `react-native-plaid-link-sdk@^11.x` (matches Expo SDK 51 RN 0.74). Requires custom dev client; SESSION_MEMORY notes `expo-dev-client` is already installed.

- New screen `apps/mobile/app/(app)/settings/banks.tsx`
- New screen `apps/mobile/app/(app)/transactions.tsx`
- Use `create` and `open` from the SDK
- Add native config in `app.json` for iOS `plaid` URL scheme + Android intent filter (Plaid OAuth re-entry)

## 8. Refactor List (existing code requiring changes)

| File | Change | Why |
|------|--------|-----|
| `apps/api/prisma/schema.prisma` | Add `plaidItems`, `bankAccounts`, `transactions`, `bankDataAccessLogs` relations on `User`; add `autoDetected`, `detectedFromTxnId`, `detectedTransactions` on `Bill` and `Subscription` | New relations |
| `apps/api/src/index.ts` | Mount Plaid webhook router with `express.raw()` BEFORE `express.json()` | Webhook signature verification needs raw body |
| `apps/api/src/index.ts` | Add `app.use('/api/plaid', plaidRouter); app.use('/api/transactions', transactionsRouter); app.use('/api/accounts', accountsRouter);` | Register new routes |
| `apps/api/src/jobs/queue.ts` | Add 3 new `JobType` values, dispatch in `processJob`, add rebalance scheduler, bump concurrency to 3 | New jobs |
| `apps/api/src/routes/dashboard.ts` | Include bank balance totals + most-recent transactions in dashboard payload | Dashboard widget |
| `apps/api/src/routes/bills.ts` | Add `?includeTransactions` query param; return matched txns; expose `autoDetected` and `detectedFromTxnId` | UI surfaces auto-match |
| `apps/api/src/routes/subscriptions.ts` | Same as bills | Same |
| `apps/api/src/middleware/rateLimiter.ts` | Add named `webhookLimiter` (e.g. 600/min) and `plaidSyncLimiter` (1/min/itemId) | Burst protection |
| `apps/api/src/config/env.ts` | Add `PLAID_*` and `ENCRYPTION_KEY` Zod fields | Env validation |
| `apps/web/src/app/(app)/dashboard/page.tsx` | Add Connected Accounts + Recent Transactions widgets | Surface bank data |
| `apps/api/src/jobs/handlers.ts` `generateDailyInsights` | Include `transactions` (last 7 days top categories) in the AI context | Richer insights |

## 9. Environment Variables

Append to `.env.example`:

```
# ── Plaid ────────────────────────────────────
PLAID_CLIENT_ID=
PLAID_SECRET=
PLAID_ENV=sandbox
PLAID_WEBHOOK_URL=https://api.yourdomain.com/api/plaid/webhook
PLAID_REDIRECT_URI=https://yourdomain.com/settings/banks/oauth-return
PLAID_PRODUCTS=transactions,auth
PLAID_COUNTRY_CODES=US

# ── Encryption (REQUIRED) ────────────────────
ENCRYPTION_KEY=                  # 32 bytes hex (64 chars). Generate: openssl rand -hex 32
ENCRYPTION_KEY_VERSION=1
```

| Var | Secret? | Where to get |
|-----|---------|--------------|
| `PLAID_CLIENT_ID` | yes | dashboard.plaid.com → Team Settings → Keys |
| `PLAID_SECRET` | yes | same — separate per env (sandbox/development/production) |
| `PLAID_ENV` | no | sandbox / development / production |
| `PLAID_WEBHOOK_URL` | no | your API URL |
| `PLAID_REDIRECT_URI` | no | your web URL — must match Plaid OAuth allowlist |
| `ENCRYPTION_KEY` | **YES — most sensitive** | `openssl rand -hex 32` |
| `ENCRYPTION_KEY_VERSION` | no | start at `1`; bump on rotation |

## 10. Security Threat Model (OWASP-aligned)

| ID | Threat | OWASP | Mitigation |
|----|--------|-------|------------|
| T1 | Stolen DB → access_token leak | A02 Cryptographic Failures | App-level AES-256-GCM. Key NEVER in DB. `ENCRYPTION_KEY_VERSION` allows quarterly rotation. |
| T2 | Webhook spoofing | A07 Identification & Authentication | Verify `Plaid-Verification` JWT against Plaid JWKS (cache 24h). Reject if `iat` > 5 min old. |
| T3 | Cross-user data read (IDOR) | A01 Broken Access Control | Every Prisma query has `where: { userId: req.user!.userId }`. Mandatory integration test. |
| T4 | Webhook replay | A04 Insecure Design | `PlaidWebhookEvent.externalEventId` is `@unique`; duplicate insert → 200 OK, no work enqueued. |
| T5 | PII in logs | A09 Logging & Monitoring Failures | Add `redactSecrets` Winston format that masks `access_token`, `account_id`, `mask`, `accessTokenCiphertext`, `Authorization`. |
| T6 | SQL injection | A03 Injection | Prisma only. Lint rule: ban `$queryRawUnsafe`, `$executeRawUnsafe`. |
| T7 | CSRF on link/exchange | A01 | Already SameSite=lax cookies. Require `Authorization: Bearer` header. |
| T8 | Insider threat / unauthorised internal access | A09 | `BankDataAccessLog` records every read/write. Append-only, exportable for compliance. |
| T9 | Token in URL / browser history | A04 | `link_token` returned in JSON body only; never as query param. |
| T10 | Webhook DoS | A05 Security Misconfiguration | `webhookLimiter` 600 req/min IP-based; immediately ack 200 and offload to queue. |
| T11 | XSS exfiltrating tokens | A03 | No `dangerouslySetInnerHTML` (CLAUDE.md rule); React auto-escaping. Tokens never in localStorage. |
| T12 | Dependency vulnerability | A06 Vulnerable Components | Pin `plaid@^28.x`, `react-plaid-link@^3.6.x`, `react-native-plaid-link-sdk@^11.x`; Dependabot weekly. |
| T13 | Loss of `ENCRYPTION_KEY` | A04 | DR runbook: keep key in 1Password + Railway secret; rotation procedure documented. |
| T14 | Webhook delivered to staging from prod | A05 | Each environment has its own `PLAID_CLIENT_ID` / webhook URL. |
| T15 | Sensitive data in error responses | A09 | All errors go through `errorHandler` which strips internal details for non-dev `NODE_ENV`. |

## 11. Test Plan

**Unit (Vitest, `apps/api/src/__tests__/`)**
- `crypto.test.ts`: round-trip, key-version, tampered ciphertext fails, wrong key fails, GCM auth tag rejected
- `plaid-service.test.ts`: link token shape, exchange happy/error path (Plaid SDK mocked)
- `transaction-sync.test.ts`: cursor advances; `removed` are deleted; `modified` upserts; `has_more` loop terminates
- `audit-log.test.ts`: writes log even when route fails; never throws

**Integration**
- Spin up Postgres test container, mock Plaid via fixture responses
- `link → exchange → initial sync → webhook → incremental sync` happy path

**Contract**
- Validate every webhook payload sample against a Zod schema

**E2E (Playwright)**
- `tests/e2e/banks.spec.ts`: login → /settings/banks → click Connect → Plaid Link sandbox flow (test creds `user_good`/`pass_good`) → assert account appears → /transactions shows ≥ 1 row

**Cross-user isolation**
- Mandatory: seed userA + userB with linked items; assert userA token gets 404 on `/api/plaid/items/:userBItemId`

**Rate-limit**
- 700 webhooks in 60s → expect 600 accepted with 200, 100 throttled with 429

**Security tests (Security Analyst owns)**
- `npm audit --production` clean
- ZAP baseline scan on `/api/plaid/*`
- Manual JWT verification bypass attempt (alg=none, missing kid)

## 12. Phased Rollout Plan

### Phase 1 — DBA (worktree `feat/plaid-db`)
- **Files:** `apps/api/prisma/schema.prisma`, new migration `apps/api/prisma/migrations/20260428_plaid_integration/migration.sql`
- **Acceptance:** `prisma migrate deploy` clean; `prisma generate` produces typed clients; `prisma studio` shows new tables
- **Complexity:** M

### Phase 2a — Backend (worktree `feat/plaid-backend`)
- **Files:** services + routes + jobs + tests + env config
- **Acceptance:** all unit + integration tests pass; sandbox link → sync round-trip succeeds locally; lint + typecheck clean
- **Complexity:** L

### Phase 2b — Frontend (worktree `feat/plaid-frontend`)
- **Files:** Web pages + Mobile screens + API client helpers
- **Acceptance:** Sandbox link succeeds in web preview + dev-client mobile build; transactions list paginates
- **Complexity:** L

### Phase 2c — Refactor (worktree `feat/plaid-refactor`)
- **Files:** existing routes/jobs that integrate with new bank data
- **Acceptance:** Dashboard returns balances; Bills include matched txns; existing tests still green
- **Complexity:** S

### Phase 3 — Security + QA (parallel, read-only)
- Security Analyst: threat-model walkthrough, `npm audit`, JWT verification bypass attempts, log scrubber verification
- QA Engineer: cross-user isolation, Playwright E2E, rate-limit test, runbook validation
- **Acceptance:** zero highs on security review; all isolation tests pass

### Phase 4 — Single PR
- Merge all worktrees into `feat/item-26-plaid` → squash-merge into `dev` → PR to `main` with full security checklist
- **Conventional commit:** `feat(plaid): add read-only bank integration with sandbox support`

## 13. Open Questions for the User

1. **Auto-match policy:** When the AI auto-detects a recurring transaction as a Bill or Subscription, do we (a) auto-create silently, (b) create with `autoDetected=true` and surface for user confirmation, or (c) only suggest in the Assistant chat? Spec assumes (b).
2. **Transaction history depth:** Cap at 24 months, or store everything Plaid returns? Spec assumes "store all".
3. **Multiple users / one account:** Can two Laylo users link the same bank login simultaneously (e.g. spouses)? Spec assumes yes (separate `PlaidItem` rows per user).
4. **OAuth institutions:** Should we email the user 7 days before `consentExpiresAt`? Spec leaves the field but no scheduler yet.
5. **Currency display:** Display `isoCurrencyCode` per transaction or convert all to USD on dashboard? Spec assumes per-transaction.
6. **Pricing budget:** Confirm $20/mo budget cap in Plaid dashboard before promoting to Production.
7. **Webhook URL during local dev:** Use ngrok or Plaid's "Sandbox webhook fire" tool?
8. **Mobile re-link UX:** When `status = LOGIN_REQUIRED`, push-notify immediately or wait for next app open? Spec assumes push-notify.
