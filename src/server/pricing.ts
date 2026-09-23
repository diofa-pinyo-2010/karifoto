import {
  LedgerEntry,
  PhotoShooting,
  PhotoShootingPricing,
  PriceAdjustment,
} from '@/generated/prisma/client';

export function calculateRemainingAmount({
  pricing,
  shooting,
  adjustments,
  ledgerEntries,
}: {
  pricing: PhotoShootingPricing;
  shooting: PhotoShooting;
  adjustments: PriceAdjustment[];
  ledgerEntries: LedgerEntry[];
}): number {
  const lightPlayPrice =
    shooting.package !== 'FAMILY' && shooting.isLightPlaySelected
      ? pricing.lightPlayPriceInCents
      : 0;
  const extraPeople = Math.max(
    0,
    shooting.numberOfGuests - pricing.extraPeopleThreshold,
  );
  const extraEdited = Math.max(
    0,
    pricing.totalEditedImages - pricing.packageEditedImagesAllowance,
  );

  const totalCharges =
    pricing.packagePriceInCents +
    pricing.packageStudioPriceInCents +
    lightPlayPrice +
    extraPeople * pricing.extraPeopleRateInCents +
    shooting.numberOfPets * pricing.extraPetRateInCents +
    extraEdited * pricing.extraEditedImageRateInCents +
    pricing.totalRetouchedImages * pricing.extraRetouchedImageRateInCents;

  const totalDeductions = adjustments.reduce(
    (sum, a) => sum + a.amountInCents,
    0,
  );

  const totalPaid = ledgerEntries
    .filter((entry) => entry.category.startsWith('INCOME'))
    .reduce((sum, en) => sum + en.amountInCents, 0);

  return totalCharges - totalDeductions - totalPaid;
}
