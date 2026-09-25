'use server';

import { revalidatePath } from 'next/cache';

import { Prisma } from '@/generated/prisma/client';
import { APP_URLS, UPCOMING_SHOOTINGS_TO_SHOW } from '@/lib/constants';
import { getOrCreateTimeSlot } from '@/lib/get-or-create-time-slot';
import { prisma } from '@/lib/prisma';
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
  // 4. Update the CONVERTED BookingIntent with the new time slot ????

  // 5. Update the existing BookingCalendarEvent
  // 6. Send an email to the user about the update
  revalidatePath(APP_URLS.photoShootingAdminPage(shootingId));
}
