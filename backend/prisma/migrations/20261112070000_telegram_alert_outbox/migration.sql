CREATE TABLE "AlertOutbox" (
    "id" TEXT NOT NULL,
    "eventCode" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "safePayload" JSONB NOT NULL,
    "occurrenceCount" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastErrorCode" TEXT,
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AlertOutbox_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AlertOutbox_dedupeKey_key" ON "AlertOutbox"("dedupeKey");
CREATE INDEX "AlertOutbox_status_nextAttemptAt_idx" ON "AlertOutbox"("status", "nextAttemptAt");
CREATE INDEX "AlertOutbox_createdAt_status_idx" ON "AlertOutbox"("createdAt", "status");
