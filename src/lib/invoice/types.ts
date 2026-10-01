import type { PaymentMethod } from '@/generated/prisma/enums';

export enum NamedVATRate {
  AAM = 'AAM',
}

type VATRate = 27 | NamedVATRate;

// The data we would always need to invoice a customer
interface InvoiceCustomer {
  name: string;
  zip: string;
  city: string;
  addressLine1: string;
  email: string;
}

export interface InvoiceLineItem {
  name: string;
  quantity: number;
  unitPriceGross: number;
  vatRate: VATRate;
}

export interface GenerateInvoiceInput {
  customer: InvoiceCustomer;
  items: InvoiceLineItem[];
  /**
   * Ahogy az ügyfél fizetett. Ez lesz a számla `fizmod`-ja, ezért kötelező:
   * a stúdióban készpénzt is átveszünk, és egy alapértelmezett "bankkártya"
   * csendben rossz dokumentumot állítana ki.
   */
  paymentMethod: PaymentMethod;
  comment?: string;
}

export interface GeneratedInvoice {
  invoiceNumber: string;
  publicUrl: string;
}

/**
 * Note what is deliberately absent from `GenerateInvoiceInput`: the szamlazz
 * flags that decide the document type. The type is chosen by *which method you
 * call*, so there is no way to ask for a final invoice without supplying the
 * advance it settles. szamlazz rejects that combination too, but this fails at
 * compile time rather than at a client's till.
 */
export interface InvoiceClient {
  /** An ordinary invoice (számla). */
  generateInvoice(input: GenerateInvoiceInput): Promise<GeneratedInvoice>;

  /** An advance invoice (előlegszámla) for money taken before the service. */
  generateAdvanceInvoice(
    input: GenerateInvoiceInput,
  ): Promise<GeneratedInvoice>;

  /**
   * A final invoice (végszámla) settling an earlier advance.
   *
   * `items` must list the **full** price of the shooting *and* the settled
   * advance as a negative line, so the document totals to what is still
   * payable. `advanceInvoiceNumber` only links the two documents —
   * szamlazz deducts nothing on its own. See
   * [`buildFinalInvoiceItems()`](./final-invoice-items.ts), which is the only
   * thing that should build this list.
   */
  generateFinalInvoice(
    input: GenerateInvoiceInput,
    advanceInvoiceNumber: string,
  ): Promise<GeneratedInvoice>;
}
