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

/** A pillanatkép azon díjai, amelyekből a válogatás ára kijön. */
export type QuotePricing = Pick<
  PhotoShootingPricing,
  | 'extraEditedImageRateInCents'
  | 'extraRetouchedImageRateInCents'
  | 'packageEditedImagesAllowance'
  | 'expressPostProductionPriceInCents'
>;

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
  isExpressPostProduction,
}: {
  pricing: QuotePricing;
  editedImages: number;
  retouchedImages: number;
  isExpressPostProduction: boolean;
}): { lines: QuoteLine[]; extraInCents: number } {
  const lines: QuoteLine[] = [];

  const addLine = (
    name: string,
    quantity: number,
    unitPriceInCents: number,
    label = `${name} (${quantity} db)`,
  ) => {
    if (quantity <= 0) return;
    lines.push({
      label,
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
  addLine(
    'Expressz utómunka',
    isExpressPostProduction ? 1 : 0,
    pricing.expressPostProductionPriceInCents,
    '⚡ Expressz utómunka',
  );

  return {
    lines,
    extraInCents: lines.reduce((sum, line) => sum + line.amountInCents, 0),
  };
}
