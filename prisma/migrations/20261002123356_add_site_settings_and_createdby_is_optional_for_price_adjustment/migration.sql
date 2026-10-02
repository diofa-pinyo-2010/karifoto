-- DropForeignKey
ALTER TABLE "PriceAdjustment" DROP CONSTRAINT "PriceAdjustment_createdById_fkey";

-- AlterTable
ALTER TABLE "PriceAdjustment" ALTER COLUMN "createdById" DROP NOT NULL;

-- CreateTable
CREATE TABLE "SiteSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "automaticEarlyBirdEnabled" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SiteSettings_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PriceAdjustment" ADD CONSTRAINT "PriceAdjustment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "StaffProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
