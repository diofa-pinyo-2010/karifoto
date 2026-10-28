import 'server-only';
import { SITE_SETTINGS_TABLE_ID } from '@/lib/constants';
import { prisma } from '@/lib/prisma';
import { getSiteSettings } from '@/lib/queries';
import { listReaders } from '@/lib/sumup/client';
import { choosePaymentReaderId } from '@/lib/sumup/readers';

/**
 * A reader, amelyre a következő fizetés induljon. A kiválasztottat minden
 * fizetés előtt összevetjük a SumUp listájával, így egy újrapárosított
 * terminál (új reader ID) magától átveszi a helyét, ha ő az egyetlen. Ezt el
 * is mentjük, hogy a Terminálok oldal is ezt mutassa.
 *
 * Ha a lista nem kérhető le, a mentett ID-vel próbálkozunk: a checkout úgyis
 * hibát ad, ha az már nem él.
 */
export async function resolvePaymentReaderId() {
  const { sumupReaderId } = await getSiteSettings();

  let readers;
  try {
    readers = await listReaders();
  } catch (error) {
    console.error('[payment-reader] SumUp readers list failed', error);
    return sumupReaderId;
  }

  const readerId = choosePaymentReaderId(sumupReaderId, readers);
  if (readerId && readerId !== sumupReaderId) {
    await saveSelectedPaymentReaderId(readerId);
  }
  return readerId;
}

export async function saveSelectedPaymentReaderId(readerId: string) {
  await prisma.siteSettings.upsert({
    where: { id: SITE_SETTINGS_TABLE_ID },
    update: { sumupReaderId: readerId },
    create: { sumupReaderId: readerId },
  });
}
