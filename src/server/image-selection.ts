'use server';

import { revalidatePath } from 'next/cache';

import * as z from 'zod';

import { APP_URLS, UUID_RE } from '@/lib/constants';
import { requireClientAccess } from '@/lib/dal';
import { countPicdropSelection } from '@/lib/picdrop';
import { prisma } from '@/lib/prisma';
import { quoteImageSelection } from '@/server/image-selection-quote';
import { resolveStatus } from '@/server/photo-shooting-status';

import type { PriceLine } from '@/server/pricing';

export type ImageSelectionPreview = {
  editedImages: number;
  retouchedImages: number;
  allowance: number;
  lines: PriceLine[];
  extraInCents: number;
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
 * A galériából megszámolja a fekete zászlós és piros szíves képeket, és
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

  return {
    ...counts,
    allowance: shooting.pricing.packageEditedImagesAllowance,
    ...quoteImageSelection({ pricing: shooting.pricing, ...counts }),
  };
}

const ShownCountsSchema = z.object({
  editedImages: z.number().int().nonnegative(),
  retouchedImages: z.number().int().nonnegative(),
});

/**
 * Lezárja a válogatást, ha nem jár extra díjjal.
 *
 * A számokat **újra megszámoljuk** a galériából: a kliens csak azt küldi,
 * amit a dialógusban látott, és ha ez eltér, az ügyfélnek újra át kell néznie
 * — nem azt zárjuk le, amit nem látott.
 */
export async function confirmImageSelection(
  clientProfileId: string,
  shootingId: string,
  shown: { editedImages: number; retouchedImages: number },
): Promise<{ error: string } | { success: true }> {
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

  const { extraInCents } = quoteImageSelection({
    pricing: shooting.pricing,
    ...counts,
  });
  if (extraInCents > 0) {
    // TODO: Stripe Checkout (lásd "The payment step" az image-selection.md-ben).
    return { error: 'A fizetés még nem érhető el. Keress minket.' };
  }

  // A `declared*` azt rögzíti, amit a galéria a lezáráskor mutatott; a
  // `total*` az, amit a szerkesztő később javíthat.
  const updates = {
    declaredEditedImages: counts.editedImages,
    declaredRetouchedImages: counts.retouchedImages,
    totalEditedImages: counts.editedImages,
    totalRetouchedImages: counts.retouchedImages,
    selectionCompletedAt: new Date(),
  };

  try {
    const status = resolveStatus({
      current: shooting,
      updates,
      pricing: shooting.pricing,
      adjustments: shooting.adjustments,
      ledgerEntries: shooting.ledgerEntries,
    });

    // A `selectionCompletedAt: null` szűrő azt védi, hogy a dupla beküldés ne
    // írjon felül egy már lezárt válogatást.
    const { count } = await prisma.photoShooting.updateMany({
      where: { id: shootingId, selectionCompletedAt: null },
      data: { ...updates, status },
    });
    if (count === 0) {
      return { error: 'A válogatás már be van küldve.' };
    }
  } catch (error) {
    console.error('[image-selection] failed to save selection', {
      error,
      shootingId,
    });
    return { error: 'Nem sikerült menteni a válogatást. Próbáld újra.' };
  }

  revalidatePath(
    APP_URLS.clientPortalShootingDetails(clientProfileId, shootingId),
  );
  return { success: true };
}
