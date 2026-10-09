'use server';

import { revalidatePath } from 'next/cache';

import { env } from '@/env';
import { BookingIntentStatus, Prisma } from '@/generated/prisma/client';
import { createClientPortalToken } from '@/lib/auth';
import { clientPortalLoginUrl } from '@/lib/client-portal';
import { APP_URLS, PENDING_INTENT_HOLD_HOURS } from '@/lib/constants';
import { verifySession } from '@/lib/dal';
import { getOrCreateTimeSlot } from '@/lib/get-or-create-time-slot';
import { prisma } from '@/lib/prisma';
import { sendImageSelectionEmail } from '@/lib/resend/image-selection';
import { qStashClient } from '@/lib/upstash';
import { dayBounds } from '@/lib/utils';
import {
  recalculatePhotoShootingStatus,
  updatePhotoShooting,
} from '@/server/admin';

const photoShootingsForDaySelect = {
  select: {
    id: true,
    package: true,
    isLightPlaySelected: true,
    timeSlot: { select: { startTime: true } },
    client: { select: { owner: { select: { name: true } } } },
  },
} satisfies Prisma.PhotoShootingDefaultArgs;

export type PhotoShootingsForDay = Prisma.PhotoShootingGetPayload<
  typeof photoShootingsForDaySelect
>;

const pendingBookingIntentsSelect = {
  select: {
    id: true,
    createdAt: true,
    name: true,
    timeSlot: { select: { startTime: true } },
  },
} satisfies Prisma.BookingIntentDefaultArgs;

export type PendingBookingIntent = Prisma.BookingIntentGetPayload<
  typeof pendingBookingIntentsSelect
>;

export async function getPhotoShootingsAndIntentsForDay(
  date: Date,
  excludeShootingId?: string,
) {
  await verifySession();

  const { start, end } = dayBounds(date);
  const shootings = await prisma.photoShooting.findMany({
    where: {
      timeSlot: { startTime: { gte: start, lt: end } },
      id: { not: excludeShootingId },
    },
    ...photoShootingsForDaySelect,
    orderBy: { timeSlot: { startTime: 'asc' } },
  });

  const PENDING_INTENT_HOLD_HOURS_MS =
    PENDING_INTENT_HOLD_HOURS * 60 * 60 * 1000;

  const pendingBookingIntents = await prisma.bookingIntent.findMany({
    where: {
      timeSlot: {
        startTime: { gte: start, lt: end },
        createdAt: {
          gt: new Date(Date.now() - PENDING_INTENT_HOLD_HOURS_MS),
        },
      },
      status: BookingIntentStatus.PENDING,
    },
    ...pendingBookingIntentsSelect,
  });

  return { shootings, pendingBookingIntents };
}

export async function changeTimeOfPhotoShooting({
  shootingId,
  newStartTime,
}: {
  shootingId: string;
  newStartTime: Date;
}): Promise<{ error: string } | void> {
  await verifySession();

  const shooting = await prisma.photoShooting.findUnique({
    where: { id: shootingId },
    select: { timeSlot: { select: { startTime: true } } },
  });
  if (shooting == null) {
    return { error: 'Ez a fotózás nem található.' };
  }
  // Same time — nothing to move. Without this, the lookup below skips the
  // shooting's own (taken) slot and would create a duplicate one.
  if (shooting.timeSlot.startTime.getTime() === newStartTime.getTime()) {
    return;
  }

  // 1. Check if there is an exising timeslot without photoshooting
  // 2. Create a new one if there is not
  const res = await getOrCreateTimeSlot(newStartTime);
  if ('error' in res) {
    return res;
  }
  const { id } = res;
  // 3. Update the shooting with the new TimeSlot
  try {
    await prisma.photoShooting.update({
      where: { id: shootingId },
      data: { timeSlotId: id },
    });
  } catch (error) {
    console.error(error);
    return { error: 'Nem sikerült módosítani az időpontot. Próbáld újra.' };
  }

  // 4. Move the Google Calendar event and email the client. The new time is
  // already saved, so a publish failure is logged, not returned to the admin.
  const jobs = [
    {
      name: 'calendar-event-reschedule',
      body: { shootingId },
    },
    {
      name: 'email-reschedule',
      body: {
        shootingId,
        oldStartTime: shooting.timeSlot.startTime.toISOString(),
      },
    },
  ];
  const results = await Promise.allSettled(
    jobs.map(({ name, body }) =>
      qStashClient.publishJSON({
        url: `${env.NEXT_PUBLIC_SITE_URL}/api/jobs/${name}`,
        body,
        retries: 3,
      }),
    ),
  );
  results.forEach((result, i) => {
    if (result.status === 'rejected') {
      console.error('[changeTimeOfPhotoShooting] failed to publish job', {
        job: jobs[i].name,
        shootingId,
        error: result.reason,
      });
    }
  });

  await recalculatePhotoShootingStatus(shootingId);
  revalidatePath(APP_URLS.photoShootingAdminPage(shootingId));
}

export async function sendRawImagesForSelection({
  shootingId,
}: {
  shootingId: string;
}): Promise<{ error: string } | { success: true }> {
  await verifySession();

  const shooting = await prisma.photoShooting.findUnique({
    where: { id: shootingId },
    select: {
      client: {
        select: {
          id: true,
          owner: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });

  if (shooting == null) {
    return { error: 'Nem találjuk ezt a PhotoShootingot' };
  }

  const { raw: rawToken } = await createClientPortalToken(
    shooting.client.owner.id,
  );

  const { error } = await sendImageSelectionEmail({
    shootingId,
    to: shooting.client.owner.email,
    name: shooting.client.owner.name,
    clientId: shooting.client.id,
    clientPortalLoginLink: clientPortalLoginUrl({
      rawToken,
      clientProfileId: shooting.client.id,
      shootingId,
    }),
  });

  if (error != null) {
    return { error: 'Nem tudtuk elküldeni az email. Próbáld újra!' };
  }

  const updateResult = await updatePhotoShooting(shootingId, {
    selectionRequestedAt: new Date(),
  });

  if (updateResult != null && 'error' in updateResult) {
    return updateResult;
  }

  return { success: true };
}
