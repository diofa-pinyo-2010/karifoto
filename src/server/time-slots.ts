'use server';

import { revalidatePath } from 'next/cache';

import { Prisma } from '@/generated/prisma/client';
import { TIME_SLOT_DURATION_MINUTES } from '@/lib/constants';
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

export async function updateTimeSlotRevealed(id: string, revealed: boolean) {
  try {
    await prisma.timeSlot.update({ where: { id }, data: { revealed } });
  } catch (error) {
    console.error(error);
  }

  revalidatePath('/admin/time-slots');
}

export async function createTimeSlot(
  startTime: Date,
): Promise<{ id: string } | { error: string }> {
  if (Number.isNaN(startTime.getTime()) || startTime.getTime() <= Date.now()) {
    return { error: 'Érvénytelen időpont.' };
  }

  const endTime = new Date(
    startTime.getTime() + TIME_SLOT_DURATION_MINUTES * 60_000,
  );

  try {
    const slot = await prisma.timeSlot.create({
      data: { startTime, endTime },
    });
    revalidatePath('/admin/time-slots');
    return { id: slot.id };
  } catch (error) {
    console.error(error);
    return { error: 'Hiba történt az idősáv létrehozásakor.' };
  }
}

export async function deleteTimeSlot(id: string) {
  const taken = await prisma.timeSlot.findFirst({
    where: { id, photoShooting: { isNot: null } },
    select: { id: true },
  });

  if (taken != null) {
    return;
  }

  try {
    await prisma.timeSlot.delete({ where: { id } });
  } catch (error) {
    console.error(error);
  }

  revalidatePath('/admin/time-slots');
}
