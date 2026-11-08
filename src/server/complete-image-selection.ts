import { revalidatePath } from 'next/cache';

import { env } from '@/env';
import { APP_URLS } from '@/lib/constants';
import { formatLongDate, monthDayFormatter } from '@/lib/formatters';
import { prisma } from '@/lib/prisma';
import { sendEditorSelectionCompletedEmail } from '@/lib/resend/editor-selection-completed';
import { getDeliveryDeadline } from '@/lib/utils';
import { resolveStatus } from '@/server/photo-shooting-status';

/**
 * Lezárja a válogatást a megadott számokkal. Közös a "Beküldés" (nincs extra)
 * és a Stripe webhook (kifizetett extra) útján, hogy a kettő ne térhessen el.
 *
 * Szándékosan **nem** `'use server'` fájl: a webhook hívja, és ami itt
 * exportálva van, az ott nyilvános server action lenne jogosultság-ellenőrzés
 * nélkül. Az ügyfél oldali hívó (`confirmImageSelection`) maga ellenőriz.
 *
 * `false`, ha a válogatás már le volt zárva — a `selectionCompletedAt: null`
 * szűrő védi, hogy a dupla beküldés vagy a webhook újrapróbálása ne írjon
 * felül egy lezárt válogatást, és ne küldjön kétszer emailt.
 *
 * A szerkesztő csak akkor kap emailt, ha már ki van jelölve; ha nincs, a
 * fotózás EDITOR_SELECTION státuszba kerül, és az adminon látszik.
 */
export async function completeImageSelection(
  shootingId: string,
  selection: {
    editedImages: number;
    retouchedImages: number;
    isExpressPostProduction: boolean;
    beautyRetouchNotes: string | null;
  },
): Promise<boolean> {
  const shooting = await prisma.photoShooting.findUniqueOrThrow({
    where: { id: shootingId },
    include: {
      timeSlot: { select: { startTime: true } },
      pricing: true,
      adjustments: true,
      ledgerEntries: true,
      client: { select: { owner: { select: { name: true } } } },
      editor: {
        select: { nickname: true, owner: { select: { email: true } } },
      },
    },
  });
  if (shooting.pricing == null) {
    throw new Error(`[image-selection] pricing missing for ${shootingId}`);
  }

  // A `declared*` azt rögzíti, amit a galéria a lezáráskor mutatott; a
  // `total*` az, amit a szerkesztő később javíthat.
  const updates = {
    declaredEditedImages: selection.editedImages,
    declaredRetouchedImages: selection.retouchedImages,
    totalEditedImages: selection.editedImages,
    totalRetouchedImages: selection.retouchedImages,
    isExpressPostProduction: selection.isExpressPostProduction,
    beautyRetouchNotes: selection.beautyRetouchNotes,
    selectionCompletedAt: new Date(),
  };

  const status = resolveStatus({
    current: shooting,
    updates,
    pricing: shooting.pricing,
    adjustments: shooting.adjustments,
    ledgerEntries: shooting.ledgerEntries,
  });

  const { count } = await prisma.photoShooting.updateMany({
    where: { id: shootingId, selectionCompletedAt: null },
    data: { ...updates, status },
  });
  if (count === 0) return false;

  revalidatePath(
    APP_URLS.clientPortalShootingDetails(shooting.clientId, shootingId),
  );

  if (shooting.editor != null) {
    // Nem dobunk: a válogatás már le van zárva, egy elakadt email miatt ne
    // bukjon el a beküldés vagy a Stripe webhook.
    try {
      const { error } = await sendEditorSelectionCompletedEmail({
        shootingId,
        to: shooting.editor.owner.email,
        name: shooting.editor.nickname,
        shootingLabel: `${shooting.client.owner.name} · ${formatLongDate(shooting.timeSlot.startTime)} · ${shooting.package}`,
        editedImages: selection.editedImages,
        retouchedImages: selection.retouchedImages,
        isExpressPostProduction: selection.isExpressPostProduction,
        beautyRetouchNotes: selection.beautyRetouchNotes,
        rawImagesUrl: shooting.rawImagesUrl,
        deadline: monthDayFormatter.format(
          getDeliveryDeadline(
            updates.selectionCompletedAt,
            selection.isExpressPostProduction,
          ),
        ),
        shootingUrl: `${env.NEXT_PUBLIC_SITE_URL}${APP_URLS.photoShootingAdminPage(shootingId)}`,
      });
      if (error != null) throw error;
    } catch (error) {
      console.error('[image-selection] editor email failed', {
        shootingId,
        error,
      });
    }
  }

  return true;
}
