-- DropForeignKey
ALTER TABLE "PriceAdjustment" DROP CONSTRAINT "PriceAdjustment_bookingIntentId_fkey";

-- DropForeignKey
ALTER TABLE "PriceAdjustment" DROP CONSTRAINT "PriceAdjustment_photoShootingId_fkey";

-- AddForeignKey
ALTER TABLE "PriceAdjustment" ADD CONSTRAINT "PriceAdjustment_bookingIntentId_fkey" FOREIGN KEY ("bookingIntentId") REFERENCES "BookingIntent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceAdjustment" ADD CONSTRAINT "PriceAdjustment_photoShootingId_fkey" FOREIGN KEY ("photoShootingId") REFERENCES "PhotoShooting"("id") ON DELETE CASCADE ON UPDATE CASCADE;
