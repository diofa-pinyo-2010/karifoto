-- AlterEnum
ALTER TYPE "LedgerEntryCategory" ADD VALUE 'INCOME_CLIENT_PAYMENT_FULL';

-- AlterTable
ALTER TABLE "BookingIntent" ADD COLUMN     "isGift" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "PhotoShooting" ADD COLUMN     "giftCode" TEXT,
ADD COLUMN     "purchasedById" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "PhotoShooting_giftCode_key" ON "PhotoShooting"("giftCode");

-- CreateIndex
CREATE INDEX "PhotoShooting_purchasedById_idx" ON "PhotoShooting"("purchasedById");

-- AddForeignKey
ALTER TABLE "PhotoShooting" ADD CONSTRAINT "PhotoShooting_purchasedById_fkey" FOREIGN KEY ("purchasedById") REFERENCES "ClientProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
