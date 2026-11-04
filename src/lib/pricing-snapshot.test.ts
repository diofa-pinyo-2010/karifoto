import { describe, expect, it } from 'vitest';

import { Package } from '@/generated/prisma/enums';
import { ADD_ONS, PACKAGES } from '@/lib/catalog';
import {
  EDITOR_FEE_PER_EDITED_IMAGE,
  EDITOR_FEE_PER_RETOUCHED_IMAGE,
  EXTRA_EDIT_PER_IMAGE,
  EXTRA_FEE_PER_EXTRA_PERSON,
  EXTRA_FEE_PER_PET,
  EXTRA_BEAUTY_RETOUCH_PER_IMAGE,
  PHOTOGRAPHER_FEE_PER_EXTRA_PERSON,
  PHOTOGRAPHER_FEE_PER_PET,
} from '@/lib/constants';
import { buildPricingSnapshot } from '@/lib/pricing-snapshot';

// Unlike pricing.test.ts, this suite *does* read src/lib/constants.ts and the
// catalog — on purpose. It asserts which constant lands in which column, never
// what the number is, so prices can change freely while a transposed pair goes red.
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

    it('takes the light play fee from the LIGHT_PLAY add-on', () => {
      expect(snapshot.lightPlayPriceInCents).toBe(
        ADD_ONS.LIGHT_PLAY.feeInCents,
      );
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
        EXTRA_BEAUTY_RETOUCH_PER_IMAGE,
      );
    });
  });

  // Same caveat as above: the four 1000 Ft staff rates are equal today, so a
  // swap among them only goes red once they diverge.
  describe('staff fee rates that do not depend on the package', () => {
    const snapshot = buildPricingSnapshot(Package.CLASSIC);

    it('takes the photographer light play fee from the LIGHT_PLAY add-on', () => {
      expect(snapshot.photographerLightPlayFeeInCents).toBe(
        ADD_ONS.LIGHT_PLAY.photographerFeeInCents,
      );
    });

    it('takes the photographer extra person fee from PHOTOGRAPHER_FEE_PER_EXTRA_PERSON', () => {
      expect(snapshot.photographerExtraPersonFeeInCents).toBe(
        PHOTOGRAPHER_FEE_PER_EXTRA_PERSON,
      );
    });

    it('takes the photographer pet fee from PHOTOGRAPHER_FEE_PER_PET', () => {
      expect(snapshot.photographerPetFeeInCents).toBe(PHOTOGRAPHER_FEE_PER_PET);
    });

    it('takes the editor edited image fee from EDITOR_FEE_PER_EDITED_IMAGE', () => {
      expect(snapshot.editorEditedImageFeeInCents).toBe(
        EDITOR_FEE_PER_EDITED_IMAGE,
      );
    });

    it('takes the editor retouched image fee from EDITOR_FEE_PER_RETOUCHED_IMAGE', () => {
      expect(snapshot.editorRetouchedImageFeeInCents).toBe(
        EDITOR_FEE_PER_RETOUCHED_IMAGE,
      );
    });
  });

  describe.each(Object.values(Package))('for the %s package', (pkg) => {
    const snapshot = buildPricingSnapshot(pkg);
    const definition = PACKAGES[pkg];

    // base and studio are distinct in every package, so a swap between these
    // two is caught outright rather than only once values diverge.
    it('takes the package price from basePriceInCents', () => {
      expect(snapshot.packagePriceInCents).toBe(definition.basePriceInCents);
    });

    it('takes the studio fee from studioPriceInCents', () => {
      expect(snapshot.packageStudioPriceInCents).toBe(
        definition.studioPriceInCents,
      );
    });

    it('takes the people threshold from personsIncluded', () => {
      expect(snapshot.extraPeopleThreshold).toBe(definition.personsIncluded);
    });

    it('takes the photographer package fee from photographerFeeInCents', () => {
      expect(snapshot.photographerPackageFeeInCents).toBe(
        definition.photographerFeeInCents,
      );
    });

    it('takes the allowance from editedImagesAllowance', () => {
      expect(snapshot.packageEditedImagesAllowance).toBe(
        definition.editedImagesAllowance,
      );
    });
  });

  // A package added to the enum but forgotten in the catalog's PACKAGES would produce
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
