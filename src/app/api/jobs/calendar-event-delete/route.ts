import { verifySignatureAppRouter } from '@upstash/qstash/nextjs';
import z from 'zod';

import { env } from '@/env';
import { deleteCalendarEvent } from '@/lib/google-calendar';
import { prisma } from '@/lib/prisma';

// Lemondott fotózás: törli a Google Calendar eseményt. A sort megtartjuk
// `deleted` státusszal, hogy látszódjon, mi történt.
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

    const { shootingId } = parsed.data;

    const calendarEvent = await prisma.bookingCalendarEvent.findUnique({
      where: { photoShootingId: shootingId },
      select: { id: true, eventId: true },
    });

    if (calendarEvent == null) {
      // Biztonságos: a létrehozó job kihagyja a lemondott fotózást, így később sem jön létre esemény.
      return new Response('no calendar event', { status: 200 });
    }

    try {
      await deleteCalendarEvent(calendarEvent.eventId);
    } catch (error) {
      const status = (error as { status?: number }).status;

      // Already gone in Google Calendar — that is the state we wanted.
      if (status !== 404 && status !== 410) {
        console.error('[job:calendar-event-delete] failed to delete event', {
          shootingId,
          error,
        });
        throw error; // -> 500 -> QStash retries
      }
    }

    await prisma.bookingCalendarEvent.update({
      where: { id: calendarEvent.id },
      data: { status: 'deleted', lastSyncedAt: new Date() },
    });

    return new Response(
      `Calendar event deleted for photo shooting ID ${shootingId}`,
      { status: 200 },
    );
  },
  { devMode: env.QSTASH_DEV },
);
