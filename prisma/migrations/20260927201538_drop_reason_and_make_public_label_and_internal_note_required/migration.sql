/*
  Warnings:

  - You are about to drop the column `reason` on the `PriceAdjustment` table. All the data in the column will be lost.
  - Made the column `internalNote` on table `PriceAdjustment` required. This step will fail if there are existing NULL values in that column.
  - Made the column `publicLabel` on table `PriceAdjustment` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "PriceAdjustment" DROP COLUMN "reason",
ALTER COLUMN "internalNote" SET NOT NULL,
ALTER COLUMN "publicLabel" SET NOT NULL;
