import { describe, expect, it } from 'vitest';

import { buildFinalInvoiceItems } from '@/lib/invoice/final-invoice-items';
import { NamedVATRate } from '@/lib/invoice/types';

import type { PriceLine } from '@/server/pricing';

/**
 * Szándékosan kézzel írt `PriceLine[]`, nem `calculatePricing()` kimenete: ez a
 * függvény a sorok *alakjáról* tud, nem az árazásról. A két oldal közti
 * összegidentitást az utolsó blokk őrzi.
 */
const line = (overrides: Partial<PriceLine> = {}): PriceLine => ({
  label: 'MINI csomag',
  amountInCents: 39_000_00,
  ...overrides,
});

/** A beszámítandó előlegszámla. Minden végszámla pontosan egyet rendez. */
const ADVANCE = { amountInCents: 10_000_00, invoiceNumber: 'E-2026-1' };

/**
 * Nulla előleg, így nem keletkezik beszámítási sor. A díjsorok leképezéséről
 * szóló tesztek ezt használják: a beszámítás a lista **elejére** kerül, tehát
 * `items[0]` különben nem a vizsgált díjsor lenne. A nulla eset viselkedésének
 * külön tesztje van lent.
 */
const NO_ADVANCE = { amountInCents: 0, invoiceNumber: 'E-2026-1' };

describe('buildFinalInvoiceItems', () => {
  describe('címkék', () => {
    it('strips a leading emoji but keeps the rest of the label', () => {
      const [item] = buildFinalInvoiceItems(
        [line({ label: '✨ Fényjáték' })],
        NO_ADVANCE,
      );

      expect(item.name).toBe('Fényjáték');
    });

    // A darabszám a zárójelben az egyetlen hely, ahol a mennyiség megjelenik a
    // számlán (a `quantity` mindig 1), tehát nem veszhet el.
    it('keeps the count in parentheses', () => {
      const [item] = buildFinalInvoiceItems(
        [line({ label: '🐶 Kis kedvencek (2)' })],
        NO_ADVANCE,
      );

      expect(item.name).toBe('Kis kedvencek (2)');
    });

    it('leaves an emoji-free label untouched', () => {
      const [item] = buildFinalInvoiceItems(
        [line({ label: 'Stúdió bérlés' })],
        NO_ADVANCE,
      );

      expect(item.name).toBe('Stúdió bérlés');
    });

    // Az Unicode `Emoji_Component` osztályba az ASCII számjegyek is beletartoznak,
    // tehát egy naiv emoji-osztály levágná a címke elejéről a számot is.
    it('keeps a leading digit', () => {
      const [item] = buildFinalInvoiceItems(
        [line({ label: '2 fő felár' })],
        NO_ADVANCE,
      );

      expect(item.name).toBe('2 fő felár');
    });
  });

  describe('tételek', () => {
    it('turns cents into forints as a single unit', () => {
      const [item] = buildFinalInvoiceItems(
        [line({ amountInCents: 39_000_00 })],
        NO_ADVANCE,
      );

      expect(item.unitPriceGross).toBe(39_000);
      expect(item.quantity).toBe(1);
      expect(item.vatRate).toBe(NamedVATRate.AAM);
    });

    /**
     * A kedvezmény negatív bruttóval kerül a számlára — így ábrázolja a
     * szamlazz is. Se nem vágjuk le, se nem hagyjuk ki, se nem fordítjuk
     * pozitívba: bármelyik felülszámlázná az ügyfelet.
     */
    it('keeps a discount line negative', () => {
      const [item] = buildFinalInvoiceItems(
        [
          line({
            label: 'Hűségkedvezmény',
            amountInCents: -5_000_00,
            adjustmentId: 'adj-1',
          }),
        ],
        NO_ADVANCE,
      );

      expect(item.unitPriceGross).toBe(-5_000);
    });

    it('ignores adjustmentId — an invoice has no use for it', () => {
      const [item] = buildFinalInvoiceItems(
        [line({ adjustmentId: 'adj-1' })],
        NO_ADVANCE,
      );

      expect(item).not.toHaveProperty('adjustmentId');
    });

    it('preserves order, so the invoice reads like the admin page', () => {
      const items = buildFinalInvoiceItems(
        [
          line({ label: 'MINI csomag' }),
          line({ label: 'Stúdió bérlés' }),
          line({ label: 'Hűségkedvezmény', amountInCents: -5_000_00 }),
        ],
        NO_ADVANCE,
      );

      expect(items.map((item) => item.name)).toEqual([
        'MINI csomag',
        'Stúdió bérlés',
        'Hűségkedvezmény',
      ]);
    });
  });

  /**
   * A végszámla adattartalma kötött: a teljes vételár pozitív előjellel, és az
   * előlegszámlán már kiegyenlített összeg negatív előjellel, hogy a végösszeg
   * a még fizetendőt adja ki. A szamlazz ezt **nem** számolja helyettünk — az
   * `elolegSzamlaszam` csak összekapcsolja a két dokumentumot.
   */
  describe('előleg beszámítása', () => {
    it('deducts the advance as a negative line', () => {
      const items = buildFinalInvoiceItems(
        [line({ amountInCents: 65_000_00 })],
        ADVANCE,
      );

      expect(items).toHaveLength(2);
      expect(items[0].unitPriceGross).toBe(-10_000);
    });

    it('puts the advance first, before every charge', () => {
      const items = buildFinalInvoiceItems(
        [line({ label: 'MINI csomag' }), line({ label: 'Stúdió bérlés' })],
        ADVANCE,
      );

      expect(items.map((item) => item.name)).toEqual([
        expect.stringContaining('előleg'),
        'MINI csomag',
        'Stúdió bérlés',
      ]);
    });

    // Ugyanaz a szabály, mint a `calculatePricing()`-nál: nem teszünk 0 Ft-os
    // sort a számlára. A nulla előleg amúgy is adathiba — arra a job figyelmeztet.
    it('omits the line when there is no advance to deduct', () => {
      const items = buildFinalInvoiceItems([line()], NO_ADVANCE);

      expect(items).toHaveLength(1);
    });

    /**
     * Ez a teszt a lényeg, és pont ez bukott el élesben: a végszámla végösszege
     * a **még fizetendő** összeg, azaz a teljes ár mínusz a beszámított előleg.
     * Ha az előleg sora lemarad, a dokumentum a teljes árat kéri újra, tehát az
     * ügyfelet kétszer számláznánk.
     *
     * Sorrendfüggetlen: a `push`/`unshift` kérdés kozmetika, az összeg nem.
     */
    it('totals to the full price minus the advance', () => {
      const lines: PriceLine[] = [
        line({ label: 'MINI csomag', amountInCents: 39_000_00 }),
        line({ label: 'Stúdió bérlés', amountInCents: 10_000_00 }),
        line({ label: '✨ Fényjáték', amountInCents: 20_000_00 }),
        line({
          label: 'Kedvezmény',
          amountInCents: -4_000_00,
          adjustmentId: 'a',
        }),
      ];
      const totalToBeInvoiced = lines.reduce(
        (sum, current) => sum + current.amountInCents,
        0,
      );
      expect(totalToBeInvoiced).toBe(65_000_00); // a hibajelentés példája

      const grossInCents = buildFinalInvoiceItems(lines, ADVANCE).reduce(
        (sum, item) => sum + item.unitPriceGross * item.quantity * 100,
        0,
      );

      expect(grossInCents).toBe(totalToBeInvoiced - ADVANCE.amountInCents);
      expect(grossInCents).toBe(55_000_00);
    });
  });
});
