/*
  Warnings:

  - A unique constraint covering the columns `[paymentIntent]` on the table `Payment` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Payment_paymentIntent_key" ON "Payment"("paymentIntent");
