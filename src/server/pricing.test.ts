import { describe, expect, it } from 'vitest';

import { calculateRemainingAmount } from '@/server/pricing';

import type {
  LedgerEntry,
  PhotoShooting,
  PhotoShootingPricing,
  PriceAdjustment,
} from '@/generated/prisma/client';

// Deliberately synthetic, round numbers rather than the real constants: the
// whole point of PhotoShootingPricing is that it is a snapshot, so a test that
// imported src/lib/constants.ts would start failing the day prices change
// without anything actually being broken. Each rate is distinct so a wrong
// total says which term went wrong.
const PACKAGE = 30_000_00;
const STUDIO = 10_000_00;
const LIGHT_PLAY = 5_000_00;
const PER_PERSON = 1_000_00;
const PER_PET = 2_000_00;
const PER_EDITED = 3_000_00;
const PER_RETOUCHED = 4_000_00;

const PEOPLE_INCLUDED = 4;
const EDITED_ALLOWANCE = 10;

/** Package + studio, with no extras of any kind. */
const BASE = PACKAGE + STUDIO;

const NOW = new Date('2026-12-01T10:00:00.000Z');

function makePricing(
  overrides: Partial<PhotoShootingPricing> = {},
): PhotoShootingPricing {
  return {
    id: 'pricing-1',
    photoShootingId: 'shooting-1',
    packagePriceInCents: PACKAGE,
    packageStudioPriceInCents: STUDIO,
    lightPlayPriceInCents: LIGHT_PLAY,
    packageEditedImagesAllowance: EDITED_ALLOWANCE,
    extraPeopleThreshold: PEOPLE_INCLUDED,
    extraPeopleRateInCents: PER_PERSON,
    extraPetRateInCents: PER_PET,
    extraEditedImageRateInCents: PER_EDITED,
    extraRetouchedImageRateInCents: PER_RETOUCHED,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function makeShooting(overrides: Partial<PhotoShooting> = {}): PhotoShooting {
  return {
    id: 'shooting-1',
    clientId: 'client-1',
    package: 'CLASSIC',
    decorSet: null,
    isLightPlaySelected: false,
    numberOfGuests: PEOPLE_INCLUDED,
    numberOfPets: 0,
    timeSlotId: 'slot-1',
    bookingIntentId: null,
    status: 'WAITING_FOR_THE_DATE',
    photographerId: null,
    editorId: null,
    selectionRequestedAt: null,
    selectionCompletedAt: null,
    declaredEditedImages: null,
    declaredRetouchedImages: null,
    totalEditedImages: 0,
    totalRetouchedImages: 0,
    rawImagesUrl: null,
    finalImagesUrl: null,
    clientNote: null,
    closedAt: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function makeAdjustment(
  overrides: Partial<PriceAdjustment> = {},
): PriceAdjustment {
  return {
    id: 'adjustment-1',
    type: 'DISCOUNT',
    amountInCents: 0,
    publicLabel: 'Kedvezmény',
    internalNote: 'teszt',
    createdById: 'staff-1',
    bookingIntentId: null,
    photoShootingId: 'shooting-1',
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function makeLedgerEntry(overrides: Partial<LedgerEntry> = {}): LedgerEntry {
  return {
    id: 'ledger-1',
    category: 'INCOME_CLIENT_PAYMENT_DEPOSIT',
    amountInCents: 0,
    currency: 'HUF',
    method: 'CARD',
    paymentIntent: null,
    invoiceId: null,
    photoShootingId: 'shooting-1',
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function remaining({
  pricing,
  shooting,
  adjustments = [],
  ledgerEntries = [],
}: {
  pricing?: Partial<PhotoShootingPricing>;
  shooting?: Partial<PhotoShooting>;
  adjustments?: PriceAdjustment[];
  ledgerEntries?: LedgerEntry[];
} = {}) {
  return calculateRemainingAmount({
    pricing: makePricing(pricing),
    shooting: makeShooting(shooting),
    adjustments,
    ledgerEntries,
  });
}

describe('calculateRemainingAmount', () => {
  it('charges the package and the studio fee with no extras', () => {
    expect(remaining()).toBe(BASE);
  });

  describe('light play', () => {
    it('is charged when selected', () => {
      expect(remaining({ shooting: { isLightPlaySelected: true } })).toBe(
        BASE + LIGHT_PLAY,
      );
    });

    it('is not charged when not selected', () => {
      expect(remaining({ shooting: { isLightPlaySelected: false } })).toBe(
        BASE,
      );
    });

    // The FAMILY package includes light play in its own price, so charging it
    // again would double-bill. Selecting it must be a no-op, not a surcharge.
    it('is never charged on top of the FAMILY package, even when selected', () => {
      expect(
        remaining({
          shooting: { package: 'FAMILY', isLightPlaySelected: true },
        }),
      ).toBe(BASE);
    });
  });

  describe('extra people', () => {
    it('charges per head above the included threshold', () => {
      expect(
        remaining({ shooting: { numberOfGuests: PEOPLE_INCLUDED + 2 } }),
      ).toBe(BASE + 2 * PER_PERSON);
    });

    it('charges nothing at exactly the threshold', () => {
      expect(remaining({ shooting: { numberOfGuests: PEOPLE_INCLUDED } })).toBe(
        BASE,
      );
    });

    // Clamped at zero: a small group must not earn a discount off the package.
    it('does not credit anything back for a group under the threshold', () => {
      expect(remaining({ shooting: { numberOfGuests: 1 } })).toBe(BASE);
    });
  });

  describe('pets', () => {
    // Unlike people, pets have no included allowance — the first one is billed.
    it('charges from the very first pet', () => {
      expect(remaining({ shooting: { numberOfPets: 1 } })).toBe(BASE + PER_PET);
    });

    it('charges per pet', () => {
      expect(remaining({ shooting: { numberOfPets: 3 } })).toBe(
        BASE + 3 * PER_PET,
      );
    });
  });

  describe('edited images', () => {
    it('charges only the images above the package allowance', () => {
      expect(
        remaining({ shooting: { totalEditedImages: EDITED_ALLOWANCE + 3 } }),
      ).toBe(BASE + 3 * PER_EDITED);
    });

    it('charges nothing at exactly the allowance', () => {
      expect(
        remaining({ shooting: { totalEditedImages: EDITED_ALLOWANCE } }),
      ).toBe(BASE);
    });

    it('does not credit anything back for using less than the allowance', () => {
      expect(remaining({ shooting: { totalEditedImages: 1 } })).toBe(BASE);
    });
  });

  describe('retouched images', () => {
    it('charges from the first one, since there is no allowance', () => {
      expect(remaining({ shooting: { totalRetouchedImages: 2 } })).toBe(
        BASE + 2 * PER_RETOUCHED,
      );
    });

    // Characterisation, not endorsement. Unlike the edited-image term this one
    // is NOT clamped, so a negative count subtracts from the bill. That hole is
    // documented in src/docs/image-selection.md ("Validation: the
    // negative-number hole") and is meant to be closed by validating the client
    // form input with z.number().int().nonnegative() — deliberately NOT by
    // clamping here, because this function is also the price-preview path and
    // must report what is stored rather than quietly repairing it.
    //
    // If this test ever fails, someone added clamping. Read that doc before
    // deciding the clamp is the fix.
    it('is not clamped, so a negative count reduces the bill', () => {
      expect(remaining({ shooting: { totalRetouchedImages: -1 } })).toBe(
        BASE - PER_RETOUCHED,
      );
    });
  });

  describe('price adjustments', () => {
    // Every adjustment type currently subtracts — DISCOUNT and DEDUCTION are
    // two labels for one behaviour. Adding a SURCHARGE type means giving each
    // type a sign; when that lands, these two expectations are what tells you
    // which call sites still assume "adjustment means deduction".
    it('subtracts a DISCOUNT', () => {
      expect(
        remaining({
          adjustments: [
            makeAdjustment({ type: 'DISCOUNT', amountInCents: 5_000_00 }),
          ],
        }),
      ).toBe(BASE - 5_000_00);
    });

    it('subtracts a DEDUCTION exactly like a DISCOUNT', () => {
      expect(
        remaining({
          adjustments: [
            makeAdjustment({ type: 'DEDUCTION', amountInCents: 5_000_00 }),
          ],
        }),
      ).toBe(BASE - 5_000_00);
    });

    it('sums several adjustments', () => {
      expect(
        remaining({
          adjustments: [
            makeAdjustment({ id: 'a', amountInCents: 1_000_00 }),
            makeAdjustment({ id: 'b', amountInCents: 2_000_00 }),
          ],
        }),
      ).toBe(BASE - 3_000_00);
    });
  });

  describe('payments', () => {
    it('subtracts what the client has already paid', () => {
      expect(
        remaining({
          ledgerEntries: [makeLedgerEntry({ amountInCents: 15_000_00 })],
        }),
      ).toBe(BASE - 15_000_00);
    });

    it('counts every INCOME category, not just the deposit', () => {
      expect(
        remaining({
          ledgerEntries: [
            makeLedgerEntry({
              id: 'l1',
              category: 'INCOME_CLIENT_PAYMENT_DEPOSIT',
              amountInCents: 10_000_00,
            }),
            makeLedgerEntry({
              id: 'l2',
              category: 'INCOME_CLIENT_PAYMENT_BALANCE',
              amountInCents: 5_000_00,
            }),
          ],
        }),
      ).toBe(BASE - 15_000_00);
    });

    // The studio's own costs are on the same ledger. If an expense ever counted
    // here, paying the photographer would reduce what the client owes.
    it('ignores EXPENSE rows entirely', () => {
      expect(
        remaining({
          ledgerEntries: [
            makeLedgerEntry({
              id: 'l1',
              category: 'EXPENSE_PHOTOGRAPHER_FEE',
              amountInCents: -8_000_00,
            }),
          ],
        }),
      ).toBe(BASE);
    });

    // resolveStatus() gates on `remaining > 0`, so an overpayment has to read
    // as "nothing owed" rather than being clamped to zero here.
    it('goes negative when the client has overpaid', () => {
      expect(
        remaining({
          ledgerEntries: [makeLedgerEntry({ amountInCents: BASE + 1_000_00 })],
        }),
      ).toBe(-1_000_00);
    });
  });

  // One realistic bill end to end, so the terms are proven to compose and not
  // just to work one at a time.
  it('combines every term for a full shooting', () => {
    const result = remaining({
      shooting: {
        package: 'CLASSIC',
        isLightPlaySelected: true,
        numberOfGuests: PEOPLE_INCLUDED + 1,
        numberOfPets: 1,
        totalEditedImages: EDITED_ALLOWANCE + 2,
        totalRetouchedImages: 1,
      },
      adjustments: [makeAdjustment({ amountInCents: 3_000_00 })],
      ledgerEntries: [makeLedgerEntry({ amountInCents: 20_000_00 })],
    });

    expect(result).toBe(
      PACKAGE +
        STUDIO +
        LIGHT_PLAY +
        PER_PERSON +
        PER_PET +
        2 * PER_EDITED +
        PER_RETOUCHED -
        3_000_00 -
        20_000_00,
    );
  });
});
