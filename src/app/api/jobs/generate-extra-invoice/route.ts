import { verifySignatureAppRouter } from '@upstash/qstash/nextjs';
import z from 'zod';

import { env } from '@/env';
import { Prisma } from '@/generated/prisma/client';
import { sendDiscordNotification } from '@/lib/discord';
import {
  claimExtraInvoice,
  confirmExtraInvoice,
  releaseExtraInvoiceClaim,
} from '@/lib/idempotency';
import { invoiceService } from '@/lib/invoice';
import { NamedVATRate } from '@/lib/invoice/types';
import { prisma } from '@/lib/prisma';
import { stripe, stripePaymentIntentUrl } from '@/lib/stripe';
import { centsToHuf } from '@/lib/utils';

import type { GeneratedInvoice } from '@/lib/invoice/types';

/**
 * Normál számla a képválogatás extra díjáról (extra képek, retus). Az
 * előlegszámla jobjának mása, két eltéréssel: a számlázási cím a kliensről
 * jön (telefonos foglalásnál nincs `bookingIntentId`), és az idempotencia
 * kulcsa a payment intent, mert egy fotózáson több extra fizetés is lehet.
 */
export const POST = verifySignatureAppRouter(
  async (req: Request) => {
    const parsed = z
      .object({
        shootingId: z.uuid(),
        sessionId: z.string().min(1),
        paymentIntent: z.string().min(1),
        amountTotal: z.number().nonnegative(),
      })
      .safeParse(await req.json());

    if (!parsed.success) {
      return new Response('invalid payload', {
        status: 489,
        headers: { 'Upstash-NonRetryable-Error': 'true' },
      });
    }

    const { shootingId, sessionId, paymentIntent, amountTotal } = parsed.data;

    const ledgerEntry = await prisma.ledgerEntry.findUnique({
      where: { paymentIntent },
      select: { id: true, invoiceId: true },
    });
    if (ledgerEntry == null) {
      console.error(
        '[job:generate-extra-invoice] ledger entry missing, cannot attach invoice',
        { shootingId, paymentIntent },
      );
      await sendDiscordNotification({
        type: 'error',
        content: [
          '**Hiányzó LedgerEntry — az extra díj számláját nem tudjuk hozzákapcsolni!**\n',
          `Shooting ID: ${shootingId}`,
          `Payment Intent: [${paymentIntent}](${stripePaymentIntentUrl(paymentIntent)})`,
        ].join('\n'),
      });
      return new Response('ledger entry missing', {
        status: 489,
        headers: { 'Upstash-NonRetryable-Error': 'true' },
      });
    }
    if (ledgerEntry.invoiceId != null) {
      return new Response('already invoiced', { status: 200 });
    }

    const photoShooting = await prisma.photoShooting.findUnique({
      where: { id: shootingId },
      include: {
        client: { select: { owner: { select: { email: true } } } },
      },
    });
    if (photoShooting == null) {
      console.error('[job:generate-extra-invoice] unknown shooting', {
        shootingId,
      });
      return new Response('unknown shooting', {
        status: 489,
        headers: { 'Upstash-NonRetryable-Error': 'true' },
      });
    }

    const billingAddress = await prisma.billingAddress.findFirst({
      orderBy: { createdAt: 'desc' },
      where: { clientProfileId: photoShooting.clientId },
    });
    if (billingAddress == null) {
      await sendDiscordNotification({
        type: 'error',
        content: [
          '**Nincs számlázási cím — az extra díj számlája nem állítható ki!**\n',
          `Shooting ID: ${shootingId}`,
          `Payment Intent: [${paymentIntent}](${stripePaymentIntentUrl(paymentIntent)})`,
        ].join('\n'),
      });
      return new Response('billing address missing', {
        status: 489,
        headers: { 'Upstash-NonRetryable-Error': 'true' },
      });
    }

    const lineItems = await stripe.checkout.sessions.listLineItems(sessionId, {
      limit: 10,
    });

    // Idempotency claim
    if (!(await claimExtraInvoice(paymentIntent))) {
      return new Response('already issued', { status: 200 });
    }

    let invoice: GeneratedInvoice;
    try {
      invoice = await invoiceService.generateInvoice({
        customer: {
          name: billingAddress.name,
          zip: billingAddress.zip,
          city: billingAddress.city,
          addressLine1: billingAddress.addressLine1,
          email: photoShooting.client.owner.email,
        },
        // A Stripe `amount_total` a sor összege, nem az egységár.
        items: lineItems.data.map((item) => {
          const quantity = item.quantity ?? 1;
          return {
            name: item.description ?? 'tétel',
            quantity,
            unitPriceGross: centsToHuf(item.amount_total / quantity),
            vatRate: NamedVATRate.AAM,
          };
        }),
        paymentMethod: 'CARD',
        comment: paymentIntent,
      });
    } catch (error) {
      await releaseExtraInvoiceClaim(paymentIntent); // nothing was issued, safe to retry
      console.error('[job:extra-inv-gen] szamlazz failed', {
        shootingId,
        error,
      });
      await sendDiscordNotification({
        type: 'error',
        content: [
          '**Nem sikerült az extra díj számlájának generálása (szamlazz.hu hiba)**\n',
          `Shooting ID: ${shootingId}`,
          `Payment Intent: [${paymentIntent}](${stripePaymentIntentUrl(paymentIntent)})`,
        ].join('\n'),
      });
      throw error;
    }

    // The document now exists at szamlazz.hu — lock it in before anything else
    // can fail, so no retry ever re-issues it.
    await confirmExtraInvoice(paymentIntent, invoice.invoiceNumber);

    try {
      await prisma.$transaction(async (tx) => {
        const invoiceInDb = await tx.invoice.create({
          data: {
            status: 'SETTLED',
            type: 'NORMAL',
            invoiceNumber: invoice.invoiceNumber,
            publicUrl: invoice.publicUrl,
            amountInCents: amountTotal,
            photoShooting: { connect: { id: shootingId } },
          },
        });

        await tx.ledgerEntry.update({
          where: { id: ledgerEntry.id },
          data: { invoice: { connect: { id: invoiceInDb.id } } },
        });
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        console.warn(
          '[job:extra-inv-gen] ledger entry already attached, skipping',
          { shootingId, paymentIntent, invoiceNumber: invoice.invoiceNumber },
        );
        return new Response('already recorded', { status: 200 });
      }

      // Keep the claim: the document exists at szamlazz.hu. Retrying must never re-issue.
      console.error('[job:extra-inv-gen] invoice issued but failed to save', {
        shootingId,
        paymentIntent,
        invoiceNumber: invoice.invoiceNumber,
        publicUrl: invoice.publicUrl,
        error,
      });
      await sendDiscordNotification({
        type: 'error',
        content: [
          '**Extra díj számlája kiállítva a szamlazz.hu-n, de nem sikerült elmenteni a DB-be!**\n',
          `Shooting ID: ${shootingId}`,
          `Payment Intent: [${paymentIntent}](${stripePaymentIntentUrl(paymentIntent)})`,
          `Számla: [${invoice.invoiceNumber}](${invoice.publicUrl})`,
        ].join('\n'),
      });
      throw error; // -> 500 -> DLQ for manual repair
    }

    return new Response(
      `Extra invoice was generated for photo shooting ID ${shootingId}`,
      { status: 200 },
    );
  },
  { devMode: env.QSTASH_DEV },
);
