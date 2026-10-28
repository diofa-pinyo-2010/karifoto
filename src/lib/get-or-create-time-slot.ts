import { livePendingIntentWhere } from '@/lib/booking-intent-hold';
import { prisma } from '@/lib/prisma';
import { createTimeSlot, updateTimeSlotRevealed } from '@/server/time-slots';

// Reuse an existing free slot at this start time (whatever its revealed
// status) instead of creating a duplicate one. `created` tells the caller
// whether the slot is new, so it can be rolled back on a later failure.
export async function getOrCreateTimeSlot(
  startTime: Date,
): Promise<{ id: string; created: boolean } | { error: string }> {
  const freeTimeSlots = await prisma.timeSlot.findMany({
    where: { startTime, photoShooting: null },
    select: {
      id: true,
      _count: {
        select: {
          bookingIntents: {
            where: livePendingIntentWhere(),
          },
        },
      },
    },
  });

  // Someone may be paying for this slot right now — taking it would make their
  // webhook hit the unique `timeSlotId` and orphan the payment. A second slot
  // at the same time would double-book the studio, so refuse instead.
  if (freeTimeSlots.some((slot) => slot._count.bookingIntents > 0)) {
    return {
      error:
        'Erre az időpontra épp folyamatban van egy foglalás. Válassz másik időpontot.',
    };
  }

  const existingTimeSlot = freeTimeSlots[0];
  if (existingTimeSlot != null) {
    await updateTimeSlotRevealed(existingTimeSlot.id, false);
    return { id: existingTimeSlot.id, created: false };
  }

  const timeSlot = await createTimeSlot(startTime, false);
  if ('error' in timeSlot) {
    return timeSlot;
  }
  return { id: timeSlot.id, created: true };
}
