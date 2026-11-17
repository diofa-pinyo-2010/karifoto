import { LEDGER_ENTRY_CATEGORY_SIDE } from '@/lib/constants';

import type {
  InvoiceType,
  LedgerEntryCategory,
  PaymentMethod,
} from '@/generated/prisma/enums';

type CancellationInput = {
  cancelledAt: Date | null;
  completedAt: Date | null;
  startTime: Date;
  ledgerEntries: {
    id: string;
    category: LedgerEntryCategory;
    amountInCents: number;
    method: PaymentMethod;
    paymentIntent: string | null;
    invoice: { type: InvoiceType } | null;
  }[];
};

export type CancellationEligibility =
  | { canCancel: false; reason: string }
  | {
      canCancel: true;
      payment: {
        ledgerEntryId: string;
        amountInCents: number;
        paymentIntent: string | null;
        method: PaymentMethod;
      };
      canRefund: boolean;
    };

const CANCELLABLE_CATEGORIES: LedgerEntryCategory[] = [
  'INCOME_CLIENT_PAYMENT_DEPOSIT',
  'INCOME_CLIENT_PAYMENT_FULL',
];

const NOT_ONLY_DEPOSIT_REASON =
  'Csak akkor mondható le, ha kizárólag az előleg / teljes összeg van befizetve.';

export function getCancellationEligibility(
  input: CancellationInput,
  now: Date,
): CancellationEligibility {
  if (input.cancelledAt)
    return { canCancel: false, reason: 'A fotózás már le van mondva.' };
  if (input.completedAt)
    return { canCancel: false, reason: 'A fotózás már lezajlott.' };
  if (input.startTime.getTime() <= now.getTime()) {
    return { canCancel: false, reason: 'A fotózás időpontja már elmúlt.' };
  }

  if (input.ledgerEntries.some((e) => e.invoice?.type === 'FINAL')) {
    return { canCancel: false, reason: 'A fotózáshoz már készült végszámla.' };
  }

  const income = input.ledgerEntries.filter(
    (e) => LEDGER_ENTRY_CATEGORY_SIDE[e.category] === 'INCOME',
  );
  const [payment] = income;
  if (
    income.length !== 1 ||
    !payment ||
    !CANCELLABLE_CATEGORIES.includes(payment.category)
  ) {
    return { canCancel: false, reason: NOT_ONLY_DEPOSIT_REASON };
  }

  return {
    canCancel: true,
    payment: {
      ledgerEntryId: payment.id,
      amountInCents: payment.amountInCents,
      paymentIntent: payment.paymentIntent,
      method: payment.method,
    },
    canRefund: payment.method === 'CARD' && !!payment.paymentIntent,
  };
}

export function buildRefundIdempotencyKey(ledgerEntryId: string): string {
  return `cancel-refund:${ledgerEntryId}`;
}
