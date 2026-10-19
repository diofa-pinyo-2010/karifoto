import { Package, PhotoShootingStatus } from '@/generated/prisma/enums';
import { LEDGER_ENTRY_CATEGORY_SIGN } from '@/lib/constants';
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
    byPackage: Record<Package, number>;
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
  const byPackage = Object.fromEntries(
    Object.values(Package).map((pkg) => [pkg, 0]),
  ) as Record<Package, number>;

  let expectedIncome = 0;
  let missingPricingCount = 0;
  let cancelled = 0;

  for (const shooting of shootings) {
    if (shooting.status === PhotoShootingStatus.CANCELLED) {
      cancelled++;
      continue;
    }

    byPackage[shooting.package]++;

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
      byPackage,
    },
  };
}
