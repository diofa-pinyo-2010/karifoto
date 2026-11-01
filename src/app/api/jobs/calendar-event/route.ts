import { verifySignatureAppRouter } from '@upstash/qstash/nextjs';
import z from 'zod';

import { env } from '@/env';
import {
  buildShootingCalendarEvent,
  createCalendarEvent,
} from '@/lib/google-calendar';
import { prisma } from '@/lib/prisma';

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
      select: {
        id: true,
        clientNote: true,
        package: true,
        isLightPlaySelected: true,
        timeSlot: { select: { startTime: true } },
        client: {
          select: {
            owner: { select: { email: true, name: true, phoneNumber: true } },
          },
        },
      },
    });

    if (photoShooting == null) {
      console.error('[job:calendar-event] unknown shooting', {
        shootingId: parsed.data.shootingId,
      });

      return new Response('unknown shooting', {
        status: 489,
        headers: { 'Upstash-NonRetryable-Error': 'true' },
      });
    }

    try {
      const event = await createCalendarEvent(
        buildShootingCalendarEvent({
          id: photoShooting.id,
          package: photoShooting.package,
          isLightPlaySelected: photoShooting.isLightPlaySelected,
          clientNote: photoShooting.clientNote,
          startTime: photoShooting.timeSlot.startTime,
          clientName: photoShooting.client.owner.name,
          clientPhoneNumber: photoShooting.client.owner.phoneNumber,
        }),
      );

      if (!event.id) {
        // QStash will retry if there is no ID, but there will be :)
        throw new Error('Google Calendar API did not return an event ID');
      }

      await prisma.bookingCalendarEvent.create({
        data: {
          photoShootingId: photoShooting.id,
          calendarId: env.GOOGLE_CALENDAR_ID,
          eventId: event.id,
          status: 'created',
          lastSyncedAt: new Date(),
        },
      });

      console.log('[job:calendar-event] event created successfully', {
        shootingId: parsed.data.shootingId,
        eventId: event.id,
      });
    } catch (error) {
      console.error('[job:calendar-event] failed to create calendar event', {
        shootingId: parsed.data.shootingId,
        error,
      });
      throw error; // -> 500 -> QStash retries
    }

    return new Response(
      `Calendar event created for photo shooting ID ${parsed.data.shootingId}`,
      { status: 200 },
    );
  },
  { devMode: env.QSTASH_DEV },
);
