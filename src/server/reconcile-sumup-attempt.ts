import 'server-only';
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
import {
  AMOUNT_MISMATCH_REASON,
  resolveAttemptReconcile,
} from '@/lib/sumup/reconcile';
import { toAttemptStatus } from '@/lib/sumup/status';
import { qStashClient } from '@/lib/upstash';
import { syncPhotoShootingStatus } from '@/server/sync-photo-shooting-status';

import type { TransactionFull } from '@sumup/sdk';

const OPEN = {
  in: [
    SumupCheckoutAttemptStatus.INITIATED,
    SumupCheckoutAttemptStatus.PENDING,
  ],
};

/**
 * Egy kísérlet lezárása a SumUp-tól **lekért** tranzakció alapján.
 *
 * A webhook és a polling endpoint (beragadt kísérletnél) is ezt hívja. Session
 * nélküli, ezért `server-only` és nem `'use server'` — lásd
 * `sync-photo-shooting-status.ts`.
 *
 * A visszatérési érték csak naplózásra/válaszszövegre való. Dob, ha egy retry
 * segíthet (a tranzakció visszagördült).
 */
export async function reconcileSumUpAttempt(
  attemptId: string,
  transaction: TransactionFull,
  failureReason?: string,
): Promise<string> {
  const status = transaction.status && toAttemptStatus(transaction.status);
  if (status == null) {
    console.error('SumUp status without attempt mapping', transaction.status);
    return 'ignored';
  }

  const attempt = await prisma.sumupCheckoutAttempt.findUnique({
    where: { id: attemptId },
    select: {
      id: true,
      status: true,
      failureReason: true,
      amountInCents: true,
      photoShootingId: true,
    },
  });
  if (!attempt) {
    console.error('No attempt for', attemptId);
    return 'ignored';
  }

  const decision = resolveAttemptReconcile({
    attempt,
    status,
    currency: transaction.currency,
    amount: transaction.amount,
  });

  switch (decision.kind) {
    case 'already-closed':
      return 'already closed';

    case 'late-success-after-manual-close':
      console.error('SumUp success after manual close', { attemptId });
      await sendDiscordNotification({
        type: 'error',
        content: [
          '**Sikeres SumUp fizetés egy kézzel lezárt kísérleten!**\n',
          `SumupCheckoutAttempt ID: ${attempt.id}`,
          `Shooting ID: ${attempt.photoShootingId}`,
          'LedgerEntry nem jött létre: visszatérítés vagy kézi könyvelés kell.',
        ].join('\n'),
      });
      return 'late success after manual close';

    case 'amount-mismatch': {
      // pénz mozgott, de nem a várt összeg → ember kell. A kísérletet lezárjuk,
      // hogy a polling ne riasszon újra és a dialog ne várjon tovább.
      console.error('SumUp amount mismatch', { attemptId });
      const { count } = await prisma.sumupCheckoutAttempt.updateMany({
        where: { id: attempt.id, status: OPEN },
        data: {
          status: SumupCheckoutAttemptStatus.FAILED,
          failureReason: AMOUNT_MISMATCH_REASON,
          clientTransactionId: transaction.client_transaction_id,
        },
      });
      if (count > 0) {
        await sendDiscordNotification({
          type: 'error',
          content: `Sumup amount mismatch! SumupCheckoutAttempt ID: ${attempt.id}`,
        });
      }
      return 'amount mismatch';
    }

    case 'update':
      break;
  }

  const category = LedgerEntryCategory.INCOME_CLIENT_PAYMENT_BALANCE;

  // Csak a DB-írások vannak a tranzakcióban: a QStash és az állapot-újraszámolás
  // a commit **után** fut, különben a job még nem látná a LedgerEntry-t.
  let ledgerEntryId: string | null;
  try {
    ledgerEntryId = await prisma.$transaction(async (tx) => {
      const { count } = await tx.sumupCheckoutAttempt.updateMany({
        where: { id: attempt.id, status: OPEN },
        data: {
          status: decision.status,
          failureReason,
          clientTransactionId: transaction.client_transaction_id,
        },
      });

      if (count === 0) {
        console.warn('unknown or already-closed attempt');
        return null;
      }
      if (decision.status !== SumupCheckoutAttemptStatus.SUCCESSFUL) {
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
        where: { id: attempt.id, status: OPEN },
        data: {
          status: decision.status,
          clientTransactionId: transaction.client_transaction_id,
        },
      });
      return 'balance already collected';
    }
    // Minden más hiba: a tranzakció visszagördült, a hívó újrapróbálhatja.
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
        '[sumup-reconcile] failed to queue final invoice job (CARD)',
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
      console.error('[sumup-reconcile] failed to sync shooting status', {
        error,
        shootingId: attempt.photoShootingId,
      });
    }
  }

  return 'Received';
}
