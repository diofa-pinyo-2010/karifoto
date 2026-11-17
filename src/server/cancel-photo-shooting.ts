'use server';

import { revalidatePath, revalidateTag } from 'next/cache';

import * as z from 'zod';

import { env } from '@/env';
import {
  LedgerEntryCategory,
  PaymentMethod,
  PhotoShootingStatus,
  StaffProfileRole,
} from '@/generated/prisma/enums';
import { ADMIN_STATS_TAG } from '@/lib/admin-stats';
import {
  buildRefundIdempotencyKey,
  getCancellationEligibility,
} from '@/lib/cancellation';
import { APP_URLS, LEDGER_ENTRY_CATEGORY_SIGN } from '@/lib/constants';
import { verifySession } from '@/lib/dal';
import { sendDiscordNotification } from '@/lib/discord';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';
import { qStashClient } from '@/lib/upstash';
import { formatMoney } from '@/lib/utils';

import type Stripe from 'stripe';

const cancelPhotoShootingSchema = z.object({
  shootingId: z.uuid(),
  refund: z.boolean(),
  reason: z
    .string()
    .trim()
    .max(1000)
    .transform((value) => (value === '' ? null : value)),
});

// Jelzi, hogy a tranzakció közben valaki más már lemondta a fotózást.
class AlreadyCancelledError extends Error {}

export async function cancelPhotoShooting(
  input: z.input<typeof cancelPhotoShootingSchema>,
): Promise<{ error: string } | { success: true }> {
  const { staffProfile } = await verifySession();
  if (staffProfile.role !== StaffProfileRole.SUPERADMIN) {
    return { error: 'Csak admin mondhat le fotózást.' };
  }

  const parsed = cancelPhotoShootingSchema.safeParse(input);
  if (!parsed.success) {
    console.error('[cancel-photo-shooting] invalid input', parsed.error.issues);
    return { error: 'Érvénytelen adatok.' };
  }
  const { shootingId, refund, reason } = parsed.data;

  const shooting = await prisma.photoShooting.findUnique({
    where: { id: shootingId },
    select: {
      cancelledAt: true,
      completedAt: true,
      timeSlot: { select: { startTime: true } },
      client: { select: { owner: { select: { name: true } } } },
      ledgerEntries: {
        select: {
          id: true,
          category: true,
          amountInCents: true,
          method: true,
          paymentIntent: true,
          invoice: { select: { type: true } },
        },
      },
    },
  });
  if (!shooting) {
    return { error: 'A fotózás nem található.' };
  }

  const eligibility = getCancellationEligibility(
    {
      cancelledAt: shooting.cancelledAt,
      completedAt: shooting.completedAt,
      startTime: shooting.timeSlot.startTime,
      ledgerEntries: shooting.ledgerEntries,
    },
    new Date(),
  );
  if (!eligibility.canCancel) {
    return { error: eligibility.reason };
  }
  const { payment, canRefund } = eligibility;

  if (refund && (!canRefund || !payment.paymentIntent)) {
    return {
      error: 'Ennél a fizetésnél nem lehet automatikusan visszatéríteni.',
    };
  }

  let stripeRefund: Stripe.Refund | null = null;
  if (refund && payment.paymentIntent) {
    try {
      // A kulcs a befizetés ledger sorához kötött, így egy ismételt kattintás
      // (pl. sikertelen DB-mentés után) ugyanazt a refundot kapja vissza.
      // A Stripe kb. 24 óráig őrzi meg az idempotencia-kulcsokat; ezen belül
      // az újrapróbálás biztonságos.
      stripeRefund = await stripe.refunds.create(
        { payment_intent: payment.paymentIntent },
        { idempotencyKey: buildRefundIdempotencyKey(payment.ledgerEntryId) },
      );
    } catch (error) {
      console.error('[cancel-photo-shooting] stripe refund failed', {
        shootingId,
        error,
      });
      return { error: 'A visszatérítés nem sikerült, nem történt változás.' };
    }

    if (
      stripeRefund.status === 'failed' ||
      stripeRefund.status === 'canceled'
    ) {
      console.error('[cancel-photo-shooting] stripe refund not successful', {
        shootingId,
        refundId: stripeRefund.id,
        status: stripeRefund.status,
      });
      return { error: 'A visszatérítés nem sikerült, nem történt változás.' };
    }
  }

  let refundLedgerEntryId: string | null = null;
  try {
    refundLedgerEntryId = await prisma.$transaction(async (tx) => {
      const { count } = await tx.photoShooting.updateMany({
        where: { id: shootingId, cancelledAt: null },
        data: {
          cancelledAt: new Date(),
          cancellationReason: reason,
          status: PhotoShootingStatus.CANCELLED,
        },
      });
      if (count === 0) throw new AlreadyCancelledError();

      if (!stripeRefund) return null;

      const refundEntry = await tx.ledgerEntry.create({
        data: {
          category: LedgerEntryCategory.REFUND_CLIENT_PAYMENT,
          amountInCents:
            payment.amountInCents *
            LEDGER_ENTRY_CATEGORY_SIGN.REFUND_CLIENT_PAYMENT,
          method: PaymentMethod.CARD,
          stripeRefundId: stripeRefund.id,
          photoShootingId: shootingId,
          description: reason ?? null,
        },
        select: { id: true },
      });
      return refundEntry.id;
    });
  } catch (error) {
    if (error instanceof AlreadyCancelledError) {
      return { error: 'A fotózást közben már lemondták.' };
    }
    console.error('[cancel-photo-shooting] failed to persist cancellation', {
      shootingId,
      refundId: stripeRefund?.id,
      error,
    });
    if (stripeRefund) {
      return {
        error:
          'A visszatérítés elindult, de a mentés nem sikerült — próbáld újra.',
      };
    }
    return { error: 'Nem sikerült menteni a lemondást. Próbáld újra.' };
  }

  // A lemondás már érvényes; a háttérmunkák hibája nem teszi visszacsinálttá.
  const jobs: { name: string; publish: () => Promise<unknown> }[] = [
    {
      name: 'calendar-event-delete',
      publish: () =>
        qStashClient.publishJSON({
          url: `${env.NEXT_PUBLIC_SITE_URL}/api/jobs/calendar-event-delete`,
          body: { shootingId },
          retries: 5,
        }),
    },
  ];
  if (refundLedgerEntryId) {
    const ledgerEntryId = refundLedgerEntryId;
    jobs.push({
      name: 'reverse-invoice',
      publish: () =>
        qStashClient.publishJSON({
          url: `${env.NEXT_PUBLIC_SITE_URL}/api/jobs/reverse-invoice`,
          body: { shootingId, refundLedgerEntryId: ledgerEntryId },
          retries: 5,
        }),
    });
  }

  const adminUrl = `${env.NEXT_PUBLIC_SITE_URL}${APP_URLS.photoShootingAdminPage(shootingId)}`;
  const results = await Promise.allSettled(jobs.map((job) => job.publish()));
  for (const [index, result] of results.entries()) {
    if (result.status === 'fulfilled') continue;
    const jobName = jobs[index]?.name;
    console.error('[cancel-photo-shooting] failed to publish job', {
      shootingId,
      job: jobName,
      error: result.reason,
    });
    await sendDiscordNotification({
      type: 'error',
      content: `Lemondott fotózás: a(z) \`${jobName}\` job nem indult el, kézzel kell pótolni. ${adminUrl}`,
    });
  }

  const isRefundPending = stripeRefund?.status === 'pending';
  await sendDiscordNotification({
    type: isRefundPending ? 'warning' : 'info',
    content: [
      `Fotózás lemondva: ${shooting.client.owner.name}`,
      `Befizetés: ${formatMoney(payment.amountInCents)}`,
      `Visszatérítés: ${stripeRefund ? `igen${isRefundPending ? ' (függőben)' : ''}` : 'nem'}`,
      `Indoklás: ${reason ?? '—'}`,
      adminUrl,
    ].join('\n'),
  });

  revalidatePath(APP_URLS.photoShootingAdminPage(shootingId));
  revalidateTag(ADMIN_STATS_TAG, { expire: 0 });
  return { success: true };
}
