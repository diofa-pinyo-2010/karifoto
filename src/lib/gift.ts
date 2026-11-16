// Client-safe (no node:crypto, no env): shared by the gift page, the admin
// and Vitest. Code generation lives in token.ts because it needs node:crypto.
import {
  LedgerEntryCategory,
  PhotoShootingStatus,
} from '@/generated/prisma/enums';
import { LEDGER_ENTRY_CATEGORY_SIGN } from '@/lib/constants';
import { stripLoginCodeSeparators } from '@/lib/login-code';

import type { LedgerEntry } from '@/generated/prisma/client';

// Crockford base32: no I, L, O, U.
export const GIFT_CODE_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

const GIFT_CODE_PATTERN = /^[0-9A-HJKMNP-TV-Z]{8}$/;

// 'KF7MQ2XR' → 'KF7M-Q2XR'
export function formatGiftCode(code: string) {
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

// A pasted code may be lowercase or carry the dash/space; anything else that
// isn't exactly 8 alphabet characters is not a code.
export function normalizeGiftCode(input: unknown): string | null {
  if (typeof input !== 'string') {
    return null;
  }

  const code = stripLoginCodeSeparators(input).trim().toUpperCase();
  return GIFT_CODE_PATTERN.test(code) ? code : null;
}

export function giftRedeemPath(code: string) {
  return `/ajandek/${formatGiftCode(code)}`;
}

export const GIFT_TRANSFERABLE_STATUSES: readonly PhotoShootingStatus[] = [
  PhotoShootingStatus.PHOTOGRAPHER_SELECTION,
  PhotoShootingStatus.WAITING_FOR_THE_DATE,
  PhotoShootingStatus.WAITING_FOR_BALANCE_PAYMENT,
  PhotoShootingStatus.RAW_PHOTOS_UPLOAD,
];

// Transferable only while nothing is owed and every income row already has its
// invoice, so the invoice is issued to the original buyer, not the recipient.
export function isGiftTransferable(input: {
  status: PhotoShootingStatus;
  totalToBePaidInCents: number;
  ledgerEntries: Pick<LedgerEntry, 'category' | 'invoiceId'>[];
}) {
  return (
    GIFT_TRANSFERABLE_STATUSES.includes(input.status) &&
    input.totalToBePaidInCents <= 0 &&
    input.ledgerEntries.every(
      (entry) =>
        LEDGER_ENTRY_CATEGORY_SIGN[entry.category] !== 1 ||
        entry.invoiceId != null,
    )
  );
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

// Typing an address proves nothing, so a session is only ever minted for an
// email nobody owned before — otherwise whoever holds the gift link could open
// that person's portal. An existing user gets in through the emailed link.
export function planGiftRedemption(input: {
  submittedEmail: string;
  currentClientEmail: string;
  existingUser: boolean;
}): { ok: false; error: string } | { ok: true; logIn: boolean } {
  if (
    normalizeEmail(input.submittedEmail) ===
    normalizeEmail(input.currentClientEmail)
  ) {
    return {
      ok: false,
      error: 'Ezt az ajándékot nem adhatod saját magadnak.',
    };
  }

  return { ok: true, logIn: !input.existingUser };
}

// A redeemed gift (purchasedById set) belongs to the recipient, but the buyer's
// invoices — issued to the buyer's name and address — still hang off the
// shooting. The recipient's portal lists only the invoices of their own extra
// payments; staff views keep showing everything.
export function invoicesVisibleToClient<
  T extends { ledgerEntry: Pick<LedgerEntry, 'category'> | null },
>(invoices: T[], purchasedById: string | null): T[] {
  if (purchasedById == null) {
    return invoices;
  }

  return invoices.filter(
    (invoice) =>
      invoice.ledgerEntry?.category ===
      LedgerEntryCategory.INCOME_CLIENT_PAYMENT_EXTRA,
  );
}
