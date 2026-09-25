import { verifySignatureAppRouter } from '@upstash/qstash/nextjs';
import z from 'zod';

import { env } from '@/env';
import { formatLongDate } from '@/lib/formatters';
import {
  markRescheduleEmailSent,
  wasRescheduleEmailSent,
} from '@/lib/idempotency';
import { prisma } from '@/lib/prisma';
import { sendRescheduleNotificationEmail } from '@/lib/resend/reschedule-notification';
import { generateClientShootingCalendarLink } from '@/lib/utils';

export const POST = verifySignatureAppRouter(
  async (req: Request) => {
    // The old time comes from the payload — once the shooting has moved, the
    // DB only knows the new one.
    const parsed = z
      .object({ shootingId: z.uuid(), oldStartTime: z.coerce.date() })
      .safeParse(await req.json());

    if (!parsed.success) {
      return new Response('invalid payload', {
        status: 489,
        headers: { 'Upstash-NonRetryable-Error': 'true' },
      });
    }

    const { shootingId, oldStartTime } = parsed.data;

    const photoShooting = await prisma.photoShooting.findUnique({
      where: { id: shootingId },
      include: {
        timeSlot: { select: { startTime: true, endTime: true } },
        client: { select: { owner: { select: { email: true, name: true } } } },
      },
    });

    if (photoShooting == null) {
      console.error('[job:email-reschedule] unknown shooting', { shootingId });

      return new Response('unknown shooting', {
        status: 489,
        headers: { 'Upstash-NonRetryable-Error': 'true' },
      });
    }

    // Read the new time from the DB, so the client is told the latest one.
    const { startTime, endTime } = photoShooting.timeSlot;

    // Moved back to the old time before this job ran — nothing changed.
    if (startTime.getTime() === oldStartTime.getTime()) {
      return new Response('time unchanged', { status: 200 });
    }

    // Idempotency claim
    if (await wasRescheduleEmailSent(shootingId, oldStartTime, startTime)) {
      return new Response('already sent', { status: 200 });
    }

    try {
      const { data, error } = await sendRescheduleNotificationEmail({
        to: photoShooting.client.owner.email,
        name: photoShooting.client.owner.name,
        bookedTimeString: formatLongDate(startTime),
        oldTimeString: formatLongDate(oldStartTime),
        addToGoogleCalendarLink: generateClientShootingCalendarLink(
          startTime,
          endTime,
        ),
      });

      if (error != null) {
        throw new Error(`Resend rejected the email: ${error.message}`, {
          cause: error,
        });
      }

      await markRescheduleEmailSent(shootingId, oldStartTime, startTime);

      console.log('[job:email-reschedule] email sent successfully', {
        shootingId,
        resendId: data.id,
      });
    } catch (error) {
      console.error('[job:email-reschedule] resend failed', {
        shootingId,
        error,
      });
      throw error; // -> 500 -> QStash retries
    }

    return new Response(
      `Reschedule email was sent for photo shooting ID ${shootingId}`,
      { status: 200 },
    );
  },
  { devMode: env.QSTASH_DEV },
);
