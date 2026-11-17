import 'server-only';
import { prisma } from '@/lib/prisma';

/**
 * Lemondott fotózáson nincs mit módosítani (a megjegyzések kivételével).
 *
 * Szándékosan **nem** `'use server'` fájl: ami ott exportálva van, az hívható
 * végpont, egy őr pedig nem lehet az. Ha a fotózás nem létezik, `null`-t
 * adunk: a hívó saját "nem található" ága dönt.
 */
export async function assertShootingEditable(
  shootingId: string,
): Promise<{ error: string } | null> {
  const shooting = await prisma.photoShooting.findUnique({
    where: { id: shootingId },
    select: { cancelledAt: true },
  });

  if (shooting?.cancelledAt != null) {
    return { error: 'Lemondott fotózás nem módosítható.' };
  }
  return null;
}
