/*
  Warnings:

  - Added the required column `packageStudioPriceInCents` to the `PhotoShootingPricing` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "PhotoShootingPricing" ADD COLUMN     "packageStudioPriceInCents" INTEGER NOT NULL;
