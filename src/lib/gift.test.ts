import { describe, expect, it } from 'vitest';

import {
  LedgerEntryCategory,
  PhotoShootingStatus,
} from '@/generated/prisma/enums';
import {
  formatGiftCode,
  GIFT_TRANSFERABLE_STATUSES,
  giftRedeemPath,
  isGiftTransferable,
  normalizeGiftCode,
  planGiftRedemption,
} from '@/lib/gift';

const paidFull = {
  category: LedgerEntryCategory.INCOME_CLIENT_PAYMENT_FULL,
  invoiceId: 'inv_1',
};

function input(
  overrides: Partial<Parameters<typeof isGiftTransferable>[0]> = {},
) {
  return {
    status: PhotoShootingStatus.WAITING_FOR_THE_DATE,
    totalToBePaidInCents: 0,
    ledgerEntries: [paidFull],
    ...overrides,
  };
}

describe('gift code format', () => {
  it('formats as XXXX-XXXX', () =>
    expect(formatGiftCode('KF7MQ2XR')).toBe('KF7M-Q2XR'));
  it('builds the redeem path', () =>
    expect(giftRedeemPath('KF7MQ2XR')).toBe('/ajandek/KF7M-Q2XR'));

  it.each([
    ['KF7M-Q2XR', 'KF7MQ2XR'],
    ['kf7m-q2xr', 'KF7MQ2XR'],
    [' KF7M Q2XR ', 'KF7MQ2XR'],
  ])('normalizes %s', (value, out) =>
    expect(normalizeGiftCode(value)).toBe(out),
  );

  it.each([
    'KF7M-Q2X',
    'KF7MQ2XRR',
    'KF7I-Q2XR',
    'KFOM-Q2XR',
    'KF7L-Q2XU',
    42,
    null,
  ])('rejects %s', (value) => expect(normalizeGiftCode(value)).toBeNull());
});

describe('isGiftTransferable', () => {
  it('allows a fully paid, fully invoiced shooting before selection', () =>
    expect(isGiftTransferable(input())).toBe(true));

  it('refuses while money is still owed', () =>
    expect(isGiftTransferable(input({ totalToBePaidInCents: 1 }))).toBe(false));

  it('refuses while an income row has no invoice yet', () =>
    expect(
      isGiftTransferable(
        input({ ledgerEntries: [{ ...paidFull, invoiceId: null }] }),
      ),
    ).toBe(false));

  it('ignores expense rows without an invoice', () =>
    expect(
      isGiftTransferable(
        input({
          ledgerEntries: [
            paidFull,
            {
              category: LedgerEntryCategory.EXPENSE_PHOTOGRAPHER_FEE,
              invoiceId: null,
            },
          ],
        }),
      ),
    ).toBe(true));

  it.each([
    'USER_SELECTION',
    'EDITOR_SELECTION',
    'COMPLETED',
    'CANCELLED',
  ] as const)('refuses in %s', (status) =>
    expect(isGiftTransferable(input({ status }))).toBe(false),
  );

  it.each(GIFT_TRANSFERABLE_STATUSES)('allows %s', (status) =>
    expect(isGiftTransferable(input({ status }))).toBe(true),
  );
});

describe('planGiftRedemption', () => {
  const currentClientEmail = 'Buyer@Example.com';

  it.each(['buyer@example.com', '  BUYER@example.COM ', 'Buyer@Example.com'])(
    'refuses the current client’s own email (%s)',
    (submittedEmail) =>
      expect(
        planGiftRedemption({
          submittedEmail,
          currentClientEmail,
          existingUser: true,
        }),
      ).toEqual({
        ok: false,
        error: 'Ezt az ajándékot nem adhatod saját magadnak.',
      }),
  );

  it('logs in a brand-new email', () =>
    expect(
      planGiftRedemption({
        submittedEmail: 'anna@example.com',
        currentClientEmail,
        existingUser: false,
      }),
    ).toEqual({ ok: true, logIn: true }));

  it('never logs in an email that already belongs to a user', () =>
    expect(
      planGiftRedemption({
        submittedEmail: 'anna@example.com',
        currentClientEmail,
        existingUser: true,
      }),
    ).toEqual({ ok: true, logIn: false }));
});
