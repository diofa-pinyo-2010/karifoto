-- AlterTable
ALTER TABLE "BookingIntent" ADD COLUMN     "optOutFromMarketingEmails" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "ClientProfile" ADD COLUMN     "marketingConsentAt" TIMESTAMPTZ;
