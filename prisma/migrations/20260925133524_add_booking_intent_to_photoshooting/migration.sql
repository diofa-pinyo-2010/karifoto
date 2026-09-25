/*
  Warnings:

  - A unique constraint covering the columns `[bookingIntentId]` on the table `PhotoShooting` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "PhotoShooting" ADD COLUMN     "bookingIntentId" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "PhotoShooting_bookingIntentId_key" ON "PhotoShooting"("bookingIntentId");

-- AddForeignKey
ALTER TABLE "PhotoShooting" ADD CONSTRAINT "PhotoShooting_bookingIntentId_fkey" FOREIGN KEY ("bookingIntentId") REFERENCES "BookingIntent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill
UPDATE "PhotoShooting" ps
SET "bookingIntentId" = bi.id
FROM "BookingIntent" bi
WHERE bi."timeSlotId" = ps."timeSlotId"
  AND bi.status = 'CONVERTED'
  AND ps."bookingIntentId" IS NULL;
