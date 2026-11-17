import { verifySignatureAppRouter } from '@upstash/qstash/nextjs';
import z from 'zod';

import { env } from '@/env';
import { Prisma } from '@/generated/prisma/client';
import { sendDiscordNotification } from '@/lib/discord';
import {
  claimStornoInvoice,
  confirmStornoInvoice,
  releaseStornoInvoiceClaim,
} from '@/lib/idempotency';
import { invoiceService } from '@/lib/invoice';
import { prisma } from '@/lib/prisma';
import { planStorno } from '@/lib/storno';

const nonRetryable = (message: string) =>
  new Response(message, {
    status: 489,
    headers: { 'Upstash-NonRetryable-Error': 'true' },
  });

export const POST = verifySignatureAppRouter(
  async (req: Request) => {
    const parsed = z
      .object({ shootingId: z.uuid(), refundLedgerEntryId: z.uuid() })
      .safeParse(await req.json());

    if (!parsed.success) {
      return nonRetryable('invalid payload');
    }

    const { shootingId, refundLedgerEntryId } = parsed.data;

    const refundEntry = await prisma.ledgerEntry.findFirst({
      where: { id: refundLedgerEntryId, photoShootingId: shootingId },
      select: { id: true, invoiceId: true },
    });

    // Az eredeti számla: a fotózás befizetés-soráról (előleg vagy teljes).
    const paymentEntry = await prisma.ledgerEntry.findFirst({
      where: {
        photoShootingId: shootingId,
        category: {
          in: ['INCOME_CLIENT_PAYMENT_DEPOSIT', 'INCOME_CLIENT_PAYMENT_FULL'],
        },
      },
      select: {
        invoice: {
          select: { id: true, invoiceNumber: true, amountInCents: true },
        },
      },
    });

    const plan = planStorno({
      refundEntry,
      originalInvoice: paymentEntry?.invoice ?? null,
    });

    if (plan.action === 'fail') {
      console.error('[job:reverse-invoice] unknown refund ledger entry', {
        shootingId,
        refundLedgerEntryId,
      });
      return nonRetryable('unknown refund ledger entry');
    }
    if (plan.action === 'skip') {
      return new Response('already reversed', { status: 200 });
    }
    if (plan.action === 'retry') {
      // Az eredeti számla job még függőben lehet — újrapróbálás.
      throw new Error(
        `[job:reverse-invoice] original invoice not available yet for shooting ${shootingId}`,
      );
    }

    const { originalInvoice } = plan;

    // Idempotency claim
    if (!(await claimStornoInvoice(originalInvoice.id))) {
      return new Response('already claimed', { status: 200 });
    }

    let storno: Awaited<ReturnType<typeof invoiceService.reverseInvoice>>;
    try {
      storno = await invoiceService.reverseInvoice(
        originalInvoice.invoiceNumber,
      );
    } catch (error) {
      await releaseStornoInvoiceClaim(originalInvoice.id); // nothing was issued, safe to retry
      console.error('[job:reverse-invoice] szamlazz failed', {
        shootingId,
        invoiceNumber: originalInvoice.invoiceNumber,
        error,
      });
      await sendDiscordNotification({
        type: 'error',
        content: [
          '**Nem sikerült a sztornó számla generálása (szamlazz.hu hiba)**\n',
          `Shooting ID: ${shootingId}`,
          `Eredeti számla: ${originalInvoice.invoiceNumber}`,
        ].join('\n'),
      });
      throw error;
    }

    // The document now exists at szamlazz.hu — lock it in before anything else
    // can fail, so no retry ever re-issues it.
    await confirmStornoInvoice(originalInvoice.id, storno.invoiceNumber);

    try {
      await prisma.$transaction(async (tx) => {
        const stornoInDb = await tx.invoice.create({
          data: {
            status: 'SETTLED',
            type: 'STORNO',
            invoiceNumber: storno.invoiceNumber,
            publicUrl: storno.publicUrl,
            amountInCents: -originalInvoice.amountInCents,
            stornoOf: { connect: { id: originalInvoice.id } },
            photoShooting: { connect: { id: shootingId } },
          },
        });

        await tx.ledgerEntry.update({
          where: { id: refundLedgerEntryId },
          data: { invoice: { connect: { id: stornoInDb.id } } },
        });

        await tx.invoice.update({
          where: { id: originalInvoice.id },
          data: { status: 'REFUNDED' },
        });
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        console.warn(
          '[job:reverse-invoice] storno already recorded, skipping',
          {
            shootingId,
            invoiceNumber: storno.invoiceNumber,
          },
        );
        return new Response('already recorded', { status: 200 });
      }

      // Keep the claim: the document exists at szamlazz.hu. Retrying must never re-issue.
      console.error('[job:reverse-invoice] storno issued but failed to save', {
        shootingId,
        refundLedgerEntryId,
        invoiceNumber: storno.invoiceNumber,
        publicUrl: storno.publicUrl,
        error,
      });
      await sendDiscordNotification({
        type: 'error',
        content: [
          '**Sztornó számla kiállítva a szamlazz.hu-n, de nem sikerült elmenteni a DB-be!**\n',
          `Shooting ID: ${shootingId}`,
          `Eredeti számla: ${originalInvoice.invoiceNumber}`,
          `Sztornó: [${storno.invoiceNumber}](${storno.publicUrl})`,
        ].join('\n'),
      });
      throw error; // -> 500 -> DLQ for manual repair
    }

    return new Response(
      `Storno invoice was generated for photo shooting ID ${shootingId}`,
      { status: 200 },
    );
  },
  { devMode: env.QSTASH_DEV },
);
