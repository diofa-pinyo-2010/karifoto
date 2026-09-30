import { describe, expect, it } from 'vitest';

import { InvoiceService } from '@/lib/invoice/invoice-service';
import { NamedVATRate } from '@/lib/invoice/types';

import type {
  GenerateInvoiceInput,
  GeneratedInvoice,
  InvoiceClient,
} from '@/lib/invoice/types';

const input: GenerateInvoiceInput = {
  customer: {
    name: 'Teszt Elek',
    zip: '1056',
    city: 'Budapest',
    addressLine1: 'Irányi utca 9.',
    email: 'teszt@example.com',
  },
  items: [
    {
      name: 'Fotózás előleg',
      quantity: 1,
      unitPriceGross: 10_000,
      vatRate: NamedVATRate.AAM,
    },
  ],
};

/**
 * A hand-written fake rather than a mocked module: `InvoiceService` already
 * takes its client by constructor injection, so nothing needs intercepting.
 * It records which method was called, which is the whole point of these tests.
 */
const result = (method: string): GeneratedInvoice => ({
  invoiceNumber: `${method}-1`,
  publicUrl: `https://example.invalid/${method}`,
});

function fakeClient() {
  const calls: Array<{ method: string; advanceInvoiceNumber?: string }> = [];

  const client: InvoiceClient = {
    generateInvoice: async () => {
      calls.push({ method: 'generateInvoice' });
      return result('generateInvoice');
    },
    generateAdvanceInvoice: async () => {
      calls.push({ method: 'generateAdvanceInvoice' });
      return result('generateAdvanceInvoice');
    },
    generateFinalInvoice: async (_input, advanceInvoiceNumber) => {
      calls.push({ method: 'generateFinalInvoice', advanceInvoiceNumber });
      return result('generateFinalInvoice');
    },
  };

  return { client, calls };
}

// `generateInvoice` and `generateAdvanceInvoice` take exactly the same
// arguments, so confusing the two compiles cleanly and lints cleanly — and
// issues an ordinary számla where the law wants an előlegszámla. Nothing but a
// test catches that, and only on a real customer's document otherwise.
describe('InvoiceService', () => {
  it('routes generateInvoice to an ordinary invoice', async () => {
    const { client, calls } = fakeClient();

    await new InvoiceService(client).generateInvoice(input);

    expect(calls).toEqual([{ method: 'generateInvoice' }]);
  });

  it('routes generateAdvanceInvoice to an advance invoice', async () => {
    const { client, calls } = fakeClient();

    await new InvoiceService(client).generateAdvanceInvoice(input);

    expect(calls).toEqual([{ method: 'generateAdvanceInvoice' }]);
  });

  it('routes generateFinalInvoice to a final invoice, carrying the advance number', async () => {
    const { client, calls } = fakeClient();

    await new InvoiceService(client).generateFinalInvoice(input, 'E-2026-123');

    expect(calls).toEqual([
      { method: 'generateFinalInvoice', advanceInvoiceNumber: 'E-2026-123' },
    ]);
  });

  it('returns what the client returned, unchanged', async () => {
    const { client } = fakeClient();

    const invoice = await new InvoiceService(client).generateAdvanceInvoice(
      input,
    );

    expect(invoice).toEqual({
      invoiceNumber: 'generateAdvanceInvoice-1',
      publicUrl: 'https://example.invalid/generateAdvanceInvoice',
    });
  });
});
