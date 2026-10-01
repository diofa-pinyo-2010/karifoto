'use server';

import { revalidatePath } from 'next/cache';

import { BookingIntentStatus } from '@/generated/prisma/enums';
import {
  PENDING_INTENT_HOLD_HOURS,
  TIME_SLOT_DURATION_MINUTES,
} from '@/lib/constants';
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
    return { error: 'Érvénytelen vagy múltbéli időpont.' };
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

  // Only a live hold blocks deletion — same predicate `getOrCreateTimeSlot`
  // uses to decide a slot is free. Converted and cancelled intents keep their
  // own `requestedStartTime`, and their FK is `SetNull`, so the row can go.
  const holdCutoff = new Date(
    Date.now() - PENDING_INTENT_HOLD_HOURS * 60 * 60 * 1000,
  );

  const slot = await prisma.timeSlot.findUnique({
    where: { id },
    select: {
      photoShooting: { select: { id: true } },
      _count: {
        select: {
          bookingIntents: {
            where: {
              status: BookingIntentStatus.PENDING,
              updatedAt: { gt: holdCutoff },
            },
          },
        },
      },
    },
  });

  if (slot?.photoShooting != null) {
    return { error: 'Ez az idősáv már foglalt, nem törölhető.' };
  }

  if (slot != null && slot._count.bookingIntents > 0) {
    return {
      error:
        'Erre az idősávra épp folyamatban van egy foglalás, ezért nem törölhető.',
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
