/*
  Warnings:

  - Made the column `reason` on table `PriceAdjustment` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "PriceAdjustment" ALTER COLUMN "reason" SET NOT NULL;
