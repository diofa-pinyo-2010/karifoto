import type { PhotoShootingPricing } from '@/generated/prisma/client';
import type { PriceLine } from '@/server/pricing';

/**
 * Egy `PriceLine` mennyiséggel és egységárral, hogy a Stripe Checkout és a
 * belőle készülő számla tételesen mutassa (pl. 3 db × 2 000 Ft). A `name` a
 * darabszám nélküli megnevezés — a darabszámot a Stripe és a számla maga írja.
 */
type QuoteLine = PriceLine & {
  name: string;
  quantity: number;
  unitPriceInCents: number;
};

/**
 * Mennyibe kerül az ügyfél által megadott két szám a csomag kerete fölött.
 *
 * Tiszta függvény, a `'use server'` fájlok miatt külön fájlban (lásd
 * `photo-shooting-status.ts`). Ugyanazokat a díjakat és a keretet olvassa a
 * `PhotoShootingPricing` pillanatképből, mint a `calculatePricing()`, ezért a
 * két szám egyezik; a retusálás itt is mind extra, nincs hozzá keret.
 *
 * A bemenetet nem validálja: a negatív számot a hívó zárja ki (lásd a
 * "negative-number hole" részt az image-selection.md-ben).
 */
export function quoteImageSelection({
  pricing,
  editedImages,
  retouchedImages,
}: {
  pricing: Pick<
    PhotoShootingPricing,
    | 'extraEditedImageRateInCents'
    | 'extraRetouchedImageRateInCents'
    | 'packageEditedImagesAllowance'
  >;
  editedImages: number;
  retouchedImages: number;
}): { lines: QuoteLine[]; extraInCents: number } {
  const lines: QuoteLine[] = [];

  const addLine = (
    name: string,
    quantity: number,
    unitPriceInCents: number,
  ) => {
    if (quantity <= 0) return;
    lines.push({
      label: `${name} (${quantity} db)`,
      amountInCents: quantity * unitPriceInCents,
      name,
      quantity,
      unitPriceInCents,
    });
  };

  addLine(
    'Extra szerkesztett képek',
    Math.max(0, editedImages - pricing.packageEditedImagesAllowance),
    pricing.extraEditedImageRateInCents,
  );
  addLine(
    'Extra retusált képek',
    retouchedImages,
    pricing.extraRetouchedImageRateInCents,
  );

  return {
    lines,
    extraInCents: lines.reduce((sum, line) => sum + line.amountInCents, 0),
  };
}
