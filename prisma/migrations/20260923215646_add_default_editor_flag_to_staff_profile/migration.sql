-- AlterTable
ALTER TABLE "StaffProfile" ADD COLUMN     "isDefaultEditor" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "StaffProfile_isDefaultEditor_key" ON "StaffProfile" ("isDefaultEditor") WHERE "isDefaultEditor" = true;
