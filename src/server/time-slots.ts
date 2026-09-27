'use server';

import { revalidatePath } from 'next/cache';

import { TIME_SLOT_DURATION_MINUTES } from '@/lib/constants';
import { verifySession } from '@/lib/dal';
import { prisma } from '@/lib/prisma';

export async function updateTimeSlotRevealed(id: string, revealed: boolean) {
  await verifySession();

  try {
    await prisma.timeSlot.update({ where: { id }, data: { revealed } });
  } catch (error) {
    console.error(error);
  }

  revalidatePath('/admin/time-slots');
}

export async function createTimeSlot(
  startTime: Date,
  revealed: boolean = false,
): Promise<{ id: string } | { error: string }> {
  await verifySession();

  if (Number.isNaN(startTime.getTime()) || startTime.getTime() <= Date.now()) {
    return { error: 'Érvénytelen időpont.' };
  }

  const endTime = new Date(
    startTime.getTime() + TIME_SLOT_DURATION_MINUTES * 60_000,
  );

  try {
    const slot = await prisma.timeSlot.create({
      data: { startTime, endTime, revealed },
    });
    revalidatePath('/admin/time-slots');
    return { id: slot.id };
  } catch (error) {
    console.error(error);
    return { error: 'Hiba történt az idősáv létrehozásakor.' };
  }
}

export async function deleteTimeSlot(
  id: string,
): Promise<{ error: string } | void> {
  await verifySession();

  const slot = await prisma.timeSlot.findUnique({
    where: { id },
    select: {
      photoShooting: { select: { id: true } },
      _count: { select: { bookingIntents: true } },
    },
  });

  if (slot?.photoShooting != null) {
    return { error: 'Ez az idősáv már foglalt, nem törölhető.' };
  }

  if (slot != null && slot._count.bookingIntents > 0) {
    return {
      error:
        'Ehhez az idősávhoz BookingIntent (foglalási szándék) tartozik, ezért nem törölhető.',
    };
  }

  try {
    await prisma.timeSlot.delete({ where: { id } });
  } catch (error) {
    console.error(error);
    return { error: 'Nem sikerült törölni az idősávot. Próbáld újra.' };
  }

  revalidatePath('/admin/time-slots');
}
