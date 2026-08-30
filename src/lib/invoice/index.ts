import { InvoiceService } from '@/lib/invoice/invoice-service';
import { szamlazzInvoiceClient } from '@/lib/invoice/szamlazz-client';

export const invoiceService = new InvoiceService(szamlazzInvoiceClient);
