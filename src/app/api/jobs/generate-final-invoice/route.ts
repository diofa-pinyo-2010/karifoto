import { verifySignatureAppRouter } from '@upstash/qstash/nextjs';
import z from 'zod';

import { env } from '@/env';
import { Prisma } from '@/generated/prisma/client';
import { sendDiscordNotification } from '@/lib/discord';
import {
  claimFinalInvoice,
  confirmFinalInvoice,
  releaseFinalInvoiceClaim,
} from '@/lib/idempotency';
import { invoiceService } from '@/lib/invoice';
import { buildFinalInvoiceItems } from '@/lib/invoice/final-invoice-items';
import { prisma } from '@/lib/prisma';
import { centsToHuf } from '@/lib/utils';
import { calculatePricing } from '@/server/pricing';

import type { GeneratedInvoice } from '@/lib/invoice/types';

const nonRetryable = (message: string) =>
  new Response(message, {
    headers: { 'Upstash-NonRetryable-Error': 'true' },
    status: 489,
  });

/**
 * Végszámla kiállítása a stúdióban átvett hátralékról.
 *
 * A `generate-deposit-invoice` mintáját követi, és annak a sorrendje sem
 * véletlen: minden olvasás előbb, a foglalás közvetlenül a szamlazz-hívás
 * előtt, a megerősítés a DB-írás előtt. A hívó (készpénz, később SumUp) már
 * rögzítette a `LedgerEntry`-t — itt a pénz megmozdulása tény.
 */
export const POST = verifySignatureAppRouter(
  async (req: Request) => {
    const parsed = z
      .object({ ledgerEntryId: z.uuid(), shootingId: z.uuid() })
      .safeParse(await req.json());

    if (!parsed.success) {
      return nonRetryable('invalid payload');
    }

    const { ledgerEntryId, shootingId } = parsed.data;

    const ledgerEntry = await prisma.ledgerEntry.findUnique({
      select: { amountInCents: true, id: true, invoiceId: true, method: true },
      where: { id: ledgerEntryId },
    });

    if (ledgerEntry == null) {
      console.error(
        '[job:generate-final-invoice] ledger entry missing, cannot attach invoice',
        { ledgerEntryId, shootingId },
      );
      await sendDiscordNotification({
        content: [
          '**Hiányzó LedgerEntry — a végszámlát nem tudjuk hozzákapcsolni!**\n',
          `Shooting ID: ${shootingId}`,
          `LedgerEntry ID: ${ledgerEntryId}`,
        ].join('\n'),
        type: 'error',
      });
      return nonRetryable('ledger entry missing');
    }
    if (ledgerEntry.invoiceId != null) {
      return new Response('already invoiced', { status: 200 });
    }

    const photoShooting = await prisma.photoShooting.findUnique({
      include: {
        adjustments: true,
        client: { select: { owner: { select: { email: true } } } },
        // Az előlegszámla, amit ez a végszámla rendez: a szamlazz ennek a
        // számlaszámára hivatkozva vonja le az előleget. A számlaszám növekvő,
        // és az Invoice-nak nincs createdAt-je, tehát az a rendezés — hogy egy
        // (elvileg lehetetlen) második előlegszámla se csináljon véletlenszerű
        // eredményt.
        invoices: {
          orderBy: { invoiceNumber: 'asc' },
          where: { type: 'ADVANCE' },
        },
        ledgerEntries: true,
        pricing: true,
      },
      where: { id: shootingId },
    });

    if (photoShooting == null) {
      console.error('[job:generate-final-invoice] unknown shooting', {
        shootingId,
      });
      return nonRetryable('unknown shooting');
    }

    if (photoShooting.pricing == null) {
      console.error('[job:generate-final-invoice] shooting has no pricing', {
        shootingId,
      });
      return nonRetryable('pricing missing');
    }

    /**
     * Szándékosan a `clientProfileId`-n keresztül, nem a `bookingIntentId`-n,
     * ahogy az előlegszámla jobja teszi: a `PhotoShooting.bookingIntentId`
     * nullable (telefonos foglalásnál nincs), a számlázási cím viszont a
     * klienshez is hozzá van kapcsolva.
     */
    const billingAddress = await prisma.billingAddress.findFirst({
      orderBy: { createdAt: 'desc' },
      where: { clientProfileId: photoShooting.clientId },
    });

    if (billingAddress == null) {
      console.error('[job:generate-final-invoice] billing address missing', {
        clientProfileId: photoShooting.clientId,
        shootingId,
      });
      await sendDiscordNotification({
        content: [
          '**Nincs számlázási cím — a végszámla nem állítható ki!**\n',
          `Shooting ID: ${shootingId}`,
          `ClientProfile ID: ${photoShooting.clientId}`,
        ].join('\n'),
        type: 'error',
      });
      return nonRetryable('billing address missing');
    }

    const [advanceInvoice] = photoShooting.invoices;

    /**
     * Végszámla nem létezhet előlegszámla nélkül. Ez `throw`, nem 489: ha az
     * előlegszámla jobja maga is DLQ-ban vár javításra, egy későbbi
     * újrapróbálás még megoldhatja. Discordon amúgy is szólunk, tehát ember
     * mindenképp tud róla.
     */
    if (advanceInvoice == null) {
      await sendDiscordNotification({
        content: [
          '**Nincs előlegszámla — a végszámla nem állítható ki!**\n',
          `Shooting ID: ${shootingId}`,
          `LedgerEntry ID: ${ledgerEntryId}`,
          'A hátralék rögzítve van, de nincs mit rendezni vele.',
        ].join('\n'),
        type: 'error',
      });
      throw new Error(
        `[job:generate-final-invoice] no advance invoice for shooting ${shootingId}`,
      );
    }

    // Idempotency claim
    if (!(await claimFinalInvoice(shootingId))) {
      return new Response('already issued', { status: 200 });
    }

    const breakdown = calculatePricing({
      adjustments: photoShooting.adjustments,
      ledgerEntries: photoShooting.ledgerEntries,
      pricing: photoShooting.pricing,
      shooting: photoShooting,
    });

    const items = buildFinalInvoiceItems(breakdown.lines, advanceInvoice);

    /**
     * A végszámla végösszege a még fizetendő, tehát meg kell egyeznie azzal,
     * amit épp átvettünk. Ha nem, akkor a két esemény között elmozdult valami
     * (új korrekció került a fotózásra, vagy az előlegszámla összege nem a
     * befizetett előleg) — a dokumentum önmagában konzisztens, ezért kiállítjuk,
     * de ember nélkül ez nem megy tovább.
     *
     * Szándékosan **nem** a `breakdown.totalToBePaid`-hez mérünk: mire ez a job
     * lefut, a készpénzes tétel már a ledgerben van, tehát az ott 0.
     */
    const invoiceTotalInCents =
      breakdown.totalToBeInvoiced - advanceInvoice.amountInCents;

    if (invoiceTotalInCents !== ledgerEntry.amountInCents) {
      console.warn('[job:final-inv-gen] invoice total differs from payment', {
        advanceInCents: advanceInvoice.amountInCents,
        invoiceTotalInCents,
        paidInCents: ledgerEntry.amountInCents,
        shootingId,
      });
      await sendDiscordNotification({
        content: [
          '**A végszámla végösszege nem egyezik az átvett összeggel!**\n',
          `Shooting ID: ${shootingId}`,
          `Átvett összeg: ${centsToHuf(ledgerEntry.amountInCents)} Ft`,
          `Végszámla végösszege: ${centsToHuf(invoiceTotalInCents)} Ft`,
          `Beszámított előleg (${advanceInvoice.invoiceNumber}): ${centsToHuf(advanceInvoice.amountInCents)} Ft`,
          'A számlát kiállítjuk, de nézd meg: valószínűleg korrekció került a fotózásra a fizetés után.',
        ].join('\n'),
        type: 'warning',
      });
    }

    let invoice: GeneratedInvoice;
    try {
      invoice = await invoiceService.generateFinalInvoice(
        {
          customer: {
            addressLine1: billingAddress.addressLine1,
            city: billingAddress.city,
            email: photoShooting.client.owner.email,
            name: billingAddress.name,
            zip: billingAddress.zip,
          },
          /**
           * A teljes ár tételesen, **plusz** a beszámított előleg negatív
           * tételként — a `buildFinalInvoiceItems()` teszi hozzá. A szamlazz az
           * `elolegSzamlaszam`-ból nem von le semmit, csak összekapcsolja a két
           * dokumentumot, tehát az előleg sora nélkül a végszámla a teljes árat
           * kérné újra.
           */
          items,
          paymentMethod: ledgerEntry.method,
        },
        advanceInvoice.invoiceNumber,
      );
    } catch (error) {
      await releaseFinalInvoiceClaim(shootingId); // nothing was issued, safe to retry
      console.error('[job:final-inv-gen] szamlazz failed', {
        error,
        shootingId,
      });
      await sendDiscordNotification({
        content: [
          '**Nem sikerült a végszámla generálása (szamlazz.hu hiba)**\n',
          `Shooting ID: ${shootingId}`,
          `Előlegszámla: ${advanceInvoice.invoiceNumber}`,
        ].join('\n'),
        type: 'error',
      });
      throw error;
    }

    // The document now exists at szamlazz.hu — lock it in before anything else
    // can fail, so no retry ever re-issues it.
    await confirmFinalInvoice(shootingId, invoice.invoiceNumber);

    try {
      await prisma.$transaction(async (tx) => {
        const invoiceInDb = await tx.invoice.create({
          data: {
            advanceInvoice: { connect: { id: advanceInvoice.id } },
            /**
             * Amit ez a dokumentum tényleg beszedett, nem a végszámla bruttója
             * (az a `breakdown.totalToBeInvoiced`): ugyanaz a konvenció, mint az
             * előlegszámlánál, ahol a Stripe `amountTotal`-ja kerül ide.
             */
            amountInCents: ledgerEntry.amountInCents,
            invoiceNumber: invoice.invoiceNumber,
            paymentMethod: ledgerEntry.method,
            photoShooting: { connect: { id: shootingId } },
            publicUrl: invoice.publicUrl,
            status: 'SETTLED',
            type: 'FINAL',
          },
        });

        await tx.ledgerEntry.update({
          data: { invoice: { connect: { id: invoiceInDb.id } } },
          where: { id: ledgerEntry.id },
        });
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        console.warn(
          '[job:final-inv-gen] invoice or ledger entry already attached, skipping',
          { invoiceNumber: invoice.invoiceNumber, ledgerEntryId, shootingId },
        );
        return new Response('already recorded', { status: 200 });
      }

      // Keep the claim: the document exists at szamlazz.hu. Retrying must never re-issue.
      console.error('[job:final-inv-gen] invoice issued but failed to save', {
        error,
        invoiceNumber: invoice.invoiceNumber,
        ledgerEntryId,
        publicUrl: invoice.publicUrl,
        shootingId,
      });
      await sendDiscordNotification({
        content: [
          '**Végszámla kiállítva a szamlazz.hu-n, de nem sikerült elmenteni a DB-be!**\n',
          `Shooting ID: ${shootingId}`,
          `LedgerEntry ID: ${ledgerEntryId}`,
          `Számla: [${invoice.invoiceNumber}](${invoice.publicUrl})`,
        ].join('\n'),
        type: 'error',
      });
      throw error; // -> 500 -> DLQ for manual repair
    }

    return new Response(
      `Final invoice was generated for photo shooting ID ${shootingId}`,
      { status: 200 },
    );
  },
  { devMode: env.QSTASH_DEV },
);
