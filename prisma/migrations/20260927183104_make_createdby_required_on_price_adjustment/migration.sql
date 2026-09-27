/*
  Warnings:

  - Made the column `createdById` on table `PriceAdjustment` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "PriceAdjustment" DROP CONSTRAINT "PriceAdjustment_createdById_fkey";

-- AlterTable
ALTER TABLE "PriceAdjustment" ALTER COLUMN "createdById" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "PriceAdjustment" ADD CONSTRAINT "PriceAdjustment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "StaffProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
