-- AlterTable
ALTER TABLE "LedgerEntry" ADD COLUMN     "staffProfileId" UUID;

-- Hand-edited: the columns are added nullable, backfilled with the 2026 rates
-- from src/lib/catalog.ts / src/lib/constants.ts (the same season the existing
-- rows were booked in), and only then made NOT NULL. Do not regenerate.

-- AlterTable
ALTER TABLE "PhotoShootingPricing" ADD COLUMN     "editorEditedImageFeeInCents" INTEGER,
ADD COLUMN     "editorRetouchedImageFeeInCents" INTEGER,
ADD COLUMN     "photographerExtraPersonFeeInCents" INTEGER,
ADD COLUMN     "photographerLightPlayFeeInCents" INTEGER,
ADD COLUMN     "photographerPackageFeeInCents" INTEGER,
ADD COLUMN     "photographerPetFeeInCents" INTEGER;

UPDATE "PhotoShootingPricing" AS p
SET "photographerPackageFeeInCents" = CASE s."package"
      WHEN 'MINI' THEN 300000
      WHEN 'CLASSIC' THEN 400000
      WHEN 'FAMILY' THEN 500000
      WHEN 'PARTY' THEN 900000
    END,
    "photographerLightPlayFeeInCents" = 100000,
    "photographerExtraPersonFeeInCents" = 100000,
    "photographerPetFeeInCents" = 100000,
    "editorEditedImageFeeInCents" = 33500,
    "editorRetouchedImageFeeInCents" = 100000
FROM "PhotoShooting" AS s
WHERE s."id" = p."photoShootingId";

ALTER TABLE "PhotoShootingPricing" ALTER COLUMN "editorEditedImageFeeInCents" SET NOT NULL,
ALTER COLUMN "editorRetouchedImageFeeInCents" SET NOT NULL,
ALTER COLUMN "photographerExtraPersonFeeInCents" SET NOT NULL,
ALTER COLUMN "photographerLightPlayFeeInCents" SET NOT NULL,
ALTER COLUMN "photographerPackageFeeInCents" SET NOT NULL,
ALTER COLUMN "photographerPetFeeInCents" SET NOT NULL;

-- CreateIndex
CREATE INDEX "LedgerEntry_staffProfileId_idx" ON "LedgerEntry"("staffProfileId");

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_staffProfileId_fkey" FOREIGN KEY ("staffProfileId") REFERENCES "StaffProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
