-- CreateEnum
CREATE TYPE "SumupCheckoutAttemptStatus" AS ENUM ('INITIATED', 'PENDING', 'SUCCESSFUL', 'CANCELLED', 'FAILED');

-- CreateTable
CREATE TABLE "SumupCheckoutAttempt" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "status" "SumupCheckoutAttemptStatus" NOT NULL DEFAULT 'INITIATED',
    "clientTransactionId" TEXT,
    "checkoutId" TEXT,
    "failureReason" TEXT,
    "amountInCents" INTEGER NOT NULL,
    "photoShootingId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SumupCheckoutAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SumupCheckoutAttempt_clientTransactionId_key" ON "SumupCheckoutAttempt"("clientTransactionId");

-- CreateIndex
CREATE INDEX "SumupCheckoutAttempt_photoShootingId_idx" ON "SumupCheckoutAttempt"("photoShootingId");

-- AddForeignKey
ALTER TABLE "SumupCheckoutAttempt" ADD CONSTRAINT "SumupCheckoutAttempt_photoShootingId_fkey" FOREIGN KEY ("photoShootingId") REFERENCES "PhotoShooting"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
