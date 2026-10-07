import * as z from 'zod';

import { env } from '@/env';
import { Prisma } from '@/generated/prisma/client';
import {
  LedgerEntryCategory,
  PaymentMethod,
  SumupCheckoutAttemptStatus,
} from '@/generated/prisma/enums';
import { LEDGER_ENTRY_CATEGORY_SIGN } from '@/lib/constants';
import { sendDiscordNotification } from '@/lib/discord';
import { prisma } from '@/lib/prisma';
import { getTransaction } from '@/lib/sumup/client';
import { toAttemptStatus } from '@/lib/sumup/status';
import { qStashClient } from '@/lib/upstash';
import { syncPhotoShootingStatus } from '@/server/sync-photo-shooting-status';

const sumupWebhookSchema = z.object({
  id: z.string(),
  event_type: z.string(),
  payload: z.object({
    client_transaction_id: z.string(),
    merchant_code: z.string(),
    status: z.string(),
    failure_reason: z.string().optional(),
  }),
  timestamp: z.string(),
});

export async function POST(req: Request) {
  const parsed = sumupWebhookSchema.safeParse(await req.json());

  if (!parsed.success) {
    console.error(parsed.error.issues);
    return new Response('invalid webhook payload', { status: 200 });
  }

  const {
    event_type,
    payload: { client_transaction_id: clientTransactionId },
  } = parsed.data;
  if (event_type !== 'solo.transaction.updated') {
    return new Response('unknown webhook type', { status: 200 });
  }

  const transactionFull = await getTransaction(clientTransactionId);
  const status =
    transactionFull.status && toAttemptStatus(transactionFull.status);
  if (status == null) {
    console.error(
      'SumUp status without attempt mapping',
      transactionFull.status,
    );
    return new Response('ignored', { status: 200 });
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

  const attempt = await prisma.sumupCheckoutAttempt.findFirst({
    where: {
      id: foreignTransactionId.data,
      status: { in: ['INITIATED', 'PENDING'] },
    },
    select: { id: true, amountInCents: true, photoShootingId: true },
  });
  if (!attempt) {
    console.error('No open attempt for', foreignTransactionId.data);
    return new Response('ignored', { status: 200 });
  }

  if (
    status === SumupCheckoutAttemptStatus.SUCCESSFUL &&
    (transactionFull.currency !== 'HUF' ||
      Math.round((transactionFull.amount ?? 0) * 100) !== attempt.amountInCents)
  ) {
    // pénz mozgott, de nem a várt összeg → ember kell
    console.error('SumUp amount mismatch');
    await sendDiscordNotification({
      type: 'error',
      content: `Sumup amount mismatch! SumupCheckoutAttempt ID: ${attempt.id}`,
    });
    return new Response('amount mismatch', { status: 200 });
  }

  const category = LedgerEntryCategory.INCOME_CLIENT_PAYMENT_BALANCE;

  // Csak a DB-írások vannak a tranzakcióban: a QStash és az állapot-újraszámolás
  // a commit **után** fut, különben a job még nem látná a LedgerEntry-t.
  let ledgerEntryId: string | null;
  try {
    ledgerEntryId = await prisma.$transaction(async (tx) => {
      const { count } = await tx.sumupCheckoutAttempt.updateMany({
        where: {
          id: foreignTransactionId.data,
          status: { in: ['INITIATED', 'PENDING'] },
        },
        data: {
          status,
          failureReason: parsed.data.payload.failure_reason,
          clientTransactionId: parsed.data.payload.client_transaction_id,
        },
      });

      if (count === 0) {
        console.warn('unknown or already-closed attempt');
        return null;
      }
      if (status !== SumupCheckoutAttemptStatus.SUCCESSFUL) {
        return null;
      }

      const entry = await tx.ledgerEntry.create({
        data: {
          category,
          amountInCents:
            attempt.amountInCents * LEDGER_ENTRY_CATEGORY_SIGN[category],
          method: PaymentMethod.CARD,
          photoShooting: { connect: { id: attempt.photoShootingId } },
        },
        select: { id: true },
      });
      return entry.id;
    });
  } catch (error) {
    // Az egyenleg-tétel részleges unique indexe: közben már rögzítették
    // (készpénz, vagy másik kártyás kísérlet). Retry nem segít, a pénz viszont
    // megmozdult a terminálon, ezért ember kell.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      console.error('SumUp payment but balance already collected', {
        attemptId: attempt.id,
      });
      await sendDiscordNotification({
        type: 'error',
        content: [
          '**Sikeres SumUp fizetés, de a hátralék már rögzítve volt!**\n',
          `SumupCheckoutAttempt ID: ${attempt.id}`,
          `Shooting ID: ${attempt.photoShootingId}`,
          'LedgerEntry nem jött létre, valószínűleg dupla fizetés: visszatérítés kell.',
        ].join('\n'),
      });
      await prisma.sumupCheckoutAttempt.updateMany({
        where: { id: attempt.id, status: { in: ['INITIATED', 'PENDING'] } },
        data: {
          status,
          clientTransactionId: parsed.data.payload.client_transaction_id,
        },
      });
      return new Response('balance already collected', { status: 200 });
    }
    // Minden más hiba: a tranzakció visszagördült, a SumUp újrapróbálja.
    throw error;
  }

  if (ledgerEntryId != null) {
    try {
      await qStashClient.publishJSON({
        body: { ledgerEntryId, shootingId: attempt.photoShootingId },
        retries: 5,
        url: `${env.NEXT_PUBLIC_SITE_URL}/api/jobs/generate-final-invoice`,
      });
    } catch (error) {
      console.error(
        '[sumup-webhook] failed to queue final invoice job (CARD)',
        { error, ledgerEntryId, shootingId: attempt.photoShootingId },
      );
      await sendDiscordNotification({
        type: 'error',
        content: [
          '**Kártyás fizetés rögzítve, de a végszámla job nem indult el!**\n',
          `Shooting ID: ${attempt.photoShootingId}`,
          `LedgerEntry ID: ${ledgerEntryId}`,
          'A fizetés rögzítve van, a végszámlát kézzel kell kiállítani vagy a jobot újra sorba tenni.',
        ].join('\n'),
      });
    }

    // A pénz már könyvelve van: ha az újraszámolás elhasal, a státusz a
    // következő mentésnél úgyis helyreáll, ezért itt nem dobunk hibát (a
    // retry-nál a kísérlet már le van zárva, nem futna újra).
    try {
      await syncPhotoShootingStatus(attempt.photoShootingId);
    } catch (error) {
      console.error('[sumup-webhook] failed to sync shooting status', {
        error,
        shootingId: attempt.photoShootingId,
      });
    }
  }

  return new Response('Received', { status: 200 });
}
