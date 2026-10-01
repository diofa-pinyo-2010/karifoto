import type { PhotoShootingPricing } from '@/generated/prisma/client';
import type { PriceLine } from '@/server/pricing';

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
}): { lines: PriceLine[]; extraInCents: number } {
  const lines: PriceLine[] = [];

  const extraEdited = Math.max(
    0,
    editedImages - pricing.packageEditedImagesAllowance,
  );
  if (extraEdited > 0) {
    lines.push({
      label: `Extra szerkesztett képek (${extraEdited} db)`,
      amountInCents: extraEdited * pricing.extraEditedImageRateInCents,
    });
  }

  if (retouchedImages > 0) {
    lines.push({
      label: `Extra retusált képek (${retouchedImages} db)`,
      amountInCents: retouchedImages * pricing.extraRetouchedImageRateInCents,
    });
  }

  return {
    lines,
    extraInCents: lines.reduce((sum, line) => sum + line.amountInCents, 0),
  };
}
