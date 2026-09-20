import { verifySignatureAppRouter } from '@upstash/qstash/nextjs';
import z from 'zod';

import { env } from '@/env';
import { Prisma } from '@/generated/prisma/client';
import { LedgerEntryCategory } from '@/generated/prisma/enums';
import { LEDGER_ENTRY_CATEGORY_SIGN } from '@/lib/constants';
import {
  claimDepositInvoice,
  confirmDepositInvoice,
  releaseDepositInvoiceClaim,
} from '@/lib/idempotency';
import { invoiceService } from '@/lib/invoice';
import { NamedVATRate } from '@/lib/invoice/types';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';

import type { GeneratedInvoice } from '@/lib/invoice/types';

export const POST = verifySignatureAppRouter(
  async (req: Request) => {
    const parsed = z
      .object({
        shootingId: z.uuid(),
        zip: z.string().nullable().optional(),
        addressLine1: z.string().nullable().optional(),
        city: z.string().nullable().optional(),
        userFullName: z.string().min(1),
        sessionId: z.string().min(1),
        paymentIntent: z.string(),
        amountTotal: z.number().nonnegative().nullable(),
      })
      .safeParse(await req.json());

    if (!parsed.success) {
      return new Response('invalid payload', {
        status: 489,
        headers: { 'Upstash-NonRetryable-Error': 'true' },
      });
    }

    const {
      shootingId,
      zip,
      addressLine1,
      city,
      userFullName,
      sessionId,
      paymentIntent,
      amountTotal,
    } = parsed.data;

    const existingLedgerEntry = await prisma.ledgerEntry.findUnique({
      where: { paymentIntent },
      select: { invoice: { select: { invoiceNumber: true } } },
    });
    if (existingLedgerEntry != null) {
      return new Response('already invoiced', { status: 200 });
    }

    if (zip == null || addressLine1 == null || city == null) {
      return new Response('billing address missing', {
        status: 489,
        headers: { 'Upstash-NonRetryable-Error': 'true' },
      });
    }

    const photoShooting = await prisma.photoShooting.findUnique({
      where: { id: shootingId },
      include: {
        client: { select: { owner: { select: { email: true } } } },
      },
    });

    if (photoShooting == null) {
      console.error('[job:generate-deposit-invoice] unknown shooting', {
        shootingId: shootingId,
      });

      return new Response('unknown shooting', {
        status: 489,
        headers: { 'Upstash-NonRetryable-Error': 'true' },
      });
    }

    const lineItems = await stripe.checkout.sessions.listLineItems(sessionId, {
      limit: 10,
    });

    // Idempotency claim
    if (!(await claimDepositInvoice(shootingId))) {
      return new Response('already issued', { status: 200 });
    }

    // GenerateInvoice and save to db
    let invoice: GeneratedInvoice;
    try {
      invoice = await invoiceService.generateInvoice({
        customer: {
          name: userFullName,
          zip,
          city,
          addressLine1,
          email: photoShooting.client.owner.email,
        },
        items: lineItems.data.map((item) => {
          const quantity = item.quantity ?? 1;
          return {
            name: item.description ?? 'tétel',
            quantity,
            unitPriceGross: item.amount_total / 100,
            vatRate: NamedVATRate.AAM,
          };
        }),
        comment: paymentIntent,
      });
    } catch (error) {
      await releaseDepositInvoiceClaim(shootingId); // nothing was issued, safe to retry
      console.error('[job:deposit-inv-gen] szamlazz failed', {
        shootingId,
        error,
      });
      throw error;
    }

    // The document now exists at szamlazz.hu — lock it in before anything else
    // can fail, so no retry ever re-issues it.
    await confirmDepositInvoice(shootingId, invoice.invoiceNumber);

    // Invoice and LedgerEntry go in together: a half-written pair would leave an
    // Invoice row pointing at a real szamlazz document with nothing paid against it.
    try {
      await prisma.$transaction(async (tx) => {
        const invoiceInDb = await tx.invoice.create({
          data: {
            status: 'SETTLED',
            invoiceNumber: invoice.invoiceNumber,
            publicUrl: invoice.publicUrl,
            amountInCents: amountTotal ?? 0,
            paymentMethod: 'CARD',
            photoShooting: { connect: { id: shootingId } },
          },
        });

        const category = LedgerEntryCategory.INCOME_CLIENT_PAYMENT_DEPOSIT;
        await tx.ledgerEntry.create({
          data: {
            category,
            amountInCents:
              (amountTotal ?? 0) * LEDGER_ENTRY_CATEGORY_SIGN[category],
            method: 'CARD',
            paymentIntent,
            photoShooting: { connect: { id: shootingId } },
            invoice: { connect: { id: invoiceInDb.id } },
          },
        });
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        console.warn(
          '[job:deposit-inv-gen] ledger entry already recorded, skipping',
          {
            shootingId,
            paymentIntent,
            invoiceNumber: invoice.invoiceNumber,
          },
        );
        return new Response('already recorded', { status: 200 });
      }

      // Keep the claim: the document exists at szamlazz.hu. Retrying must never re-issue.
      console.error('[job:deposit-inv-gen] invoice issued but failed to save', {
        shootingId,
        paymentIntent,
        invoiceNumber: invoice.invoiceNumber,
        publicUrl: invoice.publicUrl,
        error,
      });
      throw error; // -> 500 -> DLQ for manual repair
    }

    return new Response(
      `Deposit invoice was generated for photo shooting ID ${shootingId}`,
      { status: 200 },
    );
  },
  { devMode: env.QSTASH_DEV },
);
