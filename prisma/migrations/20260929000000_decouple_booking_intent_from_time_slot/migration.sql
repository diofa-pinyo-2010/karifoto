-- The intent's time slot is a live hold while PENDING, not history. Snapshot
-- the requested time as a value and let the FK go null so a freed TimeSlot
-- stays deletable once the intent is converted or cancelled.

-- DropForeignKey
ALTER TABLE "BookingIntent" DROP CONSTRAINT "BookingIntent_timeSlotId_fkey";

-- AlterTable
ALTER TABLE "BookingIntent" ADD COLUMN     "requestedStartTime" TIMESTAMPTZ;

-- Backfill the snapshot from the slot each intent currently points at.
UPDATE "BookingIntent" bi
SET "requestedStartTime" = ts."startTime"
FROM "TimeSlot" ts
WHERE ts."id" = bi."timeSlotId";

ALTER TABLE "BookingIntent" ALTER COLUMN "requestedStartTime" SET NOT NULL,
ALTER COLUMN "timeSlotId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "BookingIntent" ADD CONSTRAINT "BookingIntent_timeSlotId_fkey" FOREIGN KEY ("timeSlotId") REFERENCES "TimeSlot"("id") ON DELETE SET NULL ON UPDATE CASCADE;
