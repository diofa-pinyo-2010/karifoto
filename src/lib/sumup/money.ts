import { centsToHuf } from '@/lib/utils';

export function toSumUpMoney(amountInCents: number) {
  if (!Number.isInteger(amountInCents) || amountInCents <= 0) {
    throw new Error(`Invalid amount for SumUp: ${amountInCents}`);
  }
  if (amountInCents % 100 !== 0) {
    throw new Error(
      `Amount must be a whole number of forints, got ${amountInCents} cents`,
    );
  }

  return {
    currency: 'HUF',
    minor_unit: 0,
    value: centsToHuf(amountInCents),
  };
}
