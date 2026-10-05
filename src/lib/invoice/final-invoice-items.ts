import { NamedVATRate } from '@/lib/invoice/types';
import { centsToHuf } from '@/lib/utils';

import type { InvoiceLineItem } from '@/lib/invoice/types';
import type { PriceLine } from '@/server/pricing';

/**
 * A címkék elején álló emoji ("✨ Fényjáték", "🐶 Kis kedvencek (2)") jól
 * mutat az admin felületen, de egy adóügyi dokumentumon nem: a szamlazz PDF-je
 * és a NAV XML nem garantálja a megjelenítést. Csak a *vezető* emojikat vesszük
 * le, a címke többi része — például a zárójeles darabszám — érintetlen marad.
 *
 * Szándékosan `Extended_Pictographic` + variation selector + ZWJ, és *nem*
 * `\p{Emoji_Component}`: abba az ASCII számjegyek is beletartoznak, tehát egy
 * "2 fő felár" címke elejéről levágná a darabszámot. Van rá teszt.
 */
const LEADING_EMOJI =
  /^(?:\p{Extended_Pictographic}|\u{FE0F}|\u{200D}|\u{20E3}|\s)+/u;

/** A végszámla által rendezett előlegszámla, amennyi belőle ide kell. */
type SettledAdvance = {
  amountInCents: number;
  invoiceNumber: string;
};

/**
 * A fotózás árlistájából végszámla-tételeket készít.
 *
 * Minden sor egy tétel, `quantity: 1`-gyel: a darabszám már a `PriceLine`
 * címkéjében van ("Extra személyek (2)"), az összeg pedig már a teljes soré,
 * nem egységár. Ezt szétszedni azt jelentené, hogy itt újraszámoljuk azt, amit
 * a `calculatePricing()` egyszer már kiszámolt.
 *
 * A negatív összegű (kedvezmény) sorok negatívan mennek tovább — így ábrázolja
 * a szamlazz is a levonást.
 *
 * **A beszámított előleg külön, negatív tétel a végén, és ez nem opcionális.**
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
  lines: PriceLine[],
  advance: SettledAdvance,
): InvoiceLineItem[] {
  const items: InvoiceLineItem[] = lines.map((line) => ({
    name: line.label.replace(LEADING_EMOJI, '').trim(),
    quantity: 1,
    unitPriceGross: centsToHuf(line.amountInCents),
    vatRate: NamedVATRate.AAM,
  }));

  // add advance to the beginning of the array
  if (advance.amountInCents !== 0) {
    items.unshift({
      name: 'Fotózás előleg',
      quantity: 1,
      unitPriceGross: -centsToHuf(advance.amountInCents),
      vatRate: NamedVATRate.AAM,
    });
  }

  return items;
}
