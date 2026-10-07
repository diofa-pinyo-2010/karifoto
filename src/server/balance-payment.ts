'use server';

import { env } from '@/env';
import { Prisma } from '@/generated/prisma/client';
import { LEDGER_ENTRY_CATEGORY_SIGN, UUID_RE } from '@/lib/constants';
import { verifySession } from '@/lib/dal';
import { sendDiscordNotification } from '@/lib/discord';
import { prisma } from '@/lib/prisma';
import { qStashClient } from '@/lib/upstash';
import { recalculatePhotoShootingStatus } from '@/server/admin';
import { resolveCashBalancePayment } from '@/server/balance-payment-guard';

const BALANCE = 'INCOME_CLIENT_PAYMENT_BALANCE' as const;

/**
 * A stúdióban készpénzben átvett hátralék rögzítése.
 *
 * A döntést (átvehető-e, mennyi) a `resolveCashBalancePayment()` hozza meg — ez
 * a függvény csak a köré épülő I/O: betölt, ír, sorba tesz, újraszámol.
 *
 * A pénz már a kasszában van, mire ide érünk, ezért a sorrend nem tetszőleges:
 * a `LedgerEntry` a legelső, és semmilyen későbbi hiba nem vonja vissza.
 */
export async function recordCashBalancePayment(
  shootingId: string,
): Promise<{ error: string } | { success: true }> {
  await verifySession();

  if (!UUID_RE.test(shootingId)) {
    return { error: 'Érvénytelen PhotoShooting ID.' };
  }

  const shooting = await prisma.photoShooting.findUnique({
    where: { id: shootingId },
    include: { adjustments: true, ledgerEntries: true, pricing: true },
  });

  if (shooting == null) {
    return { error: 'Nem találjuk ezt a fotózást.' };
  }

  const decision = resolveCashBalancePayment({
    adjustments: shooting.adjustments,
    ledgerEntries: shooting.ledgerEntries,
    pricing: shooting.pricing,
    shooting,
    status: shooting.status,
  });

  if (!decision.ok) {
    return { error: decision.error };
  }

  let ledgerEntryId: string;
  try {
    ledgerEntryId = await prisma.$transaction(async (tx) => {
      /**
       * Újra megkérdezzük ugyanazt a tranzakción belül: a fenti döntés azóta
       * betöltött adatokon alapul, és a dupla kattintás pont ebben a résben
       * férne be. Ez a szűk verseny ellen nem elég (read committed mellett két
       * párhuzamos tranzakció mindkettő 0-t látna), ezért van mögötte a
       * részleges unique index is — ez itt csak a szép hibaüzenetért van.
       */
      const alreadyCollected = await tx.ledgerEntry.count({
        where: { category: BALANCE, photoShootingId: shootingId },
      });
      if (alreadyCollected > 0) {
        throw new BalanceAlreadyCollectedError();
      }

      const entry = await tx.ledgerEntry.create({
        data: {
          amountInCents:
            decision.amountInCents * LEDGER_ENTRY_CATEGORY_SIGN[BALANCE],
          category: BALANCE,
          method: 'CASH',
          photoShooting: { connect: { id: shootingId } },
        },
        select: { id: true },
      });

      return entry.id;
    });
  } catch (error) {
    /**
     * Kétféleképp derülhet ki, hogy közben más már rögzítette: a fenti
     * számolásból, vagy a `LedgerEntry_one_balance_per_photo_shooting_key`
     * részleges unique indexből. Az utóbbi az igazi védelem, mindkettő
     * ugyanazt jelenti a felhasználónak.
     */
    if (
      error instanceof BalanceAlreadyCollectedError ||
      (error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002')
    ) {
      return { error: 'A hátralék már rögzítve van.' };
    }
    console.error('[balance-payment] failed to record cash payment', {
      error,
      shootingId,
    });
    return { error: 'Nem sikerült rögzíteni a fizetést. Próbáld újra.' };
  }

  /**
   * A számlázás innentől külön job. Ha a sorba tétel elhasal, azt **nem**
   * rollbackeljük: a pénz a kasszában van, a tételnek maradnia kell. A számla
   * utólag újra sorba tehető, ezért itt csak jelezünk.
   */
  try {
    await qStashClient.publishJSON({
      body: { ledgerEntryId, shootingId },
      retries: 5,
      url: `${env.NEXT_PUBLIC_SITE_URL}/api/jobs/generate-final-invoice`,
    });
  } catch (error) {
    console.error(
      '[balance-payment] failed to queue final invoice job (CASH)',
      {
        error,
        ledgerEntryId,
        shootingId,
      },
    );
    await sendDiscordNotification({
      content: [
        '**Készpénz rögzítve, de a végszámla job nem indult el!**\n',
        `Shooting ID: ${shootingId}`,
        `LedgerEntry ID: ${ledgerEntryId}`,
        'A fizetés rögzítve van, a végszámlát kézzel kell kiállítani vagy a jobot újra sorba tenni.',
      ].join('\n'),
      type: 'error',
    });
  }

  // Egyszerre újraszámolja a státuszt (az egyenleg-kapu már zárva) és
  // revalidálja az admin oldalt — ugyanaz a fogás, mint a price-adjustments.ts-ben.
  await recalculatePhotoShootingStatus(shootingId);

  return { success: true };
}

/** Csak a tranzakció megszakítására, a hívón kívül nem látszik. */
class BalanceAlreadyCollectedError extends Error {}
