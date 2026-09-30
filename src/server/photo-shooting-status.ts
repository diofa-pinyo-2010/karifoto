import {
  LedgerEntry,
  LedgerEntryCategory,
  PhotoShooting,
  PhotoShootingPricing,
  PhotoShootingStatus,
  PriceAdjustment,
} from '@/generated/prisma/client';
import { calculateRemainingAmount } from '@/server/pricing';

/**
 * Lives outside `admin.ts` because that file is `'use server'`, where every
 * export must be an async function — so a synchronous decision function cannot
 * be exported from it, and therefore cannot be tested. The status machine is
 * the most consequential pure logic in the admin area, so it lives here
 * instead, next to `pricing.ts`.
 */
export type ResolveStatusArgs = {
  current: PhotoShooting & { timeSlot: { startTime: Date } };
  updates: Partial<PhotoShooting>;
  pricing: PhotoShootingPricing;
  adjustments: PriceAdjustment[];
  ledgerEntries: LedgerEntry[];
  /** Injectable so tests do not depend on the wall clock. */
  now?: Date;
};

/**
 * Derives a shooting's status from scratch, every time — nothing is stored and
 * then advanced, so the order of these checks *is* the workflow.
 *
 * The two payment gates deliberately ask different questions. `toBePaid > 0`
 * alone cannot distinguish the balance owed at the shooting (cash or SumUp, in
 * person) from extras owed after delivery (Stripe only), so the first gate also
 * requires that no balance payment has been recorded yet. Without that, a
 * `COMPLETED` shooting whose client later orders extra images would fall back
 * into the balance state and be offered cash and card for money that must go
 * through Stripe.
 */
export function resolveStatus({
  current,
  updates,
  pricing,
  adjustments,
  ledgerEntries,
  now = new Date(),
}: ResolveStatusArgs): PhotoShootingStatus {
  const merged = { ...current, ...updates };

  const isBalanceCollected = ledgerEntries.some(
    (entry) =>
      entry.category === LedgerEntryCategory.INCOME_CLIENT_PAYMENT_BALANCE,
  );

  if (merged.closedAt != null) {
    return PhotoShootingStatus.CLOSED;
  }

  if (merged.photographerId == null) {
    return PhotoShootingStatus.PHOTOGRAPHER_SELECTION;
  }

  if (merged.timeSlot.startTime > now) {
    return PhotoShootingStatus.WAITING_FOR_THE_DATE;
  }

  const toBePaid = calculateRemainingAmount({
    pricing,
    shooting: merged,
    adjustments,
    ledgerEntries,
  });

  if (!isBalanceCollected && toBePaid > 0) {
    return PhotoShootingStatus.WAITING_FOR_BALANCE_PAYMENT;
  }

  if (merged.rawImagesUrl == null) {
    return PhotoShootingStatus.RAW_PHOTOS_UPLOAD;
  }

  if (merged.editorId == null) {
    return PhotoShootingStatus.EDITOR_SELECTION;
  }

  if (merged.finalImagesUrl == null) {
    return PhotoShootingStatus.FINAL_PHOTOS_UPLOAD;
  }

  if (toBePaid > 0) {
    return PhotoShootingStatus.WAITING_FOR_EXTRA_PAYMENT;
  }

  return PhotoShootingStatus.COMPLETED;
}
