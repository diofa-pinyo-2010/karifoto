import { describe, expect, it } from 'vitest';

import { summarizeDailyIncome } from '@/lib/daily-income';

describe('summarizeDailyIncome', () => {
  it('splits studio balance payments by method', () => {
    const summary = summarizeDailyIncome(
      [
        {
          category: 'INCOME_CLIENT_PAYMENT_BALANCE',
          method: 'CARD',
          amountInCents: 30_000_00,
        },
        {
          category: 'INCOME_CLIENT_PAYMENT_BALANCE',
          method: 'CASH',
          amountInCents: 20_000_00,
        },
        {
          category: 'INCOME_CLIENT_PAYMENT_BALANCE',
          method: 'CASH',
          amountInCents: 5_000_00,
        },
      ],
      0,
    );

    expect(summary).toEqual({
      total: 55_000_00,
      card: 30_000_00,
      cash: 25_000_00,
      staffPayoutCash: 0,
      cashBox: 25_000_00,
    });
  });

  it('leaves out online deposits and extras paid the same day', () => {
    const summary = summarizeDailyIncome(
      [
        {
          category: 'INCOME_CLIENT_PAYMENT_DEPOSIT',
          method: 'CARD',
          amountInCents: 20_000_00,
        },
        {
          category: 'INCOME_CLIENT_PAYMENT_EXTRA',
          method: 'CARD',
          amountInCents: 3_000_00,
        },
        {
          category: 'INCOME_CLIENT_PAYMENT_BALANCE',
          method: 'CARD',
          amountInCents: 10_000_00,
        },
      ],
      0,
    );

    expect(summary.total).toBe(10_000_00);
    expect(summary.card).toBe(10_000_00);
  });

  it('adds the daily change to cash for the cash box', () => {
    const summary = summarizeDailyIncome(
      [
        {
          category: 'INCOME_CLIENT_PAYMENT_BALANCE',
          method: 'CASH',
          amountInCents: 20_000_00,
        },
      ],
      15_000_00,
    );

    expect(summary.cash).toBe(20_000_00);
    expect(summary.cashBox).toBe(35_000_00);
  });

  it('returns the daily change alone as the cash box on an empty day', () => {
    expect(summarizeDailyIncome([], 15_000_00)).toEqual({
      total: 0,
      card: 0,
      cash: 0,
      staffPayoutCash: 0,
      cashBox: 15_000_00,
    });
  });

  it('subtracts cash staff payouts from the cash box', () => {
    const summary = summarizeDailyIncome(
      [
        {
          category: 'INCOME_CLIENT_PAYMENT_BALANCE',
          method: 'CASH',
          amountInCents: 25_000_00,
        },
        {
          category: 'EXPENSE_PHOTOGRAPHER_FEE',
          method: 'CASH',
          amountInCents: -8_000_00,
        },
        {
          category: 'EXPENSE_STAFF_BONUS',
          method: 'CASH',
          amountInCents: -2_000_00,
        },
        {
          category: 'EXPENSE_EDITOR_FEE',
          method: 'TRANSFER',
          amountInCents: -5_000_00,
        },
      ],
      10_000_00,
    );

    expect(summary).toEqual({
      total: 25_000_00,
      card: 0,
      cash: 25_000_00,
      staffPayoutCash: 10_000_00,
      cashBox: 25_000_00,
    });
  });
});
