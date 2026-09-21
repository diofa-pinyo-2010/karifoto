import { verifySignatureAppRouter } from '@upstash/qstash/nextjs';
import z from 'zod';

import { env } from '@/env';
import { createCalendarEvent } from '@/lib/google-calendar';
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
      include: {
        timeSlot: { select: { startTime: true, endTime: true } },
        client: { select: { owner: { select: { email: true, name: true } } } },
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

    const startTime = photoShooting.timeSlot.startTime;
    const endTime = photoShooting.timeSlot.endTime;

    try {
      const event = await createCalendarEvent({
        title: `📸 ${photoShooting.client.owner.name} - ${photoShooting.package}`,
        description: `
        Ügyfél üzenete: ${photoShooting.clientNote}

        Díszlet: ${photoShooting.decorSet ? photoShooting.decorSet : '-'}
      `,
        startTime,
        endTime,
      });

      // Temporary log - remove
      console.log(
        '[job:calendar-event] API response',
        JSON.stringify(event, null, 2),
      );

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
