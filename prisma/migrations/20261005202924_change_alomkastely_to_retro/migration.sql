/*
  Warnings:

  - The values [ALOMKASTELY] on the enum `DecorSet` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "DecorSet_new" AS ENUM ('HOFEHER', 'RETRO');
ALTER TABLE "BookingIntent" ALTER COLUMN "decorSet" TYPE "DecorSet_new" USING ("decorSet"::text::"DecorSet_new");
ALTER TABLE "PhotoShooting" ALTER COLUMN "decorSet" TYPE "DecorSet_new" USING ("decorSet"::text::"DecorSet_new");
ALTER TYPE "DecorSet" RENAME TO "DecorSet_old";
ALTER TYPE "DecorSet_new" RENAME TO "DecorSet";
DROP TYPE "public"."DecorSet_old";
COMMIT;
