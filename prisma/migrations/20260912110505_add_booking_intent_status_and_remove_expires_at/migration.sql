/*
  Warnings:

  - The values [PARTY] on the enum `Package` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `expiresAt` on the `BookingIntent` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "BookingIntentStatus" AS ENUM ('PENDING', 'CONVERTED', 'CANCELLED', 'PAYMENT_ORPHANED');

-- AlterEnum
BEGIN;
CREATE TYPE "Package_new" AS ENUM ('MINI', 'CLASSIC', 'FAMILY');
ALTER TABLE "BookingIntent" ALTER COLUMN "package" TYPE "Package_new" USING ("package"::text::"Package_new");
ALTER TABLE "PhotoShooting" ALTER COLUMN "package" TYPE "Package_new" USING ("package"::text::"Package_new");
ALTER TYPE "Package" RENAME TO "Package_old";
ALTER TYPE "Package_new" RENAME TO "Package";
DROP TYPE "public"."Package_old";
COMMIT;

-- AlterTable
ALTER TABLE "BookingIntent" DROP COLUMN "expiresAt",
ADD COLUMN     "paymentIntent" TEXT,
ADD COLUMN     "status" "BookingIntentStatus" NOT NULL DEFAULT 'PENDING';
