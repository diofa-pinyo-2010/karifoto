import { describe, expect, it } from 'vitest';

import { toSzamlazzLineItems } from '@/lib/invoice/line-items';
import { NamedVATRate } from '@/lib/invoice/types';

import type { InvoiceLineItem } from '@/lib/invoice/types';

const item = (overrides: Partial<InvoiceLineItem> = {}): InvoiceLineItem => ({
  name: 'Fotózás előleg',
  quantity: 1,
  unitPriceGross: 10_000,
  vatRate: NamedVATRate.AAM,
  ...overrides,
});

describe('toSzamlazzLineItems', () => {
  // Everything the studio invoices today is AAM (alanyi adómentes), so this is
  // the only path that runs in production.
  describe('AAM (no VAT)', () => {
    it('leaves net equal to gross and charges no tax', () => {
      const [line] = toSzamlazzLineItems([item()]);

      expect(line.netUnitPrice).toBe(10_000);
      expect(line.netAmount).toBe(10_000);
      expect(line.grossAmount).toBe(10_000);
      expect(line.taxAmount).toBe(0);
    });

    it('multiplies the totals by quantity but not the unit price', () => {
      const [line] = toSzamlazzLineItems([
        item({ quantity: 3, unitPriceGross: 2_000 }),
      ]);

      expect(line.netUnitPrice).toBe(2_000); // per unit
      expect(line.netAmount).toBe(6_000); // total
      expect(line.grossAmount).toBe(6_000); // total
      expect(line.amount).toBe(3);
    });
  });

  describe('27% VAT', () => {
    it('derives the net price from the gross', () => {
      const [line] = toSzamlazzLineItems([
        item({ unitPriceGross: 1_270, vatRate: 27 }),
      ]);

      expect(line.netUnitPrice).toBe(1_000);
      expect(line.taxAmount).toBe(270);
    });

    // szamlazz rejects a line whose totals do not add up, so this identity
    // matters more than either number being round. It holds because taxAmount
    // is derived by subtraction rather than computed independently.
    it('keeps net + tax exactly equal to gross even when the net is not round', () => {
      const [line] = toSzamlazzLineItems([
        item({ unitPriceGross: 1_000, quantity: 3, vatRate: 27 }),
      ]);

      expect(line.netAmount + line.taxAmount).toBe(line.grossAmount);
    });
  });

  it('maps several items independently and preserves order', () => {
    const lines = toSzamlazzLineItems([
      item({ name: 'Első' }),
      item({ name: 'Második', quantity: 2 }),
    ]);

    expect(lines.map((l) => l.name)).toEqual(['Első', 'Második']);
    expect(lines[0].amount).toBe(1);
    expect(lines[1].amount).toBe(2);
  });

  it('labels every line as "db"', () => {
    const [line] = toSzamlazzLineItems([item()]);

    expect(line.amountName).toBe('db');
  });

  it('returns nothing for no items', () => {
    expect(toSzamlazzLineItems([])).toEqual([]);
  });
});
