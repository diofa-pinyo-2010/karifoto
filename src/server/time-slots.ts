'use server';

import { Prisma } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';

const timeSlotsWithPhotoShootingInclude = {
  include: {
    photoShooting: {
      select: { id: true, client: { select: { owner: true } } },
    },
  },
} satisfies Prisma.TimeSlotDefaultArgs;

export type TimeSlotsWithPhotoShooting = Prisma.TimeSlotGetPayload<
  typeof timeSlotsWithPhotoShootingInclude
>;

export async function fetchTimeSlots(): Promise<TimeSlotsWithPhotoShooting[]> {
  const slots = await prisma.timeSlot.findMany({
    where: { startTime: { gte: new Date() } },
    orderBy: { startTime: 'asc' },
    ...timeSlotsWithPhotoShootingInclude,
  });

  return slots;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getTimeSlot(
  id: string,
): Promise<TimeSlotsWithPhotoShooting | null> {
  if (!UUID_RE.test(id)) return null;

  return prisma.timeSlot.findUnique({
    where: { id },
    ...timeSlotsWithPhotoShootingInclude,
  });
}
