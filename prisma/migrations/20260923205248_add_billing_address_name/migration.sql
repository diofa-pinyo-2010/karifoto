/*
  Warnings:

  - Added the required column `name` to the `BillingAddress` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "BillingAddress" ADD COLUMN     "name" TEXT NOT NULL;
