-- CreateEnum
CREATE TYPE "EmailType" AS ENUM ('CLIENT_BOOKING_CONFIRMATION', 'DEPOSIT_REQUEST', 'REMINDER_ON_THE_DAY', 'RESCHEDULE_NOTIFICATION');

-- CreateTable
CREATE TABLE "SentEmail" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "resendId" TEXT NOT NULL,
    "type" "EmailType" NOT NULL,
    "to" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "variables" JSONB NOT NULL DEFAULT '{}',
    "clientId" UUID,
    "photoShootingId" UUID,
    "sentAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SentEmail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SentEmail_resendId_key" ON "SentEmail"("resendId");

-- CreateIndex
CREATE INDEX "SentEmail_clientId_idx" ON "SentEmail"("clientId");

-- CreateIndex
CREATE INDEX "SentEmail_photoShootingId_idx" ON "SentEmail"("photoShootingId");

-- AddForeignKey
ALTER TABLE "SentEmail" ADD CONSTRAINT "SentEmail_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClientProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SentEmail" ADD CONSTRAINT "SentEmail_photoShootingId_fkey" FOREIGN KEY ("photoShootingId") REFERENCES "PhotoShooting"("id") ON DELETE SET NULL ON UPDATE CASCADE;
