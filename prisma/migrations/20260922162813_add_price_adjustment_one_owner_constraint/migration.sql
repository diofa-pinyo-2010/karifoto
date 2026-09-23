-- CreateEnum
CREATE TYPE "PriceAdjustmentType" AS ENUM ('DISCOUNT', 'DEDUCTION');

-- CreateTable
CREATE TABLE "PhotoShootingPricing" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "photoShootingId" UUID NOT NULL,
    "packagePriceInCents" INTEGER NOT NULL,
    "packageEditedImagesAllowance" INTEGER NOT NULL,
    "extraPeopleThreshold" INTEGER NOT NULL,
    "extraPeopleRateInCents" INTEGER NOT NULL,
    "extraPetRateInCents" INTEGER NOT NULL,
    "extraEditedImageRateInCents" INTEGER NOT NULL,
    "extraRetouchedImageRateInCents" INTEGER NOT NULL,
    "totalEditedImages" INTEGER NOT NULL DEFAULT 0,
    "totalRetouchedImages" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PhotoShootingPricing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceAdjustment" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "type" "PriceAdjustmentType" NOT NULL,
    "amountInCents" INTEGER NOT NULL,
    "reason" TEXT,
    "bookingIntentId" UUID,
    "photoShootingId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PhotoShootingPricing_photoShootingId_key" ON "PhotoShootingPricing"("photoShootingId");

-- CreateIndex
CREATE INDEX "PriceAdjustment_photoShootingId_idx" ON "PriceAdjustment"("photoShootingId");

-- CreateIndex
CREATE INDEX "PriceAdjustment_bookingIntentId_idx" ON "PriceAdjustment"("bookingIntentId");

-- AddForeignKey
ALTER TABLE "PhotoShootingPricing" ADD CONSTRAINT "PhotoShootingPricing_photoShootingId_fkey" FOREIGN KEY ("photoShootingId") REFERENCES "PhotoShooting"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceAdjustment" ADD CONSTRAINT "PriceAdjustment_bookingIntentId_fkey" FOREIGN KEY ("bookingIntentId") REFERENCES "BookingIntent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceAdjustment" ADD CONSTRAINT "PriceAdjustment_photoShootingId_fkey" FOREIGN KEY ("photoShootingId") REFERENCES "PhotoShooting"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PriceAdjustment"
ADD CONSTRAINT "price_adjustment_one_owner"
CHECK (
  ("bookingIntentId" IS NOT NULL)::int +
  ("photoShootingId" IS NOT NULL)::int = 1
);