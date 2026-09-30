import SZClient, {
  PaymentMethod as SzamlazzPaymentMethod,
} from '@halftome/szamlazz-client';

import { env } from '@/env';
import { toSzamlazzLineItems } from '@/lib/invoice/line-items';
import {
  InvoiceClient,
  GenerateInvoiceInput,
  GeneratedInvoice,
} from '@/lib/invoice/types';

import type { InvoiceOptions } from '@halftome/szamlazz-client';

const client = new SZClient({ key: env.SZAMLAZZ_API_KEY });

type DocumentType = Pick<
  InvoiceOptions,
  'advanceInvoice' | 'finalInvoice' | 'advanceInvoiceNumber'
>;

async function issue(
  input: GenerateInvoiceInput,
  documentType: DocumentType,
): Promise<GeneratedInvoice> {
  const now = new Date();

  const items = toSzamlazzLineItems(input.items);

  const result = await client.generateInvoice(
    {
      customer: {
        name: input.customer.name,
        zip: input.customer.zip,
        city: input.customer.city,
        address: input.customer.addressLine1,
        email: input.customer.email,
      },
      eInvoice: true,
      issueDate: now,
      completionDate: now,
      dueDate: now,
      paymentMethod: SzamlazzPaymentMethod.Card,
      currency: 'HUF',
      language: 'hu',
      sendEmail: true,
      settled: true,
      comment: input.comment,
      ...documentType,
    },
    items,
  );

  return {
    invoiceNumber: result.invoice.number,
    /**
     * The package calls this 'customerAccountUrl', but what they actually
     * returns what we need: the public URL of the invoice.
     */
    publicUrl: result.invoice.customerAccountUrl,
  };
}

export const szamlazzInvoiceClient: InvoiceClient = {
  generateInvoice: (input) => issue(input, {}),

  generateAdvanceInvoice: (input) => issue(input, { advanceInvoice: true }),

  generateFinalInvoice: (input, advanceInvoiceNumber) =>
    issue(input, { finalInvoice: true, advanceInvoiceNumber }),
};
