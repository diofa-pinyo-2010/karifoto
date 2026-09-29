-- CreateEnum
CREATE TYPE "SessionKind" AS ENUM ('ADMIN', 'CLIENT');

-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "kind" "SessionKind" NOT NULL DEFAULT 'ADMIN';

-- CreateTable
CREATE TABLE "ClientPortalToken" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientPortalToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClientPortalToken_tokenHash_key" ON "ClientPortalToken"("tokenHash");

-- CreateIndex
CREATE INDEX "ClientPortalToken_userId_idx" ON "ClientPortalToken"("userId");

-- AddForeignKey
ALTER TABLE "ClientPortalToken" ADD CONSTRAINT "ClientPortalToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
