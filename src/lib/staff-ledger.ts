import {
  LedgerEntryCategory,
  PhotoShootingStatus,
} from '@/generated/prisma/enums';
import { isStatusBefore } from '@/lib/constants';
import { calculateEditorFee, calculatePhotographerFee } from '@/lib/staff-fees';

import type {
  LedgerEntry,
  PhotoShooting,
  PhotoShootingPricing,
  ReviewTap,
  StaffPayout,
} from '@/generated/prisma/client';

type DueItemKind = 'PHOTOGRAPHER_FEE' | 'EDITOR_FEE' | 'REVIEW_BONUS';

type StaffPayoutCategory =
  | typeof LedgerEntryCategory.EXPENSE_PHOTOGRAPHER_FEE
  | typeof LedgerEntryCategory.EXPENSE_EDITOR_FEE
  | typeof LedgerEntryCategory.EXPENSE_STAFF_BONUS;

/** Something a staff member has earned and can be paid for. */
export type DueItem = {
  /** `${category}:${photoShootingId ?? reviewTapId}` — what payouts match on. */
  key: string;
  kind: DueItemKind;
  category: StaffPayoutCategory;
  dueAt: Date;
  amountInCents: number;
  photoShootingId: string | null;
  reviewTapId: string | null;
};

export type LedgerShooting = Pick<
  PhotoShooting,
  | 'id'
  | 'package'
  | 'isLightPlaySelected'
  | 'numberOfGuests'
  | 'numberOfPets'
  | 'totalEditedImages'
  | 'totalRetouchedImages'
  | 'status'
  | 'photographerId'
  | 'editorId'
  | 'completedAt'
> & {
  pricing: PhotoShootingPricing | null;
  timeSlot: { startTime: Date };
  /** When its INCOME_CLIENT_PAYMENT_BALANCE row was recorded, if ever. */
  balancePaidAt: Date | null;
};

export type LedgerTap = Pick<
  ReviewTap,
  'id' | 'staffProfileId' | 'bonusInCents' | 'reviewUrlSetAt'
>;

type PaidLedgerEntry = Pick<
  LedgerEntry,
  'category' | 'amountInCents' | 'photoShootingId' | 'reviewTapId'
>;

export type LedgerPayout = Pick<
  StaffPayout,
  'id' | 'amountInCents' | 'method' | 'note' | 'createdAt'
> & {
  ledgerEntries: PaidLedgerEntry[];
};

type ItemPaidState = 'DUE' | 'PARTIAL' | 'PAID';

export type AccountRow =
  | {
      type: 'ITEM';
      at: Date;
      item: DueItem;
      paidInCents: number;
      state: ItemPaidState;
      balanceAfter: number;
    }
  | { type: 'PAYOUT'; at: Date; payout: LedgerPayout; balanceAfter: number };

type StaffAccount = {
  /** Earned minus paid out. Negative when a fee shrank after it was paid. */
  dueInCents: number;
  paidTotalInCents: number;
  paidByCategory: Record<StaffPayoutCategory, number>;
  /** Newest first. */
  rows: AccountRow[];
};

function itemKey(
  category: LedgerEntryCategory,
  photoShootingId: string | null,
  reviewTapId: string | null,
) {
  return `${category}:${photoShootingId ?? reviewTapId}`;
}

/**
 * Everything one staff member has earned so far, each with the moment it
 * became payable:
 *
 * - photographer fee — when the balance payment was recorded. A shooting with
 *   nothing left to collect never gets that row, so once it is past the
 *   balance gate the fee is due at the shooting time instead.
 * - editor fee — when the shooting is completed.
 * - review bonus — when the tap's review URL was filled in.
 *
 * Cancelled shootings, shootings without a pricing snapshot and zero fees
 * earn nothing.
 */
export function collectDueItems(
  staffProfileId: string,
  shootings: LedgerShooting[],
  taps: LedgerTap[],
): DueItem[] {
  const items: DueItem[] = [];

  for (const shooting of shootings) {
    const { pricing } = shooting;
    if (shooting.status === PhotoShootingStatus.CANCELLED) continue;
    if (pricing == null) continue;

    if (shooting.photographerId === staffProfileId) {
      const dueAt =
        shooting.balancePaidAt ??
        (isStatusBefore(shooting.status, PhotoShootingStatus.RAW_PHOTOS_UPLOAD)
          ? null
          : shooting.timeSlot.startTime);
      if (dueAt != null) {
        items.push(
          shootingItem(
            'PHOTOGRAPHER_FEE',
            LedgerEntryCategory.EXPENSE_PHOTOGRAPHER_FEE,
            shooting.id,
            dueAt,
            calculatePhotographerFee(pricing, shooting),
          ),
        );
      }
    }

    if (
      shooting.editorId === staffProfileId &&
      shooting.status === PhotoShootingStatus.COMPLETED
    ) {
      items.push(
        shootingItem(
          'EDITOR_FEE',
          LedgerEntryCategory.EXPENSE_EDITOR_FEE,
          shooting.id,
          shooting.completedAt ?? shooting.timeSlot.startTime,
          calculateEditorFee(pricing, shooting),
        ),
      );
    }
  }

  for (const tap of taps) {
    if (tap.staffProfileId !== staffProfileId) continue;
    if (tap.reviewUrlSetAt == null || tap.bonusInCents == null) continue;

    const category = LedgerEntryCategory.EXPENSE_STAFF_BONUS;
    items.push({
      key: itemKey(category, null, tap.id),
      kind: 'REVIEW_BONUS',
      category,
      dueAt: tap.reviewUrlSetAt,
      amountInCents: tap.bonusInCents,
      photoShootingId: null,
      reviewTapId: tap.id,
    });
  }

  return items.filter((item) => item.amountInCents > 0);
}

function shootingItem(
  kind: DueItemKind,
  category: StaffPayoutCategory,
  photoShootingId: string,
  dueAt: Date,
  amountInCents: number,
): DueItem {
  return {
    key: itemKey(category, photoShootingId, null),
    kind,
    category,
    dueAt,
    amountInCents,
    photoShootingId,
    reviewTapId: null,
  };
}

/** How much has been paid towards each item, keyed like `DueItem.key`. */
function paidByItemKey(payouts: LedgerPayout[]) {
  const paid = new Map<string, number>();
  for (const payout of payouts) {
    for (const entry of payout.ledgerEntries) {
      const key = itemKey(
        entry.category,
        entry.photoShootingId,
        entry.reviewTapId,
      );
      // Expense rows are stored negative.
      paid.set(key, (paid.get(key) ?? 0) - entry.amountInCents);
    }
  }
  return paid;
}

/**
 * The staff member's account like a bank statement: every item adds, every
 * payout subtracts, in time order, with the running balance after each row.
 * On a tie the item comes first, so a payout made right as something became
 * due still reads as covering it.
 */
export function buildStaffAccount(
  items: DueItem[],
  payouts: LedgerPayout[],
): StaffAccount {
  const paid = paidByItemKey(payouts);

  const events = [
    ...items.map((item) => ({ at: item.dueAt, order: 0, item })),
    ...payouts.map((payout) => ({ at: payout.createdAt, order: 1, payout })),
  ].sort((a, b) => a.at.getTime() - b.at.getTime() || a.order - b.order);

  let balance = 0;
  const rows: AccountRow[] = events.map((event) => {
    if ('item' in event) {
      const { item } = event;
      balance += item.amountInCents;
      const paidInCents = paid.get(item.key) ?? 0;
      return {
        type: 'ITEM',
        at: event.at,
        item,
        paidInCents,
        state:
          paidInCents >= item.amountInCents
            ? 'PAID'
            : paidInCents > 0
              ? 'PARTIAL'
              : 'DUE',
        balanceAfter: balance,
      };
    }
    balance -= event.payout.amountInCents;
    return {
      type: 'PAYOUT',
      at: event.at,
      payout: event.payout,
      balanceAfter: balance,
    };
  });

  const paidByCategory: Record<StaffPayoutCategory, number> = {
    EXPENSE_PHOTOGRAPHER_FEE: 0,
    EXPENSE_EDITOR_FEE: 0,
    EXPENSE_STAFF_BONUS: 0,
  };
  for (const payout of payouts) {
    for (const entry of payout.ledgerEntries) {
      if (entry.category in paidByCategory) {
        paidByCategory[entry.category as StaffPayoutCategory] -=
          entry.amountInCents;
      }
    }
  }

  return {
    dueInCents: balance,
    paidTotalInCents: payouts.reduce(
      (sum, payout) => sum + payout.amountInCents,
      0,
    ),
    paidByCategory,
    rows: rows.reverse(),
  };
}
