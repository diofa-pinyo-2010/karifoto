-- AlterTable
ALTER TABLE "BookingIntent" ADD COLUMN     "numberOfGuests" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "numberOfPets" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "PhotoShooting" ADD COLUMN     "numberOfGuests" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "numberOfPets" INTEGER NOT NULL DEFAULT 0;
