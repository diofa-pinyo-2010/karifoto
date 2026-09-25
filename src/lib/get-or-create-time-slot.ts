import { BookingIntentStatus } from '@/generated/prisma/enums';
import { PENDING_INTENT_HOLD_HOURS } from '@/lib/constants';
import { prisma } from '@/lib/prisma';
import { createTimeSlot, updateTimeSlotRevealed } from '@/server/time-slots';

// Reuse an existing free slot at this start time (whatever its revealed
// status) instead of creating a duplicate one. `created` tells the caller
// whether the slot is new, so it can be rolled back on a later failure.
export async function getOrCreateTimeSlot(
  startTime: Date,
): Promise<{ id: string; created: boolean } | { error: string }> {
  const holdCutoff = new Date(
    Date.now() - PENDING_INTENT_HOLD_HOURS * 60 * 60 * 1000,
  );

  const freeTimeSlots = await prisma.timeSlot.findMany({
    where: { startTime, photoShooting: null },
    select: {
      id: true,
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
