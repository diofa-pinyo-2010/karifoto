-- CreateEnum
CREATE TYPE "TapChannel" AS ENUM ('NFC', 'QR');

-- CreateTable
CREATE TABLE "ReviewStand" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "label" TEXT NOT NULL,
    "staffProfileId" UUID,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewStand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewTap" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "standId" UUID NOT NULL,
    "staffProfileId" UUID,
    "channel" "TapChannel",
    "reviewUrl" TEXT,
    "bonusInCents" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewTap_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReviewStand_staffProfileId_idx" ON "ReviewStand"("staffProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewTap_reviewUrl_key" ON "ReviewTap"("reviewUrl");

-- CreateIndex
CREATE INDEX "ReviewTap_staffProfileId_createdAt_idx" ON "ReviewTap"("staffProfileId", "createdAt");

-- CreateIndex
CREATE INDEX "ReviewTap_standId_createdAt_idx" ON "ReviewTap"("standId", "createdAt");

-- AddForeignKey
ALTER TABLE "ReviewStand" ADD CONSTRAINT "ReviewStand_staffProfileId_fkey" FOREIGN KEY ("staffProfileId") REFERENCES "StaffProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewTap" ADD CONSTRAINT "ReviewTap_standId_fkey" FOREIGN KEY ("standId") REFERENCES "ReviewStand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewTap" ADD CONSTRAINT "ReviewTap_staffProfileId_fkey" FOREIGN KEY ("staffProfileId") REFERENCES "StaffProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
