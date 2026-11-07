import { describe, expect, it } from 'vitest';

import {
  LedgerEntryCategory,
  PhotoShootingStatus,
} from '@/generated/prisma/enums';
import {
  allocatePayout,
  buildStaffAccount,
  collectDueItems,
} from '@/lib/staff-ledger';

import type { PhotoShootingPricing } from '@/generated/prisma/client';
import type {
  DueItem,
  LedgerPayout,
  LedgerShooting,
  LedgerTap,
} from '@/lib/staff-ledger';

// Synthetic rates, same reasoning as src/lib/staff-fees.test.ts.
const PACKAGE_FEE = 4_000_00;
const PER_EDITED_FEE = 335_00;
const BONUS = 2_000_00;

const ME = 'staff-me';
const OTHER = 'staff-other';

const SHOOTING_TIME = new Date('2026-12-01T10:00:00.000Z');
const T1 = new Date('2026-12-01T11:00:00.000Z');
const T2 = new Date('2026-12-05T11:00:00.000Z');
const T3 = new Date('2026-12-06T11:00:00.000Z');

function makePricing(): PhotoShootingPricing {
  return {
    id: 'pricing-1',
    photoShootingId: 'shooting-1',
    packagePriceInCents: 30_000_00,
    packageStudioPriceInCents: 10_000_00,
    lightPlayPriceInCents: 5_000_00,
    packageEditedImagesAllowance: 10,
    extraPeopleThreshold: 4,
    extraPeopleRateInCents: 1_000_00,
    extraPetRateInCents: 2_000_00,
    extraEditedImageRateInCents: 3_000_00,
    extraRetouchedImageRateInCents: 4_000_00,
    expressPostProductionPriceInCents: 10_000_00,
    photographerPackageFeeInCents: PACKAGE_FEE,
    photographerLightPlayFeeInCents: 500_00,
    photographerExtraPersonFeeInCents: 300_00,
    photographerPetFeeInCents: 700_00,
    editorEditedImageFeeInCents: PER_EDITED_FEE,
    editorRetouchedImageFeeInCents: 1_100_00,
    createdAt: SHOOTING_TIME,
    updatedAt: SHOOTING_TIME,
  };
}

function makeShooting(overrides: Partial<LedgerShooting> = {}): LedgerShooting {
  return {
    id: 'shooting-1',
    package: 'CLASSIC',
    isLightPlaySelected: false,
    numberOfGuests: 4,
    numberOfPets: 0,
    totalEditedImages: 0,
    totalRetouchedImages: 0,
    status: PhotoShootingStatus.RAW_PHOTOS_UPLOAD,
    photographerId: ME,
    editorId: null,
    completedAt: null,
    pricing: makePricing(),
    timeSlot: { startTime: SHOOTING_TIME },
    balancePaidAt: T1,
    ...overrides,
  };
}

function makeTap(overrides: Partial<LedgerTap> = {}): LedgerTap {
  return {
    id: 'tap-1',
    staffProfileId: ME,
    bonusInCents: BONUS,
    reviewUrlSetAt: T3,
    ...overrides,
  };
}

function makeItem(
  id: string,
  dueAt: Date,
  amountInCents = PACKAGE_FEE,
): DueItem {
  return {
    key: `${LedgerEntryCategory.EXPENSE_PHOTOGRAPHER_FEE}:${id}`,
    kind: 'PHOTOGRAPHER_FEE',
    category: LedgerEntryCategory.EXPENSE_PHOTOGRAPHER_FEE,
    dueAt,
    amountInCents,
    photoShootingId: id,
    reviewTapId: null,
  };
}

function makePayout(
  createdAt: Date,
  covers: { item: DueItem; amountInCents: number }[],
): LedgerPayout {
  return {
    id: `payout-${createdAt.toISOString()}`,
    amountInCents: covers.reduce((sum, c) => sum + c.amountInCents, 0),
    method: 'CASH',
    note: null,
    createdAt,
    ledgerEntries: covers.map(({ item, amountInCents }) => ({
      category: item.category,
      amountInCents: -amountInCents,
      photoShootingId: item.photoShootingId,
      reviewTapId: item.reviewTapId,
    })),
  };
}

describe('collectDueItems', () => {
  it('makes the photographer fee due at the balance payment', () => {
    const items = collectDueItems(ME, [makeShooting()], []);

    expect(items).toEqual([
      {
        key: 'EXPENSE_PHOTOGRAPHER_FEE:shooting-1',
        kind: 'PHOTOGRAPHER_FEE',
        category: LedgerEntryCategory.EXPENSE_PHOTOGRAPHER_FEE,
        dueAt: T1,
        amountInCents: PACKAGE_FEE,
        photoShootingId: 'shooting-1',
        reviewTapId: null,
      },
    ]);
  });

  it('makes the photographer fee due at the shooting time when there was nothing to collect', () => {
    const items = collectDueItems(
      ME,
      [makeShooting({ balancePaidAt: null })],
      [],
    );

    expect(items.map((item) => item.dueAt)).toEqual([SHOOTING_TIME]);
  });

  it('does not make the photographer fee due while waiting for the balance', () => {
    const items = collectDueItems(
      ME,
      [
        makeShooting({
          status: PhotoShootingStatus.WAITING_FOR_BALANCE_PAYMENT,
          balancePaidAt: null,
        }),
      ],
      [],
    );

    expect(items).toEqual([]);
  });

  it('makes the editor fee due only when completed', () => {
    const editing = {
      photographerId: OTHER,
      editorId: ME,
      totalEditedImages: 10,
    };

    expect(
      collectDueItems(
        ME,
        [
          makeShooting({
            ...editing,
            status: PhotoShootingStatus.EDITOR_SELECTION,
          }),
        ],
        [],
      ),
    ).toEqual([]);

    const items = collectDueItems(
      ME,
      [
        makeShooting({
          ...editing,
          status: PhotoShootingStatus.COMPLETED,
          completedAt: T2,
        }),
      ],
      [],
    );
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      kind: 'EDITOR_FEE',
      category: LedgerEntryCategory.EXPENSE_EDITOR_FEE,
      key: 'EXPENSE_EDITOR_FEE:shooting-1',
      dueAt: T2,
      amountInCents: 10 * PER_EDITED_FEE,
    });
  });

  it('makes photographer and editor on the same shooting two items', () => {
    const items = collectDueItems(
      ME,
      [
        makeShooting({
          editorId: ME,
          totalEditedImages: 1,
          status: PhotoShootingStatus.COMPLETED,
          completedAt: T2,
        }),
      ],
      [],
    );

    expect(items.map((item) => item.kind).toSorted()).toEqual([
      'EDITOR_FEE',
      'PHOTOGRAPHER_FEE',
    ]);
  });

  it('gives nothing for cancelled shootings and shootings without pricing', () => {
    const items = collectDueItems(
      ME,
      [
        makeShooting({ status: PhotoShootingStatus.CANCELLED }),
        makeShooting({ id: 'shooting-2', pricing: null }),
      ],
      [],
    );

    expect(items).toEqual([]);
  });

  it('makes the review bonus due once the url is set', () => {
    const items = collectDueItems(
      ME,
      [],
      [
        makeTap(),
        makeTap({ id: 'tap-2', reviewUrlSetAt: null, bonusInCents: null }),
        makeTap({ id: 'tap-3', staffProfileId: OTHER }),
      ],
    );

    expect(items).toEqual([
      {
        key: 'EXPENSE_STAFF_BONUS:tap-1',
        kind: 'REVIEW_BONUS',
        category: LedgerEntryCategory.EXPENSE_STAFF_BONUS,
        dueAt: T3,
        amountInCents: BONUS,
        photoShootingId: null,
        reviewTapId: 'tap-1',
      },
    ]);
  });
});

describe('buildStaffAccount', () => {
  it('is items minus payouts, newest first', () => {
    const items = Array.from({ length: 8 }, (_, i) =>
      makeItem(`shooting-${i}`, new Date(T1.getTime() + i * 60_000)),
    );
    const payout = makePayout(
      T2,
      items.map((item) => ({ item, amountInCents: PACKAGE_FEE })),
    );

    const account = buildStaffAccount(items, [payout]);

    expect(account.dueInCents).toBe(0);
    expect(account.paidTotalInCents).toBe(32_000_00);
    expect(account.paidByCategory).toEqual({
      EXPENSE_PHOTOGRAPHER_FEE: 32_000_00,
      EXPENSE_EDITOR_FEE: 0,
      EXPENSE_STAFF_BONUS: 0,
    });
    expect(account.rows).toHaveLength(9);
    expect(account.rows[0]).toMatchObject({ type: 'PAYOUT', balanceAfter: 0 });
    expect(account.rows[1]).toMatchObject({
      type: 'ITEM',
      balanceAfter: 32_000_00,
    });
    for (const row of account.rows.slice(1)) {
      expect(row).toMatchObject({ type: 'ITEM', state: 'PAID' });
    }
  });

  it('marks a partly paid item PARTIAL', () => {
    const item = makeItem('shooting-1', T1);
    const account = buildStaffAccount(
      [item],
      [makePayout(T2, [{ item, amountInCents: 1_000_00 }])],
    );

    expect(account.dueInCents).toBe(3_000_00);
    expect(account.rows[1]).toMatchObject({
      type: 'ITEM',
      state: 'PARTIAL',
      paidInCents: 1_000_00,
    });
  });

  it('marks an unpaid item DUE', () => {
    const account = buildStaffAccount([makeItem('shooting-1', T1)], []);

    expect(account.rows[0]).toMatchObject({ state: 'DUE', paidInCents: 0 });
  });

  it('goes negative when an item disappears after its payout', () => {
    const gone = makeItem('shooting-1', T1);
    const account = buildStaffAccount(
      [],
      [makePayout(T2, [{ item: gone, amountInCents: PACKAGE_FEE }])],
    );

    expect(account.dueInCents).toBe(-PACKAGE_FEE);
  });
});

describe('allocatePayout', () => {
  const a = makeItem('shooting-a', T1);
  const b = makeItem('shooting-b', T2);
  const c: DueItem = {
    ...makeItem('tap-c', T3, BONUS),
    key: 'EXPENSE_STAFF_BONUS:tap-c',
    kind: 'REVIEW_BONUS',
    category: LedgerEntryCategory.EXPENSE_STAFF_BONUS,
    photoShootingId: null,
    reviewTapId: 'tap-c',
  };
  const later = new Date('2026-12-10T11:00:00.000Z');

  it('pays the oldest items first', () => {
    expect(allocatePayout([c, b, a], [], 6_000_00)).toEqual({
      ok: true,
      allocations: [
        { item: a, amountInCents: 4_000_00 },
        { item: b, amountInCents: 2_000_00 },
      ],
    });
  });

  it('skips items already paid', () => {
    const earlier = makePayout(later, [{ item: a, amountInCents: 4_000_00 }]);

    expect(allocatePayout([a, b, c], [earlier], 4_000_00)).toEqual({
      ok: true,
      allocations: [{ item: b, amountInCents: 4_000_00 }],
    });
  });

  it('continues a partly paid item', () => {
    const earlier = makePayout(later, [{ item: a, amountInCents: 1_000_00 }]);

    expect(allocatePayout([a, b, c], [earlier], 3_000_00)).toEqual({
      ok: true,
      allocations: [{ item: a, amountInCents: 3_000_00 }],
    });
  });

  it('rejects more than the due balance', () => {
    expect(allocatePayout([a, b, c], [], 10_000_01)).toMatchObject({
      ok: false,
    });
    expect(allocatePayout([a, b, c], [], 10_000_00)).toMatchObject({
      ok: true,
    });
  });

  it('rejects zero, negative and fractional amounts', () => {
    for (const amount of [0, -1_00, 1.5]) {
      expect(allocatePayout([a], [], amount)).toMatchObject({ ok: false });
    }
  });

  it('rejects any amount when the balance is negative', () => {
    const overpaid = makePayout(later, [
      { item: makeItem('gone', T1), amountInCents: 4_000_00 },
    ]);

    expect(allocatePayout([], [overpaid], 1_00)).toMatchObject({ ok: false });
  });
});
