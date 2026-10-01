import { PhotoShootingStatus } from '@/generated/prisma/enums';
import { isBalanceCollected } from '@/lib/utils';
import { calculatePricing } from '@/server/pricing';

import type {
  LedgerEntry,
  PhotoShooting,
  PhotoShootingPricing,
  PriceAdjustment,
} from '@/generated/prisma/client';

export type ResolveCashBalancePaymentArgs = {
  status: PhotoShootingStatus;
  /** Nullable a sémában, ezért itt is az. */
  pricing: PhotoShootingPricing | null;
  shooting: PhotoShooting;
  adjustments: PriceAdjustment[];
  ledgerEntries: LedgerEntry[];
};

export type CashBalancePaymentDecision =
  | { ok: true; amountInCents: number }
  | { ok: false; error: string };

/**
 * Átvehetünk-e készpénzt erre a fotózásra, és mennyit.
 *
 * Saját, `prisma`-mentes fájlban lakik, nem a `'use server'` action mellett:
 * egyrészt egy `'use server'` modul csak async függvényeket exportálhat,
 * másrészt ez a feladat egyetlen kockázatos döntése, tehát tesztelhetőnek kell
 * lennie — lásd a CLAUDE.md-t erről a mintáról.
 *
 * Az összeget mindig **itt** számoljuk, a pillanatképből: a kliens által
 * küldött összegben nem bízunk.
 */
export function resolveCashBalancePayment({
  status,
  pricing,
  shooting,
  adjustments,
  ledgerEntries,
}: ResolveCashBalancePaymentArgs): CashBalancePaymentDecision {
  if (status !== PhotoShootingStatus.WAITING_FOR_BALANCE_PAYMENT) {
    return {
      error: 'Ennél a fotózásnál most nem vehető át a hátralék készpénzben.',
      ok: false,
    };
  }

  if (isBalanceCollected(ledgerEntries)) {
    return { error: 'A hátralék már rögzítve van.', ok: false };
  }

  if (pricing == null) {
    return {
      error: 'A fotózáshoz nincs árazás mentve, szólj a fejlesztőnek.',
      ok: false,
    };
  }

  const { totalToBePaid } = calculatePricing({
    adjustments,
    ledgerEntries,
    pricing,
    shooting,
  });

  // Túlfizetésnél negatív összeg jönne ki: azt semmiképp nem írjuk a ledgerbe.
  if (totalToBePaid <= 0) {
    return { error: 'Nincs fizetnivaló ezen a fotózáson.', ok: false };
  }

  return { amountInCents: totalToBePaid, ok: true };
}
