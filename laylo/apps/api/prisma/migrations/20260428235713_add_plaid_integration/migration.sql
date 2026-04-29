-- CreateEnum
CREATE TYPE "PlaidItemStatus" AS ENUM ('ACTIVE', 'LOGIN_REQUIRED', 'ERROR', 'DISCONNECTED');

-- CreateEnum
CREATE TYPE "BankAccountType" AS ENUM ('DEPOSITORY', 'CREDIT', 'LOAN', 'INVESTMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "BankAccountSubtype" AS ENUM ('CHECKING', 'SAVINGS', 'HSA', 'CD', 'MONEY_MARKET', 'PAYPAL', 'PREPAID', 'CREDIT_CARD', 'AUTO', 'MORTGAGE', 'STUDENT', 'PERSONAL', 'OTHER');

-- CreateEnum
CREATE TYPE "PlaidWebhookStatus" AS ENUM ('PENDING', 'PROCESSED', 'FAILED', 'IGNORED');

-- CreateEnum
CREATE TYPE "BankDataAccessAction" AS ENUM ('READ', 'WRITE', 'SYNC', 'EXPORT', 'DELETE', 'LINK', 'UNLINK');

-- AlterTable
ALTER TABLE "bills" ADD COLUMN     "autoDetected" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "detectedFromTxnId" VARCHAR(80);

-- AlterTable
ALTER TABLE "subscriptions" ADD COLUMN     "autoDetected" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "detectedFromTxnId" VARCHAR(80);

-- CreateTable
CREATE TABLE "plaid_items" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "plaidItemId" TEXT NOT NULL,
    "accessTokenCiphertext" TEXT NOT NULL,
    "accessTokenKeyVersion" INTEGER NOT NULL DEFAULT 1,
    "institutionId" TEXT NOT NULL,
    "institutionName" VARCHAR(200) NOT NULL,
    "institutionLogo" TEXT,
    "status" "PlaidItemStatus" NOT NULL DEFAULT 'ACTIVE',
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "cursor" TEXT,
    "consentExpiresAt" TIMESTAMP(3),
    "lastSyncAt" TIMESTAMP(3),
    "lastWebhookAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plaid_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "plaidItemId" TEXT NOT NULL,
    "plaidAccountId" TEXT NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "officialName" VARCHAR(200),
    "mask" VARCHAR(8),
    "type" "BankAccountType" NOT NULL,
    "subtype" "BankAccountSubtype",
    "isoCurrencyCode" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "currentBalance" DECIMAL(14,2),
    "availableBalance" DECIMAL(14,2),
    "creditLimit" DECIMAL(14,2),
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "lastBalanceUpdate" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bank_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bankAccountId" TEXT NOT NULL,
    "plaidTransactionId" TEXT NOT NULL,
    "plaidPendingId" TEXT,
    "amount" DECIMAL(14,2) NOT NULL,
    "isoCurrencyCode" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "date" DATE NOT NULL,
    "authorizedDate" DATE,
    "name" VARCHAR(500) NOT NULL,
    "merchantName" VARCHAR(200),
    "merchantLogoUrl" TEXT,
    "category" VARCHAR(80),
    "categoryDetailed" VARCHAR(120),
    "paymentChannel" VARCHAR(40),
    "pending" BOOLEAN NOT NULL DEFAULT false,
    "isoLocationCity" VARCHAR(100),
    "isoLocationRegion" VARCHAR(100),
    "isoLocationCountry" VARCHAR(2),
    "billId" TEXT,
    "subscriptionId" TEXT,
    "matchConfidence" DECIMAL(4,3),
    "userVerifiedMatch" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plaid_webhook_events" (
    "id" TEXT NOT NULL,
    "plaidItemId" TEXT,
    "webhookType" VARCHAR(60) NOT NULL,
    "webhookCode" VARCHAR(60) NOT NULL,
    "externalEventId" TEXT,
    "rawPayload" JSONB NOT NULL,
    "status" "PlaidWebhookStatus" NOT NULL DEFAULT 'PENDING',
    "processingError" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "plaid_webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_data_access_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "action" "BankDataAccessAction" NOT NULL,
    "resource" VARCHAR(80) NOT NULL,
    "resourceId" VARCHAR(80),
    "ipAddress" VARCHAR(64),
    "userAgent" VARCHAR(400),
    "context" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bank_data_access_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "plaid_items_plaidItemId_key" ON "plaid_items"("plaidItemId");

-- CreateIndex
CREATE INDEX "plaid_items_userId_idx" ON "plaid_items"("userId");

-- CreateIndex
CREATE INDEX "plaid_items_userId_status_idx" ON "plaid_items"("userId", "status");

-- CreateIndex
CREATE INDEX "plaid_items_plaidItemId_idx" ON "plaid_items"("plaidItemId");

-- CreateIndex
CREATE UNIQUE INDEX "bank_accounts_plaidAccountId_key" ON "bank_accounts"("plaidAccountId");

-- CreateIndex
CREATE INDEX "bank_accounts_userId_idx" ON "bank_accounts"("userId");

-- CreateIndex
CREATE INDEX "bank_accounts_userId_deletedAt_idx" ON "bank_accounts"("userId", "deletedAt");

-- CreateIndex
CREATE INDEX "bank_accounts_plaidItemId_idx" ON "bank_accounts"("plaidItemId");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_plaidTransactionId_key" ON "transactions"("plaidTransactionId");

-- CreateIndex
CREATE INDEX "transactions_userId_date_idx" ON "transactions"("userId", "date" DESC);

-- CreateIndex
CREATE INDEX "transactions_userId_bankAccountId_date_idx" ON "transactions"("userId", "bankAccountId", "date" DESC);

-- CreateIndex
CREATE INDEX "transactions_userId_category_idx" ON "transactions"("userId", "category");

-- CreateIndex
CREATE INDEX "transactions_userId_merchantName_idx" ON "transactions"("userId", "merchantName");

-- CreateIndex
CREATE INDEX "transactions_billId_idx" ON "transactions"("billId");

-- CreateIndex
CREATE INDEX "transactions_subscriptionId_idx" ON "transactions"("subscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "plaid_webhook_events_externalEventId_key" ON "plaid_webhook_events"("externalEventId");

-- CreateIndex
CREATE INDEX "plaid_webhook_events_plaidItemId_idx" ON "plaid_webhook_events"("plaidItemId");

-- CreateIndex
CREATE INDEX "plaid_webhook_events_status_receivedAt_idx" ON "plaid_webhook_events"("status", "receivedAt");

-- CreateIndex
CREATE INDEX "plaid_webhook_events_webhookType_webhookCode_idx" ON "plaid_webhook_events"("webhookType", "webhookCode");

-- CreateIndex
CREATE INDEX "bank_data_access_logs_userId_createdAt_idx" ON "bank_data_access_logs"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "bank_data_access_logs_action_createdAt_idx" ON "bank_data_access_logs"("action", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "plaid_items" ADD CONSTRAINT "plaid_items_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_plaidItemId_fkey" FOREIGN KEY ("plaidItemId") REFERENCES "plaid_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "bank_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_billId_fkey" FOREIGN KEY ("billId") REFERENCES "bills"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plaid_webhook_events" ADD CONSTRAINT "plaid_webhook_events_plaidItemId_fkey" FOREIGN KEY ("plaidItemId") REFERENCES "plaid_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_data_access_logs" ADD CONSTRAINT "bank_data_access_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
