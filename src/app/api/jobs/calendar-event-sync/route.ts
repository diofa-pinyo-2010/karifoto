import { verifySignatureAppRouter } from '@upstash/qstash/nextjs';
import z from 'zod';

import { env } from '@/env';
import {
  buildShootingCalendarEvent,
  updateCalendarEvent,
} from '@/lib/google-calendar';
import { prisma } from '@/lib/prisma';

// Rewrites the whole Google Calendar event (time, title, description) from the
// shooting's *current* DB state, so a retried or out-of-order job still ends up
// right. The DB is the source of truth: manual edits in Google Calendar are
// overwritten.
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
        timeSlot: { select: { startTime: true } },
        calendarEvent: { select: { id: true, eventId: true } },
        client: {
          select: { owner: { select: { name: true, phoneNumber: true } } },
        },
      },
    });

    if (photoShooting == null) {
      console.error('[job:calendar-event-sync] unknown shooting', {
        shootingId,
      });

      return new Response('unknown shooting', {
        status: 489,
        headers: { 'Upstash-NonRetryable-Error': 'true' },
      });
    }

    const { calendarEvent, timeSlot, client } = photoShooting;

    if (calendarEvent == null) {
      // The create job may still be pending — retry. It builds the event from
      // the same DB state, so the next attempt only rewrites what is there.
      throw new Error(
        `[job:calendar-event-sync] no calendar event yet for shooting ${shootingId}`,
      );
    }

    try {
      await updateCalendarEvent({
        eventId: calendarEvent.eventId,
        ...buildShootingCalendarEvent({
          id: photoShooting.id,
          package: photoShooting.package,
          isLightPlaySelected: photoShooting.isLightPlaySelected,
          clientNote: photoShooting.clientNote,
          startTime: timeSlot.startTime,
          clientName: client.owner.name,
          clientPhoneNumber: client.owner.phoneNumber,
        }),
      });
    } catch (error) {
      const status = (error as { status?: number }).status;

      // Event was deleted in Google Calendar — retrying won't help.
      if (status === 404 || status === 410) {
        console.error('[job:calendar-event-sync] event not found', {
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

      console.error('[job:calendar-event-sync] failed to sync calendar event', {
        shootingId,
        error,
      });
      throw error; // -> 500 -> QStash retries
    }

    await prisma.bookingCalendarEvent.update({
      where: { id: calendarEvent.id },
      data: { status: 'updated', lastSyncedAt: new Date() },
    });

    console.log('[job:calendar-event-sync] event synced', {
      shootingId,
      eventId: calendarEvent.eventId,
    });

    return new Response(
      `Calendar event synced for photo shooting ID ${shootingId}`,
      { status: 200 },
    );
  },
  { devMode: env.QSTASH_DEV },
);
