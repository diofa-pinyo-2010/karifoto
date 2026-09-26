import { verifySignatureAppRouter } from '@upstash/qstash/nextjs';
import z from 'zod';

import { env } from '@/env';
import { formatLongDate } from '@/lib/formatters';
import { markEmailSent, wasEmailSent } from '@/lib/idempotency';
import { prisma } from '@/lib/prisma';
import { sendBookingConfirmationEmail } from '@/lib/resend/booking-confirmation';
import { generateClientShootingCalendarLink } from '@/lib/utils';

export const POST = verifySignatureAppRouter(
  async (req: Request) => {
    const parsed = z
      .object({ shootingId: z.uuid() })
      .safeParse(await req.json());

    if (!parsed.success) {
      return new Response('invalid payload', {
        status: 489,
        headers: { 'Upstash-NonRetryable-Error': 'true' },
      });
    }

    const photoShooting = await prisma.photoShooting.findUnique({
      where: { id: parsed.data.shootingId },
      include: {
        timeSlot: { select: { startTime: true, endTime: true } },
        client: { select: { owner: { select: { email: true, name: true } } } },
      },
    });

    if (photoShooting == null) {
      console.error('[job:email-confirmation] unknown shooting', {
        shootingId: parsed.data.shootingId,
      });

      return new Response('unknown shooting', {
        status: 489,
        headers: { 'Upstash-NonRetryable-Error': 'true' },
      });
    }

    // Idempotency claim
    if (await wasEmailSent(parsed.data.shootingId)) {
      return new Response('already sent', { status: 200 });
    }

    const bookedTimeString = formatLongDate(photoShooting.timeSlot.startTime);
    const addToGoogleCalendarLink = generateClientShootingCalendarLink(
      photoShooting.timeSlot.startTime,
      photoShooting.timeSlot.endTime,
    );

    try {
      const { data, error } = await sendBookingConfirmationEmail({
        to: photoShooting.client.owner.email,
        name: photoShooting.client.owner.name,
        bookedTimeString,
        addToGoogleCalendarLink,
        shootingId: photoShooting.id,
        clientId: photoShooting.clientId,
      });

      if (error != null) {
        throw new Error(`Resend rejected the email: ${error.message}`, {
          cause: error,
        });
      }

      await markEmailSent(parsed.data.shootingId);

      console.log('[job:email-confirmation] email sent successfully', {
        shootingId: parsed.data.shootingId,
        resendId: data.id,
      });
    } catch (error) {
      console.error('[job:email-confirmation] resend failed', {
        shootingId: parsed.data.shootingId,
        error,
      });
      throw error; //-> 500 -> QStash retries
    }

    return new Response(
      `Confirmation Email was sent for photo shooting ID ${parsed.data.shootingId}`,
      { status: 200 },
    );
  },
  { devMode: env.QSTASH_DEV },
);
