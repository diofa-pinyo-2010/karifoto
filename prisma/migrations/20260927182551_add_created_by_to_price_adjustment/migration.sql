-- AlterTable
ALTER TABLE "PriceAdjustment" ADD COLUMN     "createdById" UUID;

-- CreateIndex
CREATE INDEX "PriceAdjustment_createdById_idx" ON "PriceAdjustment"("createdById");

-- AddForeignKey
ALTER TABLE "PriceAdjustment" ADD CONSTRAINT "PriceAdjustment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "StaffProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
