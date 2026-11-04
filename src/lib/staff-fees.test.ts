import { describe, expect, it } from 'vitest';

import {
  LedgerEntryCategory,
  PhotoShootingStatus,
} from '@/generated/prisma/enums';
import {
  calculateEditorFee,
  calculateOwnShootingFees,
  calculatePhotographerFee,
  summarizeStaffFees,
} from '@/lib/staff-fees';

import type { PhotoShootingPricing } from '@/generated/prisma/client';

// Synthetic, distinct rates rather than the real constants — same reasoning as
// src/server/pricing.test.ts: the snapshot is what the calculation reads.
const PACKAGE_FEE = 4_000_00;
const LIGHT_PLAY_FEE = 500_00;
const PER_PERSON_FEE = 300_00;
const PER_PET_FEE = 700_00;
const PER_EDITED_FEE = 335_00;
const PER_RETOUCHED_FEE = 1_100_00;
const PEOPLE_INCLUDED = 4;

const NOW = new Date('2026-12-01T10:00:00.000Z');

const ME = 'staff-me';
const OTHER = 'staff-other';

function makePricing(): PhotoShootingPricing {
  return {
    id: 'pricing-1',
    photoShootingId: 'shooting-1',
    packagePriceInCents: 30_000_00,
    packageStudioPriceInCents: 10_000_00,
    lightPlayPriceInCents: 5_000_00,
    packageEditedImagesAllowance: 10,
    extraPeopleThreshold: PEOPLE_INCLUDED,
    extraPeopleRateInCents: 1_000_00,
    extraPetRateInCents: 2_000_00,
    extraEditedImageRateInCents: 3_000_00,
    extraRetouchedImageRateInCents: 4_000_00,
    expressPostProductionPriceInCents: 10_000_00,
    photographerPackageFeeInCents: PACKAGE_FEE,
    photographerLightPlayFeeInCents: LIGHT_PLAY_FEE,
    photographerExtraPersonFeeInCents: PER_PERSON_FEE,
    photographerPetFeeInCents: PER_PET_FEE,
    editorEditedImageFeeInCents: PER_EDITED_FEE,
    editorRetouchedImageFeeInCents: PER_RETOUCHED_FEE,
    createdAt: NOW,
    updatedAt: NOW,
  };
}

type Shooting = Parameters<typeof summarizeStaffFees>[1][number];

function makeShooting(overrides: Partial<Shooting> = {}): Shooting {
  return {
    package: 'CLASSIC',
    isLightPlaySelected: false,
    numberOfGuests: PEOPLE_INCLUDED,
    numberOfPets: 0,
    totalEditedImages: 0,
    totalRetouchedImages: 0,
    status: PhotoShootingStatus.WAITING_FOR_THE_DATE,
    photographerId: ME,
    editorId: null,
    pricing: makePricing(),
    ledgerEntries: [],
    ...overrides,
  };
}

function payout(
  category: LedgerEntryCategory,
  amount: number,
  staffProfileId: string | null = ME,
) {
  return { category, amountInCents: -amount, staffProfileId };
}

describe('calculatePhotographerFee', () => {
  const pricing = makePricing();

  it('is the package fee with no extras', () => {
    expect(calculatePhotographerFee(pricing, makeShooting())).toBe(PACKAGE_FEE);
  });

  it('adds light play when the client paid for it', () => {
    expect(
      calculatePhotographerFee(
        pricing,
        makeShooting({ package: 'CLASSIC', isLightPlaySelected: true }),
      ),
    ).toBe(PACKAGE_FEE + LIGHT_PLAY_FEE);
  });

  it('does not add light play when the package includes it', () => {
    expect(
      calculatePhotographerFee(
        pricing,
        makeShooting({ package: 'FAMILY', isLightPlaySelected: true }),
      ),
    ).toBe(PACKAGE_FEE);
  });

  it('adds people above the threshold and every pet', () => {
    expect(
      calculatePhotographerFee(
        pricing,
        makeShooting({ numberOfGuests: PEOPLE_INCLUDED + 2, numberOfPets: 3 }),
      ),
    ).toBe(PACKAGE_FEE + 2 * PER_PERSON_FEE + 3 * PER_PET_FEE);
  });
});

describe('calculateEditorFee', () => {
  it('pays every edited and retouched image', () => {
    expect(
      calculateEditorFee(
        makePricing(),
        makeShooting({ totalEditedImages: 12, totalRetouchedImages: 2 }),
      ),
    ).toBe(12 * PER_EDITED_FEE + 2 * PER_RETOUCHED_FEE);
  });

  it('is 0 before the image counts are known', () => {
    expect(calculateEditorFee(makePricing(), makeShooting())).toBe(0);
  });
});

describe('summarizeStaffFees', () => {
  it('counts the photographer fee as expected before the balance is paid', () => {
    expect(
      summarizeStaffFees(ME, [
        makeShooting({
          status: PhotoShootingStatus.WAITING_FOR_BALANCE_PAYMENT,
        }),
      ]),
    ).toEqual({ expectedInCents: PACKAGE_FEE, dueInCents: 0, paidInCents: 0 });
  });

  it('counts the photographer fee as due once the balance is paid', () => {
    expect(
      summarizeStaffFees(ME, [
        makeShooting({ status: PhotoShootingStatus.RAW_PHOTOS_UPLOAD }),
      ]),
    ).toEqual({ expectedInCents: 0, dueInCents: PACKAGE_FEE, paidInCents: 0 });
  });

  it('counts the editor fee as expected until the shooting is completed', () => {
    const shooting = makeShooting({
      photographerId: OTHER,
      editorId: ME,
      totalEditedImages: 10,
      status: PhotoShootingStatus.READY_TO_COMPLETE,
    });

    expect(summarizeStaffFees(ME, [shooting])).toEqual({
      expectedInCents: 10 * PER_EDITED_FEE,
      dueInCents: 0,
      paidInCents: 0,
    });
    expect(
      summarizeStaffFees(ME, [
        { ...shooting, status: PhotoShootingStatus.COMPLETED },
      ]),
    ).toEqual({
      expectedInCents: 0,
      dueInCents: 10 * PER_EDITED_FEE,
      paidInCents: 0,
    });
  });

  it('moves a partial payout into paid and leaves the rest due', () => {
    expect(
      summarizeStaffFees(ME, [
        makeShooting({
          status: PhotoShootingStatus.COMPLETED,
          ledgerEntries: [
            payout(LedgerEntryCategory.EXPENSE_PHOTOGRAPHER_FEE, 1_000_00),
          ],
        }),
      ]),
    ).toEqual({
      expectedInCents: 0,
      dueInCents: PACKAGE_FEE - 1_000_00,
      paidInCents: 1_000_00,
    });
  });

  it('never reports a negative due when overpaid', () => {
    expect(
      summarizeStaffFees(ME, [
        makeShooting({
          status: PhotoShootingStatus.COMPLETED,
          ledgerEntries: [
            payout(
              LedgerEntryCategory.EXPENSE_PHOTOGRAPHER_FEE,
              PACKAGE_FEE * 2,
            ),
          ],
        }),
      ]),
    ).toEqual({
      expectedInCents: 0,
      dueInCents: 0,
      paidInCents: PACKAGE_FEE * 2,
    });
  });

  it('ignores payouts to someone else and payouts for the other role', () => {
    expect(
      summarizeStaffFees(ME, [
        makeShooting({
          status: PhotoShootingStatus.COMPLETED,
          ledgerEntries: [
            payout(
              LedgerEntryCategory.EXPENSE_PHOTOGRAPHER_FEE,
              1_000_00,
              OTHER,
            ),
            payout(LedgerEntryCategory.EXPENSE_EDITOR_FEE, 1_000_00),
          ],
        }),
      ]),
    ).toEqual({ expectedInCents: 0, dueInCents: PACKAGE_FEE, paidInCents: 0 });
  });

  it('adds both fees when one person photographs and edits', () => {
    expect(
      summarizeStaffFees(ME, [
        makeShooting({
          editorId: ME,
          totalEditedImages: 10,
          status: PhotoShootingStatus.FINAL_PHOTOS_UPLOAD,
        }),
      ]),
    ).toEqual({
      expectedInCents: 10 * PER_EDITED_FEE,
      dueInCents: PACKAGE_FEE,
      paidInCents: 0,
    });
  });

  it('counts nothing for shootings assigned to someone else', () => {
    expect(
      summarizeStaffFees(ME, [makeShooting({ photographerId: OTHER })]),
    ).toEqual({ expectedInCents: 0, dueInCents: 0, paidInCents: 0 });
  });

  it('counts cancelled shootings as 0 everywhere, even with a payout', () => {
    expect(
      summarizeStaffFees(ME, [
        makeShooting({
          status: PhotoShootingStatus.CANCELLED,
          ledgerEntries: [
            payout(LedgerEntryCategory.EXPENSE_PHOTOGRAPHER_FEE, 1_000_00),
          ],
        }),
      ]),
    ).toEqual({ expectedInCents: 0, dueInCents: 0, paidInCents: 0 });
  });

  it('counts shootings without a pricing snapshot as 0', () => {
    expect(summarizeStaffFees(ME, [makeShooting({ pricing: null })])).toEqual({
      expectedInCents: 0,
      dueInCents: 0,
      paidInCents: 0,
    });
  });
});

describe('calculateOwnShootingFees', () => {
  const editing = { totalEditedImages: 10, totalRetouchedImages: 1 };
  const EDITOR_FEE = 10 * PER_EDITED_FEE + PER_RETOUCHED_FEE;

  it('shows only the photographer fee when someone else edits', () => {
    expect(
      calculateOwnShootingFees(
        ME,
        makeShooting({ ...editing, photographerId: ME, editorId: OTHER }),
      ),
    ).toEqual({
      photographerFeeInCents: PACKAGE_FEE,
      editorFeeInCents: null,
      totalInCents: PACKAGE_FEE,
    });
  });

  it('shows only the editor fee when someone else photographs', () => {
    expect(
      calculateOwnShootingFees(
        ME,
        makeShooting({ ...editing, photographerId: OTHER, editorId: ME }),
      ),
    ).toEqual({
      photographerFeeInCents: null,
      editorFeeInCents: EDITOR_FEE,
      totalInCents: EDITOR_FEE,
    });
  });

  it('adds both fees when one person does both', () => {
    expect(
      calculateOwnShootingFees(
        ME,
        makeShooting({ ...editing, photographerId: ME, editorId: ME }),
      ),
    ).toEqual({
      photographerFeeInCents: PACKAGE_FEE,
      editorFeeInCents: EDITOR_FEE,
      totalInCents: PACKAGE_FEE + EDITOR_FEE,
    });
  });

  it('earns 0 on a cancelled shooting but keeps the role', () => {
    expect(
      calculateOwnShootingFees(
        ME,
        makeShooting({ status: PhotoShootingStatus.CANCELLED }),
      ),
    ).toEqual({
      photographerFeeInCents: 0,
      editorFeeInCents: null,
      totalInCents: 0,
    });
  });

  it('earns 0 without a pricing snapshot', () => {
    expect(
      calculateOwnShootingFees(ME, makeShooting({ pricing: null })),
    ).toEqual({
      photographerFeeInCents: 0,
      editorFeeInCents: null,
      totalInCents: 0,
    });
  });
});
