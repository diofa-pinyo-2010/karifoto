import type {
  GenerateInvoiceInput,
  GeneratedInvoice,
  InvoiceClient,
} from '@/lib/invoice/types';

export class InvoiceService {
  constructor(private client: InvoiceClient) {}

  async generateInvoice(
    input: GenerateInvoiceInput,
  ): Promise<GeneratedInvoice> {
    return this.client.generateInvoice(input);
  }

  async generateAdvanceInvoice(
    input: GenerateInvoiceInput,
  ): Promise<GeneratedInvoice> {
    return this.client.generateAdvanceInvoice(input);
  }

  async generateFinalInvoice(
    input: GenerateInvoiceInput,
    advanceInvoiceNumber: string,
  ): Promise<GeneratedInvoice> {
    return this.client.generateFinalInvoice(input, advanceInvoiceNumber);
  }
}
