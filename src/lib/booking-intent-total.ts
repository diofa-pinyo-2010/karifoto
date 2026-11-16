import {
  isLightPlayChargeable,
  PRICE_ADJUSTMENT_TYPE_SIGN,
} from '@/lib/constants';
import { buildPricingSnapshot } from '@/lib/pricing-snapshot';

import type { Package } from '@/generated/prisma/client';
import type { PriceAdjustmentType } from '@/generated/prisma/enums';

/**
 * Total (in cents) of a booking intent, before any shooting exists. Must equal
 * `calculatePricing().totalToBePaid` of the shooting the webhook will create
 * (guarded by a test), so the summary page and checkout agree. Kept free of
 * server-only imports so client components can use it.
 */
export function calculateBookingIntentTotal(intent: {
  package: Package;
  isLightPlaySelected: boolean;
  numberOfGuests: number;
  numberOfPets: number;
  adjustments: { amountInCents: number; type: PriceAdjustmentType }[];
}): number {
  const pricing = buildPricingSnapshot(intent.package);

  const lightFee =
    isLightPlayChargeable(intent.package) && intent.isLightPlaySelected
      ? pricing.lightPlayPriceInCents
      : 0;
  const extraPeople = Math.max(
    0,
    intent.numberOfGuests - pricing.extraPeopleThreshold,
  );
  const adjustments = intent.adjustments.reduce(
    (sum, adj) =>
      sum + adj.amountInCents * PRICE_ADJUSTMENT_TYPE_SIGN[adj.type],
    0,
  );

  return (
    pricing.packagePriceInCents +
    pricing.packageStudioPriceInCents +
    lightFee +
    extraPeople * pricing.extraPeopleRateInCents +
    intent.numberOfPets * pricing.extraPetRateInCents +
    adjustments
  );
}
