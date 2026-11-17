/*
  Warnings:

  - A unique constraint covering the columns `[stripeRefundId]` on the table `LedgerEntry` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
ALTER TYPE "LedgerEntryCategory" ADD VALUE 'REFUND_CLIENT_PAYMENT';

-- AlterTable
ALTER TABLE "LedgerEntry" ADD COLUMN     "stripeRefundId" TEXT;

-- AlterTable
ALTER TABLE "PhotoShooting" ADD COLUMN     "cancellationReason" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "LedgerEntry_stripeRefundId_key" ON "LedgerEntry"("stripeRefundId");
