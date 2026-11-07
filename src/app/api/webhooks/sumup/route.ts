import * as z from 'zod';

import { getTransaction } from '@/lib/sumup/client';
import {
  cancelSumUpAttemptWithoutTransaction,
  reconcileSumUpAttempt,
} from '@/server/reconcile-sumup-attempt';

// Aláírás nélküli: a payloadból csak a tranzakció azonosítóját használjuk, az
// állapotot és az összeget mindig a SumUp API-tól kérjük le. A payload
// `failure_reason`-jét sem mentjük, mert bárki küldhetné.
const sumupWebhookSchema = z.object({
  id: z.string(),
  event_type: z.string(),
  payload: z.object({
    client_transaction_id: z.string(),
    merchant_code: z.string(),
    status: z.string(),
  }),
  timestamp: z.string(),
});

export async function POST(req: Request) {
  const parsed = sumupWebhookSchema.safeParse(
    await req.json().catch(() => null),
  );

  if (!parsed.success) {
    console.error(parsed.error.issues);
    return new Response('invalid webhook payload', { status: 200 });
  }

  const {
    event_type,
    payload: { client_transaction_id: clientTransactionId, status },
  } = parsed.data;
  if (event_type !== 'solo.transaction.updated') {
    return new Response('unknown webhook type', { status: 200 });
  }

  const transactionFull = await getTransaction(clientTransactionId);

  if (transactionFull == null) {
    // Kártya nélküli megszakításnál a SumUp `failed`-et küld, de tranzakció nem
    // jön létre: a SumUp API-ja szerint nem mozdult pénz, ezért lezárjuk.
    // Sikeres fizetésnél a tranzakció hiánya csak késés lehet: a retry segít.
    if (status !== 'failed') {
      throw new Error(
        `SumUp transaction not found for ${status} webhook: ${clientTransactionId}`,
      );
    }
    const result =
      await cancelSumUpAttemptWithoutTransaction(clientTransactionId);
    return new Response(result, { status: 200 });
  }

  const foreignTransactionId = z
    .uuid()
    .safeParse(transactionFull.foreign_transaction_id);
  if (!foreignTransactionId.success) {
    console.error(
      'ForeignTransactionID is missing or not a UUID. clientTransactionId: ',
      transactionFull.client_transaction_id,
    );
    return new Response('ignored', { status: 200 });
  }

  const result = await reconcileSumUpAttempt(
    foreignTransactionId.data,
    transactionFull,
  );

  return new Response(result, { status: 200 });
}
