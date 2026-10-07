import { describe, expect, it } from 'vitest';

import { toSumUpMoney } from '@/lib/sumup/money';

describe('toSumUpMoney', () => {
  it('sends whole forints with minor_unit 0', () => {
    expect(toSumUpMoney(39000_00)).toEqual({
      currency: 'HUF',
      minor_unit: 0,
      value: 39000,
    });
  });

  it('converts a small amount', () => {
    expect(toSumUpMoney(100).value).toBe(1);
  });

  it('throws when the amount is not divisible by 100', () => {
    expect(() => toSumUpMoney(39000_50)).toThrow();
    expect(() => toSumUpMoney(1)).toThrow();
  });

  it('throws on zero, negative and non-integer amounts', () => {
    expect(() => toSumUpMoney(0)).toThrow();
    expect(() => toSumUpMoney(-100_00)).toThrow();
    expect(() => toSumUpMoney(100.5)).toThrow();
    expect(() => toSumUpMoney(Number.NaN)).toThrow();
  });
});
