/*
  Warnings:

  - You are about to drop the `Payment` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "LedgerEntryCategory" AS ENUM ('INCOME_CLIENT_PAYMENT_DEPOSIT', 'INCOME_CLIENT_PAYMENT_BALANCE', 'INCOME_CLIENT_PAYMENT_EXTRA', 'INCOME_OTHER', 'EXPENSE_PHOTOGRAPHER_FEE', 'EXPENSE_EDITOR_FEE', 'EXPENSE_EQUIPMENT', 'EXPENSE_RENT', 'EXPENSE_SOFTWARE', 'EXPENSE_OTHER');

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_invoiceId_fkey";

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_photoShootingId_fkey";

-- DropTable
DROP TABLE "Payment";

-- DropEnum
DROP TYPE "InvoiceType";

-- DropEnum
DROP TYPE "PaymentType";

-- CreateTable
CREATE TABLE "LedgerEntry" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "category" "LedgerEntryCategory" NOT NULL,
    "amountInCents" INTEGER NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'HUF',
    "method" "PaymentMethod" NOT NULL,
    "paymentIntent" TEXT,
    "invoiceId" UUID,
    "photoShootingId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LedgerEntry_paymentIntent_key" ON "LedgerEntry"("paymentIntent");

-- CreateIndex
CREATE UNIQUE INDEX "LedgerEntry_invoiceId_key" ON "LedgerEntry"("invoiceId");

-- CreateIndex
CREATE INDEX "LedgerEntry_photoShootingId_idx" ON "LedgerEntry"("photoShootingId");

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_photoShootingId_fkey" FOREIGN KEY ("photoShootingId") REFERENCES "PhotoShooting"("id") ON DELETE SET NULL ON UPDATE CASCADE;
