import { APIError, SumUp } from '@sumup/sdk';

import { env } from '@/env';
import { toSumUpMoney } from '@/lib/sumup/money';

import type { ReaderDeviceStatus } from '@/lib/sumup/readers';

const sumup = new SumUp({ apiKey: env.SUMUP_API_KEY });

export async function createSumUpCheckout({
  readerId,
  paymentAttemptId,
  amountInCents,
  clientName,
}: {
  readerId: string;
  paymentAttemptId: string;
  amountInCents: number;
  clientName: string;
}) {
  return sumup.readers.createCheckout(env.SUMUP_MERCHANT_CODE, readerId, {
    affiliate: {
      app_id: env.SUMUP_AFFILIATE_APP_ID,
      key: env.SUMUP_AFFILIATE_KEY,
      foreign_transaction_id: paymentAttemptId,
    },
    total_amount: toSumUpMoney(amountInCents),
    description: `${clientName} – Karácsonyi fotózás`,
    return_url: `${env.NEXT_PUBLIC_SITE_URL}/api/webhooks/sumup`,
  });
}

export async function getTransaction(clientTransactionId: string) {
  return sumup.transactions.get(env.SUMUP_MERCHANT_CODE, {
    client_transaction_id: clientTransactionId,
  });
}

/**
 * A tranzakció a mi kísérlet-id-nk alapján (`foreign_transaction_id`). `null`,
 * ha a SumUp nem tud róla: a checkout nem jutott el a terminálig.
 */
export async function getTransactionForAttempt(attemptId: string) {
  try {
    return await sumup.transactions.get(env.SUMUP_MERCHANT_CODE, {
      foreign_transaction_id: attemptId,
    });
  } catch (error) {
    if (error instanceof APIError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

export async function listReaders() {
  const { items } = await sumup.readers.list(env.SUMUP_MERCHANT_CODE);
  return items;
}

/**
 * A merchant összes readere a legutóbbi ismert állapotával. Egy reader
 * állapotlekérésének hibája csak azt a readert érinti (`deviceStatus: null`),
 * a lista lekérésének hibája viszont kidobódik.
 */
export async function listReadersWithStatus() {
  const items = await listReaders();

  return Promise.all(
    items.map(async (reader) => {
      let deviceStatus: ReaderDeviceStatus | null = null;
      if (reader.status === 'paired') {
        try {
          const { data } = await sumup.readers.getStatus(
            env.SUMUP_MERCHANT_CODE,
            reader.id,
          );
          deviceStatus = data;
        } catch (error) {
          console.error(`SumUp reader status failed for ${reader.id}`, error);
        }
      }

      return { reader, deviceStatus };
    }),
  );
}

export async function terminateSumUpCheckout(readerId: string) {
  return sumup.readers.terminateCheckout(env.SUMUP_MERCHANT_CODE, readerId);
}
