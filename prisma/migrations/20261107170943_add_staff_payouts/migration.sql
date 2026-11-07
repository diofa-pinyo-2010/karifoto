-- AlterEnum
ALTER TYPE "LedgerEntryCategory" ADD VALUE 'EXPENSE_STAFF_BONUS';

-- AlterTable
ALTER TABLE "LedgerEntry" ADD COLUMN     "reviewTapId" UUID,
ADD COLUMN     "staffPayoutId" UUID;

-- AlterTable
ALTER TABLE "ReviewTap" ADD COLUMN     "reviewUrlSetAt" TIMESTAMPTZ;

-- CreateTable
CREATE TABLE "StaffPayout" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "staffProfileId" UUID NOT NULL,
    "amountInCents" INTEGER NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffPayout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StaffPayout_staffProfileId_createdAt_idx" ON "StaffPayout"("staffProfileId", "createdAt");

-- CreateIndex
CREATE INDEX "LedgerEntry_staffPayoutId_idx" ON "LedgerEntry"("staffPayoutId");

-- CreateIndex
CREATE INDEX "LedgerEntry_reviewTapId_idx" ON "LedgerEntry"("reviewTapId");

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_staffPayoutId_fkey" FOREIGN KEY ("staffPayoutId") REFERENCES "StaffPayout"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_reviewTapId_fkey" FOREIGN KEY ("reviewTapId") REFERENCES "ReviewTap"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffPayout" ADD CONSTRAINT "StaffPayout_staffProfileId_fkey" FOREIGN KEY ("staffProfileId") REFERENCES "StaffProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
