'use server';

import * as z from 'zod';

import { env } from '@/env';
import { resolveBeautyRetouchNotes } from '@/lib/beauty-retouch-notes';
import { APP_URLS, UUID_RE } from '@/lib/constants';
import { requireClientAccess } from '@/lib/dal';
import { countPicdropSelection } from '@/lib/picdrop';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';
import { completeImageSelection } from '@/server/complete-image-selection';
import { quoteImageSelection } from '@/server/image-selection-quote';

import type { CheckoutMetadata } from '@/lib/checkout-metadata';
import type { QuotePricing } from '@/server/image-selection-quote';

/**
 * A számok és a díjak, nem a kész ár: a dialógus maga hívja a
 * `quoteImageSelection()`-t, hogy az expressz pipa azonnal frissítse az
 * összeget — ugyanazzal a függvénnyel, amelyik a beküldéskor számol.
 */
export type ImageSelectionPreview = {
  editedImages: number;
  retouchedImages: number;
  pricing: QuotePricing;
};

const COUNT_FAILED_ERROR =
  'Nem sikerült megszámolni a megjelölt képeket. Próbáld újra pár perc múlva, vagy keress minket.';

/**
 * Betölti a fotózást, ha *ez* az ügyfél most válogathat. Csak
 * `client_session` jó: a személyzet nem zárhatja le a válogatást az ügyfél
 * helyett (lásd `requireClientAccess`). A fotózást az ügyfél sorára szűkítjük.
 */
async function loadSelectableShooting(
  clientProfileId: string,
  shootingId: string,
) {
  await requireClientAccess(clientProfileId);

  if (!UUID_RE.test(shootingId)) {
    return { error: 'Érvénytelen fotózás.' };
  }

  const shooting = await prisma.photoShooting.findFirst({
    where: { id: shootingId, clientId: clientProfileId },
    include: {
      timeSlot: { select: { startTime: true } },
      pricing: true,
      adjustments: true,
      ledgerEntries: true,
      client: { select: { stripeCustomerId: true } },
    },
  });

  if (shooting?.pricing == null || shooting.rawImagesUrl == null) {
    return { error: 'Nem találjuk ezt a fotózást.' };
  }

  if (shooting.status !== 'USER_SELECTION') {
    return { error: 'Most nem lehet képeket választani.' };
  }

  return {
    error: null,
    shooting: {
      ...shooting,
      pricing: shooting.pricing,
      rawImagesUrl: shooting.rawImagesUrl,
    },
  };
}

/**
 * A galériából megszámolja a piros és fekete zászlós képeket, és
 * megmondja, mennyi extra díjjal jár. Nem ír semmit: a "Mégse" így valóban
 * csak mégse.
 */
export async function previewImageSelection(
  clientProfileId: string,
  shootingId: string,
): Promise<{ error: string } | ImageSelectionPreview> {
  const loaded = await loadSelectableShooting(clientProfileId, shootingId);
  if (loaded.error != null) return { error: loaded.error };
  const { shooting } = loaded;

  const counts = await countPicdropSelection(shooting.rawImagesUrl);
  if (counts == null) return { error: COUNT_FAILED_ERROR };

  const { pricing } = shooting;
  return {
    ...counts,
    pricing: {
      extraEditedImageRateInCents: pricing.extraEditedImageRateInCents,
      extraRetouchedImageRateInCents: pricing.extraRetouchedImageRateInCents,
      packageEditedImagesAllowance: pricing.packageEditedImagesAllowance,
      expressPostProductionPriceInCents:
        pricing.expressPostProductionPriceInCents,
    },
  };
}

const ShownCountsSchema = z.object({
  editedImages: z.number().int().nonnegative(),
  retouchedImages: z.number().int().nonnegative(),
  isExpressPostProduction: z.boolean(),
  beautyRetouchNotes: z.string().nullable(),
});

/**
 * Lezárja a válogatást, ha nem jár extra díjjal; ha jár, Stripe Checkoutot
 * nyit, és a lezárás a webhookra marad.
 *
 * A számokat **újra megszámoljuk** a galériából: a kliens csak azt küldi,
 * amit a dialógusban látott, és ha ez eltér, az ügyfélnek újra át kell néznie
 * — nem azt zárjuk le, amit nem látott.
 */
export async function confirmImageSelection(
  clientProfileId: string,
  shootingId: string,
  shown: {
    editedImages: number;
    retouchedImages: number;
    isExpressPostProduction: boolean;
    beautyRetouchNotes: string | null;
  },
): Promise<{ error: string } | { success: true } | { checkoutUrl: string }> {
  const parsedShown = ShownCountsSchema.safeParse(shown);
  if (!parsedShown.success) {
    return { error: 'Érvénytelen adat.' };
  }

  const loaded = await loadSelectableShooting(clientProfileId, shootingId);
  if (loaded.error != null) return { error: loaded.error };
  const { shooting } = loaded;

  const counts = await countPicdropSelection(shooting.rawImagesUrl);
  if (counts == null) return { error: COUNT_FAILED_ERROR };

  if (
    counts.editedImages !== parsedShown.data.editedImages ||
    counts.retouchedImages !== parsedShown.data.retouchedImages
  ) {
    return {
      error:
        'Közben változott a válogatás a galériában. Zárd be és nézd át újra.',
    };
  }

  // Az újraszámolt darabszám dönt: ha közben eltűnt a retus jelölés, a
  // jegyzet sem kell.
  const notes = resolveBeautyRetouchNotes(
    counts.retouchedImages,
    parsedShown.data.beautyRetouchNotes,
  );
  if (!notes.ok) return { error: notes.error };

  const selection = {
    ...counts,
    isExpressPostProduction: parsedShown.data.isExpressPostProduction,
    beautyRetouchNotes: notes.notes,
  };
  const { lines, extraInCents } = quoteImageSelection({
    pricing: shooting.pricing,
    ...selection,
  });

  if (extraInCents > 0) {
    const detailsUrl = `${env.NEXT_PUBLIC_SITE_URL}${APP_URLS.clientPortalShootingDetails(clientProfileId, shootingId)}`;
    try {
      const session = await stripe.checkout.sessions.create({
        customer: shooting.client.stripeCustomerId,
        mode: 'payment',
        line_items: lines.map((line) => ({
          price_data: {
            currency: 'huf',
            product_data: { name: line.name },
            unit_amount: line.unitPriceInCents,
          },
          quantity: line.quantity,
        })),
        metadata: {
          kind: 'image_selection_extra',
          photo_shooting_id: shootingId,
          edited_images: counts.editedImages,
          retouched_images: counts.retouchedImages,
          express_post_production: selection.isExpressPostProduction
            ? 'true'
            : 'false',
          ...(selection.beautyRetouchNotes != null && {
            beauty_retouch_notes: selection.beautyRetouchNotes,
          }),
        } satisfies CheckoutMetadata,
        success_url: detailsUrl,
        cancel_url: detailsUrl,
      });
      if (session.url == null) {
        return { error: 'Nem tudtuk létrehozni a fizetést, próbáld újra.' };
      }
      return { checkoutUrl: session.url };
    } catch (error) {
      console.error('[image-selection] failed to create checkout', {
        error,
        shootingId,
      });
      return {
        error:
          'Nem sikerült kapcsolódni a fizetési szolgáltatóhoz, próbáld újra.',
      };
    }
  }

  try {
    if (!(await completeImageSelection(shootingId, selection))) {
      return { error: 'A válogatás már be van küldve.' };
    }
  } catch (error) {
    console.error('[image-selection] failed to save selection', {
      error,
      shootingId,
    });
    return { error: 'Nem sikerült menteni a válogatást. Próbáld újra.' };
  }

  return { success: true };
}
