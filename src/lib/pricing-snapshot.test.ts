import { describe, expect, it } from 'vitest';

import { Package } from '@/generated/prisma/enums';
import {
  EXTRA_EDIT_PER_IMAGE,
  EXTRA_FEE_PER_EXTRA_PERSON,
  EXTRA_FEE_PER_PET,
  EXTRA_RETOUCH_PER_IMAGE,
  LIGHT_PLAY_FEE,
  PACKAGE_PRICES,
  PERSONS_INCLUDED,
} from '@/lib/constants';
import { buildPricingSnapshot } from '@/lib/pricing-snapshot';

// Unlike pricing.test.ts, this suite *does* read src/lib/constants.ts — on
// purpose. It asserts which constant lands in which column, never what the
// number is, so prices can change freely while a transposed pair goes red.
//
// Caveat worth knowing: two constants with equal values are indistinguishable
// to any value-based assertion. Today `EXTRA_FEE_PER_EXTRA_PERSON` and
// `EXTRA_FEE_PER_PET` are both 5000_00, so swapping those two would slip
// through here — and would also be harmless, since the bill comes out the same.
// The day someone makes them differ, the swap starts to matter *and* these
// assertions start catching it. The test arms itself exactly when the risk
// becomes real.
describe('buildPricingSnapshot', () => {
  describe('rates that do not depend on the package', () => {
    const snapshot = buildPricingSnapshot(Package.CLASSIC);

    it('takes the light play fee from LIGHT_PLAY_FEE', () => {
      expect(snapshot.lightPlayPriceInCents).toBe(LIGHT_PLAY_FEE);
    });

    it('takes the people threshold from PERSONS_INCLUDED', () => {
      expect(snapshot.extraPeopleThreshold).toBe(PERSONS_INCLUDED);
    });

    it('takes the extra person rate from EXTRA_FEE_PER_EXTRA_PERSON', () => {
      expect(snapshot.extraPeopleRateInCents).toBe(EXTRA_FEE_PER_EXTRA_PERSON);
    });

    it('takes the pet rate from EXTRA_FEE_PER_PET', () => {
      expect(snapshot.extraPetRateInCents).toBe(EXTRA_FEE_PER_PET);
    });

    it('takes the extra edited image rate from EXTRA_EDIT_PER_IMAGE', () => {
      expect(snapshot.extraEditedImageRateInCents).toBe(EXTRA_EDIT_PER_IMAGE);
    });

    it('takes the retouched image rate from EXTRA_RETOUCH_PER_IMAGE', () => {
      expect(snapshot.extraRetouchedImageRateInCents).toBe(
        EXTRA_RETOUCH_PER_IMAGE,
      );
    });
  });

  describe.each(Object.values(Package))('for the %s package', (pkg) => {
    const snapshot = buildPricingSnapshot(pkg);
    const prices = PACKAGE_PRICES[pkg];

    // base and studio are distinct in every package, so a swap between these
    // two is caught outright rather than only once values diverge.
    it('takes the package price from base', () => {
      expect(snapshot.packagePriceInCents).toBe(prices.base);
    });

    it('takes the studio fee from studio', () => {
      expect(snapshot.packageStudioPriceInCents).toBe(prices.studio);
    });

    it('takes the allowance from editedImagesAllowance', () => {
      expect(snapshot.packageEditedImagesAllowance).toBe(
        prices.editedImagesAllowance,
      );
    });
  });

  // A package added to the enum but forgotten in PACKAGE_PRICES would produce
  // a snapshot full of `undefined` and write NaN-adjacent nonsense into a row
  // nobody can repair afterwards.
  it('produces a complete snapshot for every package in the enum', () => {
    for (const pkg of Object.values(Package)) {
      const snapshot = buildPricingSnapshot(pkg);

      for (const [field, value] of Object.entries(snapshot)) {
        expect(
          Number.isInteger(value),
          `${pkg}.${field} should be an integer, got ${value}`,
        ).toBe(true);
      }
    }
  });
});
