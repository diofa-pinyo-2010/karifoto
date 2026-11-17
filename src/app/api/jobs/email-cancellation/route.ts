import { verifySignatureAppRouter } from '@upstash/qstash/nextjs';
import z from 'zod';

import { env } from '@/env';
import { createClientPortalToken } from '@/lib/auth';
import { clientPortalLoginUrl } from '@/lib/client-portal';
import { formatLongDate } from '@/lib/formatters';
import { prisma } from '@/lib/prisma';
import { sendCancellationNotificationEmail } from '@/lib/resend/cancellation-notification';

export const POST = verifySignatureAppRouter(
  async (req: Request) => {
    const parsed = z
      .object({ shootingId: z.uuid(), refunded: z.boolean() })
      .safeParse(await req.json());

    if (!parsed.success) {
      return new Response('invalid payload', {
        status: 489,
        headers: { 'Upstash-NonRetryable-Error': 'true' },
      });
    }

    const { shootingId, refunded } = parsed.data;

    const photoShooting = await prisma.photoShooting.findUnique({
      where: { id: shootingId },
      select: {
        id: true,
        clientId: true,
        cancelledAt: true,
        purchasedById: true,
        timeSlot: { select: { startTime: true } },
        client: {
          select: { owner: { select: { id: true, email: true, name: true } } },
        },
      },
    });

    if (photoShooting == null || photoShooting.cancelledAt == null) {
      console.error('[job:email-cancellation] unknown or not cancelled', {
        shootingId,
      });

      return new Response('unknown or not cancelled shooting', {
        status: 489,
        headers: { 'Upstash-NonRetryable-Error': 'true' },
      });
    }

    // Tartós "már elment" jelzés: a Resend idempotencia-kulcsa csak 24 óráig él.
    const alreadySent = await prisma.sentEmail.findFirst({
      where: { type: 'CANCELLATION_NOTIFICATION', photoShootingId: shootingId },
      select: { id: true },
    });
    if (alreadySent) {
      return new Response('already sent', { status: 200 });
    }

    // Beváltott ajándéknál a fotózás ügyfele a kedvezményezett: a pénz a
    // vásárlónak megy vissza, és a sztornót sem látja a portálon
    // (`invoicesVisibleToClient`), ezért neki nem írunk a visszatérítésről.
    const showRefund = refunded && photoShooting.purchasedById == null;

    // A token újrahasználható, egy újrapróbálás miatti második token ártalmatlan.
    const { raw: portalToken } = await createClientPortalToken(
      photoShooting.client.owner.id,
    );

    try {
      const { data, error } = await sendCancellationNotificationEmail({
        to: photoShooting.client.owner.email,
        name: photoShooting.client.owner.name,
        bookedTimeString: formatLongDate(photoShooting.timeSlot.startTime),
        refunded: showRefund,
        clientPortalLoginLink: clientPortalLoginUrl({
          clientProfileId: photoShooting.clientId,
          shootingId: photoShooting.id,
          rawToken: portalToken,
        }),
        shootingId: photoShooting.id,
        clientId: photoShooting.clientId,
      });

      if (error != null) {
        throw new Error(`Resend rejected the email: ${error.message}`, {
          cause: error,
        });
      }

      console.log('[job:email-cancellation] email sent successfully', {
        shootingId,
        resendId: data.id,
      });
    } catch (error) {
      console.error('[job:email-cancellation] resend failed', {
        shootingId,
        error,
      });
      throw error; // -> 500 -> QStash retries
    }

    return new Response(
      `Cancellation email was sent for photo shooting ID ${shootingId}`,
      { status: 200 },
    );
  },
  { devMode: env.QSTASH_DEV },
);
