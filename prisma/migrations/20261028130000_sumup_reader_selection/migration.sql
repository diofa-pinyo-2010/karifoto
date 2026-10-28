-- AlterTable
ALTER TABLE "SiteSettings" ADD COLUMN     "sumupReaderId" TEXT;

-- AlterTable
ALTER TABLE "SumupCheckoutAttempt" ADD COLUMN     "readerId" TEXT;
