import { revalidatePath } from 'next/cache';

import { env } from '@/env';
import { APP_URLS } from '@/lib/constants';
import { sendDiscordNotification } from '@/lib/discord';
import { prisma } from '@/lib/prisma';
import { formatMoney } from '@/lib/utils';
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
 * felül egy lezárt válogatást, és ne pingeljen kétszer.
 */
export async function completeImageSelection(
  shootingId: string,
  selection: {
    editedImages: number;
    retouchedImages: number;
    isExpressPostProduction: boolean;
  },
  paidInCents: number | null,
): Promise<boolean> {
  const shooting = await prisma.photoShooting.findUniqueOrThrow({
    where: { id: shootingId },
    include: {
      timeSlot: { select: { startTime: true } },
      pricing: true,
      adjustments: true,
      ledgerEntries: true,
      client: { select: { owner: { select: { name: true } } } },
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

  await sendDiscordNotification({
    type: 'info',
    content: [
      '🖼️ **Képválogatás beküldve!**\n',
      `Név: ${shooting.client.owner.name}`,
      `Szerkesztésre: ${selection.editedImages} db (csomagban: ${shooting.pricing.packageEditedImagesAllowance} db)`,
      `Extra retusra: ${selection.retouchedImages} db`,
      `Expressz utómunka: ${selection.isExpressPostProduction ? 'igen ⚡' : 'nem'}`,
      `Fizetett extra: ${paidInCents != null ? formatMoney(paidInCents) : '—'}`,
      `[Fotózás megnyitása az adminon](${env.NEXT_PUBLIC_SITE_URL}${APP_URLS.photoShootingAdminPage(shootingId)})`,
    ].join('\n'),
  });

  return true;
}
