'use server';

import { revalidatePath } from 'next/cache';

import { env } from '@/env';
import { EmailType, PhotoShootingStatus } from '@/generated/prisma/enums';
import { createClientPortalToken } from '@/lib/auth';
import { livePendingIntentWhere } from '@/lib/booking-intent-hold';
import { clientPortalLoginUrl } from '@/lib/client-portal';
import { APP_URLS } from '@/lib/constants';
import { verifySession } from '@/lib/dal';
import { getOrCreateTimeSlot } from '@/lib/get-or-create-time-slot';
import { prisma } from '@/lib/prisma';
import { invalidatePublicTimeSlots } from '@/lib/public-time-slots';
import { sendCompleteProjectEmail } from '@/lib/resend/complete-project';
import { sendImageSelectionEmail } from '@/lib/resend/image-selection';
import { qStashClient } from '@/lib/upstash';
import { dayBounds } from '@/lib/utils';
import {
  recalculatePhotoShootingStatus,
  updatePhotoShooting,
} from '@/server/admin';

import type { Prisma } from '@/generated/prisma/client';

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

  const pendingBookingIntents = await prisma.bookingIntent.findMany({
    where: {
      timeSlot: {
        startTime: { gte: start, lt: end },
      },
      ...livePendingIntentWhere(),
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
    select: { status: true, timeSlot: { select: { startTime: true } } },
  });
  if (shooting == null) {
    return { error: 'Ez a fotózás nem található.' };
  }
  if (shooting.status === PhotoShootingStatus.COMPLETED) {
    return { error: 'A lezárt fotózás nem módosítható.' };
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
  // A régi idősáv felszabadult, az új foglalt lett.
  invalidatePublicTimeSlots();

  // 4. Move the Google Calendar event and email the client. The new time is
  // already saved, so a publish failure is logged, not returned to the admin.
  const jobs = [
    {
      name: 'calendar-event-sync',
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

export async function completePhotoShooting({
  shootingId,
}: {
  shootingId: string;
}): Promise<{ error: string } | { success: true }> {
  await verifySession();

  const shooting = await prisma.photoShooting.findUnique({
    where: { id: shootingId },
    select: {
      status: true,
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

  if (shooting.status !== PhotoShootingStatus.READY_TO_COMPLETE) {
    return { error: 'A projekt jelenleg nem zárható le.' };
  }

  const alreadySent = await prisma.sentEmail.findFirst({
    where: { photoShootingId: shootingId, type: EmailType.COMPLETED_PROJECT },
    select: { id: true },
  });

  if (alreadySent == null) {
    const { raw: rawToken } = await createClientPortalToken(
      shooting.client.owner.id,
    );

    const { error } = await sendCompleteProjectEmail({
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
      return { error: 'Nem tudtuk elküldeni az emailt. Próbáld újra!' };
    }
  }

  // Csak az elfogadott email után: a `completedAt` hibás küldésnél is
  // teljesítettnek mutatná a projektet, és az ügyfél nem kapná meg a képeket.
  const updateResult = await updatePhotoShooting(shootingId, {
    completedAt: new Date(),
  });

  if (updateResult != null && 'error' in updateResult) {
    return updateResult;
  }

  return { success: true };
}
