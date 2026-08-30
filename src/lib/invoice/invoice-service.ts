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
}
