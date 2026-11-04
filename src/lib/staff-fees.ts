import {
  LedgerEntryCategory,
  PhotoShootingStatus,
} from '@/generated/prisma/enums';
import { isLightPlayChargeable, isStatusBefore } from '@/lib/constants';

import type {
  LedgerEntry,
  PhotoShooting,
  PhotoShootingPricing,
} from '@/generated/prisma/client';

type FeeShooting = Pick<
  PhotoShooting,
  | 'package'
  | 'isLightPlaySelected'
  | 'numberOfGuests'
  | 'numberOfPets'
  | 'totalEditedImages'
  | 'totalRetouchedImages'
>;

/**
 * Light play only earns the photographer extra when the client paid extra for
 * it — in Family and Party it is part of the package fee.
 */
export function calculatePhotographerFee(
  pricing: PhotoShootingPricing,
  shooting: FeeShooting,
) {
  const lightPlay =
    isLightPlayChargeable(shooting.package) && shooting.isLightPlaySelected
      ? pricing.photographerLightPlayFeeInCents
      : 0;

  const extraPeople = Math.max(
    0,
    shooting.numberOfGuests - pricing.extraPeopleThreshold,
  );

  return (
    pricing.photographerPackageFeeInCents +
    lightPlay +
    extraPeople * pricing.photographerExtraPersonFeeInCents +
    shooting.numberOfPets * pricing.photographerPetFeeInCents
  );
}

/** Every edited image is paid, not only the ones above the package allowance. */
export function calculateEditorFee(
  pricing: PhotoShootingPricing,
  shooting: FeeShooting,
) {
  return (
    shooting.totalEditedImages * pricing.editorEditedImageFeeInCents +
    shooting.totalRetouchedImages * pricing.editorRetouchedImageFeeInCents
  );
}

type OwnFeeShooting = FeeShooting &
  Pick<PhotoShooting, 'status' | 'photographerId' | 'editorId'> & {
    pricing: PhotoShootingPricing | null;
  };

type OwnShootingFees = {
  /** `null` when this staff member is not the shooting's photographer. */
  photographerFeeInCents: number | null;
  /** `null` when this staff member is not the shooting's editor. */
  editorFeeInCents: number | null;
  totalInCents: number;
};

/**
 * One staff member's fees on one shooting — never a colleague's. Cancelled
 * shootings and shootings without a pricing snapshot earn 0.
 */
export function calculateOwnShootingFees(
  staffProfileId: string,
  shooting: OwnFeeShooting,
): OwnShootingFees {
  const { pricing } = shooting;
  const earns = (calculateFee: typeof calculatePhotographerFee) =>
    pricing == null || shooting.status === PhotoShootingStatus.CANCELLED
      ? 0
      : calculateFee(pricing, shooting);

  const photographerFeeInCents =
    shooting.photographerId === staffProfileId
      ? earns(calculatePhotographerFee)
      : null;
  const editorFeeInCents =
    shooting.editorId === staffProfileId ? earns(calculateEditorFee) : null;

  return {
    photographerFeeInCents,
    editorFeeInCents,
    totalInCents: (photographerFeeInCents ?? 0) + (editorFeeInCents ?? 0),
  };
}

export type StaffFeeTotals = {
  expectedInCents: number;
  dueInCents: number;
  paidInCents: number;
};

type StaffFeeShooting = FeeShooting &
  Pick<PhotoShooting, 'status' | 'photographerId' | 'editorId'> & {
    pricing: PhotoShootingPricing | null;
    ledgerEntries: Pick<
      LedgerEntry,
      'category' | 'amountInCents' | 'staffProfileId'
    >[];
  };

type Role = {
  assigneeId: (shooting: StaffFeeShooting) => string | null;
  category: LedgerEntryCategory;
  calculateFee: typeof calculatePhotographerFee;
  isDue: (status: PhotoShootingStatus) => boolean;
};

const ROLES: Role[] = [
  {
    assigneeId: (shooting) => shooting.photographerId,
    category: LedgerEntryCategory.EXPENSE_PHOTOGRAPHER_FEE,
    calculateFee: calculatePhotographerFee,
    // Due once the client has settled the balance, i.e. the shooting has moved
    // past WAITING_FOR_BALANCE_PAYMENT.
    isDue: (status) =>
      !isStatusBefore(status, PhotoShootingStatus.RAW_PHOTOS_UPLOAD),
  },
  {
    assigneeId: (shooting) => shooting.editorId,
    category: LedgerEntryCategory.EXPENSE_EDITOR_FEE,
    calculateFee: calculateEditorFee,
    isDue: (status) => status === PhotoShootingStatus.COMPLETED,
  },
];

/**
 * Splits one staff member's fees into three disjoint buckets: not yet earned
 * (expected), earned but not paid out (due), and paid out. A partial payout
 * just moves part of the fee into `paid`.
 *
 * A payout counts when it is an expense row of the role's category with this
 * staff member's id — one person can photograph *and* edit the same shooting,
 * so the category is what tells the two fees apart.
 *
 * Cancelled shootings count 0 everywhere, as do shootings without a pricing
 * snapshot.
 */
export function summarizeStaffFees(
  staffProfileId: string,
  shootings: StaffFeeShooting[],
): StaffFeeTotals {
  const totals: StaffFeeTotals = {
    expectedInCents: 0,
    dueInCents: 0,
    paidInCents: 0,
  };

  for (const shooting of shootings) {
    if (shooting.status === PhotoShootingStatus.CANCELLED) continue;
    if (shooting.pricing == null) continue;

    for (const role of ROLES) {
      if (role.assigneeId(shooting) !== staffProfileId) continue;

      const fee = role.calculateFee(shooting.pricing, shooting);

      // Expense rows are stored negative.
      const paid = -shooting.ledgerEntries
        .filter(
          (entry) =>
            entry.category === role.category &&
            entry.staffProfileId === staffProfileId,
        )
        .reduce((sum, entry) => sum + entry.amountInCents, 0);

      const remaining = Math.max(0, fee - paid);

      totals.paidInCents += paid;
      if (role.isDue(shooting.status)) {
        totals.dueInCents += remaining;
      } else {
        totals.expectedInCents += remaining;
      }
    }
  }

  return totals;
}
