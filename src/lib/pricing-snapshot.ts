import {
  EXTRA_EDIT_PER_IMAGE,
  EXTRA_FEE_PER_EXTRA_PERSON,
  EXTRA_FEE_PER_PET,
  EXTRA_BEAUTY_RETOUCH_PER_IMAGE,
  LIGHT_PLAY_FEE,
  PACKAGE_PRICES,
  PERSONS_INCLUDED,
} from '@/lib/constants';

import type { Package, PhotoShootingPricing } from '@/generated/prisma/client';

/** The columns of a `PhotoShootingPricing` row that describe the prices. */
export type PricingSnapshot = Omit<
  PhotoShootingPricing,
  'id' | 'photoShootingId' | 'createdAt' | 'updatedAt'
>;

/**
 * Freezes today's prices onto a booking, the way an order line remembers what
 * was charged. Every later calculation reads the snapshot, never
 * `src/lib/constants.ts`, so changing a price cannot re-bill past shootings.
 *
 * Extracted out of the Stripe webhook so it can be tested: nine similarly named
 * columns assigned from seven similarly named constants is exactly the shape of
 * mistake that type-checks, lints and silently bills wrong. A snapshot bug is
 * also worse than an ordinary one — the wrong numbers are persisted per row, so
 * fixing the code does nothing for bookings already taken.
 */
export function buildPricingSnapshot(
  selectedPackage: Package,
): PricingSnapshot {
  const prices = PACKAGE_PRICES[selectedPackage];

  return {
    packagePriceInCents: prices.base,
    packageStudioPriceInCents: prices.studio,
    packageEditedImagesAllowance: prices.editedImagesAllowance,

    lightPlayPriceInCents: LIGHT_PLAY_FEE,

    extraPeopleThreshold: PERSONS_INCLUDED,
    extraPeopleRateInCents: EXTRA_FEE_PER_EXTRA_PERSON,
    extraPetRateInCents: EXTRA_FEE_PER_PET,

    extraEditedImageRateInCents: EXTRA_EDIT_PER_IMAGE,
    extraRetouchedImageRateInCents: EXTRA_BEAUTY_RETOUCH_PER_IMAGE,
  };
}
