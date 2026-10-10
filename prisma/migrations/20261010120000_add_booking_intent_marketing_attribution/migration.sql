-- AlterTable
ALTER TABLE "BookingIntent" ADD COLUMN     "clientIp" TEXT,
ADD COLUMN     "fbc" TEXT,
ADD COLUMN     "fbp" TEXT,
ADD COLUMN     "marketingConsent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "userAgent" TEXT;
