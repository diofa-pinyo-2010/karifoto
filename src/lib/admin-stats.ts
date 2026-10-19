import { Package, PhotoShootingStatus } from '@/generated/prisma/enums';
import {
  isLightPlayChargeable,
  LEDGER_ENTRY_CATEGORY_SIGN,
  PACKAGE_LABEL,
} from '@/lib/constants';
import { calculatePricing } from '@/server/pricing';

import type {
  PhotoShooting,
  PhotoShootingPricing,
  PriceAdjustment,
} from '@/generated/prisma/client';
import type { LedgerEntryCategory } from '@/generated/prisma/enums';

export const ADMIN_STATS_TAG = 'admin-stats';

type StatsShooting = PhotoShooting & {
  pricing: PhotoShootingPricing | null;
  adjustments: PriceAdjustment[];
};

type LedgerSum = {
  category: LedgerEntryCategory;
  amountInCents: number;
};

type AdminStats = {
  expectedIncome: number;
  income: number;
  /** Positive magnitude, although the ledger stores expenses as negative. */
  expenses: number;
  expectedProfit: number;
  profit: number;
  /** Non-cancelled shootings without a price snapshot, left out of `expectedIncome`. */
  missingPricingCount: number;
  shootings: {
    total: number;
    cancelled: number;
    /**
     * One row per package, except where light play is an extra (Mini, Classic):
     * those split into with and without light play.
     */
    rows: { key: string; label: string; count: number }[];
  };
};

/**
 * All-time money and shooting figures for /admin/stats.
 *
 * Expected income is what every non-cancelled shooting will be invoiced in
 * total, so it grows as image selections add extras. Income and expenses come
 * from the ledger alone: a cancelled shooting's kept deposit is still income.
 */
export function buildAdminStats({
  shootings,
  ledgerSums,
}: {
  shootings: StatsShooting[];
  ledgerSums: LedgerSum[];
}): AdminStats {
  const counts = new Map<string, number>();

  let expectedIncome = 0;
  let missingPricingCount = 0;
  let cancelled = 0;

  for (const shooting of shootings) {
    if (shooting.status === PhotoShootingStatus.CANCELLED) {
      cancelled++;
      continue;
    }

    const key = rowKey(shooting.package, shooting.isLightPlaySelected);
    counts.set(key, (counts.get(key) ?? 0) + 1);

    if (!shooting.pricing) {
      missingPricingCount++;
      continue;
    }

    // totalToBeInvoiced does not depend on payments, so the ledger is not loaded.
    expectedIncome += calculatePricing({
      pricing: shooting.pricing,
      shooting,
      adjustments: shooting.adjustments,
      ledgerEntries: [],
    }).totalToBeInvoiced;
  }

  let income = 0;
  let expenses = 0;
  for (const { category, amountInCents } of ledgerSums) {
    if (LEDGER_ENTRY_CATEGORY_SIGN[category] === 1) {
      income += amountInCents;
    } else {
      expenses -= amountInCents;
    }
  }

  return {
    expectedIncome,
    income,
    expenses,
    expectedProfit: expectedIncome - expenses,
    profit: income - expenses,
    missingPricingCount,
    shootings: {
      total: shootings.length - cancelled,
      cancelled,
      rows: Object.values(Package).flatMap((pkg) =>
        (isLightPlayChargeable(pkg) ? [false, true] : [false]).map(
          (withLightPlay) => {
            const key = rowKey(pkg, withLightPlay);
            return {
              key,
              label: rowLabel(pkg, withLightPlay),
              count: counts.get(key) ?? 0,
            };
          },
        ),
      ),
    },
  };
}

// Where light play is part of the package, `isLightPlaySelected` says nothing
// about the price, so those packages get a single row.
function rowKey(pkg: Package, isLightPlaySelected: boolean) {
  if (!isLightPlayChargeable(pkg)) return pkg;
  return `${pkg}_${isLightPlaySelected ? 'WITH' : 'WITHOUT'}_LIGHT_PLAY`;
}

function rowLabel(pkg: Package, withLightPlay: boolean) {
  if (!isLightPlayChargeable(pkg)) return PACKAGE_LABEL[pkg];
  return withLightPlay
    ? `${PACKAGE_LABEL[pkg]} + fényjáték`
    : PACKAGE_LABEL[pkg];
}
