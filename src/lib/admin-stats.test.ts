import { describe, expect, it } from 'vitest';

import { buildAdminStats } from '@/lib/admin-stats';

import type {
  PhotoShooting,
  PhotoShootingPricing,
  PriceAdjustment,
} from '@/generated/prisma/client';

// Synthetic round numbers, like pricing.test.ts: the snapshot is the input, not
// the current constants.
const PACKAGE = 30_000_00;
const STUDIO = 10_000_00;
const BASE = PACKAGE + STUDIO;

const NOW = new Date('2026-12-01T10:00:00.000Z');

function makePricing(): PhotoShootingPricing {
  return {
    id: 'pricing-1',
    photoShootingId: 'shooting-1',
    packagePriceInCents: PACKAGE,
    packageStudioPriceInCents: STUDIO,
    lightPlayPriceInCents: 5_000_00,
    packageEditedImagesAllowance: 10,
    extraPeopleThreshold: 4,
    extraPeopleRateInCents: 1_000_00,
    extraPetRateInCents: 2_000_00,
    extraEditedImageRateInCents: 3_000_00,
    extraRetouchedImageRateInCents: 4_000_00,
    createdAt: NOW,
    updatedAt: NOW,
  };
}

function makeShooting(
  overrides: Partial<PhotoShooting> & {
    pricing?: PhotoShootingPricing | null;
    adjustments?: PriceAdjustment[];
  } = {},
) {
  return {
    id: 'shooting-1',
    clientId: 'client-1',
    package: 'CLASSIC',
    decorSet: null,
    isLightPlaySelected: false,
    numberOfGuests: 4,
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
    completedAt: null,
    cancelledAt: null,
    createdAt: NOW,
    updatedAt: NOW,
    pricing: makePricing(),
    adjustments: [],
    ...overrides,
  } satisfies Parameters<typeof buildAdminStats>[0]['shootings'][number];
}

describe('buildAdminStats', () => {
  it('returns zeros and every package for empty input', () => {
    expect(buildAdminStats({ shootings: [], ledgerSums: [] })).toEqual({
      expectedIncome: 0,
      income: 0,
      expenses: 0,
      expectedProfit: 0,
      profit: 0,
      missingPricingCount: 0,
      shootings: {
        total: 0,
        cancelled: 0,
        rows: [
          {
            key: 'MINI_WITHOUT_LIGHT_PLAY',
            label: 'Mini',
            count: 0,
          },
          { key: 'MINI_WITH_LIGHT_PLAY', label: 'Mini + fényjáték', count: 0 },
          {
            key: 'CLASSIC_WITHOUT_LIGHT_PLAY',
            label: 'Classic',
            count: 0,
          },
          {
            key: 'CLASSIC_WITH_LIGHT_PLAY',
            label: 'Classic + fényjáték',
            count: 0,
          },
          { key: 'FAMILY', label: 'Family', count: 0 },
          { key: 'PARTY', label: 'Party', count: 0 },
        ],
      },
    });
  });

  it('splits Mini and Classic by light play, but not packages that include it', () => {
    const stats = buildAdminStats({
      shootings: [
        makeShooting({ package: 'MINI' }),
        makeShooting({ package: 'MINI', isLightPlaySelected: true }),
        makeShooting({ package: 'MINI', isLightPlaySelected: true }),
        makeShooting({ package: 'CLASSIC', isLightPlaySelected: true }),
        makeShooting({ package: 'FAMILY' }),
        makeShooting({ package: 'FAMILY', isLightPlaySelected: true }),
      ],
      ledgerSums: [],
    });

    expect(
      Object.fromEntries(
        stats.shootings.rows.map((row) => [row.key, row.count]),
      ),
    ).toEqual({
      MINI_WITHOUT_LIGHT_PLAY: 1,
      MINI_WITH_LIGHT_PLAY: 2,
      CLASSIC_WITHOUT_LIGHT_PLAY: 0,
      CLASSIC_WITH_LIGHT_PLAY: 1,
      FAMILY: 2,
      PARTY: 0,
    });
  });

  it('sums totalToBeInvoiced, including adjustments', () => {
    const stats = buildAdminStats({
      shootings: [
        makeShooting(),
        makeShooting({
          package: 'MINI',
          adjustments: [
            {
              id: 'adjustment-1',
              type: 'DISCOUNT',
              amountInCents: 5_000_00,
              publicLabel: 'Kedvezmény',
              internalNote: 'teszt',
              createdById: null,
              bookingIntentId: null,
              photoShootingId: 'shooting-1',
              createdAt: NOW,
              updatedAt: NOW,
            },
          ],
        }),
      ],
      ledgerSums: [],
    });

    expect(stats.expectedIncome).toBe(2 * BASE - 5_000_00);
    expect(stats.shootings.total).toBe(2);
  });

  it('leaves cancelled shootings out of expected income and counts, but keeps their ledger income', () => {
    const stats = buildAdminStats({
      shootings: [makeShooting(), makeShooting({ status: 'CANCELLED' })],
      ledgerSums: [
        { category: 'INCOME_CLIENT_PAYMENT_DEPOSIT', amountInCents: 20_000_00 },
      ],
    });

    expect(stats.expectedIncome).toBe(BASE);
    expect(stats.income).toBe(20_000_00);
    expect(stats.shootings.total).toBe(1);
    expect(stats.shootings.cancelled).toBe(1);
  });

  it('skips and counts shootings without a price snapshot', () => {
    const stats = buildAdminStats({
      shootings: [makeShooting(), makeShooting({ pricing: null })],
      ledgerSums: [],
    });

    expect(stats.expectedIncome).toBe(BASE);
    expect(stats.missingPricingCount).toBe(1);
    expect(stats.shootings.total).toBe(2);
  });

  it('reports expenses as a magnitude and subtracts them from both profits', () => {
    const stats = buildAdminStats({
      shootings: [makeShooting()],
      ledgerSums: [
        { category: 'INCOME_CLIENT_PAYMENT_DEPOSIT', amountInCents: 20_000_00 },
        { category: 'INCOME_OTHER', amountInCents: 1_000_00 },
        { category: 'EXPENSE_PHOTOGRAPHER_FEE', amountInCents: -8_000_00 },
        { category: 'EXPENSE_RENT', amountInCents: -2_000_00 },
      ],
    });

    expect(stats.income).toBe(21_000_00);
    expect(stats.expenses).toBe(10_000_00);
    expect(stats.profit).toBe(11_000_00);
    expect(stats.expectedProfit).toBe(BASE - 10_000_00);
  });
});
