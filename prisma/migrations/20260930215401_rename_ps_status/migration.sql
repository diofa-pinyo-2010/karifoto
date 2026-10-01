/*
  Warnings:

  - The values [MARKED_FOR_COMPLETED] on the enum `PhotoShootingStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "PhotoShootingStatus_new" AS ENUM ('PHOTOGRAPHER_SELECTION', 'WAITING_FOR_THE_DATE', 'WAITING_FOR_BALANCE_PAYMENT', 'RAW_PHOTOS_UPLOAD', 'USER_SELECTION', 'EDITOR_SELECTION', 'FINAL_PHOTOS_UPLOAD', 'WAITING_FOR_EXTRA_PAYMENT', 'READY_TO_COMPLETE', 'COMPLETED', 'CANCELLED');
ALTER TABLE "public"."PhotoShooting" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "PhotoShooting" ALTER COLUMN "status" TYPE "PhotoShootingStatus_new" USING ("status"::text::"PhotoShootingStatus_new");
ALTER TYPE "PhotoShootingStatus" RENAME TO "PhotoShootingStatus_old";
ALTER TYPE "PhotoShootingStatus_new" RENAME TO "PhotoShootingStatus";
DROP TYPE "public"."PhotoShootingStatus_old";
ALTER TABLE "PhotoShooting" ALTER COLUMN "status" SET DEFAULT 'PHOTOGRAPHER_SELECTION';
COMMIT;
