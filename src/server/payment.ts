'use server';

import { APIError } from '@sumup/sdk';

import { UUID_RE } from '@/lib/constants';
import { verifySession } from '@/lib/dal';
import { sendDiscordNotification } from '@/lib/discord';
import { prisma } from '@/lib/prisma';
import {
  createSumUpCheckout,
  getTransactionForAttempt,
  terminateSumUpCheckout,
} from '@/lib/sumup/client';
import { toSumUpMoney } from '@/lib/sumup/money';
import {
  MANUAL_CLOSE_REASON,
  OPEN_STATUSES,
  canForceCloseAttempt,
  isAttemptOpen,
} from '@/lib/sumup/reconcile';
import { loadBalancePayment } from '@/server/load-balance-payment';
import { reconcileSumUpAttempt } from '@/server/reconcile-sumup-attempt';

import type { SumupCheckoutAttempt } from '@/generated/prisma/client';

const OPEN = { in: OPEN_STATUSES };
const NOT_FOUND = { error: 'A fizetési kísérlet nem található.' };

export async function createPaymentAttempt(shootingId: string) {
  await verifySession();

  if (!UUID_RE.test(shootingId)) {
    return { error: 'Érvénytelen PhotoShooting ID.' };
  }

  let attempt: SumupCheckoutAttempt;
  let clientName: string;
  try {
    // Egyszerre egy nyitott kísérlet: ha van, azt folytatjuk, nem indítunk újat
    // (egy második checkout a terminálon dupla terheléshez vezethetne).
    const openAttempt = await prisma.sumupCheckoutAttempt.findFirst({
      where: { photoShootingId: shootingId, status: OPEN },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });
    if (openAttempt) {
      return { attemptId: openAttempt.id };
    }

    // Az összeget mindig a szerver számolja, a kliens által látott szám csak
    // tájékoztat — ugyanaz a döntés, mint a készpénzes ágban.
    const decision = await loadBalancePayment(shootingId);
    if (!decision.ok) {
      return { error: decision.error };
    }
    clientName = decision.clientName;

    // Előbb validálunk, hogy érvénytelen összegnél ne maradjon árva rekord.
    try {
      toSumUpMoney(decision.amountInCents);
    } catch (error) {
      console.error(error);
      return { error: 'Érvénytelen összeg, a fizetés nem indítható.' };
    }

    attempt = await prisma.sumupCheckoutAttempt.create({
      data: {
        amountInCents: decision.amountInCents,
        photoShooting: { connect: { id: shootingId } },
      },
    });
  } catch (error) {
    console.error('[payment] failed to create attempt', { error, shootingId });
    return { error: 'Nem sikerült elindítani a fizetést. Próbáld újra.' };
  }

  let checkout;
  try {
    checkout = await createSumUpCheckout({
      paymentAttemptId: attempt.id,
      amountInCents: attempt.amountInCents,
      clientName,
    });
  } catch (error) {
    console.error('SumUp nem tudta megcsinálni a checkoutot', error);

    const failureReason =
      error instanceof APIError
        ? `${error.status}: ${JSON.stringify(error.error)}`
        : error instanceof Error
          ? error.message
          : 'unknown error';

    // Ha a SumUp mégis elfogadta (pl. timeout), és később sikeres fizetés jön
    // rá, a reconcile ezt a lezárt kísérletet látja, és Discordon riaszt.
    try {
      await prisma.sumupCheckoutAttempt.update({
        where: { id: attempt.id },
        data: { status: 'FAILED', failureReason },
      });
    } catch (updateError) {
      console.error('[payment] failed to mark attempt FAILED', {
        attemptId: attempt.id,
        updateError,
      });
    }

    return { error: 'SumUp nem tudta megcsinálni a checkoutot' };
  }

  // A checkout már elfogadva: ha ez az update elbukik, a kísérletet NEM
  // jelöljük FAILED-nek, mert a terminálon a fizetés elindulhat. A webhook a
  // foreign_transaction_id alapján úgyis megtalálja és lezárja.
  try {
    await prisma.sumupCheckoutAttempt.update({
      where: { id: attempt.id },
      data: {
        clientTransactionId: checkout.data.client_transaction_id,
        checkoutId: checkout.data.checkout_id,
      },
    });
  } catch (error) {
    console.error('[payment] failed to store checkout ids', {
      attemptId: attempt.id,
      error,
    });
  }

  return { attemptId: attempt.id };
}

export async function cancelPaymentAttempt(
  attemptId: string,
): Promise<{ error?: string }> {
  await verifySession();

  if (!UUID_RE.test(attemptId)) {
    return NOT_FOUND;
  }

  try {
    const attempt = await prisma.sumupCheckoutAttempt.findUnique({
      where: { id: attemptId },
    });
    if (!attempt) {
      return NOT_FOUND;
    }
    if (!isAttemptOpen(attempt)) {
      return { error: 'A fizetés már lezárult.' };
    }
    if (await isReaderBusyElsewhere(attempt.id)) {
      return {
        error:
          'A terminálon egy másik fotózás fizetése is nyitott, ezért nem állítjuk le.',
      };
    }
  } catch (error) {
    console.error('[payment] failed to load attempt for cancel', error);
    return { error: 'A fizetést most nem lehet megszakítani.' };
  }

  // A SumUp a leállítást nem erősíti meg, és csak akkor fogadja el, ha a
  // terminál kártyára/PIN-re vár. A kísérlet státuszát ezért itt nem írjuk:
  // sikeres leállításnál a webhook `failed`-et küld, azt a webhook zárja le.
  try {
    await terminateSumUpCheckout();
  } catch (error) {
    console.error('SumUp nem tudta leállítani a checkoutot', error);
    return { error: 'A fizetést most nem lehet megszakítani.' };
  }

  return {};
}

/**
 * Végső kiút egy beragadt kísérletre: ha a SumUp percek óta nem mond végleges
 * állapotot, a kolléga sikertelenként lezárhatja és újraindíthatja a fizetést.
 *
 * Előtte még egyszer megkérdezzük a SumUp-ot: ha közben lezárult, az nyer. Ha a
 * lezárás után mégis sikeres fizetés jön, a reconcile nem könyvel, hanem
 * Discordon riaszt.
 */
export async function forceClosePaymentAttempt(
  attemptId: string,
): Promise<{ error?: string }> {
  await verifySession();

  if (!UUID_RE.test(attemptId)) {
    return NOT_FOUND;
  }

  try {
    const attempt = await prisma.sumupCheckoutAttempt.findUnique({
      where: { id: attemptId },
    });
    if (!attempt) {
      return NOT_FOUND;
    }
    if (!isAttemptOpen(attempt)) {
      return { error: 'A fizetés már lezárult.' };
    }
    if (!canForceCloseAttempt(attempt, new Date())) {
      return { error: 'Még várj egy kicsit, a terminál válaszolhat.' };
    }

    try {
      const transaction = await getTransactionForAttempt(attempt.id);
      if (transaction != null) {
        await reconcileSumUpAttempt(attempt.id, transaction);
      }
    } catch (error) {
      console.error('[payment] reconcile before force close failed', error);
    }

    // Ha a terminál még erre vár, leállítjuk; ha nem, ez hibát ad, amit
    // elnyelünk. Másik fotózás nyitott fizetését viszont nem lőjük le.
    if (!(await isReaderBusyElsewhere(attempt.id))) {
      try {
        await terminateSumUpCheckout();
      } catch (error) {
        console.error('[payment] terminate before force close failed', error);
      }
    }

    const { count } = await prisma.sumupCheckoutAttempt.updateMany({
      where: { id: attempt.id, status: OPEN },
      data: { status: 'FAILED', failureReason: MANUAL_CLOSE_REASON },
    });
    if (count > 0) {
      await sendDiscordNotification({
        type: 'warning',
        content: [
          '**SumUp kísérlet kézzel lezárva** (a terminál nem jelzett vissza)\n',
          `SumupCheckoutAttempt ID: ${attempt.id}`,
          `Shooting ID: ${attempt.photoShootingId}`,
          'Érdemes a SumUp felületén ellenőrizni, hogy nem ment-e át mégis a fizetés.',
        ].join('\n'),
      });
    }
  } catch (error) {
    console.error('[payment] force close failed', { attemptId, error });
    return { error: 'Nem sikerült lezárni a fizetést. Próbáld újra.' };
  }

  return {};
}

/**
 * Egy terminálunk van, és a SumUp leállítása (`terminateCheckout`) azt állítja
 * le, ami éppen rajta fut — nem egy adott checkoutot. Ha más fotózásnak is van
 * nyitott kísérlete, lehet, hogy éppen az fut.
 */
async function isReaderBusyElsewhere(attemptId: string) {
  const other = await prisma.sumupCheckoutAttempt.count({
    where: { id: { not: attemptId }, status: OPEN },
  });
  return other > 0;
}
