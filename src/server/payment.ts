'use server';

import { APIError } from '@sumup/sdk';

import { verifySession } from '@/lib/dal';
import { prisma } from '@/lib/prisma';
import {
  createSumUpCheckout,
  terminateSumUpCheckout,
} from '@/lib/sumup/client';
import { toSumUpMoney } from '@/lib/sumup/money';

export async function createPaymentAttempt({
  shootingId,
  amountInCents,
  clientName,
}: {
  shootingId: string;
  amountInCents: number;
  clientName: string;
}) {
  await verifySession();

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
