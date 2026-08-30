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

export interface InvoiceClient {
  generateInvoice(input: GenerateInvoiceInput): Promise<GeneratedInvoice>;
}
