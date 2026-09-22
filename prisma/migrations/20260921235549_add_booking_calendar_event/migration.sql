-- CreateTable
CREATE TABLE "BookingCalendarEvent" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "photoShootingId" UUID NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'google',
    "calendarId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingCalendarEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BookingCalendarEvent_photoShootingId_key" ON "BookingCalendarEvent"("photoShootingId");

-- AddForeignKey
ALTER TABLE "BookingCalendarEvent" ADD CONSTRAINT "BookingCalendarEvent_photoShootingId_fkey" FOREIGN KEY ("photoShootingId") REFERENCES "PhotoShooting"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
