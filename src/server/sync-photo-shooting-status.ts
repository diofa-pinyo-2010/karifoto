import 'server-only';
import { revalidatePath } from 'next/cache';

import { APP_URLS } from '@/lib/constants';
import { prisma } from '@/lib/prisma';
import { resolveStatus } from '@/server/photo-shooting-status';

/**
 * Újraszámolja és elmenti a fotózás státuszát, **session nélkül**.
 *
 * Külön fájlban él, nem az `admin.ts`-ben: az `'use server'` modul minden
 * exportja kliensről hívható server action, egy auth nélküli exportot ott
 * bárki meghívhatna. A `server-only` import ezt a fájlt a kliens bundle-ből is
 * kizárja.
 *
 * Azoknak a hívóknak való, amelyeknek nincs admin sessionjük (SumUp webhook).
 * Az admin felületről az `admin.ts`-beli `recalculatePhotoShootingStatus` hívja,
 * az `verifySession()` után delegál ide.
 *
 * Hibát dob, ha a fotózás vagy az árazása hiányzik: a hívó dönti el, mi a teendő.
 */
export async function syncPhotoShootingStatus(shootingId: string) {
  const current = await prisma.photoShooting.findUniqueOrThrow({
    where: { id: shootingId },
    include: {
      timeSlot: { select: { startTime: true } },
      pricing: true,
      adjustments: true,
      ledgerEntries: true,
    },
  });

  if (current.pricing == null) {
    throw new Error(`PhotoShooting ${shootingId} has no pricing record`);
  }

  const status = resolveStatus({
    current,
    updates: {},
    pricing: current.pricing,
    adjustments: current.adjustments,
    ledgerEntries: current.ledgerEntries,
  });

  await prisma.photoShooting.update({
    where: { id: shootingId },
    data: { status },
  });

  revalidatePath(APP_URLS.photoShootingAdminPage(shootingId));
}
