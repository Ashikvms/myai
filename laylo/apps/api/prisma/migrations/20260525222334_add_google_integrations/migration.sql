-- CreateEnum
CREATE TYPE "GoogleDataAccessAction" AS ENUM ('READ', 'WRITE', 'SYNC', 'EXPORT', 'DELETE', 'LINK', 'UNLINK');

-- AlterTable
ALTER TABLE "appointments" ADD COLUMN     "source" VARCHAR(40) DEFAULT 'manual',
ADD COLUMN     "sourceRef" VARCHAR(120);

-- AlterTable
ALTER TABLE "bills" ADD COLUMN     "source" VARCHAR(40) DEFAULT 'manual',
ADD COLUMN     "sourceRef" VARCHAR(120);

-- AlterTable
ALTER TABLE "reminders" ADD COLUMN     "source" VARCHAR(40) DEFAULT 'manual',
ADD COLUMN     "sourceRef" VARCHAR(120);

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "googleAccessTokenCiphertext" TEXT,
ADD COLUMN     "googleCalendarLastSyncedAt" TIMESTAMP(3),
ADD COLUMN     "googleEmail" TEXT,
ADD COLUMN     "googleGmailHistoryId" TEXT,
ADD COLUMN     "googleGmailLastPolledAt" TIMESTAMP(3),
ADD COLUMN     "googleLinkedAt" TIMESTAMP(3),
ADD COLUMN     "googleRefreshTokenCiphertext" TEXT,
ADD COLUMN     "googleScopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "googleTokenExpiresAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "google_calendar_events" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "googleEventId" TEXT NOT NULL,
    "calendarId" TEXT NOT NULL,
    "summary" VARCHAR(500) NOT NULL,
    "description" TEXT,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "location" VARCHAR(500),
    "attendees" JSONB,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "etag" VARCHAR(120),
    "appointmentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "google_calendar_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gmail_messages" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "googleMessageId" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "fromAddress" VARCHAR(320) NOT NULL,
    "subject" VARCHAR(500) NOT NULL,
    "snippet" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "processedAt" TIMESTAMP(3),
    "category" VARCHAR(40),
    "extractionRefs" JSONB,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gmail_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "google_data_access_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "actorUserId" VARCHAR(80) NOT NULL,
    "action" "GoogleDataAccessAction" NOT NULL,
    "scope" VARCHAR(40) NOT NULL,
    "endpoint" VARCHAR(120) NOT NULL,
    "resourceId" VARCHAR(120),
    "ipAddress" VARCHAR(64),
    "userAgent" VARCHAR(400),
    "context" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "google_data_access_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "google_calendar_events_appointmentId_key" ON "google_calendar_events"("appointmentId");

-- CreateIndex
CREATE INDEX "google_calendar_events_userId_startAt_idx" ON "google_calendar_events"("userId", "startAt");

-- CreateIndex
CREATE INDEX "google_calendar_events_userId_syncedAt_idx" ON "google_calendar_events"("userId", "syncedAt");

-- CreateIndex
CREATE UNIQUE INDEX "google_calendar_events_userId_googleEventId_key" ON "google_calendar_events"("userId", "googleEventId");

-- CreateIndex
CREATE INDEX "gmail_messages_userId_receivedAt_idx" ON "gmail_messages"("userId", "receivedAt");

-- CreateIndex
CREATE INDEX "gmail_messages_userId_processedAt_idx" ON "gmail_messages"("userId", "processedAt");

-- CreateIndex
CREATE INDEX "gmail_messages_userId_category_idx" ON "gmail_messages"("userId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "gmail_messages_userId_googleMessageId_key" ON "gmail_messages"("userId", "googleMessageId");

-- CreateIndex
CREATE INDEX "google_data_access_logs_userId_createdAt_idx" ON "google_data_access_logs"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "google_data_access_logs_action_createdAt_idx" ON "google_data_access_logs"("action", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "google_data_access_logs_scope_createdAt_idx" ON "google_data_access_logs"("scope", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "appointments_userId_source_idx" ON "appointments"("userId", "source");

-- CreateIndex
CREATE INDEX "bills_userId_source_idx" ON "bills"("userId", "source");

-- CreateIndex
CREATE INDEX "reminders_userId_source_idx" ON "reminders"("userId", "source");

-- AddForeignKey
ALTER TABLE "google_calendar_events" ADD CONSTRAINT "google_calendar_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "google_calendar_events" ADD CONSTRAINT "google_calendar_events_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gmail_messages" ADD CONSTRAINT "gmail_messages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "google_data_access_logs" ADD CONSTRAINT "google_data_access_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
