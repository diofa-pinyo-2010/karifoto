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
  canForceCloseAttempt,
  isAttemptOpen,
} from '@/lib/sumup/reconcile';
import { resolveBalancePayment } from '@/server/balance-payment-guard';
import { reconcileSumUpAttempt } from '@/server/reconcile-sumup-attempt';

const OPEN = { in: ['INITIATED' as const, 'PENDING' as const] };

export async function createPaymentAttempt({
  shootingId,
  clientName,
}: {
  shootingId: string;
  clientName: string;
}) {
  await verifySession();

  if (!UUID_RE.test(shootingId)) {
    return { error: 'Érvénytelen PhotoShooting ID.' };
  }

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

  const shooting = await prisma.photoShooting.findUnique({
    where: { id: shootingId },
    include: { adjustments: true, ledgerEntries: true, pricing: true },
  });
  if (shooting == null) {
    return { error: 'Nem találjuk ezt a fotózást.' };
  }

  // Az összeget mindig a szerver számolja, a kliens által látott szám csak
  // tájékoztat — ugyanaz a döntés, mint a készpénzes ágban.
  const decision = resolveBalancePayment({
    adjustments: shooting.adjustments,
    ledgerEntries: shooting.ledgerEntries,
    pricing: shooting.pricing,
    shooting,
    status: shooting.status,
  });
  if (!decision.ok) {
    return { error: decision.error };
  }
  const { amountInCents } = decision;

  // Előbb validálunk, hogy érvénytelen összegnél ne maradjon árva rekord.
  try {
    toSumUpMoney(amountInCents);
  } catch (error) {
    console.error(error);
    return { error: 'Érvénytelen összeg, a fizetés nem indítható.' };
  }

  const attempt = await prisma.sumupCheckoutAttempt.create({
    data: { amountInCents, photoShooting: { connect: { id: shootingId } } },
  });

  let checkout;
  try {
    checkout = await createSumUpCheckout({
      paymentAttemptId: attempt.id,
      amountInCents,
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

    await prisma.sumupCheckoutAttempt.update({
      where: { id: attempt.id },
      data: { status: 'FAILED', failureReason },
    });

    return { error: 'SumUp nem tudta megcsinálni a checkoutot' };
  }

  // A checkout már elfogadva: ha ez az update elbukik, a kísérletet NEM
  // jelöljük FAILED-nek, mert a terminálon a fizetés elindulhat. A webhook a
  // foreign_transaction_id alapján úgyis megtalálja és lezárja.
  await prisma.sumupCheckoutAttempt.update({
    where: { id: attempt.id },
    data: {
      clientTransactionId: checkout.data.client_transaction_id,
      checkoutId: checkout.data.checkout_id,
    },
  });

  return { attemptId: attempt.id };
}

export async function cancelPaymentAttempt(attemptId: string) {
  await verifySession();

  const attempt = await prisma.sumupCheckoutAttempt.findUnique({
    where: { id: attemptId },
  });
  if (!attempt) {
    return { error: 'A fizetési kísérlet nem található.' };
  }
  if (attempt.status !== 'INITIATED' && attempt.status !== 'PENDING') {
    return { error: 'A fizetés már lezárult.' };
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
 * Discordon riaszt (`MANUAL_CLOSE_REASON`).
 */
export async function forceClosePaymentAttempt(attemptId: string) {
  await verifySession();

  if (!UUID_RE.test(attemptId)) {
    return { error: 'A fizetési kísérlet nem található.' };
  }

  const attempt = await prisma.sumupCheckoutAttempt.findUnique({
    where: { id: attemptId },
  });
  if (!attempt) {
    return { error: 'A fizetési kísérlet nem található.' };
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

  // Ha a terminál még vár, leállítjuk; ha nem, ez hibát ad, amit elnyelünk.
  try {
    await terminateSumUpCheckout();
  } catch (error) {
    console.error('[payment] terminate before force close failed', error);
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

  return {};
}
