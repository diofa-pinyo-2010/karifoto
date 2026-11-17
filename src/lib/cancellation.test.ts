import { describe, expect, it } from 'vitest';

import {
  buildRefundIdempotencyKey,
  getCancellationEligibility,
} from '@/lib/cancellation';

import type {
  LedgerEntryCategory,
  PaymentMethod,
} from '@/generated/prisma/enums';

const now = new Date('2026-12-01T10:00:00Z');
const future = new Date('2026-12-10T10:00:00Z');

function entry(
  category: LedgerEntryCategory,
  over: Partial<{
    id: string;
    amountInCents: number;
    method: PaymentMethod;
    paymentIntent: string | null;
    invoice: { type: 'NORMAL' | 'ADVANCE' | 'FINAL' | 'STORNO' } | null;
  }> = {},
) {
  return {
    id: 'le1',
    category,
    amountInCents: 10_000_00,
    method: 'CARD' as PaymentMethod,
    paymentIntent: 'pi_1',
    invoice: null,
    ...over,
  };
}

function input(
  ledgerEntries: ReturnType<typeof entry>[],
  over: Partial<{
    cancelledAt: Date | null;
    completedAt: Date | null;
    startTime: Date;
  }> = {},
) {
  return {
    cancelledAt: null,
    completedAt: null,
    startTime: future,
    ledgerEntries,
    ...over,
  };
}

describe('getCancellationEligibility', () => {
  it('allows deposit only, refundable', () => {
    const r = getCancellationEligibility(
      input([entry('INCOME_CLIENT_PAYMENT_DEPOSIT')]),
      now,
    );
    expect(r.canCancel).toBe(true);
    if (r.canCancel) {
      expect(r.canRefund).toBe(true);
      expect(r.payment.amountInCents).toBe(10_000_00);
    }
  });

  it('allows gift FULL only', () => {
    const r = getCancellationEligibility(
      input([entry('INCOME_CLIENT_PAYMENT_FULL')]),
      now,
    );
    expect(r.canCancel).toBe(true);
  });

  it('rejects deposit + balance', () => {
    const r = getCancellationEligibility(
      input([
        entry('INCOME_CLIENT_PAYMENT_DEPOSIT'),
        entry('INCOME_CLIENT_PAYMENT_BALANCE', { id: 'le2' }),
      ]),
      now,
    );
    expect(r.canCancel).toBe(false);
  });

  it('rejects deposit + extra', () => {
    const r = getCancellationEligibility(
      input([
        entry('INCOME_CLIENT_PAYMENT_DEPOSIT'),
        entry('INCOME_CLIENT_PAYMENT_EXTRA', { id: 'le2' }),
      ]),
      now,
    );
    expect(r.canCancel).toBe(false);
  });

  it('rejects when a FINAL invoice exists', () => {
    const r = getCancellationEligibility(
      input([
        entry('INCOME_CLIENT_PAYMENT_DEPOSIT', { invoice: { type: 'FINAL' } }),
      ]),
      now,
    );
    expect(r.canCancel).toBe(false);
  });

  it('rejects when startTime is not in the future', () => {
    expect(
      getCancellationEligibility(
        input([entry('INCOME_CLIENT_PAYMENT_DEPOSIT')], { startTime: now }),
        now,
      ).canCancel,
    ).toBe(false);
  });

  it('rejects already cancelled', () => {
    expect(
      getCancellationEligibility(
        input([entry('INCOME_CLIENT_PAYMENT_DEPOSIT')], { cancelledAt: now }),
        now,
      ).canCancel,
    ).toBe(false);
  });

  it('rejects completed', () => {
    expect(
      getCancellationEligibility(
        input([entry('INCOME_CLIENT_PAYMENT_DEPOSIT')], { completedAt: now }),
        now,
      ).canCancel,
    ).toBe(false);
  });

  it('rejects when no income row', () => {
    expect(getCancellationEligibility(input([]), now).canCancel).toBe(false);
  });

  it('rejects an existing refund row (income-side)', () => {
    const r = getCancellationEligibility(
      input([
        entry('INCOME_CLIENT_PAYMENT_DEPOSIT'),
        entry('REFUND_CLIENT_PAYMENT', { id: 'le2' }),
      ]),
      now,
    );
    expect(r.canCancel).toBe(false);
  });

  it('cash deposit: cancellable, not refundable', () => {
    const r = getCancellationEligibility(
      input([
        entry('INCOME_CLIENT_PAYMENT_DEPOSIT', {
          method: 'CASH',
          paymentIntent: null,
        }),
      ]),
      now,
    );
    expect(r.canCancel).toBe(true);
    if (r.canCancel) expect(r.canRefund).toBe(false);
  });

  it('card without paymentIntent: not refundable', () => {
    const r = getCancellationEligibility(
      input([entry('INCOME_CLIENT_PAYMENT_DEPOSIT', { paymentIntent: null })]),
      now,
    );
    expect(r.canCancel).toBe(true);
    if (r.canCancel) expect(r.canRefund).toBe(false);
  });

  it('expense rows do not block', () => {
    const r = getCancellationEligibility(
      input([
        entry('INCOME_CLIENT_PAYMENT_DEPOSIT'),
        entry('EXPENSE_PHOTOGRAPHER_FEE', {
          id: 'le2',
          method: 'TRANSFER',
          paymentIntent: null,
        }),
      ]),
      now,
    );
    expect(r.canCancel).toBe(true);
  });
});

describe('buildRefundIdempotencyKey', () => {
  it('prefixes the ledger entry id', () => {
    expect(buildRefundIdempotencyKey('abc')).toBe('cancel-refund:abc');
  });
});
