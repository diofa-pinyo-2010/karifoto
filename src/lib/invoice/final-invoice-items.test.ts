import { describe, expect, it } from 'vitest';

import { buildFinalInvoiceItems } from '@/lib/invoice/final-invoice-items';
import { NamedVATRate } from '@/lib/invoice/types';

/** A beszámítandó előlegszámla. Minden végszámla pontosan egyet rendez. */
const ADVANCE = { amountInCents: 10_000_00, invoiceNumber: 'E-2026-1' };

/** Nulla előleg, így nem keletkezik beszámítási sor. */
const NO_ADVANCE = { amountInCents: 0, invoiceNumber: 'E-2026-1' };

describe('buildFinalInvoiceItems', () => {
  describe('fotózás tétel', () => {
    it('lists the full price as a single "Fotózás" item', () => {
      const [item] = buildFinalInvoiceItems(65_000_00, NO_ADVANCE);

      expect(item).toEqual({
        name: 'Fotózás',
        quantity: 1,
        unitPriceGross: 65_000,
        vatRate: NamedVATRate.AAM,
      });
    });
  });

  /**
   * A végszámla adattartalma kötött: a teljes vételár pozitív előjellel, és az
   * előlegszámlán már kiegyenlített összeg negatív előjellel, hogy a végösszeg
   * a még fizetendőt adja ki. A szamlazz ezt **nem** számolja helyettünk — az
   * `elolegSzamlaszam` csak összekapcsolja a két dokumentumot.
   */
  describe('előleg beszámítása', () => {
    it('puts the advance first as a negative line, then the shooting', () => {
      const items = buildFinalInvoiceItems(65_000_00, ADVANCE);

      expect(items).toEqual([
        {
          name: 'Fotózás előleg',
          quantity: 1,
          unitPriceGross: -10_000,
          vatRate: NamedVATRate.AAM,
        },
        {
          name: 'Fotózás',
          quantity: 1,
          unitPriceGross: 65_000,
          vatRate: NamedVATRate.AAM,
        },
      ]);
    });

    // Ugyanaz a szabály, mint a `calculatePricing()`-nál: nem teszünk 0 Ft-os
    // sort a számlára. A nulla előleg amúgy is adathiba — arra a job figyelmeztet.
    it('omits the line when there is no advance to deduct', () => {
      const items = buildFinalInvoiceItems(65_000_00, NO_ADVANCE);

      expect(items).toHaveLength(1);
    });

    /**
     * Ez a teszt a lényeg, és pont ez bukott el élesben: a végszámla végösszege
     * a **még fizetendő** összeg, azaz a teljes ár mínusz a beszámított előleg.
     * Ha az előleg sora lemarad, a dokumentum a teljes árat kéri újra, tehát az
     * ügyfelet kétszer számláznánk.
     */
    it('totals to the full price minus the advance', () => {
      const grossInCents = buildFinalInvoiceItems(65_000_00, ADVANCE).reduce(
        (sum, item) => sum + item.unitPriceGross * item.quantity * 100,
        0,
      );

      expect(grossInCents).toBe(55_000_00); // a hibajelentés példája
    });
  });
});
