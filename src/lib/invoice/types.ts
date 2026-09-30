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

interface InvoiceLineItem {
  name: string;
  quantity: number;
  unitPriceGross: number;
  vatRate: VATRate;
}

export interface GenerateInvoiceInput {
  customer: InvoiceCustomer;
  items: InvoiceLineItem[];
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
   * `items` must list the **full** price of the shooting, not the remaining
   * balance — szamlazz deducts the referenced advance itself, so passing the
   * remainder would deduct it twice.
   */
  generateFinalInvoice(
    input: GenerateInvoiceInput,
    advanceInvoiceNumber: string,
  ): Promise<GeneratedInvoice>;
}
