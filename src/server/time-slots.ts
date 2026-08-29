'use server';

import { Prisma } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';

const timeSlotsWithPhotoShootingInclude = {
  include: { photoShooting: { select: { id: true } } },
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
