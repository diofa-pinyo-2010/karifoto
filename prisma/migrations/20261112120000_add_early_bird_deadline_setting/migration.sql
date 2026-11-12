-- AlterTable
ALTER TABLE "SiteSettings" ADD COLUMN     "earlyBirdDeadline" DATE;

-- Kézzel hozzáadva: a korábbi EARLY_BIRD_DATE_DEADLINE konstans értéke kerül a
-- singleton sorba, így a deploy pillanatában semmi nem tolódik el.
INSERT INTO "SiteSettings" ("id", "earlyBirdDeadline", "updatedAt")
VALUES ('singleton', DATE '2026-11-16', now())
ON CONFLICT ("id") DO UPDATE SET "earlyBirdDeadline" = EXCLUDED."earlyBirdDeadline";
