import { describe, expect, it } from 'vitest';

import { calculateBookingIntentTotal } from '@/lib/booking-intent-total';
import { PACKAGES } from '@/lib/catalog';
import { isLightPlayChargeable } from '@/lib/constants';
import { buildPricingSnapshot } from '@/lib/pricing-snapshot';
import { calculatePricing } from '@/server/pricing';

import type {
  Package,
  PhotoShooting,
  PhotoShootingPricing,
  PriceAdjustment,
} from '@/generated/prisma/client';
import type { PriceAdjustmentType } from '@/generated/prisma/enums';

type Intent = {
  package: Package;
  isLightPlaySelected: boolean;
  numberOfGuests: number;
  numberOfPets: number;
  adjustments: { type: PriceAdjustmentType; amountInCents: number }[];
};

// Mirrors the fields the Stripe webhook's `photoShooting.create` sets; the
// post-production counters start at zero there.
function shootingFrom(intent: Intent): PhotoShooting {
  return {
    package: intent.package,
    numberOfGuests: intent.numberOfGuests,
    numberOfPets: intent.numberOfPets,
    isLightPlaySelected:
      isLightPlayChargeable(intent.package) && intent.isLightPlaySelected,
    totalEditedImages: 0,
    totalRetouchedImages: 0,
    isExpressPostProduction: false,
  } as PhotoShooting;
}

describe('calculateBookingIntentTotal', () => {
  it.each([
    [
      'base package',
      {
        numberOfGuests: 2,
        numberOfPets: 0,
        isLightPlaySelected: false,
        adjustments: [],
      },
    ],
    [
      'light play + extra people + pets',
      {
        numberOfGuests: 6,
        numberOfPets: 2,
        isLightPlaySelected: true,
        adjustments: [],
      },
    ],
    [
      'early-bird discount',
      {
        numberOfGuests: 2,
        numberOfPets: 0,
        isLightPlaySelected: false,
        adjustments: [{ type: 'DISCOUNT' as const, amountInCents: 5000_00 }],
      },
    ],
    [
      'surcharge',
      {
        numberOfGuests: 3,
        numberOfPets: 1,
        isLightPlaySelected: true,
        adjustments: [{ type: 'SURCHARGE' as const, amountInCents: 2000_00 }],
      },
    ],
  ])('matches calculatePricing().totalToBePaid for %s', (_, intent) => {
    for (const pkg of Object.keys(PACKAGES) as Package[]) {
      const input = { ...intent, package: pkg };
      expect(calculateBookingIntentTotal(input)).toBe(
        calculatePricing({
          pricing: { ...buildPricingSnapshot(pkg) } as PhotoShootingPricing,
          shooting: shootingFrom(input),
          adjustments: input.adjustments as PriceAdjustment[],
          ledgerEntries: [],
        }).totalToBePaid,
      );
    }
  });
});
