-- CreateTable
CREATE TABLE "BillingAddress" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "zip" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "addressLine1" TEXT NOT NULL,
    "bookingIntentId" UUID,
    "clientProfileId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillingAddress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BillingAddress_bookingIntentId_key" ON "BillingAddress"("bookingIntentId");

-- CreateIndex
CREATE INDEX "BillingAddress_clientProfileId_idx" ON "BillingAddress"("clientProfileId");

-- AddForeignKey
ALTER TABLE "BillingAddress" ADD CONSTRAINT "BillingAddress_bookingIntentId_fkey" FOREIGN KEY ("bookingIntentId") REFERENCES "BookingIntent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingAddress" ADD CONSTRAINT "BillingAddress_clientProfileId_fkey" FOREIGN KEY ("clientProfileId") REFERENCES "ClientProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
