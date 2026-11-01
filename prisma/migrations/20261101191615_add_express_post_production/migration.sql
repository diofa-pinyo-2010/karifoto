-- AlterTable
ALTER TABLE "PhotoShooting" ADD COLUMN     "isExpressPostProduction" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "PhotoShootingPricing" ADD COLUMN     "expressPostProductionPriceInCents" INTEGER NOT NULL DEFAULT 1000000;
