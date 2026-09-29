/*
  Warnings:

  - You are about to drop the column `totalEditedImages` on the `PhotoShootingPricing` table. All the data in the column will be lost.
  - You are about to drop the column `totalRetouchedImages` on the `PhotoShootingPricing` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "PhotoShooting" ADD COLUMN     "declaredEditedImages" INTEGER,
ADD COLUMN     "declaredRetouchedImages" INTEGER,
ADD COLUMN     "selectionCompletedAt" TIMESTAMPTZ,
ADD COLUMN     "selectionRequestedAt" TIMESTAMPTZ,
ADD COLUMN     "totalEditedImages" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalRetouchedImages" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "PhotoShootingPricing" DROP COLUMN "totalEditedImages",
DROP COLUMN "totalRetouchedImages";
