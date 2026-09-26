'use server';

import { revalidatePath } from 'next/cache';

import { env } from '@/env';
import { Prisma } from '@/generated/prisma/client';
import { APP_URLS, UPCOMING_SHOOTINGS_TO_SHOW } from '@/lib/constants';
import { verifySession } from '@/lib/dal';
import { getOrCreateTimeSlot } from '@/lib/get-or-create-time-slot';
import { prisma } from '@/lib/prisma';
import { qStashClient } from '@/lib/upstash';
import { dayBounds } from '@/lib/utils';

const photoShootingWithClientInclude = {
  include: {
    client: { include: { owner: true } },
    timeSlot: { select: { startTime: true } },
  },
} satisfies Prisma.PhotoShootingDefaultArgs;

type PhotoShootingWithClient = Prisma.PhotoShootingGetPayload<
  typeof photoShootingWithClientInclude
>;

export async function fetchUpcomingPhotoShootings(): Promise<
  PhotoShootingWithClient[]
> {
  return prisma.photoShooting.findMany({
    where: {
      AND: {
        timeSlot: { endTime: { gte: new Date() } },
        status: { notIn: ['COMPLETED', 'CLOSED'] },
      },
    },
    take: UPCOMING_SHOOTINGS_TO_SHOW,
    orderBy: { timeSlot: { startTime: 'asc' } },
    ...photoShootingWithClientInclude,
  });
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const photoShootingDetailInclude = {
  include: {
    client: { include: { owner: true } },
    timeSlot: true,
    photographer: { include: { owner: true } },
    editor: { include: { owner: true } },
    ledgerEntries: {
      include: { invoice: true },
      orderBy: { createdAt: 'asc' },
    },
    pricing: true,
    adjustments: true,
    sentEmails: {
      select: {
        id: true,
        subject: true,
        resendId: true,
        sentAt: true,
        to: true,
      },
      orderBy: { sentAt: 'desc' },
    },
  },
} satisfies Prisma.PhotoShootingDefaultArgs;

export type PhotoShootingDetail = Prisma.PhotoShootingGetPayload<
  typeof photoShootingDetailInclude
>;

export async function getPhotoShooting(
  id: string,
): Promise<PhotoShootingDetail | null> {
  if (!UUID_RE.test(id)) return null;

  return prisma.photoShooting.findUnique({
    where: { id },
    ...photoShootingDetailInclude,
  });
}

const photoShootingsForDaySelect = {
  select: {
    id: true,
    package: true,
    isLightPlaySelected: true,
    timeSlot: { select: { startTime: true } },
  },
} satisfies Prisma.PhotoShootingDefaultArgs;

export type PhotoShootingsForDay = Prisma.PhotoShootingGetPayload<
  typeof photoShootingsForDaySelect
>;

export async function getPhotoShootingsForDay(
  date: Date,
  excludeShootingId?: string,
) {
  await verifySession();
  const { start, end } = dayBounds(date);
  return prisma.photoShooting.findMany({
    where: {
      timeSlot: { startTime: { gte: start, lt: end } },
      id: { not: excludeShootingId },
    },
    ...photoShootingsForDaySelect,
    orderBy: { timeSlot: { startTime: 'asc' } },
  });
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

  revalidatePath(APP_URLS.photoShootingAdminPage(shootingId));
}
