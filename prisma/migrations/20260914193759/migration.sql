/*
  Warnings:

  - The values [ADMIN] on the enum `StaffProfileRole` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "StaffProfileRole_new" AS ENUM ('SUPERADMIN', 'EDITOR');
ALTER TABLE "public"."StaffProfile" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "StaffProfile" ALTER COLUMN "role" TYPE "StaffProfileRole_new" USING ("role"::text::"StaffProfileRole_new");
ALTER TYPE "StaffProfileRole" RENAME TO "StaffProfileRole_old";
ALTER TYPE "StaffProfileRole_new" RENAME TO "StaffProfileRole";
DROP TYPE "public"."StaffProfileRole_old";
ALTER TABLE "StaffProfile" ALTER COLUMN "role" SET DEFAULT 'EDITOR';
COMMIT;

-- AlterTable
ALTER TABLE "StaffProfile" ALTER COLUMN "role" SET DEFAULT 'EDITOR';
