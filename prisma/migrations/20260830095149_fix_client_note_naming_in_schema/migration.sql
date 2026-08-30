/*
  Warnings:

  - You are about to drop the column `customerNote` on the `BookingIntent` table. All the data in the column will be lost.
  - You are about to drop the column `customerNote` on the `PhotoShooting` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "BookingIntent" DROP COLUMN "customerNote",
ADD COLUMN     "clientNote" TEXT;

-- AlterTable
ALTER TABLE "PhotoShooting" DROP COLUMN "customerNote";
