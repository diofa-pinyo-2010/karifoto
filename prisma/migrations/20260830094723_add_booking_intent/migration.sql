/*
  Warnings:

  - Added the required column `package` to the `PhotoShooting` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Package" AS ENUM ('MINI', 'CLASSIC', 'FAMILY', 'PARTY');

-- CreateEnum
CREATE TYPE "DecorSet" AS ENUM ('HOFEHER', 'ALOMKASTELY');

-- AlterTable
ALTER TABLE "PhotoShooting" ADD COLUMN     "decorSet" "DecorSet",
ADD COLUMN     "isLightPlaySelected" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "package" "Package" NOT NULL;

-- CreateTable
CREATE TABLE "BookingIntent" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "package" "Package" NOT NULL,
    "decorSet" "DecorSet",
    "isLightPlaySelected" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "timeSlotId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingIntent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BookingIntent_timeSlotId_idx" ON "BookingIntent"("timeSlotId");

-- AddForeignKey
ALTER TABLE "BookingIntent" ADD CONSTRAINT "BookingIntent_timeSlotId_fkey" FOREIGN KEY ("timeSlotId") REFERENCES "TimeSlot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
