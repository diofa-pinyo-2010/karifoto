-- AlterTable
ALTER TABLE "TimeSlot" ADD COLUMN     "allowedPackages" "Package"[] DEFAULT ARRAY[]::"Package"[];
