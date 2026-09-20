import { verifySignatureAppRouter } from '@upstash/qstash/nextjs';
import * as z from 'zod';

import { env } from '@/env';
import { DEPOSIT_AMOUNT } from '@/lib/constants';
import { formatLongDate } from '@/lib/formatters';
import { markEmailSent, wasEmailSent } from '@/lib/idempotency';
import { prisma } from '@/lib/prisma';
import { sendDepositRequestEmail } from '@/lib/resend/deposit-request';
import { formatMoney } from '@/lib/utils';

export const POST = verifySignatureAppRouter(
  async (req: Request) => {
    const parsed = z
      .object({ bookingIntentId: z.uuid() })
      .safeParse(await req.json());

    if (!parsed.success) {
      return new Response('invalid payload', {
        status: 489,
        headers: { 'Upstash-NonRetryable-Error': 'true' },
      });
    }

    const bookingIntent = await prisma.bookingIntent.findUnique({
      where: { id: parsed.data.bookingIntentId },
      select: {
        name: true,
        email: true,
        timeSlot: { select: { startTime: true } },
      },
    });

    if (bookingIntent == null) {
      console.error('[job:deposit-request] unknown booking intent', {
        bookingIntentId: parsed.data.bookingIntentId,
      });

      return new Response('unknown booking intent', {
        status: 489,
        headers: { 'Upstash-NonRetryable-Error': 'true' },
      });
    }

    // Idempotency claim
    if (await wasEmailSent(parsed.data.bookingIntentId)) {
      return new Response('already sent', { status: 200 });
    }

    const bookedTimeString = formatLongDate(bookingIntent.timeSlot.startTime);
    try {
      const { data, error } = await sendDepositRequestEmail({
        bookedTimeString,
        depositAmount: formatMoney(DEPOSIT_AMOUNT),
        name: bookingIntent.name,
        to: bookingIntent.email,
        summaryUrl: `${env.NEXT_PUBLIC_SITE_URL}/foglalas-osszegzese/${parsed.data.bookingIntentId}`,
      });

      if (error != null) {
        throw new Error(`Resend rejected the email: ${error.message}`, {
          cause: error,
        });
      }

      await markEmailSent(parsed.data.bookingIntentId);

      // TODO: Save this to a table?
      console.log('[job:deposit-request] email sent successfully.', {
        shootingId: parsed.data.bookingIntentId,
        resendId: data.id,
      });
    } catch (error) {
      console.error('[job:deposit-request] resend failed', {
        shootingId: parsed.data.bookingIntentId,
        error,
      });
      throw error; //-> 500 -> QStash retries
    }

    return new Response(
      `Deposit Request Email was sent to client with Booking Intent ID: ${parsed.data.bookingIntentId}`,
      { status: 200 },
    );
  },
  {
    devMode: env.QSTASH_DEV,
  },
);
