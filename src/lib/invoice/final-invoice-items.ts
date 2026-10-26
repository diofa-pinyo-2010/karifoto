import { NamedVATRate } from '@/lib/invoice/types';
import { centsToHuf } from '@/lib/utils';

import type { InvoiceLineItem } from '@/lib/invoice/types';

/** A végszámla által rendezett előlegszámla, amennyi belőle ide kell. */
type SettledAdvance = {
  amountInCents: number;
  invoiceNumber: string;
};

/**
 * A végszámla tételei: a beszámított előleg negatív tételként, és egyetlen
 * "Fotózás" tétel a fotózás teljes árával. A számlán szándékosan nincs
 * tételes bontás — az az admin felületen marad.
 *
 * **A beszámított előleg külön, negatív tétel, és ez nem opcionális.**
 * A végszámla kötött adattartalma: a teljes vételár pozitív előjellel, plusz az
 * előlegszámlán már kiegyenlített összeg negatív előjellel, hogy a végösszeg a
 * még fizetendőt adja ki. A szamlazz ezt **nem** számolja helyettünk: a
 * `fejlec.elolegSzamlaszam` csak összekapcsolja a két dokumentumot, nem von le
 * semmit. Ezért kötelező paraméter — a nélküle kiállított végszámla a teljes
 * árat kérné újra.
 *
 * Csak típusokat importál a szamlazz oldaláról, hogy tesztelhető maradjon; lásd
 * a `line-items.ts` fejkommentjét ugyanerről.
 */
export function buildFinalInvoiceItems(
  totalToBeInvoicedInCents: number,
  advance: SettledAdvance,
): InvoiceLineItem[] {
  const items: InvoiceLineItem[] = [];

  if (advance.amountInCents !== 0) {
    items.push({
      name: 'Fotózás előleg',
      quantity: 1,
      unitPriceGross: -centsToHuf(advance.amountInCents),
      vatRate: NamedVATRate.AAM,
    });
  }

  items.push({
    name: 'Fotózás',
    quantity: 1,
    unitPriceGross: centsToHuf(totalToBeInvoicedInCents),
    vatRate: NamedVATRate.AAM,
  });

  return items;
}
