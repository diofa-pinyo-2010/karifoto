import { describe, expect, it } from 'vitest';

import { planStorno } from '@/lib/storno';

const original = { id: 'inv-1', invoiceNumber: 'KF-1', amountInCents: 5000_00 };

describe('planStorno', () => {
  it('fails when the refund entry is missing', () => {
    expect(
      planStorno({ refundEntry: null, originalInvoice: original }),
    ).toEqual({ action: 'fail' });
  });

  it('skips when the refund entry already has an invoice', () => {
    expect(
      planStorno({
        refundEntry: { invoiceId: 'storno-1' },
        originalInvoice: original,
      }),
    ).toEqual({ action: 'skip' });
  });

  it('retries when the original invoice is not there yet', () => {
    expect(
      planStorno({ refundEntry: { invoiceId: null }, originalInvoice: null }),
    ).toEqual({ action: 'retry' });
  });

  it('issues with the original invoice otherwise', () => {
    expect(
      planStorno({
        refundEntry: { invoiceId: null },
        originalInvoice: original,
      }),
    ).toEqual({ action: 'issue', originalInvoice: original });
  });
});
