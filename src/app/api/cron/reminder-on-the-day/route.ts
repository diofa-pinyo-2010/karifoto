import { env } from '@/env';
import { formatLongDate } from '@/lib/formatters';
import { markReminderSent, wasReminderSent } from '@/lib/idempotency';
import { prisma } from '@/lib/prisma';
import { sendReminderOnTheDayEmail } from '@/lib/resend/reminder-on-the-day';
import { getBudapestDayKey } from '@/lib/utils';

function isAuthorized(req: Request): boolean {
  return req.headers.get('authorization') === `Bearer ${env.CRON_SECRET}`;
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const now = new Date();
    const todayKey = getBudapestDayKey(now);
    // Wide DB window, exact match happens below — avoids UTC/CET offset math.
    const windowStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const windowEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const candidates = await prisma.photoShooting.findMany({
      where: {
        status: { notIn: ['CLOSED', 'COMPLETED'] },
        timeSlot: { startTime: { gte: windowStart, lt: windowEnd } },
      },
      include: {
        timeSlot: { select: { startTime: true } },
        client: { select: { owner: { select: { email: true, name: true } } } },
      },
    });

    const todaysShootings = candidates.filter(
      (shooting) => getBudapestDayKey(shooting.timeSlot.startTime) === todayKey,
    );

    const results = await Promise.allSettled(
      todaysShootings.map(async (shooting) => {
        if (await wasReminderSent(shooting.id, todayKey)) {
          return;
        }

        const { error } = await sendReminderOnTheDayEmail({
          to: shooting.client.owner.email,
          name: shooting.client.owner.name,
          bookedTimeString: formatLongDate(shooting.timeSlot.startTime),
        });

        if (error != null) {
          throw new Error(`Resend rejected the email: ${error.message}`, {
            cause: error,
          });
        }

        await markReminderSent(shooting.id, todayKey);
      }),
    );

    const failures = results.filter((r) => r.status === 'rejected');
    if (failures.length > 0) {
      console.error('[cron:reminder-on-the-day] some reminders failed', {
        failed: failures.length,
        total: todaysShootings.length,
        reasons: failures.map((f) => String(f.reason)),
      });
      return new Response('Partial failure', { status: 500 });
    }

    return Response.json({ ok: true, sent: todaysShootings.length });
  } catch (error) {
    console.error('[cron:reminder-on-the-day] failed', error);
    return new Response('Error', { status: 500 });
  }
}
