import type { InvoiceLineItem } from '@/lib/invoice/types';
import type { LineItem } from '@halftome/szamlazz-client';

/**
 * Turns our gross-priced line items into the net/tax/gross triples szamlazz
 * wants.
 *
 * Lives in its own file rather than inside `szamlazz-client.ts` so it can be
 * tested: that module builds an `SZClient` from `env.SZAMLAZZ_API_KEY` at import
 * time, which would drag the whole environment into a test about arithmetic.
 * The only import here is a type, so nothing is loaded at runtime.
 *
 * Note `netUnitPrice` is per unit while `netAmount` and `grossAmount` are
 * totals — szamlazz mixes the two in one object.
 */
export function toSzamlazzLineItems(items: InvoiceLineItem[]): LineItem[] {
  return items.map((item) => {
    const quantity = Number(item.quantity);
    const vatRateNumer = item.vatRate === 'AAM' ? 0 : item.vatRate;
    const netUnitPrice = item.unitPriceGross / (1 + vatRateNumer / 100);
    const netAmount = netUnitPrice * quantity;
    const grossAmount = item.unitPriceGross * quantity;

    return {
      name: item.name,
      amount: quantity,
      amountName: 'db',
      netUnitPrice,
      netAmount,
      // Derived by subtraction rather than computed independently, so that
      // net + tax always equals gross exactly. szamlazz rejects a line whose
      // totals do not add up.
      taxAmount: grossAmount - netAmount,
      grossAmount,
      vatRate: item.vatRate,
    };
  });
}
