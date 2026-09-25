import { verifySignatureAppRouter } from '@upstash/qstash/nextjs';
import z from 'zod';

import { env } from '@/env';
import { rescheduleCalendarEvent } from '@/lib/google-calendar';
import { prisma } from '@/lib/prisma';

// Moves the Google Calendar event to the shooting's *current* time slot, so a
// retried or out-of-order job still ends up with the right time.
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

    const photoShooting = await prisma.photoShooting.findUnique({
      where: { id: shootingId },
      include: {
        timeSlot: { select: { startTime: true, endTime: true } },
        calendarEvent: { select: { id: true, eventId: true } },
      },
    });

    if (photoShooting == null) {
      console.error('[job:calendar-event-reschedule] unknown shooting', {
        shootingId,
      });

      return new Response('unknown shooting', {
        status: 489,
        headers: { 'Upstash-NonRetryable-Error': 'true' },
      });
    }

    const { calendarEvent, timeSlot } = photoShooting;

    if (calendarEvent == null) {
      // The create job may still be pending — retry. If it runs first it
      // already uses the current time slot, so the next attempt is a no-op.
      throw new Error(
        `[job:calendar-event-reschedule] no calendar event yet for shooting ${shootingId}`,
      );
    }

    try {
      await rescheduleCalendarEvent({
        eventId: calendarEvent.eventId,
        startTime: timeSlot.startTime,
        endTime: timeSlot.endTime,
      });
    } catch (error) {
      const status = (error as { status?: number }).status;

      // Event was deleted in Google Calendar — retrying won't help.
      if (status === 404 || status === 410) {
        console.error('[job:calendar-event-reschedule] event not found', {
          shootingId,
          eventId: calendarEvent.eventId,
        });
        await prisma.bookingCalendarEvent.update({
          where: { id: calendarEvent.id },
          data: { status: 'failed', lastSyncedAt: new Date() },
        });

        return new Response('calendar event not found', {
          status: 489,
          headers: { 'Upstash-NonRetryable-Error': 'true' },
        });
      }

      console.error(
        '[job:calendar-event-reschedule] failed to reschedule calendar event',
        { shootingId, error },
      );
      throw error; // -> 500 -> QStash retries
    }

    await prisma.bookingCalendarEvent.update({
      where: { id: calendarEvent.id },
      data: { status: 'updated', lastSyncedAt: new Date() },
    });

    console.log('[job:calendar-event-reschedule] event rescheduled', {
      shootingId,
      eventId: calendarEvent.eventId,
    });

    return new Response(
      `Calendar event rescheduled for photo shooting ID ${shootingId}`,
      { status: 200 },
    );
  },
  { devMode: env.QSTASH_DEV },
);
