ALTER TABLE "AuthSession" ADD COLUMN "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "VoteOrder" ADD COLUMN "ussdSessionId" TEXT;
CREATE UNIQUE INDEX "VoteOrder_ussdSessionId_key" ON "VoteOrder"("ussdSessionId");
