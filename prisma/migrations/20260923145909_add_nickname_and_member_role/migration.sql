-- AlterEnum
ALTER TYPE "StaffProfileRole" ADD VALUE 'MEMBER';

-- AlterTable
ALTER TABLE "StaffProfile" ADD COLUMN     "nickname" TEXT,
ALTER COLUMN "role" SET DEFAULT 'MEMBER';
