-- CreateTable
CREATE TABLE "Comment" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "body" TEXT NOT NULL,
    "authorId" UUID,
    "photoShootingId" UUID,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Comment_photoShootingId_createdAt_idx" ON "Comment"("photoShootingId", "createdAt");

-- CreateIndex
CREATE INDEX "Comment_authorId_idx" ON "Comment"("authorId");

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "StaffProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_photoShootingId_fkey" FOREIGN KEY ("photoShootingId") REFERENCES "PhotoShooting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Hand-added: exactly one owner must be set. Extend this sum when Comment gains
-- another owner FK. Never regenerate this migration.
ALTER TABLE "Comment"
ADD CONSTRAINT "comment_one_owner"
CHECK (
  ("photoShootingId" IS NOT NULL)::int = 1
);
